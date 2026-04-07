import db from '../config/database.js';

class FacultyPostComment {
  static async create(postId, data) {
    try {
      const { user_id, guest_email, guest_name, content, status = 'approved' } = data;

      const [result] = await db.query(
        `INSERT INTO faculty_post_comments (post_id, user_id, guest_email, guest_name, content, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [postId, user_id || null, guest_email || null, guest_name || null, content, status]
      );

      return { id: result.insertId, ...data };
    } catch (error) {
      throw new Error(`Failed to create comment: ${error.message}`);
    }
  }

  static async findById(commentId) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM faculty_post_comments WHERE id = ?',
        [commentId]
      );
      return rows[0];
    } catch (error) {
      throw new Error(`Failed to get comment: ${error.message}`);
    }
  }

  static async findByPostId(postId, options = {}) {
    try {
      const { status = 'approved', limit = 20, offset = 0 } = options;

      let query = `
        SELECT fpc.*, u.first_name, u.last_name, u.email
        FROM faculty_post_comments fpc
        LEFT JOIN users u ON fpc.user_id = u.id
        WHERE fpc.post_id = ?`;
      const params = [postId];

      if (status) {
        query += ' AND fpc.status = ?';
        params.push(status);
      }

      query += ' ORDER BY fpc.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.query(query, params);
      return rows;
    } catch (error) {
      throw new Error(`Failed to get comments: ${error.message}`);
    }
  }

  static async update(commentId, data) {
    try {
      const { content } = data;

      await db.query(
        `UPDATE faculty_post_comments SET content = ?, updated_at = NOW() WHERE id = ?`,
        [content, commentId]
      );

      return await this.findById(commentId);
    } catch (error) {
      throw new Error(`Failed to update comment: ${error.message}`);
    }
  }

  static async updateStatus(commentId, status) {
    try {
      await db.query(
        'UPDATE faculty_post_comments SET status = ? WHERE id = ?',
        [status, commentId]
      );
      return true;
    } catch (error) {
      throw new Error(`Failed to update comment status: ${error.message}`);
    }
  }

  static async delete(commentId) {
    try {
      const [result] = await db.query(
        'DELETE FROM faculty_post_comments WHERE id = ?',
        [commentId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Comment not found');
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to delete comment: ${error.message}`);
    }
  }

  static async getCommentsCount(postId) {
    try {
      const [result] = await db.query(
        'SELECT COUNT(*) as count FROM faculty_post_comments WHERE post_id = ? AND status = ?',
        [postId, 'approved']
      );
      return result[0].count;
    } catch (error) {
      throw new Error(`Failed to get comments count: ${error.message}`);
    }
  }
}

export default FacultyPostComment;
