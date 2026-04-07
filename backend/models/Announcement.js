import db from '../config/database.js';

class Announcement {
  static async create(schoolIdOrPayload, titleOrUserId, message) {
    if (typeof schoolIdOrPayload === 'object' && schoolIdOrPayload !== null) {
      return this.createGlobal(schoolIdOrPayload, titleOrUserId);
    }

    return this.createSchool(schoolIdOrPayload, titleOrUserId, message);
  }

  static async createSchool(schoolId, title, message, createdBy = 1) {
    try {
      const [result] = await db.query(
        `INSERT INTO announcements (school_id, title, content, type, priority, is_active, published_at, created_by)
         VALUES (?, ?, ?, 'notice', 'medium', TRUE, NOW(), ?)`,
        [schoolId, title, message, createdBy]
      );
      return {
        id: result.insertId,
        school_id: schoolId,
        title,
        message,
        created_at: new Date(),
        type: 'notice',
        priority: 'medium'
      };
    } catch (error) {
      throw new Error(`Failed to create announcement: ${error.message}`);
    }
  }

  static async createGlobal(data, userId) {
    try {
      const { title, content, type = 'notice', priority = 'medium', targetRoles, targetSchools } = data;

      const [result] = await db.query(
        `INSERT INTO announcements (school_id, title, content, type, priority, target_roles, target_schools, is_active, published_at, created_by)
         VALUES (NULL, ?, ?, ?, ?, ?, ?, TRUE, NOW(), ?)`,
        [
          title,
          content,
          type,
          priority,
          targetRoles ? JSON.stringify(targetRoles) : null,
          targetSchools ? JSON.stringify(targetSchools) : null,
          userId
        ]
      );

      return this.getById(result.insertId);
    } catch (error) {
      throw new Error(`Failed to create announcement: ${error.message}`);
    }
  }

  // Get announcements for school
  static async findBySchoolId(schoolId) {
    try {
      const [rows] = await db.query(
        `SELECT id, school_id, title, content as message, type, priority, is_active, created_at 
         FROM announcements 
         WHERE school_id = ? AND is_active = TRUE
         ORDER BY created_at DESC`,
        [schoolId]
      );
      return rows;
    } catch (error) {
      throw new Error(`Failed to fetch announcements: ${error.message}`);
    }
  }

  // Delete announcement
  static async deleteById(id, schoolId) {
    try {
      await db.query(
        `DELETE FROM announcements WHERE id = ? AND school_id = ?`,
        [id, schoolId]
      );
      return true;
    } catch (error) {
      throw new Error(`Failed to delete announcement: ${error.message}`);
    }
  }

  // Get all announcements (for Super Admin)
  static async getAll(filters = {}) {
    try {
      let query = `SELECT a.*, u.first_name, u.last_name FROM announcements a
                   JOIN users u ON a.created_by = u.id WHERE 1=1`;
      const params = [];

      if (filters.type) {
        query += ' AND a.type = ?';
        params.push(filters.type);
      }

      if (filters.isActive !== undefined) {
        query += ' AND a.is_active = ?';
        params.push(filters.isActive);
      }

      if (filters.startDate) {
        query += ' AND a.published_at >= ?';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ' AND a.published_at <= ?';
        params.push(filters.endDate);
      }

      query += ' ORDER BY a.published_at DESC LIMIT 100';

      const [announcements] = await db.query(query, params);
      return announcements;
    } catch (error) {
      throw new Error(`Failed to get announcements: ${error.message}`);
    }
  }

  // Get single announcement
  static async getById(id) {
    try {
      const [announcement] = await db.query(
        `SELECT a.*, u.first_name, u.last_name FROM announcements a
         JOIN users u ON a.created_by = u.id WHERE a.id = ?`,
        [id]
      );

      if (announcement[0]) {
        announcement[0].target_roles = JSON.parse(announcement[0].target_roles || '[]');
        announcement[0].target_schools = JSON.parse(announcement[0].target_schools || '[]');
        announcement[0].message = announcement[0].content;
      }

      return announcement[0];
    } catch (error) {
      throw new Error(`Failed to get announcement: ${error.message}`);
    }
  }

  // Update announcement
  static async update(id, data, userId) {
    try {
      const { title, content, type, priority, targetRoles, targetSchools, isActive } = data;

      await db.query(
        `UPDATE announcements 
         SET title = ?, content = ?, type = ?, priority = ?,
             target_roles = ?, target_schools = ?, is_active = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          title,
          content,
          type,
          priority,
          targetRoles ? JSON.stringify(targetRoles) : null,
          targetSchools ? JSON.stringify(targetSchools) : null,
          isActive,
          id
        ]
      );

      return await this.getById(id);
    } catch (error) {
      throw new Error(`Failed to update announcement: ${error.message}`);
    }
  }

  // Deactivate announcement
  static async deactivate(id) {
    try {
      await db.query(
        'UPDATE announcements SET is_active = FALSE, updated_at = NOW() WHERE id = ?',
        [id]
      );
      return true;
    } catch (error) {
      throw new Error(`Failed to deactivate announcement: ${error.message}`);
    }
  }

  // Get stats
  static async getStats() {
    try {
      const [stats] = await db.query(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN type = 'circular' THEN 1 ELSE 0 END) as circulars,
          SUM(CASE WHEN type = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
          SUM(CASE WHEN priority = 'critical' THEN 1 ELSE 0 END) as critical
         FROM announcements`
      );

      return stats[0];
    } catch (error) {
      throw new Error(`Failed to get announcement stats: ${error.message}`);
    }
  }
}

export default Announcement;
