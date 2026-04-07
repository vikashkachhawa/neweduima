import db from '../config/database.js';

class SchoolFollower {
  static async create(schoolId, followerData) {
    try {
      const { follower_id, follower_email, follower_name, status = 'approved', is_staff = false } = followerData;
      
      const [result] = await db.query(
        `INSERT INTO school_followers (school_id, follower_id, follower_email, follower_name, status, is_staff, followed_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [schoolId, follower_id || null, follower_email, follower_name, status, is_staff]
      );

      return { id: result.insertId, ...followerData };
    } catch (error) {
      throw new Error(`Failed to create follower: ${error.message}`);
    }
  }

  static async findBySchoolAndUser(schoolId, userId) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM school_followers WHERE school_id = ? AND follower_id = ?',
        [schoolId, userId]
      );
      return rows[0];
    } catch (error) {
      throw new Error(`Failed to get follower: ${error.message}`);
    }
  }

  static async findFollowersBySchool(schoolId, options = {}) {
    try {
      const { status = 'approved', limit = 50, offset = 0 } = options;
      
      let query = 'SELECT * FROM school_followers WHERE school_id = ?';
      const params = [schoolId];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY followed_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.query(query, params);
      return rows;
    } catch (error) {
      throw new Error(`Failed to get followers: ${error.message}`);
    }
  }

  static async updateStatus(followerId, status) {
    try {
      await db.query(
        'UPDATE school_followers SET status = ? WHERE id = ?',
        [status, followerId]
      );
      return true;
    } catch (error) {
      throw new Error(`Failed to update follower status: ${error.message}`);
    }
  }

  static async delete(schoolId, userId) {
    try {
      await db.query(
        'DELETE FROM school_followers WHERE school_id = ? AND follower_id = ?',
        [schoolId, userId]
      );
      return true;
    } catch (error) {
      throw new Error(`Failed to delete follower: ${error.message}`);
    }
  }

  static async getFollowerCount(schoolId, status = 'approved') {
    try {
      const [result] = await db.query(
        'SELECT COUNT(*) as count FROM school_followers WHERE school_id = ? AND status = ?',
        [schoolId, status]
      );
      return result[0].count;
    } catch (error) {
      throw new Error(`Failed to get follower count: ${error.message}`);
    }
  }
}

export default SchoolFollower;
