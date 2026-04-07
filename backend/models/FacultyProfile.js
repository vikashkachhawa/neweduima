import db from '../config/database.js';

class FacultyProfile {
  static async findByFacultyId(facultyId) {
    try {
      const [rows] = await db.query(
        `SELECT * FROM faculty_profiles WHERE faculty_id = ?`,
        [facultyId]
      );
      return rows[0];
    } catch (error) {
      throw new Error(`Failed to get faculty profile: ${error.message}`);
    }
  }

  static async create(facultyId, schoolId, data = {}) {
    try {
      const [result] = await db.query(
        `INSERT INTO faculty_profiles (faculty_id, school_id, banner_url, profile_image_url, bio, specialization, education, experience, is_public, allow_comments, require_follow_approval)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          facultyId,
          schoolId,
          data.banner_url || null,
          data.profile_image_url || null,
          data.bio || null,
          data.specialization || null,
          data.education || null,
          data.experience || null,
          data.is_public !== false,
          data.allow_comments !== false,
          data.require_follow_approval === true
        ]
      );

      return await this.findByFacultyId(facultyId);
    } catch (error) {
      throw new Error(`Failed to create faculty profile: ${error.message}`);
    }
  }

  static async updateProfile(facultyId, data) {
    try {
      const allowedKeys = [
        'banner_url',
        'profile_image_url',
        'bio',
        'specialization',
        'education',
        'experience',
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
        return await this.findByFacultyId(facultyId);
      }

      setClauses.push('updated_at = NOW()');
      const sql = `UPDATE faculty_profiles SET ${setClauses.join(', ')} WHERE faculty_id = ?`;
      params.push(facultyId);

      await db.query(sql, params);
      return await this.findByFacultyId(facultyId);
    } catch (error) {
      throw new Error(`Failed to update faculty profile: ${error.message}`);
    }
  }

  static async getPublicProfile(facultyId) {
    try {
      const [rows] = await db.query(
        `SELECT fp.id, fp.faculty_id, fp.school_id, fp.banner_url, fp.profile_image_url, 
                fp.bio, fp.specialization, fp.education, fp.experience, fp.followers_count, 
                fp.following_count, fp.posts_count, fp.is_public, fp.allow_comments,
                u.first_name, u.last_name, u.email
         FROM faculty_profiles fp
         LEFT JOIN users u ON fp.faculty_id = u.id
         WHERE fp.faculty_id = ? AND fp.is_public = TRUE`,
        [facultyId]
      );
      return rows[0];
    } catch (error) {
      throw new Error(`Failed to get public profile: ${error.message}`);
    }
  }

  static async incrementFollowerCount(facultyId) {
    try {
      await db.query(
        'UPDATE faculty_profiles SET followers_count = followers_count + 1 WHERE faculty_id = ?',
        [facultyId]
      );
    } catch (error) {
      throw new Error(`Failed to increment follower count: ${error.message}`);
    }
  }

  static async decrementFollowerCount(facultyId) {
    try {
      await db.query(
        'UPDATE faculty_profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE faculty_id = ?',
        [facultyId]
      );
    } catch (error) {
      throw new Error(`Failed to decrement follower count: ${error.message}`);
    }
  }

  static async incrementPostCount(facultyId) {
    try {
      await db.query(
        'UPDATE faculty_profiles SET posts_count = posts_count + 1 WHERE faculty_id = ?',
        [facultyId]
      );
    } catch (error) {
      throw new Error(`Failed to increment post count: ${error.message}`);
    }
  }

  static async decrementPostCount(facultyId) {
    try {
      await db.query(
        'UPDATE faculty_profiles SET posts_count = GREATEST(0, posts_count - 1) WHERE faculty_id = ?',
        [facultyId]
      );
    } catch (error) {
      throw new Error(`Failed to decrement post count: ${error.message}`);
    }
  }

  static async incrementFollowingCount(facultyId) {
    try {
      await db.query(
        'UPDATE faculty_profiles SET following_count = following_count + 1 WHERE faculty_id = ?',
        [facultyId]
      );
    } catch (error) {
      throw new Error(`Failed to increment following count: ${error.message}`);
    }
  }

  static async decrementFollowingCount(facultyId) {
    try {
      await db.query(
        'UPDATE faculty_profiles SET following_count = GREATEST(0, following_count - 1) WHERE faculty_id = ?',
        [facultyId]
      );
    } catch (error) {
      throw new Error(`Failed to decrement following count: ${error.message}`);
    }
  }

  static async findBySchoolId(schoolId, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;
      const [rows] = await db.query(
        `SELECT fp.*, u.first_name, u.last_name, u.email
         FROM faculty_profiles fp
         LEFT JOIN users u ON fp.faculty_id = u.id
         WHERE fp.school_id = ? AND fp.is_public = TRUE
         ORDER BY fp.created_at DESC
         LIMIT ? OFFSET ?`,
        [schoolId, limit, offset]
      );
      return rows;
    } catch (error) {
      throw new Error(`Failed to get faculty profiles: ${error.message}`);
    }
  }
}

export default FacultyProfile;
