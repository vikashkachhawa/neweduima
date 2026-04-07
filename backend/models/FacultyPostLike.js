import db from '../config/database.js';

class FacultyPostLike {
  static async create(postId, userId) {
    try {
      const [result] = await db.query(
        `INSERT INTO faculty_post_likes (post_id, user_id) VALUES (?, ?)`,
        [postId, userId]
      );

      return { id: result.insertId, post_id: postId, user_id: userId };
    } catch (error) {
      throw new Error(`Failed to create like: ${error.message}`);
    }
  }

  static async findByPostAndUser(postId, userId) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM faculty_post_likes WHERE post_id = ? AND user_id = ?',
        [postId, userId]
      );
      return rows[0];
    } catch (error) {
      throw new Error(`Failed to get like: ${error.message}`);
    }
  }

  static async delete(postId, userId) {
    try {
      const [result] = await db.query(
        'DELETE FROM faculty_post_likes WHERE post_id = ? AND user_id = ?',
        [postId, userId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Like not found');
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to delete like: ${error.message}`);
    }
  }

  static async getLikesCount(postId) {
    try {
      const [result] = await db.query(
        'SELECT COUNT(*) as count FROM faculty_post_likes WHERE post_id = ?',
        [postId]
      );
      return result[0].count;
    } catch (error) {
      throw new Error(`Failed to get likes count: ${error.message}`);
    }
  }
}

export default FacultyPostLike;
