import db from '../config/database.js';

class AcademicTemplate {
  // Create global academic template (holiday, event, schedule)
  static async create(data, userId) {
    try {
      const { type, name, description, startDate, endDate, appliesToAllSchools, applicableSchools } = data;

      const [result] = await db.query(
        `INSERT INTO global_academic_templates 
         (type, name, description, start_date, end_date, applies_to_all_schools, applicable_schools, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          type, // 'holiday', 'event', 'schedule', 'vacation'
          name,
          description,
          startDate,
          endDate,
          appliesToAllSchools ? true : false,
          !appliesToAllSchools && applicableSchools ? JSON.stringify(applicableSchools) : null,
          userId
        ]
      );

      return { id: result.insertId, ...data };
    } catch (error) {
      throw new Error(`Failed to create template: ${error.message}`);
    }
  }

  // Get templates for school
  static async getForSchool(schoolId, type = null) {
    try {
      let query = `SELECT * FROM global_academic_templates 
                   WHERE applies_to_all_schools = TRUE
                   OR JSON_CONTAINS(applicable_schools, ?)`;
      const params = [JSON.stringify(schoolId)];

      if (type) {
        query += ' AND type = ?';
        params.push(type);
      }

      query += ' AND is_active = TRUE ORDER BY start_date';

      const [templates] = await db.query(query, params);
      return templates;
    } catch (error) {
      throw new Error(`Failed to get templates: ${error.message}`);
    }
  }

  // Get all templates (for Super Admin)
  static async getAll(filters = {}) {
    try {
      let query = 'SELECT * FROM global_academic_templates WHERE 1=1';
      const params = [];

      if (filters.type) {
        query += ' AND type = ?';
        params.push(filters.type);
      }

      if (filters.isActive !== undefined) {
        query += ' AND is_active = ?';
        params.push(filters.isActive);
      }

      if (filters.startDate) {
        query += ' AND start_date >= ?';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ' AND end_date <= ?';
        params.push(filters.endDate);
      }

      query += ' ORDER BY start_date DESC LIMIT 100';

      const [templates] = await db.query(query, params);
      return templates;
    } catch (error) {
      throw new Error(`Failed to get templates: ${error.message}`);
    }
  }

  // Get single template
  static async getById(id) {
    try {
      const [template] = await db.query(
        'SELECT * FROM global_academic_templates WHERE id = ?',
        [id]
      );

      if (template[0] && template[0].applicable_schools) {
        template[0].applicable_schools = JSON.parse(template[0].applicable_schools);
      }

      return template[0];
    } catch (error) {
      throw new Error(`Failed to get template: ${error.message}`);
    }
  }

  // Update template
  static async update(id, data) {
    try {
      const { name, description, startDate, endDate, appliesToAllSchools, applicableSchools } = data;

      await db.query(
        `UPDATE global_academic_templates 
         SET name = ?, description = ?, start_date = ?, end_date = ?,
             applies_to_all_schools = ?, applicable_schools = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          name,
          description,
          startDate,
          endDate,
          appliesToAllSchools ? true : false,
          !appliesToAllSchools && applicableSchools ? JSON.stringify(applicableSchools) : null,
          id
        ]
      );

      return await this.getById(id);
    } catch (error) {
      throw new Error(`Failed to update template: ${error.message}`);
    }
  }

  // Deactivate template
  static async deactivate(id) {
    try {
      await db.query(
        'UPDATE global_academic_templates SET is_active = FALSE, updated_at = NOW() WHERE id = ?',
        [id]
      );
      return true;
    } catch (error) {
      throw new Error(`Failed to deactivate template: ${error.message}`);
    }
  }

  // Get upcoming holidays/events
  static async getUpcoming(schoolId, days = 30) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const future = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [templates] = await db.query(
        `SELECT * FROM global_academic_templates 
         WHERE (applies_to_all_schools = TRUE OR JSON_CONTAINS(applicable_schools, ?))
         AND type IN ('holiday', 'event')
         AND is_active = TRUE
         AND start_date >= ? AND start_date <= ?
         ORDER BY start_date`,
        [JSON.stringify(schoolId), today, future]
      );

      return templates;
    } catch (error) {
      throw new Error(`Failed to get upcoming templates: ${error.message}`);
    }
  }

  // Check if today is a holiday/vacation
  static async isHolidayToday(schoolId) {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [result] = await db.query(
        `SELECT COUNT(*) as count FROM global_academic_templates 
         WHERE (applies_to_all_schools = TRUE OR JSON_CONTAINS(applicable_schools, ?))
         AND type IN ('holiday', 'vacation')
         AND is_active = TRUE
         AND start_date <= ? AND end_date >= ?`,
        [JSON.stringify(schoolId), today, today]
      );

      return result[0].count > 0;
    } catch (error) {
      throw new Error(`Failed to check holiday: ${error.message}`);
    }
  }

  // Get statistics
  static async getStats() {
    try {
      const [stats] = await db.query(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN type = 'holiday' THEN 1 ELSE 0 END) as holidays,
          SUM(CASE WHEN type = 'event' THEN 1 ELSE 0 END) as events,
          SUM(CASE WHEN applies_to_all_schools = TRUE THEN 1 ELSE 0 END) as global
         FROM global_academic_templates`
      );

      return stats[0];
    } catch (error) {
      throw new Error(`Failed to get template stats: ${error.message}`);
    }
  }
}

export default AcademicTemplate;
