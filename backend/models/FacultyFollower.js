import db from '../config/database.js';

class FacultyFollower {
  static async create(facultyId, followerData) {
    try {
      const { follower_id, follower_email, follower_name, status = 'approved' } = followerData;

      const [result] = await db.query(
        `INSERT INTO faculty_followers (faculty_id, follower_id, follower_email, follower_name, status, followed_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [facultyId, follower_id || null, follower_email, follower_name, status]
      );

      return { id: result.insertId, ...followerData };
    } catch (error) {
      throw new Error(`Failed to create follower: ${error.message}`);
    }
  }

  static async findByFacultyAndUser(facultyId, userId) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM faculty_followers WHERE faculty_id = ? AND follower_id = ?',
        [facultyId, userId]
      );
      return rows[0];
    } catch (error) {
      throw new Error(`Failed to get follower: ${error.message}`);
    }
  }

  static async findFollowersByFaculty(facultyId, options = {}) {
    try {
      const { status = 'approved', limit = 50, offset = 0 } = options;

      let query = `
        SELECT ff.*, u.email, u.first_name, u.last_name
        FROM faculty_followers ff
        LEFT JOIN users u ON ff.follower_id = u.id
        WHERE ff.faculty_id = ?`;
      const params = [facultyId];

      if (status) {
        query += ' AND ff.status = ?';
        params.push(status);
      }

      query += ' ORDER BY ff.followed_at DESC LIMIT ? OFFSET ?';
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
        'UPDATE faculty_followers SET status = ? WHERE id = ?',
        [status, followerId]
      );
      return true;
    } catch (error) {
      throw new Error(`Failed to update follower status: ${error.message}`);
    }
  }

  static async delete(facultyId, userId) {
    try {
      await db.query(
        'DELETE FROM faculty_followers WHERE faculty_id = ? AND follower_id = ?',
        [facultyId, userId]
      );
      return true;
    } catch (error) {
      throw new Error(`Failed to delete follower: ${error.message}`);
    }
  }

  static async getFollowerCount(facultyId, status = 'approved') {
    try {
      const [result] = await db.query(
        'SELECT COUNT(*) as count FROM faculty_followers WHERE faculty_id = ? AND status = ?',
        [facultyId, status]
      );
      return result[0].count;
    } catch (error) {
      throw new Error(`Failed to get follower count: ${error.message}`);
    }
  }

  static async isFollowing(facultyId, userId) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM faculty_followers WHERE faculty_id = ? AND follower_id = ? AND status = ?',
        [facultyId, userId, 'approved']
      );
      return rows.length > 0;
    } catch (error) {
      throw new Error(`Failed to check follow status: ${error.message}`);
    }
  }
}

export default FacultyFollower;
