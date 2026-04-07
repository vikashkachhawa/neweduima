import db from '../config/database.js';

class FacultyFollowRequest {
  static async create(facultyId, requestData) {
    try {
      const { requester_id, requester_email, requester_name, message } = requestData;

      const [result] = await db.query(
        `INSERT INTO faculty_follow_requests (faculty_id, requester_id, requester_email, requester_name, message, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [facultyId, requester_id, requester_email, requester_name, message || null, 'pending']
      );

      return { id: result.insertId, ...requestData };
    } catch (error) {
      throw new Error(`Failed to create follow request: ${error.message}`);
    }
  }

  static async findById(requestId) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM faculty_follow_requests WHERE id = ?',
        [requestId]
      );
      return rows[0];
    } catch (error) {
      throw new Error(`Failed to get request: ${error.message}`);
    }
  }

  static async findByFacultyAndRequester(facultyId, requesterId) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM faculty_follow_requests WHERE faculty_id = ? AND requester_id = ?',
        [facultyId, requesterId]
      );
      return rows[0];
    } catch (error) {
      throw new Error(`Failed to get request: ${error.message}`);
    }
  }

  static async findByFaculty(facultyId, options = {}) {
    try {
      const { status = 'pending', limit = 50, offset = 0 } = options;

      let query = `
        SELECT ffr.*, u.first_name, u.last_name, u.email
        FROM faculty_follow_requests ffr
        LEFT JOIN users u ON ffr.requester_id = u.id
        WHERE ffr.faculty_id = ?`;
      const params = [facultyId];

      if (status) {
        query += ' AND ffr.status = ?';
        params.push(status);
      }

      query += ' ORDER BY ffr.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.query(query, params);
      return rows;
    } catch (error) {
      throw new Error(`Failed to get requests: ${error.message}`);
    }
  }

  static async findByRequester(requesterId, options = {}) {
    try {
      const { status = 'pending', limit = 50, offset = 0 } = options;

      let query = `
        SELECT ffr.*, u.first_name, u.last_name, u.email
        FROM faculty_follow_requests ffr
        LEFT JOIN users u ON ffr.faculty_id = u.id
        WHERE ffr.requester_id = ?`;
      const params = [requesterId];

      if (status) {
        query += ' AND ffr.status = ?';
        params.push(status);
      }

      query += ' ORDER BY ffr.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.query(query, params);
      return rows;
    } catch (error) {
      throw new Error(`Failed to get requests: ${error.message}`);
    }
  }

  static async updateStatus(requestId, status) {
    try {
      const [result] = await db.query(
        'UPDATE faculty_follow_requests SET status = ?, updated_at = NOW() WHERE id = ?',
        [status, requestId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Request not found');
      }

      return await this.findById(requestId);
    } catch (error) {
      throw new Error(`Failed to update request status: ${error.message}`);
    }
  }

  static async delete(requestId) {
    try {
      const [result] = await db.query(
        'DELETE FROM faculty_follow_requests WHERE id = ?',
        [requestId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Request not found');
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to delete request: ${error.message}`);
    }
  }

  static async deleteByFacultyAndRequester(facultyId, requesterId) {
    try {
      await db.query(
        'DELETE FROM faculty_follow_requests WHERE faculty_id = ? AND requester_id = ?',
        [facultyId, requesterId]
      );
      return true;
    } catch (error) {
      throw new Error(`Failed to delete request: ${error.message}`);
    }
  }

  static async getPendingRequestCount(facultyId) {
    try {
      const [result] = await db.query(
        'SELECT COUNT(*) as count FROM faculty_follow_requests WHERE faculty_id = ? AND status = ?',
        [facultyId, 'pending']
      );
      return result[0].count;
    } catch (error) {
      throw new Error(`Failed to get pending request count: ${error.message}`);
    }
  }
}

export default FacultyFollowRequest;
