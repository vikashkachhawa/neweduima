import db from '../config/database.js';

class Notification {
  static async create(data) {
    const {
      recipientUserId,
      actorUserId = null,
      type,
      title,
      message,
      entityType = null,
      entityId = null,
      metadata = null
    } = data;

    const [result] = await db.query(
      `INSERT INTO user_notifications
        (recipient_user_id, actor_user_id, type, title, message, entity_type, entity_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recipientUserId,
        actorUserId,
        type,
        title,
        message,
        entityType,
        entityId,
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    return result.insertId;
  }

  static async listForUser(userId, options = {}) {
    const limit = Math.min(Number(options.limit || 20), 100);
    const offset = Math.max(Number(options.offset || 0), 0);

    const [rows] = await db.query(
      `SELECT
         n.*,
         u.first_name AS actor_first_name,
         u.last_name AS actor_last_name,
         u.role AS actor_role
       FROM user_notifications n
       LEFT JOIN users u ON u.id = n.actor_user_id
       WHERE n.recipient_user_id = ?
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return rows.map((row) => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      actor_name: [row.actor_first_name, row.actor_last_name].filter(Boolean).join(' ').trim() || null
    }));
  }

  static async countUnread(userId) {
    const [[row]] = await db.query(
      `SELECT COUNT(*) AS count
       FROM user_notifications
       WHERE recipient_user_id = ? AND is_read = FALSE`,
      [userId]
    );

    return row?.count || 0;
  }

  static async markRead(notificationId, userId) {
    const [result] = await db.query(
      `UPDATE user_notifications
       SET is_read = TRUE, read_at = NOW()
       WHERE id = ? AND recipient_user_id = ?`,
      [notificationId, userId]
    );

    return result.affectedRows > 0;
  }

  static async markAllRead(userId) {
    await db.query(
      `UPDATE user_notifications
       SET is_read = TRUE, read_at = NOW()
       WHERE recipient_user_id = ? AND is_read = FALSE`,
      [userId]
    );
  }

  static async existsRecentDuplicate({ recipientUserId, actorUserId = null, type, entityType = null, entityId = null, hours = 12 }) {
    const [[row]] = await db.query(
      `SELECT 1
       FROM user_notifications
       WHERE recipient_user_id = ?
         AND actor_user_id <=> ?
         AND type = ?
         AND entity_type <=> ?
         AND entity_id <=> ?
         AND created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
       LIMIT 1`,
      [recipientUserId, actorUserId, type, entityType, entityId, hours]
    );

    return Boolean(row);
  }
}

export default Notification;