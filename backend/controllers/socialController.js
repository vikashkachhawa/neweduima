import db from '../config/database.js';
import SchoolPage from '../models/SchoolPage.js';
import { createConnectionRequestNotification } from '../services/notificationService.js';

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
    return 'Super admin cannot use social connections';
  }

  return null;
};

export const getConnectionSummary = async (req, res) => {
  try {
    const ineligibleReason = ensureEligibleUser(req.user);
    if (ineligibleReason) {
      return res.status(403).json({ success: false, message: ineligibleReason });
    }

    const currentUserId = req.user.id;

    const [[connectionsCountRow]] = await db.query(
      `SELECT COUNT(*) AS count
      FROM social_connections
       WHERE status = 'accepted' AND (user_one_id = ? OR user_two_id = ?)`,
      [currentUserId, currentUserId]
    );

    const [[incomingCountRow]] = await db.query(
      `SELECT COUNT(*) AS count
      FROM social_connections
       WHERE status = 'pending'
         AND requester_id <> ?
         AND (user_one_id = ? OR user_two_id = ?)`,
      [currentUserId, currentUserId, currentUserId]
    );

    const [[outgoingCountRow]] = await db.query(
      `SELECT COUNT(*) AS count
      FROM social_connections
       WHERE status = 'pending'
         AND requester_id = ?
         AND (user_one_id = ? OR user_two_id = ?)`,
      [currentUserId, currentUserId, currentUserId]
    );

    const [[pagesFollowingCountRow]] = await db.query(
      `SELECT COUNT(*) AS count
       FROM school_followers
       WHERE follower_id = ? AND status = 'approved'`,
      [currentUserId]
    );

    return res.json({
      success: true,
      summary: {
        connections: connectionsCountRow?.count || 0,
        incomingRequests: incomingCountRow?.count || 0,
        outgoingRequests: outgoingCountRow?.count || 0,
        pagesFollowing: pagesFollowingCountRow?.count || 0
      }
    });
  } catch (error) {
    console.error('Get connection summary error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch social summary' });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const ineligibleReason = ensureEligibleUser(req.user);
    if (ineligibleReason) {
      return res.status(403).json({ success: false, message: ineligibleReason });
    }

    const currentUserId = req.user.id;
    const q = String(req.query.q || '').trim();
    const limit = Math.min(Number(req.query.limit || 20), 50);

    if (!q || q.length < 2) {
      return res.json({ success: true, users: [] });
    }

    const likeTerm = `%${q}%`;

    const [rows] = await db.query(
      `SELECT
         u.id,
         u.first_name,
         u.last_name,
         u.email,
         u.role,
         u.school_id,
         s.name AS school_name,
         uc.id AS connection_id,
         uc.status AS connection_status,
         uc.requester_id
       FROM users u
       LEFT JOIN schools s ON s.id = u.school_id
      LEFT JOIN social_connections uc
         ON uc.user_one_id = LEAST(?, u.id)
        AND uc.user_two_id = GREATEST(?, u.id)
       WHERE u.id <> ?
         AND u.role <> 'super_admin'
         AND u.is_active = TRUE
         AND (
           CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) LIKE ?
           OR u.email LIKE ?
           OR COALESCE(s.name, '') LIKE ?
         )
       ORDER BY u.first_name ASC, u.last_name ASC
       LIMIT ?`,
      [currentUserId, currentUserId, currentUserId, likeTerm, likeTerm, likeTerm, limit]
    );

    const users = rows.map((row) => {
      let relationship = 'none';

      if (row.connection_status === 'accepted') {
        relationship = 'connected';
      } else if (row.connection_status === 'pending' && row.requester_id === currentUserId) {
        relationship = 'outgoing_pending';
      } else if (row.connection_status === 'pending' && row.requester_id !== currentUserId) {
        relationship = 'incoming_pending';
      }

      return {
        id: row.id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        role: row.role,
        school_id: row.school_id,
        school_name: row.school_name,
        relationship,
        connection_id: row.connection_id
      };
    });

    return res.json({ success: true, users });
  } catch (error) {
    console.error('Search users error:', error);
    return res.status(500).json({ success: false, message: 'Failed to search users' });
  }
};

export const sendConnectionRequest = async (req, res) => {
  try {
    const ineligibleReason = ensureEligibleUser(req.user);
    if (ineligibleReason) {
      return res.status(403).json({ success: false, message: ineligibleReason });
    }

    const currentUserId = Number(req.user.id);
    const targetUserId = Number(req.params.userId);
    const requestMessage = req.body?.message ? String(req.body.message).slice(0, 255) : null;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Target user is required' });
    }

    if (targetUserId === currentUserId) {
      return res.status(400).json({ success: false, message: 'Cannot connect with yourself' });
    }

    const [[targetUser]] = await db.query(
      'SELECT id, role, is_active FROM users WHERE id = ? LIMIT 1',
      [targetUserId]
    );

    if (!targetUser || !targetUser.is_active) {
      return res.status(404).json({ success: false, message: 'Target user not found' });
    }

    if (targetUser.role === 'super_admin') {
      return res.status(400).json({ success: false, message: 'Cannot connect with super admin users' });
    }

    const [userOneId, userTwoId] = normalizeUserIdPair(currentUserId, targetUserId);

    const [[existing]] = await db.query(
      `SELECT id, status, requester_id
      FROM social_connections
       WHERE user_one_id = ? AND user_two_id = ?
       LIMIT 1`,
      [userOneId, userTwoId]
    );

    if (!existing) {
      const [result] = await db.query(
        `INSERT INTO social_connections (user_one_id, user_two_id, requester_id, status, request_message)
         VALUES (?, ?, ?, 'pending', ?)`,
        [userOneId, userTwoId, currentUserId, requestMessage]
      );

      await createConnectionRequestNotification(targetUserId, currentUserId);

      return res.status(201).json({
        success: true,
        message: 'Connection request sent',
        request: { id: result.insertId, status: 'pending' }
      });
    }

    if (existing.status === 'accepted') {
      return res.status(409).json({ success: false, message: 'Already connected' });
    }

    if (existing.status === 'pending' && existing.requester_id === currentUserId) {
      return res.status(409).json({ success: false, message: 'Connection request already sent' });
    }

    if (existing.status === 'pending' && existing.requester_id === targetUserId) {
      await db.query(
        `UPDATE social_connections
         SET status = 'accepted', requester_id = ?, responded_at = NOW(), request_message = ?, updated_at = NOW()
         WHERE id = ?`,
        [targetUserId, requestMessage, existing.id]
      );

      return res.json({
        success: true,
        message: 'Connection request accepted automatically',
        request: { id: existing.id, status: 'accepted' }
      });
    }

    await db.query(
      `UPDATE social_connections
       SET status = 'pending', requester_id = ?, request_message = ?, responded_at = NULL, updated_at = NOW()
       WHERE id = ?`,
      [currentUserId, requestMessage, existing.id]
    );

    await createConnectionRequestNotification(targetUserId, currentUserId);

    return res.json({
      success: true,
      message: 'Connection request sent',
      request: { id: existing.id, status: 'pending' }
    });
  } catch (error) {
    console.error('Send connection request error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send connection request' });
  }
};

export const respondToConnectionRequest = async (req, res) => {
  try {
    const ineligibleReason = ensureEligibleUser(req.user);
    if (ineligibleReason) {
      return res.status(403).json({ success: false, message: ineligibleReason });
    }

    const currentUserId = Number(req.user.id);
    const requestId = Number(req.params.requestId);
    const action = String(req.body?.action || '').toLowerCase();

    if (!requestId || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Valid request id and action are required' });
    }

    const [[connection]] = await db.query(
      `SELECT *
       FROM social_connections
       WHERE id = ? AND status = 'pending'
       LIMIT 1`,
      [requestId]
    );

    if (!connection) {
      return res.status(404).json({ success: false, message: 'Pending request not found' });
    }

    const involvesUser = connection.user_one_id === currentUserId || connection.user_two_id === currentUserId;
    const isRecipient = connection.requester_id !== currentUserId;

    if (!involvesUser || !isRecipient) {
      return res.status(403).json({ success: false, message: 'Not allowed to respond to this request' });
    }

    const nextStatus = action === 'accept' ? 'accepted' : 'rejected';

    await db.query(
      `UPDATE social_connections
       SET status = ?, responded_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [nextStatus, requestId]
    );

    return res.json({ success: true, message: `Request ${action}ed` });
  } catch (error) {
    console.error('Respond connection request error:', error);
    return res.status(500).json({ success: false, message: 'Failed to respond to request' });
  }
};

export const getConnectionRequests = async (req, res) => {
  try {
    const ineligibleReason = ensureEligibleUser(req.user);
    if (ineligibleReason) {
      return res.status(403).json({ success: false, message: ineligibleReason });
    }

    const currentUserId = Number(req.user.id);

    const [incoming] = await db.query(
      `SELECT
         uc.id,
         uc.request_message,
         uc.created_at,
         u.id AS requester_id,
         u.first_name,
         u.last_name,
         u.email,
         u.role,
         s.name AS school_name
      FROM social_connections uc
       INNER JOIN users u ON u.id = uc.requester_id
       LEFT JOIN schools s ON s.id = u.school_id
       WHERE uc.status = 'pending'
         AND uc.requester_id <> ?
         AND (uc.user_one_id = ? OR uc.user_two_id = ?)
       ORDER BY uc.created_at DESC
       LIMIT 50`,
      [currentUserId, currentUserId, currentUserId]
    );

    const [outgoing] = await db.query(
      `SELECT
         uc.id,
         uc.request_message,
         uc.created_at,
         u.id AS recipient_id,
         u.first_name,
         u.last_name,
         u.email,
         u.role,
         s.name AS school_name
      FROM social_connections uc
       INNER JOIN users u ON u.id = CASE
         WHEN uc.user_one_id = ? THEN uc.user_two_id
         ELSE uc.user_one_id
       END
       LEFT JOIN schools s ON s.id = u.school_id
       WHERE uc.status = 'pending'
         AND uc.requester_id = ?
         AND (uc.user_one_id = ? OR uc.user_two_id = ?)
       ORDER BY uc.created_at DESC
       LIMIT 50`,
      [currentUserId, currentUserId, currentUserId, currentUserId]
    );

    return res.json({ success: true, incoming, outgoing });
  } catch (error) {
    console.error('Get connection requests error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch connection requests' });
  }
};

export const getConnections = async (req, res) => {
  try {
    const ineligibleReason = ensureEligibleUser(req.user);
    if (ineligibleReason) {
      return res.status(403).json({ success: false, message: ineligibleReason });
    }

    const currentUserId = Number(req.user.id);

    const [rows] = await db.query(
      `SELECT
         uc.id,
         uc.updated_at,
         u.id AS user_id,
         u.first_name,
         u.last_name,
         u.email,
         u.role,
         s.name AS school_name
      FROM social_connections uc
       INNER JOIN users u ON u.id = CASE
         WHEN uc.user_one_id = ? THEN uc.user_two_id
         ELSE uc.user_one_id
       END
       LEFT JOIN schools s ON s.id = u.school_id
       WHERE uc.status = 'accepted'
         AND (uc.user_one_id = ? OR uc.user_two_id = ?)
       ORDER BY u.first_name ASC, u.last_name ASC
       LIMIT 200`,
      [currentUserId, currentUserId, currentUserId]
    );

    return res.json({ success: true, connections: rows });
  } catch (error) {
    console.error('Get connections error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch connections' });
  }
};

export const removeConnection = async (req, res) => {
  try {
    const ineligibleReason = ensureEligibleUser(req.user);
    if (ineligibleReason) {
      return res.status(403).json({ success: false, message: ineligibleReason });
    }

    const currentUserId = Number(req.user.id);
    const connectionUserId = Number(req.params.userId);

    if (!connectionUserId || connectionUserId === currentUserId) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const [userOneId, userTwoId] = normalizeUserIdPair(currentUserId, connectionUserId);

    await db.query(
      `DELETE FROM social_connections
       WHERE user_one_id = ? AND user_two_id = ? AND status = 'accepted'`,
      [userOneId, userTwoId]
    );

    return res.json({ success: true, message: 'Connection removed' });
  } catch (error) {
    console.error('Remove connection error:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove connection' });
  }
};

export const searchPages = async (req, res) => {
  try {
    const ineligibleReason = ensureEligibleUser(req.user);
    if (ineligibleReason) {
      return res.status(403).json({ success: false, message: ineligibleReason });
    }

    const currentUserId = Number(req.user.id);
    const q = String(req.query.q || '').trim();
    const limit = Math.min(Number(req.query.limit || 20), 50);

    if (!q || q.length < 2) {
      return res.json({ success: true, pages: [] });
    }

    const likeTerm = `%${q}%`;

    const [rows] = await db.query(
      `SELECT
         s.id AS school_id,
         s.name AS school_name,
         s.subdomain,
         sp.description,
         sp.logo_url,
         sp.banner_url,
         sp.follower_count,
         sf.id AS follow_id
       FROM schools s
       LEFT JOIN school_pages sp ON sp.school_id = s.id
       LEFT JOIN school_followers sf
         ON sf.school_id = s.id AND sf.follower_id = ? AND sf.status = 'approved'
       WHERE s.status <> 'deleted'
         AND (s.name LIKE ? OR COALESCE(sp.description, '') LIKE ?)
       ORDER BY s.name ASC
       LIMIT ?`,
      [currentUserId, likeTerm, likeTerm, limit]
    );

    const pages = rows.map((row) => ({
      school_id: row.school_id,
      school_name: row.school_name,
      subdomain: row.subdomain,
      description: row.description,
      logo_url: row.logo_url,
      banner_url: row.banner_url,
      follower_count: row.follower_count || 0,
      is_following: Boolean(row.follow_id)
    }));

    return res.json({ success: true, pages });
  } catch (error) {
    console.error('Search pages error:', error);
    return res.status(500).json({ success: false, message: 'Failed to search pages' });
  }
};

export const getFollowingPages = async (req, res) => {
  try {
    const ineligibleReason = ensureEligibleUser(req.user);
    if (ineligibleReason) {
      return res.status(403).json({ success: false, message: ineligibleReason });
    }

    const currentUserId = Number(req.user.id);

    const [rows] = await db.query(
      `SELECT
         s.id AS school_id,
         s.name AS school_name,
         s.subdomain,
         sp.logo_url,
         sp.description,
         sp.follower_count,
         sf.followed_at
       FROM school_followers sf
       INNER JOIN schools s ON s.id = sf.school_id
       LEFT JOIN school_pages sp ON sp.school_id = s.id
       WHERE sf.follower_id = ?
         AND sf.status = 'approved'
       ORDER BY sf.followed_at DESC
       LIMIT 100`,
      [currentUserId]
    );

    return res.json({ success: true, pages: rows });
  } catch (error) {
    console.error('Get following pages error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch followed pages' });
  }
};

export const followPage = async (req, res) => {
  try {
    const ineligibleReason = ensureEligibleUser(req.user);
    if (ineligibleReason) {
      return res.status(403).json({ success: false, message: ineligibleReason });
    }

    const currentUserId = Number(req.user.id);
    const schoolId = Number(req.params.schoolId);

    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School id is required' });
    }

    const [[school]] = await db.query('SELECT id FROM schools WHERE id = ? AND status <> \'deleted\' LIMIT 1', [schoolId]);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School page not found' });
    }

    const [[existing]] = await db.query(
      `SELECT id, status FROM school_followers WHERE school_id = ? AND follower_id = ? LIMIT 1`,
      [schoolId, currentUserId]
    );

    if (existing && existing.status === 'approved') {
      return res.json({ success: true, message: 'Already following page' });
    }

    if (existing) {
      await db.query(
        `UPDATE school_followers
         SET status = 'approved', followed_at = NOW(), follower_email = ?, follower_name = ?
         WHERE id = ?`,
        [req.user.email, `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim(), existing.id]
      );
    } else {
      await db.query(
        `INSERT INTO school_followers
           (school_id, follower_id, follower_email, follower_name, status, is_staff, followed_at)
         VALUES (?, ?, ?, ?, 'approved', FALSE, NOW())`,
        [schoolId, currentUserId, req.user.email, `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim()]
      );
    }

    await SchoolPage.incrementFollowerCount(schoolId);

    return res.status(201).json({ success: true, message: 'Page followed successfully' });
  } catch (error) {
    console.error('Follow page error:', error);
    return res.status(500).json({ success: false, message: 'Failed to follow page' });
  }
};

export const unfollowPage = async (req, res) => {
  try {
    const ineligibleReason = ensureEligibleUser(req.user);
    if (ineligibleReason) {
      return res.status(403).json({ success: false, message: ineligibleReason });
    }

    const currentUserId = Number(req.user.id);
    const schoolId = Number(req.params.schoolId);

    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School id is required' });
    }

    const [result] = await db.query(
      `DELETE FROM school_followers WHERE school_id = ? AND follower_id = ?`,
      [schoolId, currentUserId]
    );

    if (result.affectedRows > 0) {
      await SchoolPage.decrementFollowerCount(schoolId);
    }

    return res.json({ success: true, message: 'Page unfollowed successfully' });
  } catch (error) {
    console.error('Unfollow page error:', error);
    return res.status(500).json({ success: false, message: 'Failed to unfollow page' });
  }
};
