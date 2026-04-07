import db from '../config/database.js';

class FeatureFlag {
  // Check if feature is enabled globally
  static async isGloballyEnabled(featureName) {
    try {
      const [flags] = await db.query(
        'SELECT is_enabled FROM feature_flags WHERE feature_name = ? AND is_global = TRUE',
        [featureName]
      );
      return flags[0]?.is_enabled === true;
    } catch (error) {
      throw new Error(`Failed to check global feature flag: ${error.message}`);
    }
  }

  // Check if feature is enabled for specific school (with global fallback)
  static async isEnabledForSchool(schoolId, featureName) {
    try {
      // Check school-specific override first
      const [override] = await db.query(
        `SELECT sff.is_enabled FROM school_feature_flags sff
         JOIN feature_flags ff ON sff.feature_id = ff.id
         WHERE sff.school_id = ? AND ff.feature_name = ?`,
        [schoolId, featureName]
      );
      
      if (override[0]) {
        return override[0].is_enabled === true;
      }

      // Fall back to global setting
      const [global] = await db.query(
        'SELECT is_enabled FROM feature_flags WHERE feature_name = ? AND is_global = TRUE',
        [featureName]
      );

      return global[0]?.is_enabled === true;
    } catch (error) {
      throw new Error(`Failed to check feature flag: ${error.message}`);
    }
  }

  // Get all features
  static async getAllFeatures() {
    try {
      const [features] = await db.query(
        'SELECT id, feature_name, description, is_global, is_enabled FROM feature_flags ORDER BY feature_name'
      );
      return features;
    } catch (error) {
      throw new Error(`Failed to get features: ${error.message}`);
    }
  }

  // Get features for school (with overrides)
  static async getFeaturesForSchool(schoolId) {
    try {
      const [features] = await db.query(
        `SELECT 
          ff.id,
          ff.feature_name,
          ff.description,
          ff.is_global,
          COALESCE(sff.is_enabled, ff.is_enabled) as is_enabled,
          sff.reason as override_reason
         FROM feature_flags ff
         LEFT JOIN school_feature_flags sff ON ff.id = sff.feature_id AND sff.school_id = ?
         ORDER BY ff.feature_name`,
        [schoolId]
      );
      return features;
    } catch (error) {
      throw new Error(`Failed to get school features: ${error.message}`);
    }
  }

  // Toggle feature globally
  static async toggleGlobal(featureName, isEnabled, userId) {
    try {
      const [result] = await db.query(
        'UPDATE feature_flags SET is_enabled = ? WHERE feature_name = ?',
        [isEnabled, featureName]
      );

      // Log the change
      if (result.affectedRows > 0) {
        const [flag] = await db.query(
          'SELECT id FROM feature_flags WHERE feature_name = ?',
          [featureName]
        );

        await db.query(
          `INSERT INTO feature_flag_history (feature_id, old_status, new_status, changed_by)
           VALUES (?, ?, ?, ?)`,
          [flag[0].id, !isEnabled ? 'enabled' : 'disabled', isEnabled ? 'enabled' : 'disabled', userId]
        );
      }

      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Failed to toggle feature: ${error.message}`);
    }
  }

  // Override feature for specific school
  static async setForSchool(schoolId, featureName, isEnabled, reason, userId) {
    try {
      const [flag] = await db.query(
        'SELECT id FROM feature_flags WHERE feature_name = ?',
        [featureName]
      );

      if (!flag[0]) {
        throw new Error('Feature not found');
      }

      const featureId = flag[0].id;
      const timestamp = isEnabled ? new Date() : null;

      await db.query(
        `INSERT INTO school_feature_flags (school_id, feature_id, is_enabled, enabled_at, reason, updated_by)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE is_enabled = ?, reason = ?, updated_by = ?`,
        [schoolId, featureId, isEnabled, timestamp, reason, userId, isEnabled, reason, userId]
      );

      // Log the change
      await db.query(
        `INSERT INTO feature_flag_history (school_id, feature_id, old_status, new_status, changed_by, reason)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [schoolId, featureId, 'changed', isEnabled ? 'enabled' : 'disabled', userId, reason]
      );

      return true;
    } catch (error) {
      throw new Error(`Failed to set school feature: ${error.message}`);
    }
  }

  // Get feature history
  static async getHistory(featureName, schoolId = null) {
    try {
      let query = `
        SELECT h.*, ff.feature_name, u.first_name, u.last_name, s.name as school_name
        FROM feature_flag_history h
        JOIN feature_flags ff ON h.feature_id = ff.id
        JOIN users u ON h.changed_by = u.id
        LEFT JOIN schools s ON h.school_id = s.id
        WHERE ff.feature_name = ?
      `;
      const params = [featureName];

      if (schoolId) {
        query += ' AND h.school_id = ?';
        params.push(schoolId);
      }

      query += ' ORDER BY h.created_at DESC LIMIT 50';

      const [history] = await db.query(query, params);
      return history;
    } catch (error) {
      throw new Error(`Failed to get feature history: ${error.message}`);
    }
  }
}

export default FeatureFlag;
