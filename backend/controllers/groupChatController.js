import db from '../config/database.js';

/**
 * Group Chat Controller
 * Handles messaging functionality for groups
 */

/**
 * Send message to group
 * POST /api/group-chat/:groupId/messages
 */
export const sendMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { message, message_type = 'text' } = req.body;
    const senderId = req.user.id;

    // Validation
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }

    if (message.length > 5000) {
      return res.status(400).json({ success: false, message: 'Message exceeds 5000 characters' });
    }

    if (!['text', 'emoji', 'image', 'attachment'].includes(message_type)) {
      return res.status(400).json({ success: false, message: 'Invalid message type' });
    }

    // Verify user is group member
    const [[membership]] = await db.query(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND removed_at IS NULL',
      [groupId, senderId]
    );

    if (!membership) {
      return res.status(403).json({ success: false, message: 'Not a member of this group' });
    }

    // Verify group exists and is not deleted
    const [[group]] = await db.query(
      'SELECT id FROM chat_groups WHERE id = ? AND deleted_at IS NULL',
      [groupId]
    );

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Insert message
    const [result] = await db.query(
      `INSERT INTO group_messages (group_id, sender_id, message_text, message_type)
       VALUES (?, ?, ?, ?)`,
      [groupId, senderId, message.trim(), message_type]
    );

    const messageId = result.insertId;

    // Get sender details
    const [[sender]] = await db.query(
      'SELECT id, first_name, last_name FROM users WHERE id = ?',
      [senderId]
    );

    // Return message
    res.status(201).json({
      success: true,
      message: {
        id: messageId,
        group_id: groupId,
        sender_id: senderId,
        sender_name: `${sender.first_name} ${sender.last_name}`,
        message: message.trim(),
        message_type,
        is_edited: false,
        created_at: new Date().toISOString(),
        read_count: 0
      }
    });
  } catch (error) {
    console.error('Error sending group message:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

/**
 * Get messages from group
 * GET /api/group-chat/:groupId/messages?limit=50&offset=0
 */
export const getMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 50, 250);
    const offset = parseInt(req.query.offset) || 0;

    // Verify user is group member
    const [[membership]] = await db.query(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND removed_at IS NULL',
      [groupId, userId]
    );

    if (!membership) {
      return res.status(403).json({ success: false, message: 'Not a member of this group' });
    }

    // Get messages
    const [messages] = await db.query(
      `SELECT 
        gm.id,
        gm.group_id,
        gm.sender_id,
        u.first_name,
        u.last_name,
        gm.message_text,
        gm.message_type,
        gm.is_edited,
        gm.created_at,
        COUNT(DISTINCT gmr.user_id) as read_count
      FROM group_messages gm
      INNER JOIN users u ON u.id = gm.sender_id
      LEFT JOIN group_message_reads gmr ON gmr.message_id = gm.id
      WHERE gm.group_id = ? AND gm.deleted_at IS NULL
      GROUP BY gm.id
      ORDER BY gm.created_at DESC
      LIMIT ? OFFSET ?`,
      [groupId, limit, offset]
    );

    // Get total message count
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM group_messages 
       WHERE group_id = ? AND deleted_at IS NULL`,
      [groupId]
    );

    res.json({
      success: true,
      messages: messages
        .reverse()
        .map(msg => ({
          id: msg.id,
          group_id: msg.group_id,
          sender_id: msg.sender_id,
          sender_name: `${msg.first_name} ${msg.last_name}`,
          message: msg.message_text,
          message_type: msg.message_type,
          is_edited: msg.is_edited,
          created_at: msg.created_at,
          read_count: msg.read_count
        })),
      total_count: total,
      offset,
      limit
    });
  } catch (error) {
    console.error('Error fetching group messages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
};

/**
 * Mark messages as read
 * POST /api/group-chat/:groupId/messages/:messageId/mark-read
 */
export const markMessageRead = async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const userId = req.user.id;

    // Verify user is group member
    const [[membership]] = await db.query(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND removed_at IS NULL',
      [groupId, userId]
    );

    if (!membership) {
      return res.status(403).json({ success: false, message: 'Not a member of this group' });
    }

    // Verify message exists in group
    const [[message]] = await db.query(
      'SELECT id FROM group_messages WHERE id = ? AND group_id = ?',
      [messageId, groupId]
    );

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Insert or ignore read receipt
    await db.query(
      `INSERT INTO group_message_reads (message_id, user_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE read_at = NOW()`,
      [messageId, userId]
    );

    res.json({ success: true, message: 'Message marked as read' });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ success: false, message: 'Failed to mark message as read' });
  }
};

/**
 * Get unread count for group
 * GET /api/group-chat/:groupId/unread-count
 */
export const getUnreadCount = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Verify user is group member
    const [[membership]] = await db.query(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND removed_at IS NULL',
      [groupId, userId]
    );

    if (!membership) {
      return res.status(403).json({ success: false, message: 'Not a member of this group' });
    }

    // Count unread messages (messages not in read_receipts for this user)
    const [[{ unread_count }]] = await db.query(
      `SELECT COUNT(gm.id) as unread_count
       FROM group_messages gm
       LEFT JOIN group_message_reads gmr 
         ON gmr.message_id = gm.id AND gmr.user_id = ?
       WHERE gm.group_id = ? 
         AND gm.deleted_at IS NULL 
         AND gmr.id IS NULL`,
      [userId, groupId]
    );

    res.json({ success: true, unread_count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ success: false, message: 'Failed to get unread count' });
  }
};

export default {
  sendMessage,
  getMessages,
  markMessageRead,
  getUnreadCount
};
