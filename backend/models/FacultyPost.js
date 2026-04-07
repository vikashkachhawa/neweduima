import db from '../config/database.js';

class FacultyPost {
  static async create(facultyId, schoolId, data) {
    try {
      const { title, content, post_type, status, allow_comments, scheduled_at, media_url } = data;

      const [result] = await db.query(
        `INSERT INTO faculty_posts (faculty_id, school_id, title, content, post_type, status, allow_comments, scheduled_at, media_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [facultyId, schoolId, title || null, content, post_type || 'text', status || 'draft', allow_comments !== false, scheduled_at || null, media_url || null]
      );

      return { id: result.insertId, ...data };
    } catch (error) {
      throw new Error(`Failed to create post: ${error.message}`);
    }
  }

  static async findById(postId) {
    try {
      const [rows] = await db.query(
        `SELECT * FROM faculty_posts WHERE id = ?`,
        [postId]
      );
      return rows[0];
    } catch (error) {
      throw new Error(`Failed to get post: ${error.message}`);
    }
  }

  static async findByFacultyId(facultyId, options = {}) {
    try {
      const { status = 'published', limit = 20, offset = 0 } = options;

      let query = `
        SELECT fp.*, 
               u.id as author_id, u.first_name, u.last_name, 
               CONCAT(u.first_name, ' ', u.last_name) as author_name,
               fprof.profile_image_url as author_profile_image_url
        FROM faculty_posts fp
        LEFT JOIN users u ON fp.faculty_id = u.id
        LEFT JOIN faculty_profiles fprof ON fp.faculty_id = fprof.faculty_id
        WHERE fp.faculty_id = ?`;
      const params = [facultyId];

      if (status) {
        query += ' AND fp.status = ?';
        params.push(status);
      }

      query += ' ORDER BY fp.published_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.query(query, params);
      return rows;
    } catch (error) {
      throw new Error(`Failed to get posts: ${error.message}`);
    }
  }

  static async findBySchoolId(schoolId, options = {}) {
    try {
      const { status = 'published', limit = 20, offset = 0 } = options;

      let query = `
        SELECT fp.*, 
               u.id as author_id, u.first_name, u.last_name, 
               CONCAT(u.first_name, ' ', u.last_name) as author_name,
               fprof.profile_image_url as author_profile_image_url
        FROM faculty_posts fp
        LEFT JOIN users u ON fp.faculty_id = u.id
        LEFT JOIN faculty_profiles fprof ON fp.faculty_id = fprof.faculty_id
        WHERE fp.school_id = ?`;
      const params = [schoolId];

      if (status) {
        query += ' AND fp.status = ?';
        params.push(status);
      }

      query += ' ORDER BY fp.published_at DESC LIMIT ? OFFSET ?';
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
        `UPDATE faculty_posts SET title = ?, content = ?, allow_comments = ?, updated_at = NOW() WHERE id = ?`,
        [title, content, allow_comments, postId]
      );

      return await this.findById(postId);
    } catch (error) {
      throw new Error(`Failed to update post: ${error.message}`);
    }
  }

  static async publish(postId) {
    try {
      const [result] = await db.query(
        `UPDATE faculty_posts SET status = 'published', published_at = NOW(), updated_at = NOW() WHERE id = ? AND status IN ('draft', 'scheduled')`,
        [postId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Post not found or already published');
      }

      return await this.findById(postId);
    } catch (error) {
      throw new Error(`Failed to publish post: ${error.message}`);
    }
  }

  static async delete(postId) {
    try {
      const [result] = await db.query(
        `DELETE FROM faculty_posts WHERE id = ?`,
        [postId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Post not found');
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to delete post: ${error.message}`);
    }
  }

  static async incrementLikes(postId) {
    try {
      await db.query(
        'UPDATE faculty_posts SET likes_count = likes_count + 1 WHERE id = ?',
        [postId]
      );
    } catch (error) {
      throw new Error(`Failed to increment likes: ${error.message}`);
    }
  }

  static async decrementLikes(postId) {
    try {
      await db.query(
        'UPDATE faculty_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?',
        [postId]
      );
    } catch (error) {
      throw new Error(`Failed to decrement likes: ${error.message}`);
    }
  }

  static async incrementComments(postId) {
    try {
      await db.query(
        'UPDATE faculty_posts SET comments_count = comments_count + 1 WHERE id = ?',
        [postId]
      );
    } catch (error) {
      throw new Error(`Failed to increment comments: ${error.message}`);
    }
  }

  static async decrementComments(postId) {
    try {
      await db.query(
        'UPDATE faculty_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = ?',
        [postId]
      );
    } catch (error) {
      throw new Error(`Failed to decrement comments: ${error.message}`);
    }
  }
}

export default FacultyPost;
