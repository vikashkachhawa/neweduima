import db from '../config/database.js';

class SchoolPage {
  static async findBySchoolId(schoolId) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM school_pages WHERE school_id = ?',
        [schoolId]
      );
      return rows[0];
    } catch (error) {
      throw new Error(`Failed to get school page: ${error.message}`);
    }
  }

  static async updateProfile(schoolId, data) {
    try {
      console.log('📊 SchoolPage.updateProfile - schoolId:', schoolId);
      // Build partial update only for provided fields (undefined keys are skipped)
      const allowedKeys = [
        'banner_url',
        'logo_url',
        'description',
        'vision_statement',
        'achievements',
        'allow_comments',
        'require_follow_approval',
        'is_public'
      ];

      const setClauses = [];
      const params = [];

      for (const key of allowedKeys) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          setClauses.push(`${key} = ?`);
          params.push(data[key]);
        }
      }

      if (setClauses.length === 0) {
        console.log('ℹ️ No fields provided to update. Returning current page.');
        return await this.findBySchoolId(schoolId);
      }

      setClauses.push('updated_at = NOW()');
      const sql = `UPDATE school_pages SET ${setClauses.join(', ')} WHERE school_id = ?`;
      params.push(schoolId);

      const result = await db.query(sql, params);
      console.log('📊 Update result:', result[0]);

      const updated = await this.findBySchoolId(schoolId);
      console.log('📊 Updated page returned:', updated);
      return updated;
    } catch (error) {
      throw new Error(`Failed to update school page: ${error.message}`);
    }
  }

  static async getPublicPage(schoolId) {
    try {
      const [rows] = await db.query(
        `SELECT id, school_id, banner_url, logo_url, description, vision_statement, 
                achievements, follower_count, post_count, is_public, allow_comments 
         FROM school_pages WHERE school_id = ? AND is_public = TRUE`,
        [schoolId]
      );
      return rows[0];
    } catch (error) {
      throw new Error(`Failed to get public page: ${error.message}`);
    }
  }

  static async incrementFollowerCount(schoolId) {
    try {
      await db.query(
        'UPDATE school_pages SET follower_count = follower_count + 1 WHERE school_id = ?',
        [schoolId]
      );
    } catch (error) {
      throw new Error(`Failed to increment follower count: ${error.message}`);
    }
  }

  static async decrementFollowerCount(schoolId) {
    try {
      await db.query(
        'UPDATE school_pages SET follower_count = GREATEST(0, follower_count - 1) WHERE school_id = ?',
        [schoolId]
      );
    } catch (error) {
      throw new Error(`Failed to decrement follower count: ${error.message}`);
    }
  }

  static async incrementPostCount(schoolId) {
    try {
      await db.query(
        'UPDATE school_pages SET post_count = post_count + 1 WHERE school_id = ?',
        [schoolId]
      );
    } catch (error) {
      throw new Error(`Failed to increment post count: ${error.message}`);
    }
  }

  static async decrementPostCount(schoolId) {
    try {
      await db.query(
        'UPDATE school_pages SET post_count = GREATEST(0, post_count - 1) WHERE school_id = ?',
        [schoolId]
      );
    } catch (error) {
      throw new Error(`Failed to decrement post count: ${error.message}`);
    }
  }
}

export default SchoolPage;
