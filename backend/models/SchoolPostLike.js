import db from '../config/database.js';

class SchoolPost {
  static async create(schoolId, data) {
    try {
      const { title, content, post_type, status, allow_comments, created_by, scheduled_at } = data;
      
      const [result] = await db.query(
        `INSERT INTO school_posts (school_id, title, content, post_type, status, allow_comments, created_by, scheduled_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [schoolId, title, content, post_type || 'text', status || 'draft', allow_comments !== false, created_by, scheduled_at || null]
      );

      return { id: result.insertId, ...data };
    } catch (error) {
      throw new Error(`Failed to create post: ${error.message}`);
    }
  }

  static async findById(postId) {
    try {
      const [rows] = await db.query(
        `SELECT * FROM school_posts WHERE id = ?`,
        [postId]
      );
      return rows[0];
    } catch (error) {
      throw new Error(`Failed to get post: ${error.message}`);
    }
  }

  static async findBySchoolId(schoolId, options = {}) {
    try {
      const { status = 'published', limit = 20, offset = 0 } = options;
      
      let query = 'SELECT * FROM school_posts WHERE school_id = ?';
      const params = [schoolId];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY published_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.query(query, params);
      return rows;
    } catch (error) {
      throw new Error(`Failed to get posts: ${error.message}`);
    }
  }

  static async update(postId, data) {
    try {
      const { title, content, allow_comments } = data;
      
      await db.query(
        `UPDATE school_posts SET title = ?, content = ?, allow_comments = ?, updated_at = NOW()
         WHERE id = ?`,
        [title, content, allow_comments, postId]
      );

      return await this.findById(postId);
    } catch (error) {
      throw new Error(`Failed to update post: ${error.message}`);
    }
  }

  static async publish(postId) {
    try {
      await db.query(
        `UPDATE school_posts SET status = 'published', published_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [postId]
      );

      return await this.findById(postId);
    } catch (error) {
      throw new Error(`Failed to publish post: ${error.message}`);
    }
  }

  static async delete(postId) {
    try {
      await db.query('DELETE FROM school_posts WHERE id = ?', [postId]);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete post: ${error.message}`);
    }
  }

  static async incrementLikes(postId) {
    try {
      await db.query(
        'UPDATE school_posts SET likes_count = likes_count + 1 WHERE id = ?',
        [postId]
      );
    } catch (error) {
      throw new Error(`Failed to increment likes: ${error.message}`);
    }
  }

  static async decrementLikes(postId) {
    try {
      await db.query(
        'UPDATE school_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?',
        [postId]
      );
    } catch (error) {
      throw new Error(`Failed to decrement likes: ${error.message}`);
    }
  }

  static async incrementComments(postId) {
    try {
      await db.query(
        'UPDATE school_posts SET comments_count = comments_count + 1 WHERE id = ?',
        [postId]
      );
    } catch (error) {
      throw new Error(`Failed to increment comments: ${error.message}`);
    }
  }

  static async decrementComments(postId) {
    try {
      await db.query(
        'UPDATE school_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = ?',
        [postId]
      );
    } catch (error) {
      throw new Error(`Failed to decrement comments: ${error.message}`);
    }
  }

  static async incrementViews(postId) {
    try {
      await db.query(
        'UPDATE school_posts SET views_count = views_count + 1 WHERE id = ?',
        [postId]
      );
    } catch (error) {
      throw new Error(`Failed to increment views: ${error.message}`);
    }
  }
}

export default SchoolPost;
