import db from '../config/database.js';

/**
 * Broadcast Controller
 * Handles creation, sending, and tracking of broadcast messages
 */

/**
 * Helper: Get recipient list based on broadcast type
 */
const getRecipients = async (broadcastType, scope_value, schoolId, senderId) => {
  let recipientIds = [];

  switch (broadcastType) {
    case 'school_wide': {
      // All users in school except sender
      const [users] = await db.query(
        'SELECT id FROM users WHERE school_id = ? AND id != ? AND deleted_at IS NULL AND role != ?',
        [schoolId, senderId, 'super_admin']
      );
      recipientIds = users.map(u => u.id);
      break;
    }

    case 'class': {
      // All students in class
      const classId = parseInt(scope_value);
      const [students] = await db.query(
        `SELECT DISTINCT u.id FROM users u
         INNER JOIN student_enrollments se ON se.student_id = u.id
         WHERE se.class_id = ? AND u.school_id = ? AND u.deleted_at IS NULL`,
        [classId, schoolId]
      );
      recipientIds = students.map(s => s.id);
      break;
    }

    case 'group': {
      // All members of group
      const groupId = parseInt(scope_value);
      const [members] = await db.query(
        `SELECT u.id FROM users u
         INNER JOIN group_members gm ON gm.user_id = u.id
         WHERE gm.group_id = ? AND gm.removed_at IS NULL AND u.deleted_at IS NULL`,
        [groupId]
      );
      recipientIds = members.map(m => m.id);
      break;
    }

    case 'custom': {
      // Custom user IDs passed as JSON array
      try {
        const ids = JSON.parse(scope_value);
        if (Array.isArray(ids)) {
          recipientIds = ids.map(Number);
        }
      } catch (e) {
        console.error('Invalid custom scope:', e);
      }
      break;
    }
  }

  return recipientIds;
};

/**
 * Check if user can send broadcasts
 */
const canSendBroadcast = (user) => {
  return ['super_admin', 'school_admin', 'faculty'].includes(user.role);
};

/**
 * Check broadcast scope permission
 */
const checkBroadcastPermission = (user, broadcastType) => {
  if (user.role === 'super_admin') return true; // Super admin can send any type
  if (user.role === 'school_admin') return true; // School admin can send any type
  if (user.role === 'faculty') {
    // Faculty can only send to classes and groups
    return ['class', 'group'].includes(broadcastType);
  }
  return false;
};

/**
 * Create broadcast (draft)
 * POST /api/broadcast/create
 */
export const createBroadcast = async (req, res) => {
  try {
    const { title, message, broadcast_type, reply_enabled = false, scope_value } = req.body;
    const senderId = req.user.id;
    const schoolId = req.user.school_id;

    // Permission check
    if (!canSendBroadcast(req.user)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to send broadcasts' });
    }

    if (!checkBroadcastPermission(req.user, broadcast_type)) {
      return res.status(403).json({ success: false, message: `You cannot send ${broadcast_type} broadcasts` });
    }

    // Validation
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    if (title.trim().length > 200) {
      return res.status(400).json({ success: false, message: 'Title exceeds 200 characters' });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    if (message.trim().length > 5000) {
      return res.status(400).json({ success: false, message: 'Message exceeds 5000 characters' });
    }

    if (!['school_wide', 'class', 'group', 'custom'].includes(broadcast_type)) {
      return res.status(400).json({ success: false, message: 'Invalid broadcast type' });
    }

    // Create broadcast in draft status
    const [result] = await db.query(
      `INSERT INTO broadcasts (sender_id, school_id, broadcast_type, title, message, reply_enabled, status)
       VALUES (?, ?, ?, ?, ?, ?, 'draft')`,
      [senderId, broadcast_type === 'school_wide' ? schoolId : null, broadcast_type, title.trim(), message.trim(), reply_enabled ? 1 : 0]
    );

    const broadcastId = result.insertId;

    // Store scope if provided
    if (scope_value && ['class', 'group', 'custom'].includes(broadcast_type)) {
      await db.query(
        'INSERT INTO broadcast_scope (broadcast_id, scope_type, scope_value) VALUES (?, ?, ?)',
        [broadcastId, `${broadcast_type}_id`, scope_value]
      );
    }

    res.status(201).json({
      success: true,
      broadcast: {
        id: broadcastId,
        title: title.trim(),
        status: 'draft',
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating broadcast:', error);
    res.status(500).json({ success: false, message: 'Failed to create broadcast' });
  }
};

/**
 * Send broadcast (draft -> sent)
 * POST /api/broadcast/:broadcastId/send
 */
export const sendBroadcast = async (req, res) => {
  try {
    const { broadcastId } = req.params;
    const userId = req.user.id;
    const schoolId = req.user.school_id;

    // Get broadcast
    const [[broadcast]] = await db.query(
      `SELECT id, sender_id, school_id, broadcast_type, title, message, status
       FROM broadcasts WHERE id = ? AND sender_id = ?`,
      [broadcastId, userId]
    );

    if (!broadcast) {
      return res.status(404).json({ success: false, message: 'Broadcast not found' });
    }

    if (broadcast.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft broadcasts can be sent' });
    }

    // Get scope if exists
    const [[scope]] = await db.query(
      'SELECT scope_value FROM broadcast_scope WHERE broadcast_id = ? LIMIT 1',
      [broadcastId]
    );

    // Get recipient list
    const recipientIds = await getRecipients(
      broadcast.broadcast_type,
      scope?.scope_value,
      broadcast.school_id || schoolId,
      userId
    );

    if (recipientIds.length === 0) {
      // Update status to sent even with 0 recipients
      await db.query(
        'UPDATE broadcasts SET status = ?, sent_at = NOW() WHERE id = ?',
        ['sent', broadcastId]
      );

      return res.json({
        success: true,
        recipients_count: 0,
        message: 'Broadcast sent to 0 recipients'
      });
    }

    // Insert broadcast recipients
    const placeholders = recipientIds.map(() => '(?, ?, ?)').join(',');
    const values = recipientIds.flatMap(rId => [broadcastId, rId, 'pending']);

    await db.query(
      `INSERT INTO broadcast_recipients (broadcast_id, recipient_user_id, status)
       VALUES ${placeholders}`,
      values
    );

    // Update broadcast status
    await db.query(
      'UPDATE broadcasts SET status = ?, sent_at = NOW() WHERE id = ?',
      ['sent', broadcastId]
    );

    // Send notifications to all recipients
    const notificationPlaceholders = recipientIds.map(() => '(?, ?, ?, ?, ?, ?)').join(',');
    const notificationValues = recipientIds.flatMap(rId => [
      rId,
      'broadcast_received',
      'New Broadcast',
      `New broadcast from ${broadcast.sender_id}: ${broadcast.title}`,
      'broadcast',
      broadcastId
    ]);

    if (recipientIds.length > 0) {
      await db.query(
        `INSERT INTO user_notifications (recipient_user_id, type, title, message, entity_type, entity_id)
         VALUES ${notificationPlaceholders}`,
        notificationValues
      );
    }

    res.json({
      success: true,
      recipients_count: recipientIds.length,
      message: `Broadcast sent to ${recipientIds.length} recipient${recipientIds.length !== 1 ? 's' : ''}`
    });
  } catch (error) {
    console.error('Error sending broadcast:', error);
    res.status(500).json({ success: false, message: 'Failed to send broadcast' });
  }
};

/**
 * Get broadcasts sent by current user
 * GET /api/broadcast/my-broadcasts?status=sent&limit=20
 */
export const getMyBroadcasts = async (req, res) => {
  try {
    const userId = req.user.id;
    const status = req.query.status || 'sent';
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    let query = `
      SELECT 
        b.id, b.title, b.status, b.created_at, b.sent_at,
        COUNT(br.id) as recipients_count,
        SUM(CASE WHEN br.status = 'read' THEN 1 ELSE 0 END) as read_count
      FROM broadcasts b
      LEFT JOIN broadcast_recipients br ON br.broadcast_id = b.id
      WHERE b.sender_id = ?
    `;

    const params = [userId];

    if (status && status !== 'all') {
      query += ' AND b.status = ?';
      params.push(status);
    }

    query += ` GROUP BY b.id ORDER BY b.created_at DESC LIMIT ?`;
    params.push(limit);

    const [broadcasts] = await db.query(query, params);

    res.json({
      success: true,
      broadcasts: broadcasts.map(b => ({
        id: b.id,
        title: b.title,
        status: b.status,
        recipients_count: b.recipients_count || 0,
        read_count: b.read_count || 0,
        read_percentage: b.recipients_count > 0 ? Math.round(((b.read_count || 0) / b.recipients_count) * 100) : 0,
        created_at: b.created_at,
        sent_at: b.sent_at
      }))
    });
  } catch (error) {
    console.error('Error fetching user broadcasts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch broadcasts' });
  }
};

/**
 * Get broadcast statistics
 * GET /api/broadcast/:broadcastId/stats
 */
export const getBroadcastStats = async (req, res) => {
  try {
    const { broadcastId } = req.params;
    const userId = req.user.id;

    // Get broadcast (sender only)
    const [[broadcast]] = await db.query(
      `SELECT id, title, status, created_at, sent_at
       FROM broadcasts WHERE id = ? AND sender_id = ?`,
      [broadcastId, userId]
    );

    if (!broadcast) {
      return res.status(404).json({ success: false, message: 'Broadcast not found' });
    }

    // Get stats
    const [[stats]] = await db.query(
      `SELECT 
        COUNT(br.id) as total_recipients,
        SUM(CASE WHEN br.status IN ('delivered', 'read') THEN 1 ELSE 0 END) as delivered_count,
        SUM(CASE WHEN br.status = 'read' THEN 1 ELSE 0 END) as read_count
       FROM broadcast_recipients br
       WHERE br.broadcast_id = ?`,
      [broadcastId]
    );

    const total = stats.total_recipients || 0;
    const delivered = stats.delivered_count || 0;
    const read = stats.read_count || 0;

    // Get readers details
    const [readers] = await db.query(
      `SELECT 
        u.id as user_id,
        u.first_name,
        u.last_name,
        br.read_at
       FROM broadcast_recipients br
       INNER JOIN users u ON u.id = br.recipient_user_id
       WHERE br.broadcast_id = ? AND br.status = 'read'
       ORDER BY br.read_at DESC
       LIMIT 100`,
      [broadcastId]
    );

    res.json({
      success: true,
      stats: {
        id: broadcast.id,
        title: broadcast.title,
        status: broadcast.status,
        total_recipients: total,
        delivered_count: delivered,
        read_count: read,
        delivered_percentage: total > 0 ? Math.round((delivered / total) * 100) : 0,
        read_percentage: total > 0 ? Math.round((read / total) * 100) : 0,
        sent_at: broadcast.sent_at,
        readers: readers.map(r => ({
          user_id: r.user_id,
          first_name: r.first_name,
          last_name: r.last_name,
          read_at: r.read_at
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching broadcast stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
};

/**
 * Delete broadcast (draft only)
 * DELETE /api/broadcast/:broadcastId
 */
export const deleteBroadcast = async (req, res) => {
  try {
    const { broadcastId } = req.params;
    const userId = req.user.id;

    // Get broadcast
    const [[broadcast]] = await db.query(
      'SELECT id, status FROM broadcasts WHERE id = ? AND sender_id = ?',
      [broadcastId, userId]
    );

    if (!broadcast) {
      return res.status(404).json({ success: false, message: 'Broadcast not found' });
    }

    if (broadcast.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft broadcasts can be deleted' });
    }

    // Delete broadcast and related records
    await db.query('DELETE FROM broadcast_scope WHERE broadcast_id = ?', [broadcastId]);
    await db.query('DELETE FROM broadcast_recipients WHERE broadcast_id = ?', [broadcastId]);
    await db.query('DELETE FROM broadcast_attachments WHERE broadcast_id = ?', [broadcastId]);
    await db.query('DELETE FROM broadcasts WHERE id = ?', [broadcastId]);

    res.json({ success: true, message: 'Broadcast deleted' });
  } catch (error) {
    console.error('Error deleting broadcast:', error);
    res.status(500).json({ success: false, message: 'Failed to delete broadcast' });
  }
};

/**
 * Get broadcast inbox for recipient
 * GET /api/broadcast/inbox?sort=latest&limit=20&read_status=unread
 */
export const getInbox = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const read_status = req.query.read_status; // 'read', 'unread', or undefined for all

    let query = `
      SELECT 
        b.id, b.title, b.message, b.broadcast_type, b.reply_enabled,
        u.first_name, u.last_name, u.role,
        s.name as school_name,
        br.status, br.delivered_at, br.read_at,
        b.created_at, b.sent_at
      FROM broadcasts b
      INNER JOIN users u ON u.id = b.sender_id
      LEFT JOIN schools s ON s.id = b.school_id
      INNER JOIN broadcast_recipients br ON br.broadcast_id = b.id
      WHERE br.recipient_user_id = ? AND b.status = 'sent'
    `;

    const params = [userId];

    if (read_status === 'read') {
      query += ' AND br.status = ?';
      params.push('read');
    } else if (read_status === 'unread') {
      query += ' AND br.status != ?';
      params.push('read');
    }

    query += ` ORDER BY COALESCE(b.sent_at, b.created_at) DESC LIMIT ?`;
    params.push(limit);

    const [broadcasts] = await db.query(query, params);

    res.json({
      success: true,
      broadcasts: broadcasts.map(b => ({
        id: b.id,
        sender_name: `${b.first_name} ${b.last_name}`,
        sender_role: b.role,
        school_name: b.school_name,
        title: b.title,
        message: b.message,
        broadcast_type: b.broadcast_type,
        status: b.status,
        reply_enabled: Boolean(b.reply_enabled),
        received_at: b.sent_at || b.created_at,
        read_at: b.read_at,
        is_read: b.status === 'read'
      }))
    });
  } catch (error) {
    console.error('Error fetching broadcast inbox:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inbox' });
  }
};

/**
 * Mark broadcast as read
 * POST /api/broadcast/:broadcastId/mark-read
 */
export const markBroadcastRead = async (req, res) => {
  try {
    const { broadcastId } = req.params;
    const userId = req.user.id;

    // Verify user is recipient
    const [[recipient]] = await db.query(
      'SELECT id FROM broadcast_recipients WHERE broadcast_id = ? AND recipient_user_id = ?',
      [broadcastId, userId]
    );

    if (!recipient) {
      return res.status(403).json({ success: false, message: 'Not a recipient of this broadcast' });
    }

    // Update status to read
    await db.query(
      'UPDATE broadcast_recipients SET status = ?, read_at = NOW() WHERE broadcast_id = ? AND recipient_user_id = ?',
      ['read', broadcastId, userId]
    );

    res.json({ success: true, message: 'Broadcast marked as read' });
  } catch (error) {
    console.error('Error marking broadcast as read:', error);
    res.status(500).json({ success: false, message: 'Failed to mark broadcast as read' });
  }
};

/**
 * Reply to broadcast (if enabled)
 * POST /api/broadcast/:broadcastId/reply
 */
export const replyToBroadcast = async (req, res) => {
  try {
    const { broadcastId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    // Validation
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Reply message cannot be empty' });
    }

    // Get broadcast
    const [[broadcast]] = await db.query(
      'SELECT id, sender_id, reply_enabled FROM broadcasts WHERE id = ?',
      [broadcastId]
    );

    if (!broadcast) {
      return res.status(404).json({ success: false, message: 'Broadcast not found' });
    }

    if (!broadcast.reply_enabled) {
      return res.status(400).json({ success: false, message: 'Replies are not enabled for this broadcast' });
    }

    // Verify user is recipient
    const [[recipient]] = await db.query(
      'SELECT id FROM broadcast_recipients WHERE broadcast_id = ? AND recipient_user_id = ?',
      [broadcastId, userId]
    );

    if (!recipient) {
      return res.status(403).json({ success: false, message: 'Not a recipient of this broadcast' });
    }

    // For now, create a direct message to sender
    // In future: could create a broadcast_reply table
    const [sender] = await db.query(
      'SELECT first_name, last_name FROM users WHERE id = ?',
      [broadcast.sender_id]
    );

    const senderUser = sender[0];

    res.status(201).json({
      success: true,
      message: {
        id: null, // Generated by messaging system
        type: 'direct_message',
        recipient_id: broadcast.sender_id,
        recipient_name: `${senderUser.first_name} ${senderUser.last_name}`,
        message: message.trim(),
        created_at: new Date().toISOString(),
        note: 'This would be sent as a direct message to the broadcast sender'
      }
    });
  } catch (error) {
    console.error('Error replying to broadcast:', error);
    res.status(500).json({ success: false, message: 'Failed to send reply' });
  }
};

export default {
  createBroadcast,
  sendBroadcast,
  getMyBroadcasts,
  getBroadcastStats,
  deleteBroadcast,
  getInbox,
  markBroadcastRead,
  replyToBroadcast
};
