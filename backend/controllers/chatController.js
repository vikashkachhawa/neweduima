import db from '../config/database.js';

const normalizeUserIdPair = (a, b) => {
  const first = Number(a);
  const second = Number(b);
  return first < second ? [first, second] : [second, first];
};

const ensureEligibleUser = (user) => {
  if (!user) {
    return 'Authentication required';
  }

  if (user.role === 'super_admin') {
    return 'Super admin cannot use chat';
  }

  return null;
};

const ensureConnectedUsers = async (currentUserId, targetUserId) => {
  const [userOneId, userTwoId] = normalizeUserIdPair(currentUserId, targetUserId);
  const [[connection]] = await db.query(
    `SELECT id
     FROM social_connections
     WHERE user_one_id = ? AND user_two_id = ? AND status = 'accepted'
     LIMIT 1`,
    [userOneId, userTwoId]
  );

  return Boolean(connection);
};

const buildConnectedUsersQuery = () => `
  SELECT
    u.id AS user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.role,
    s.name AS school_name,
    fp.profile_image_url,
    latest.message_text AS last_message,
    latest.created_at AS last_message_at,
    latest.sender_id AS last_message_sender_id,
    latest.recipient_id AS last_message_recipient_id,
    COALESCE(latest.is_read, FALSE) AS last_message_is_read,
    COALESCE(unread.unread_count, 0) AS unread_count
  FROM social_connections sc
  INNER JOIN users u
    ON u.id = CASE WHEN sc.user_one_id = ? THEN sc.user_two_id ELSE sc.user_one_id END
  LEFT JOIN schools s ON s.id = u.school_id
  LEFT JOIN faculty_profiles fp ON fp.faculty_id = u.id
  LEFT JOIN (
    SELECT cm1.user_one_id, cm1.user_two_id, cm1.message_text, cm1.created_at, cm1.sender_id, cm1.recipient_id, cm1.is_read
    FROM chat_messages cm1
    INNER JOIN (
      SELECT user_one_id, user_two_id, MAX(id) AS max_id
      FROM chat_messages
      GROUP BY user_one_id, user_two_id
    ) latest_msg ON latest_msg.max_id = cm1.id
  ) latest ON latest.user_one_id = LEAST(?, u.id) AND latest.user_two_id = GREATEST(?, u.id)
  LEFT JOIN (
    SELECT user_one_id, user_two_id, recipient_id, COUNT(*) AS unread_count
    FROM chat_messages
    WHERE is_read = FALSE
    GROUP BY user_one_id, user_two_id, recipient_id
  ) unread ON unread.user_one_id = LEAST(?, u.id)
      AND unread.user_two_id = GREATEST(?, u.id)
      AND unread.recipient_id = ?
  WHERE sc.status = 'accepted'
    AND (sc.user_one_id = ? OR sc.user_two_id = ?)
`;

export const getChatConnections = async (req, res) => {
  try {
    const ineligibleReason = ensureEligibleUser(req.user);
    if (ineligibleReason) {
      return res.status(403).json({ success: false, message: ineligibleReason });
    }

    const currentUserId = Number(req.user.id);

    const [rows] = await db.query(
      `${buildConnectedUsersQuery()}
       ORDER BY u.first_name ASC, u.last_name ASC
       LIMIT 300`,
      [
        currentUserId,
        currentUserId,
        currentUserId,
        currentUserId,
        currentUserId,
        currentUserId,
        currentUserId,
        currentUserId
      ]
    );

    return res.json({ success: true, connections: rows });
  } catch (error) {
    console.error('Get chat connections error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch chat connections' });
  }
};

export const getActiveChats = async (req, res) => {
  try {
    const ineligibleReason = ensureEligibleUser(req.user);
    if (ineligibleReason) {
      return res.status(403).json({ success: false, message: ineligibleReason });
    }

    const currentUserId = Number(req.user.id);

    const [rows] = await db.query(
      `${buildConnectedUsersQuery()}
       HAVING last_message_at IS NOT NULL
       ORDER BY last_message_at DESC
       LIMIT 100`,
      [
        currentUserId,
        currentUserId,
        currentUserId,
        currentUserId,
        currentUserId,
        currentUserId,
        currentUserId,
        currentUserId
      ]
    );

    return res.json({ success: true, activeChats: rows });
  } catch (error) {
    console.error('Get active chats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch active chats' });
  }
};

export const getUnreadChatCount = async (req, res) => {
  try {
    const ineligibleReason = ensureEligibleUser(req.user);
    if (ineligibleReason) {
      return res.status(403).json({ success: false, message: ineligibleReason });
    }

    const currentUserId = Number(req.user.id);

    const [[row]] = await db.query(
      `SELECT COUNT(*) AS unreadCount
       FROM chat_messages
       WHERE recipient_id = ? AND is_read = FALSE`,
      [currentUserId]
    );

    return res.json({ success: true, unreadCount: Number(row?.unreadCount || 0) });
  } catch (error) {
    console.error('Get unread chat count error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch unread chat count' });
  }
};

export const getConversationMessages = async (req, res) => {
  try {
    const ineligibleReason = ensureEligibleUser(req.user);
    if (ineligibleReason) {
      return res.status(403).json({ success: false, message: ineligibleReason });
    }

    const currentUserId = Number(req.user.id);
    const targetUserId = Number(req.params.userId);
    const limit = Math.min(Math.max(Number(req.query.limit || 120), 1), 250);

    if (!targetUserId || targetUserId === currentUserId) {
      return res.status(400).json({ success: false, message: 'Valid connected user is required' });
    }

    const isConnected = await ensureConnectedUsers(currentUserId, targetUserId);
    if (!isConnected) {
      return res.status(403).json({ success: false, message: 'You can chat only with connected users' });
    }

    const [userOneId, userTwoId] = normalizeUserIdPair(currentUserId, targetUserId);

    const [rows] = await db.query(
      `SELECT
         cm.id,
         cm.sender_id,
         cm.recipient_id,
         cm.message_text,
         cm.is_read,
         cm.read_at,
         cm.created_at,
         u.first_name,
         u.last_name
       FROM chat_messages cm
       INNER JOIN users u ON u.id = cm.sender_id
       WHERE cm.user_one_id = ? AND cm.user_two_id = ?
       ORDER BY cm.id DESC
       LIMIT ?`,
      [userOneId, userTwoId, limit]
    );

    const messages = [...rows].reverse().map((row) => ({
      ...row,
      sender_name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'User'
    }));

    return res.json({ success: true, messages });
  } catch (error) {
    console.error('Get conversation messages error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const ineligibleReason = ensureEligibleUser(req.user);
    if (ineligibleReason) {
      return res.status(403).json({ success: false, message: ineligibleReason });
    }

    const currentUserId = Number(req.user.id);
    const targetUserId = Number(req.params.userId);
    const messageText = String(req.body?.message || '').trim();

    if (!targetUserId || targetUserId === currentUserId) {
      return res.status(400).json({ success: false, message: 'Valid connected user is required' });
    }

    if (!messageText) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }

    if (messageText.length > 4000) {
      return res.status(400).json({ success: false, message: 'Message too long' });
    }

    const isConnected = await ensureConnectedUsers(currentUserId, targetUserId);
    if (!isConnected) {
      return res.status(403).json({ success: false, message: 'You can chat only with connected users' });
    }

    const [userOneId, userTwoId] = normalizeUserIdPair(currentUserId, targetUserId);

    const [result] = await db.query(
      `INSERT INTO chat_messages (user_one_id, user_two_id, sender_id, recipient_id, message_text)
       VALUES (?, ?, ?, ?, ?)`,
      [userOneId, userTwoId, currentUserId, targetUserId, messageText]
    );

    return res.status(201).json({
      success: true,
      message: 'Message sent',
      chatMessage: {
        id: result.insertId,
        sender_id: currentUserId,
        recipient_id: targetUserId,
        message_text: messageText,
        is_read: 0,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Send chat message error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

export const markConversationAsRead = async (req, res) => {
  try {
    const ineligibleReason = ensureEligibleUser(req.user);
    if (ineligibleReason) {
      return res.status(403).json({ success: false, message: ineligibleReason });
    }

    const currentUserId = Number(req.user.id);
    const targetUserId = Number(req.params.userId);

    if (!targetUserId || targetUserId === currentUserId) {
      return res.status(400).json({ success: false, message: 'Valid connected user is required' });
    }

    const isConnected = await ensureConnectedUsers(currentUserId, targetUserId);
    if (!isConnected) {
      return res.status(403).json({ success: false, message: 'You can chat only with connected users' });
    }

    const [userOneId, userTwoId] = normalizeUserIdPair(currentUserId, targetUserId);

    await db.query(
      `UPDATE chat_messages
       SET is_read = TRUE, read_at = NOW(), updated_at = NOW()
       WHERE user_one_id = ?
         AND user_two_id = ?
         AND recipient_id = ?
         AND is_read = FALSE`,
      [userOneId, userTwoId, currentUserId]
    );

    return res.json({ success: true, message: 'Conversation marked as read' });
  } catch (error) {
    console.error('Mark conversation read error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark conversation as read' });
  }
};
