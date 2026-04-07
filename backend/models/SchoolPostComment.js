import db from '../config/database.js';

class SchoolPostComment {
  static async create(postId, data) {
    try {
      const { user_id, guest_name, guest_email, comment } = data;
      
      const [result] = await db.query(
        `INSERT INTO school_post_comments (post_id, user_id, guest_name, guest_email, comment, moderation_status)
         VALUES (?, ?, ?, ?, ?, 'approved')`,
        [postId, user_id || null, guest_name, guest_email, comment]
      );

      return { id: result.insertId, ...data };
    } catch (error) {
      throw new Error(`Failed to create comment: ${error.message}`);
    }
  }

  static async findByPostId(postId, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;
      
      const [rows] = await db.query(
        `SELECT 
           c.*,
           u.id as user_id,
           COALESCE(u.school_id, spost.school_id) as school_id,
           u.first_name,
           u.last_name,
           CONCAT(u.first_name, ' ', u.last_name) as user_name,
           COALESCE(sp_user.logo_url, sp_page.logo_url) as user_profile_image
         FROM school_post_comments c
         LEFT JOIN users u ON c.user_id = u.id
         LEFT JOIN school_posts spost ON c.post_id = spost.id
         LEFT JOIN school_pages sp_user ON u.school_id = sp_user.school_id
         LEFT JOIN school_pages sp_page ON spost.school_id = sp_page.school_id
         WHERE c.post_id = ? AND c.is_hidden = FALSE AND c.moderation_status = 'approved'
         ORDER BY c.is_pinned DESC, c.created_at DESC
         LIMIT ? OFFSET ?`,
        [postId, limit, offset]
      );
      return rows;
    } catch (error) {
      throw new Error(`Failed to get comments: ${error.message}`);
    }
  }

  static async findById(commentId) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM school_post_comments WHERE id = ?',
        [commentId]
      );
      return rows[0];
    } catch (error) {
      throw new Error(`Failed to get comment: ${error.message}`);
    }
  }

  static async update(commentId, text) {
    try {
      await db.query(
        'UPDATE school_post_comments SET comment = ?, updated_at = NOW() WHERE id = ?',
        [text, commentId]
      );
      return await this.findById(commentId);
    } catch (error) {
      throw new Error(`Failed to update comment: ${error.message}`);
    }
  }

  static async delete(commentId) {
    try {
      await db.query('DELETE FROM school_post_comments WHERE id = ?', [commentId]);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete comment: ${error.message}`);
    }
  }

  static async pin(commentId) {
    try {
      await db.query(
        'UPDATE school_post_comments SET is_pinned = TRUE WHERE id = ?',
        [commentId]
      );
      return true;
    } catch (error) {
      throw new Error(`Failed to pin comment: ${error.message}`);
    }
  }

  static async unpin(commentId) {
    try {
      await db.query(
        'UPDATE school_post_comments SET is_pinned = FALSE WHERE id = ?',
        [commentId]
      );
      return true;
    } catch (error) {
      throw new Error(`Failed to unpin comment: ${error.message}`);
    }
  }

  static async hide(commentId) {
    try {
      await db.query(
        'UPDATE school_post_comments SET is_hidden = TRUE WHERE id = ?',
        [commentId]
      );
      return true;
    } catch (error) {
      throw new Error(`Failed to hide comment: ${error.message}`);
    }
  }
}

export default SchoolPostComment;
