import pool from '../config/database.js';

class AuditLog {
  static async log(userId, action, entityType, entityId, changes, req, status = 'success', reason = null) {
    try {
      const ipAddress = req?.ip || req?.connection?.remoteAddress || 'unknown';
      const userAgent = req?.get?.('user-agent') || 'unknown';
      
      const changesJson = changes ? JSON.stringify(changes) : null;

      await pool.query(
        `INSERT INTO audit_logs 
         (user_id, action, entity_type, entity_id, changes, ip_address, user_agent, status, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, action, entityType, entityId, changesJson, ipAddress, userAgent, status, reason]
      );
    } catch (error) {
      console.error('Failed to log audit:', error.message);
      // Don't throw - audit logging shouldn't break the main operation
    }
  }

  static async getAuditLogs(filters = {}, limit = 100, offset = 0) {
    try {
      let query = `
        SELECT 
          al.id, al.user_id, al.action, al.entity_type, al.entity_id,
          al.changes, al.ip_address, al.status, al.reason, al.created_at,
          CONCAT(u.first_name, ' ', u.last_name) as user_name, u.email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.userId) {
        query += ' AND al.user_id = ?';
        params.push(filters.userId);
      }

      if (filters.action) {
        query += ' AND al.action = ?';
        params.push(filters.action);
      }

      if (filters.entityType) {
        query += ' AND al.entity_type = ?';
        params.push(filters.entityType);
      }

      if (filters.entityId) {
        query += ' AND al.entity_id = ?';
        params.push(filters.entityId);
      }

      if (filters.status) {
        query += ' AND al.status = ?';
        params.push(filters.status);
      }

      if (filters.startDate && filters.endDate) {
        query += ' AND al.created_at BETWEEN ? AND ?';
        params.push(filters.startDate);
        params.push(filters.endDate);
      }

      // Count total
      const countQuery = query.replace('SELECT al.id, al.user_id, al.action, al.entity_type, al.entity_id, al.changes, al.ip_address, al.status, al.reason, al.created_at, CONCAT(u.first_name, \' \', u.last_name) as user_name, u.email', 'SELECT COUNT(*) as total');
      const [countResult] = await pool.query(countQuery, params);
      const total = countResult[0].total;

      // Get data
      query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit);
      params.push(offset);

      const [logs] = await pool.query(query, params);
      return { logs, total };
    } catch (error) {
      throw new Error(`Failed to fetch audit logs: ${error.message}`);
    }
  }

  static async getActionStats(startDate, endDate) {
    try {
      const [stats] = await pool.query(
        `SELECT action, COUNT(*) as count
         FROM audit_logs
         WHERE created_at BETWEEN ? AND ?
         GROUP BY action
         ORDER BY count DESC`,
        [startDate, endDate]
      );
      return stats;
    } catch (error) {
      throw new Error(`Failed to fetch action stats: ${error.message}`);
    }
  }

  static async getUserActivityStats(startDate, endDate) {
    try {
      const [stats] = await pool.query(
        `SELECT 
          al.user_id,
          CONCAT(u.first_name, ' ', u.last_name) as user_name,
          COUNT(*) as action_count
         FROM audit_logs al
         LEFT JOIN users u ON al.user_id = u.id
         WHERE al.created_at BETWEEN ? AND ?
         GROUP BY al.user_id
         ORDER BY action_count DESC`,
        [startDate, endDate]
      );
      return stats;
    } catch (error) {
      throw new Error(`Failed to fetch user activity stats: ${error.message}`);
    }
  }

  static async deleteOldLogs(daysOld = 90) {
    try {
      const [result] = await pool.query(
        `DELETE FROM audit_logs 
         WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [daysOld]
      );
      return result.affectedRows;
    } catch (error) {
      throw new Error(`Failed to delete old logs: ${error.message}`);
    }
  }
}

export default AuditLog;
