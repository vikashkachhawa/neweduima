import crypto from 'crypto';
import db from '../config/database.js';
import { AccessToken } from 'livekit-server-sdk';
import { getRecordingAbsolutePath, getRecordingById, listRoomRecordings, saveRoomRecording } from '../services/eduMeetRecordingService.js';

const MANAGEMENT_ROLES = new Set(['faculty', 'school_admin', 'super_admin']);
const ROOM_ROLE_MAP = {
  faculty: 'teacher',
  school_admin: 'admin',
  super_admin: 'admin',
  student: 'student',
};

const roomRoleForUser = (userRole) => ROOM_ROLE_MAP[userRole] || 'student';
const canManageRoom = (userRole) => MANAGEMENT_ROLES.has(userRole);
const hashPassword = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const parseJson = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeIceServer = (item) => {
  if (!item) return null;
  if (typeof item === 'string') return { urls: item };
  if (typeof item === 'object' && item.urls) return item;
  return null;
};

const generateRoomCode = async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    const [rows] = await db.query('SELECT id FROM edumeet_rooms WHERE room_code = ?', [code]);
    if (!rows.length) return code;
  }
  throw new Error('Failed to generate unique room code');
};

const getRoomRow = async (roomId) => {
  const [[room]] = await db.query(
    `SELECT r.*, u.first_name AS creator_first_name, u.last_name AS creator_last_name,
            (SELECT COUNT(*) FROM edumeet_participants ep WHERE ep.room_id = r.id AND ep.status IN ('joined', 'in_room')) AS participant_count,
            (SELECT COUNT(*) FROM edumeet_messages em WHERE em.room_id = r.id) AS message_count,
            (SELECT COUNT(*) FROM edumeet_polls p WHERE p.room_id = r.id) AS poll_count,
            (SELECT COUNT(*) FROM edumeet_files f WHERE f.room_id = r.id) AS file_count
     FROM edumeet_rooms r
     JOIN users u ON u.id = r.creator_id
     WHERE r.id = ?`,
    [roomId]
  );
  return room || null;
};

const roomToResponse = (room) => ({
  ...room,
  is_password_protected: Boolean(room.room_password_hash),
});

const loadParticipants = async (roomId) => {
  const [rows] = await db.query(
    `SELECT ep.*, u.first_name, u.last_name, u.email
     FROM edumeet_participants ep
     JOIN users u ON u.id = ep.user_id
     WHERE ep.room_id = ? AND ep.status IN ('joined', 'in_room')
     ORDER BY FIELD(ep.role, 'admin', 'teacher', 'student'), ep.spotlighted DESC, u.first_name ASC`,
    [roomId]
  );
  return rows;
};

const loadMessages = async (roomId, userId) => {
  const [rows] = await db.query(
    `SELECT m.*, sender.first_name AS sender_first_name, sender.last_name AS sender_last_name,
            recipient.first_name AS recipient_first_name, recipient.last_name AS recipient_last_name
     FROM edumeet_messages m
     JOIN users sender ON sender.id = m.sender_id
     LEFT JOIN users recipient ON recipient.id = m.recipient_id
     WHERE m.room_id = ? AND (m.recipient_id IS NULL OR m.recipient_id = ? OR m.sender_id = ?)
     ORDER BY m.created_at ASC
     LIMIT 200`,
    [roomId, userId, userId]
  );
  return rows.map((row) => ({ ...row, metadata: parseJson(row.metadata_json, null) }));
};

const loadFiles = async (roomId) => {
  const [rows] = await db.query(
    `SELECT f.*, u.first_name AS uploader_first_name, u.last_name AS uploader_last_name
     FROM edumeet_files f
     JOIN users u ON u.id = f.uploader_id
     WHERE f.room_id = ?
     ORDER BY f.created_at DESC`,
    [roomId]
  );
  return rows;
};

const loadWhiteboardEvents = async (roomId) => {
  const [rows] = await db.query(
    `SELECT id, event_type, payload_json, created_at
     FROM edumeet_whiteboard_events
     WHERE room_id = ?
     ORDER BY created_at ASC
     LIMIT 300`,
    [roomId]
  );
  return rows.map((row) => ({ id: row.id, event_type: row.event_type, payload: parseJson(row.payload_json, {}) }));
};

const loadPolls = async (roomId, userId) => {
  const [polls] = await db.query(
    `SELECT p.*,
            COALESCE((
              SELECT JSON_ARRAYAGG(JSON_OBJECT('option', pr.selected_option, 'count', counts.total_count))
              FROM (
                SELECT selected_option, COUNT(*) AS total_count
                FROM edumeet_poll_responses
                WHERE poll_id = p.id
                GROUP BY selected_option
              ) counts
              JOIN edumeet_poll_responses pr ON pr.poll_id = p.id AND pr.selected_option = counts.selected_option
              GROUP BY p.id
            ), JSON_ARRAY()) AS summary_json,
            (
              SELECT selected_option
              FROM edumeet_poll_responses
              WHERE poll_id = p.id AND user_id = ?
              LIMIT 1
            ) AS my_response,
            COALESCE((
              SELECT JSON_ARRAYAGG(JSON_OBJECT(
                'user_id', pr.user_id,
                'user_name', CONCAT(u.first_name, ' ', u.last_name),
                'selected_option', pr.selected_option,
                'response_time', DATE_FORMAT(pr.created_at, '%Y-%m-%dT%H:%i:%sZ'),
                'is_correct', IF(p.correct_option IS NOT NULL AND pr.selected_option = p.correct_option, 1, 0)
              ))
              FROM edumeet_poll_responses pr
              JOIN users u ON u.id = pr.user_id
              WHERE pr.poll_id = p.id
            ), JSON_ARRAY()) AS responses_json
     FROM edumeet_polls p
     WHERE p.room_id = ?
     ORDER BY p.created_at DESC`,
    [userId, roomId]
  );
  return polls.map((poll) => ({
    ...poll,
    options: parseJson(poll.options_json, []),
    summary: parseJson(poll.summary_json, []),
    responses: parseJson(poll.responses_json, []),
  }));
};

const loadNotes = async (roomId) => {
  const [rows] = await db.query(
    `SELECT n.*, u.first_name, u.last_name
     FROM edumeet_notes n
     JOIN users u ON u.id = n.user_id
     WHERE n.room_id = ?
     ORDER BY n.pinned DESC, n.created_at ASC`,
    [roomId]
  );
  return rows;
};

const loadHandQueue = async (roomId) => {
  const [rows] = await db.query(
    `SELECT q.*, u.first_name, u.last_name
     FROM edumeet_hand_queue q
     JOIN users u ON u.id = q.user_id
     WHERE q.room_id = ? AND q.status = 'queued'
     ORDER BY q.queue_order ASC, q.raised_at ASC`,
    [roomId]
  );
  return rows;
};

const ensureParticipant = async (roomId, userId, role) => {
  await db.query(
    `INSERT INTO edumeet_participants (room_id, user_id, role, status, joined_at, last_seen_at)
     VALUES (?, ?, ?, 'joined', NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       role = VALUES(role),
       status = IF(status = 'removed', status, 'joined'),
       joined_at = COALESCE(joined_at, NOW()),
       last_seen_at = NOW()`,
    [roomId, userId, role]
  );
};

const getParticipantRow = async (roomId, userId) => {
  const [[row]] = await db.query('SELECT * FROM edumeet_participants WHERE room_id = ? AND user_id = ? LIMIT 1', [roomId, userId]);
  return row || null;
};

const ensureRoomAccess = async (roomId, user, { requireManager = false, allowJoinPreview = false } = {}) => {
  const room = await getRoomRow(roomId);
  if (!room) return { error: 'Room not found', status: 404 };

  if (user.role !== 'super_admin' && room.school_id !== user.school_id) {
    return { error: 'You do not have access to this room', status: 403 };
  }

  if (requireManager) {
    if (!canManageRoom(user.role)) {
      return { error: 'Only teachers or admins can manage this room', status: 403 };
    }
    return { room };
  }

  if (canManageRoom(user.role)) {
    return { room };
  }

  const participant = await getParticipantRow(roomId, user.id);
  if (!participant && !allowJoinPreview) {
    return { error: 'Join the room first', status: 403 };
  }

  return { room, participant };
};

export const createRoom = async (req, res) => {
  try {
    const { role, id: userId, school_id: schoolId } = req.user;
    if (!canManageRoom(role)) {
      return res.status(403).json({ success: false, message: 'Only teachers or admins can create rooms' });
    }

    const {
      title,
      description = '',
      conference_type = 'many_to_many',
      room_password = '',
      scheduled_at = null,
      duration_minutes = 60,
      primary_language = 'english',
      low_bandwidth_mode = false,
      high_quality_video = true,
      allow_private_chat = true,
      allow_screen_share = true,
      allow_file_sharing = true,
      attendance_tracking_enabled = true,
      recording_enabled = false,
      breakout_enabled = false,
      max_participants = 100,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'Room title is required' });
    }

    if (!schoolId && role !== 'super_admin') {
      return res.status(400).json({ success: false, message: 'School context is required' });
    }

    const roomCode = await generateRoomCode();
    const passwordHash = room_password ? hashPassword(room_password) : null;
    const [result] = await db.query(
      `INSERT INTO edumeet_rooms (
        school_id, creator_id, title, description, conference_type, room_code, room_password_hash,
        scheduled_at, duration_minutes, primary_language, low_bandwidth_mode, high_quality_video,
        allow_private_chat, allow_screen_share, allow_file_sharing, attendance_tracking_enabled,
        recording_enabled, breakout_enabled, max_participants
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId || 1,
        userId,
        title.trim(),
        description,
        conference_type,
        roomCode,
        passwordHash,
        scheduled_at || null,
        Number(duration_minutes) || 60,
        primary_language,
        low_bandwidth_mode ? 1 : 0,
        high_quality_video ? 1 : 0,
        allow_private_chat ? 1 : 0,
        allow_screen_share ? 1 : 0,
        allow_file_sharing ? 1 : 0,
        attendance_tracking_enabled ? 1 : 0,
        recording_enabled ? 1 : 0,
        breakout_enabled ? 1 : 0,
        Number(max_participants) || 100,
      ]
    );

    await ensureParticipant(result.insertId, userId, roomRoleForUser(role));
    const room = await getRoomRow(result.insertId);
    return res.status(201).json({ success: true, room: roomToResponse(room) });
  } catch (error) {
    console.error('createRoom error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create EduMeet room' });
  }
};

export const listRooms = async (req, res) => {
  try {
    const { role, id: userId, school_id: schoolId } = req.user;
    const { status = '' } = req.query;
    const params = [];
    const filters = [];

    if (status) {
      filters.push('r.status = ?');
      params.push(status);
    }

    if (role !== 'super_admin') {
      filters.push('r.school_id = ?');
      params.push(schoolId);
    }

    const [rows] = await db.query(
      `SELECT r.*, ep.status AS my_status, ep.role AS my_room_role,
              (SELECT COUNT(*) FROM edumeet_participants p WHERE p.room_id = r.id AND p.status <> 'removed') AS participant_count
       FROM edumeet_rooms r
       LEFT JOIN edumeet_participants ep ON ep.room_id = r.id AND ep.user_id = ?
       ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
       ORDER BY COALESCE(r.scheduled_at, r.created_at) DESC`,
      [userId, ...params]
    );

    return res.json({ success: true, rooms: rows.map(roomToResponse) });
  } catch (error) {
    console.error('listRooms error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load EduMeet rooms' });
  }
};

export const getIceConfig = async (_req, res) => {
  try {
    const jsonCfg = process.env.EDUMEET_ICE_SERVERS_JSON;
    let iceServers = [];

    if (jsonCfg) {
      iceServers = parseJson(jsonCfg, []).map(normalizeIceServer).filter(Boolean);
    }

    if (!iceServers.length) {
      const stunUrls = (process.env.EDUMEET_STUN_URLS || 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      iceServers = stunUrls.map((url) => ({ urls: url }));

      if (process.env.EDUMEET_TURN_URL && process.env.EDUMEET_TURN_USERNAME && process.env.EDUMEET_TURN_PASSWORD) {
        iceServers.push({
          urls: process.env.EDUMEET_TURN_URL,
          username: process.env.EDUMEET_TURN_USERNAME,
          credential: process.env.EDUMEET_TURN_PASSWORD,
        });
      }
    }

    return res.json({ success: true, iceServers });
  } catch (error) {
    console.error('getIceConfig error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load ICE configuration' });
  }
};

export const getRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const access = await ensureRoomAccess(roomId, req.user, { allowJoinPreview: true });
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const [participants, messages, polls, files, whiteboard_events, recordings] = await Promise.all([
      loadParticipants(roomId),
      loadMessages(roomId, req.user.id),
      loadPolls(roomId, req.user.id),
      loadFiles(roomId),
      loadWhiteboardEvents(roomId),
      listRoomRecordings(roomId),
    ]);

    return res.json({
      success: true,
      room: roomToResponse(access.room),
      participants,
      messages,
      polls,
      files,
      whiteboard_events,
      recordings,
    });
  } catch (error) {
    console.error('getRoom error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load room details' });
  }
};

const joinExistingRoom = async ({ room, user, roomPassword }) => {
  if (room.status === 'ended') {
    return { error: 'This session has ended. Rejoining is disabled.', status: 410 };
  }

  if (room.room_password_hash) {
    if (!roomPassword || hashPassword(roomPassword) !== room.room_password_hash) {
      return { error: 'Invalid room password', status: 403 };
    }
  }

  if (room.status !== 'live') {
    await db.query(
      'UPDATE edumeet_rooms SET status = \'live\', scheduled_at = COALESCE(scheduled_at, NOW()) WHERE id = ?',
      [room.id]
    );
  }

  await ensureParticipant(room.id, user.id, roomRoleForUser(user.role));
  await db.query(
    `UPDATE edumeet_participants
     SET status = 'in_room',
         mic_enabled = TRUE,
         camera_enabled = TRUE,
         joined_at = COALESCE(joined_at, NOW()),
         last_seen_at = NOW()
     WHERE room_id = ? AND user_id = ? AND status <> 'removed'`,
    [room.id, user.id]
  );

  const participant = await getParticipantRow(room.id, user.id);
  return { participant };
};

export const joinByCode = async (req, res) => {
  try {
    const { invite_code, room_password = '' } = req.body;
    if (!invite_code?.trim()) {
      return res.status(400).json({ success: false, message: 'Room code is required' });
    }

    const [[room]] = await db.query('SELECT * FROM edumeet_rooms WHERE room_code = ? LIMIT 1', [invite_code.trim().toUpperCase()]);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const access = await ensureRoomAccess(room.id, req.user, { allowJoinPreview: true });
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const joinResult = await joinExistingRoom({ room: access.room, user: req.user, roomPassword: room_password });
    if (joinResult.error) return res.status(joinResult.status).json({ success: false, message: joinResult.error });

    return res.json({ success: true, room: roomToResponse(access.room), participant: joinResult.participant });
  } catch (error) {
    console.error('joinByCode error:', error);
    return res.status(500).json({ success: false, message: 'Failed to join room' });
  }
};

export const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { room_password = '' } = req.body || {};
    const access = await ensureRoomAccess(roomId, req.user, { allowJoinPreview: true });
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const joinResult = await joinExistingRoom({ room: access.room, user: req.user, roomPassword: room_password });
    if (joinResult.error) return res.status(joinResult.status).json({ success: false, message: joinResult.error });

    return res.json({ success: true, room: roomToResponse(access.room), participant: joinResult.participant });
  } catch (error) {
    console.error('joinRoom error:', error);
    return res.status(500).json({ success: false, message: 'Failed to join room' });
  }
};

export const startRoom = async (req, res) => {
  try {
    const access = await ensureRoomAccess(req.params.roomId, req.user, { requireManager: true });
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    await db.query('UPDATE edumeet_rooms SET status = \'live\', scheduled_at = COALESCE(scheduled_at, NOW()) WHERE id = ?', [req.params.roomId]);
    return res.json({ success: true, message: 'Room started' });
  } catch (error) {
    console.error('startRoom error:', error);
    return res.status(500).json({ success: false, message: 'Failed to start room' });
  }
};

const purgeRoomHistory = async (roomId) => {
  await db.query('DELETE FROM edumeet_poll_responses WHERE poll_id IN (SELECT id FROM edumeet_polls WHERE room_id = ?)', [roomId]);
  await db.query('DELETE FROM edumeet_polls WHERE room_id = ?', [roomId]);
  await db.query('DELETE FROM edumeet_messages WHERE room_id = ?', [roomId]);
  await db.query('DELETE FROM edumeet_files WHERE room_id = ?', [roomId]);
  await db.query('DELETE FROM edumeet_whiteboard_events WHERE room_id = ?', [roomId]);
  await db.query('DELETE FROM edumeet_recordings WHERE room_id = ?', [roomId]);
  await db.query('DELETE FROM edumeet_waiting_room WHERE room_id = ?', [roomId]);
  await db.query('DELETE FROM edumeet_breakout_participants WHERE breakout_room_id IN (SELECT id FROM edumeet_breakout_rooms WHERE parent_room_id = ?)', [roomId]);
  await db.query('DELETE FROM edumeet_breakout_rooms WHERE parent_room_id = ?', [roomId]);
  await db.query('DELETE FROM edumeet_participants WHERE room_id = ?', [roomId]);
};

export const endRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const access = await ensureRoomAccess(roomId, req.user, { requireManager: true });
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const saveHistory = req.body?.save_history === true;

    await db.query('UPDATE edumeet_rooms SET status = \'ended\' WHERE id = ?', [roomId]);
    await db.query('UPDATE edumeet_participants SET status = IF(status = \'removed\', status, \'left\'), left_at = NOW() WHERE room_id = ?', [roomId]);

    if (!saveHistory) {
      await purgeRoomHistory(roomId);
    }

    return res.json({
      success: true,
      message: saveHistory ? 'Room ended and history saved' : 'Room ended and history discarded',
      save_history: saveHistory,
    });
  } catch (error) {
    console.error('endRoom error:', error);
    return res.status(500).json({ success: false, message: 'Failed to end room' });
  }
};

export const clearRoomHistory = async (req, res) => {
  try {
    const { roomId } = req.params;
    const access = await ensureRoomAccess(roomId, req.user, { requireManager: true });
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    await purgeRoomHistory(roomId);

    return res.json({ success: true, message: 'Meeting history deleted for all participants' });
  } catch (error) {
    console.error('clearRoomHistory error:', error);
    return res.status(500).json({ success: false, message: 'Failed to clear meeting history' });
  }
};

export const getParticipants = async (req, res) => {
  try {
    const access = await ensureRoomAccess(req.params.roomId, req.user);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });
    const participants = await loadParticipants(req.params.roomId);
    return res.json({ success: true, participants });
  } catch (error) {
    console.error('getParticipants error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load participants' });
  }
};

export const getMessages = async (req, res) => {
  try {
    const access = await ensureRoomAccess(req.params.roomId, req.user);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });
    const messages = await loadMessages(req.params.roomId, req.user.id);
    return res.json({ success: true, messages });
  } catch (error) {
    console.error('getMessages error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load messages' });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, recipient_id = null, message_type = 'text', metadata = null } = req.body;
    const access = await ensureRoomAccess(roomId, req.user);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    if (recipient_id && !access.room.allow_private_chat) {
      return res.status(400).json({ success: false, message: 'Private chat is disabled for this room' });
    }

    const [result] = await db.query(
      `INSERT INTO edumeet_messages (room_id, sender_id, recipient_id, message_type, content, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [roomId, req.user.id, recipient_id || null, message_type, content.trim(), metadata ? JSON.stringify(metadata) : null]
    );

    const messages = await loadMessages(roomId, req.user.id);
    const message = messages.find((item) => item.id === result.insertId) || null;
    return res.status(201).json({ success: true, message });
  } catch (error) {
    console.error('sendMessage error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

export const listPolls = async (req, res) => {
  try {
    const access = await ensureRoomAccess(req.params.roomId, req.user);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });
    const polls = await loadPolls(req.params.roomId, req.user.id);
    return res.json({ success: true, polls });
  } catch (error) {
    console.error('listPolls error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load polls' });
  }
};

export const createPoll = async (req, res) => {
  try {
    const { roomId } = req.params;
    const access = await ensureRoomAccess(roomId, req.user, { requireManager: true });
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const { question, options = [], correctOption } = req.body;
    const normalizedOptions = Array.isArray(options) ? options.map((item) => String(item).trim()).filter(Boolean) : [];
    if (!question?.trim() || normalizedOptions.length < 2) {
      return res.status(400).json({ success: false, message: 'Question and at least two options are required' });
    }

    await db.query('UPDATE edumeet_polls SET is_active = FALSE, closed_at = NOW() WHERE room_id = ? AND is_active = TRUE', [roomId]);
    const [result] = await db.query(
      'INSERT INTO edumeet_polls (room_id, creator_id, question, options_json, correct_option) VALUES (?, ?, ?, ?, ?)',
      [roomId, req.user.id, question.trim(), JSON.stringify(normalizedOptions), correctOption || null]
    );

    const polls = await loadPolls(roomId, req.user.id);
    const poll = polls.find((item) => item.id === result.insertId) || null;
    return res.status(201).json({ success: true, poll });
  } catch (error) {
    console.error('createPoll error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create poll' });
  }
};

export const respondToPoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const { selected_option } = req.body;
    const [[poll]] = await db.query('SELECT * FROM edumeet_polls WHERE id = ? LIMIT 1', [pollId]);
    if (!poll) return res.status(404).json({ success: false, message: 'Poll not found' });

    const access = await ensureRoomAccess(poll.room_id, req.user);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    if (!poll.is_active) {
      return res.status(400).json({ success: false, message: 'This poll has ended' });
    }

    const options = parseJson(poll.options_json, []);
    if (!options.includes(selected_option)) {
      return res.status(400).json({ success: false, message: 'Invalid poll option' });
    }

    const [[existingVote]] = await db.query(
      'SELECT id FROM edumeet_poll_responses WHERE poll_id = ? AND user_id = ? LIMIT 1',
      [pollId, req.user.id]
    );
    if (existingVote) {
      return res.status(409).json({ success: false, message: 'You have already voted on this poll' });
    }

    await db.query(
      `INSERT INTO edumeet_poll_responses (poll_id, user_id, selected_option)
       VALUES (?, ?, ?)`,
      [pollId, req.user.id, selected_option]
    );

    const polls = await loadPolls(poll.room_id, req.user.id);
    const updated = polls.find((item) => item.id === Number(pollId)) || null;
    return res.json({ success: true, poll: updated });
  } catch (error) {
    console.error('respondToPoll error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record poll response' });
  }
};

export const endPoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const [[poll]] = await db.query('SELECT * FROM edumeet_polls WHERE id = ? LIMIT 1', [pollId]);
    if (!poll) return res.status(404).json({ success: false, message: 'Poll not found' });

    const access = await ensureRoomAccess(poll.room_id, req.user, { requireManager: true });
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    await db.query('UPDATE edumeet_polls SET is_active = FALSE, closed_at = NOW() WHERE id = ?', [pollId]);
    const polls = await loadPolls(poll.room_id, req.user.id);
    const updated = polls.find((item) => item.id === Number(pollId)) || null;
    return res.json({ success: true, poll: updated, message: 'Poll ended' });
  } catch (error) {
    console.error('endPoll error:', error);
    return res.status(500).json({ success: false, message: 'Failed to end poll' });
  }
};

export const deletePoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const [[poll]] = await db.query('SELECT * FROM edumeet_polls WHERE id = ? LIMIT 1', [pollId]);
    if (!poll) return res.status(404).json({ success: false, message: 'Poll not found' });

    const access = await ensureRoomAccess(poll.room_id, req.user, { requireManager: true });
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    await db.query('DELETE FROM edumeet_polls WHERE id = ?', [pollId]);
    return res.json({ success: true, pollId: Number(pollId), message: 'Poll deleted' });
  } catch (error) {
    console.error('deletePoll error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete poll' });
  }
};

export const shareFile = async (req, res) => {
  try {
    const { roomId } = req.params;
    const access = await ensureRoomAccess(roomId, req.user);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const { title, file_type = 'link', file_url } = req.body;
    if (!title?.trim() || !file_url?.trim()) {
      return res.status(400).json({ success: false, message: 'Title and file URL are required' });
    }

    await db.query(
      'INSERT INTO edumeet_files (room_id, uploader_id, title, file_type, file_url) VALUES (?, ?, ?, ?, ?)',
      [roomId, req.user.id, title.trim(), file_type, file_url.trim()]
    );

    const files = await loadFiles(roomId);
    return res.status(201).json({ success: true, files });
  } catch (error) {
    console.error('shareFile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to share file' });
  }
};

export const listFiles = async (req, res) => {
  try {
    const access = await ensureRoomAccess(req.params.roomId, req.user);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });
    const files = await loadFiles(req.params.roomId);
    return res.json({ success: true, files });
  } catch (error) {
    console.error('listFiles error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load shared files' });
  }
};

export const listRecordings = async (req, res) => {
  try {
    const access = await ensureRoomAccess(req.params.roomId, req.user);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });
    const recordings = await listRoomRecordings(req.params.roomId);
    return res.json({ success: true, recordings });
  } catch (error) {
    console.error('listRecordings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load recordings' });
  }
};

export const downloadRecording = async (req, res) => {
  try {
    const recording = await getRecordingById(req.params.recordingId);
    if (!recording || new Date(recording.expires_at).getTime() <= Date.now()) {
      return res.status(404).json({ success: false, message: 'Recording not found or expired' });
    }

    const access = await ensureRoomAccess(recording.room_id, req.user, { requireManager: true });
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const safeTitle = `${recording.title}`.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'edumeet-recording';
    return res.download(getRecordingAbsolutePath(recording.file_name), `${safeTitle}.${recording.file_name.split('.').pop()}`);
  } catch (error) {
    console.error('downloadRecording error:', error);
    return res.status(500).json({ success: false, message: 'Failed to download recording' });
  }
};

export const uploadRecording = async (req, res) => {
  try {
    const { roomId } = req.params;
    const access = await ensureRoomAccess(roomId, req.user, { requireManager: true });
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    if (!access.room.recording_enabled) {
      return res.status(400).json({ success: false, message: 'Recording is disabled for this room' });
    }

    const buffer = req.body;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      return res.status(400).json({ success: false, message: 'Recording file is required' });
    }

    if (buffer.length > 500 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'Recording exceeds 500 MB upload limit' });
    }

    const title = req.headers['x-recording-title'] || `${access.room.title} recording`;
    const mimeType = req.headers['content-type'] || req.headers['x-recording-mime-type'] || 'video/webm';
    const durationSeconds = Number(req.headers['x-recording-duration-seconds'] || 0) || null;
    const recording = await saveRoomRecording({
      roomId,
      uploaderId: req.user.id,
      title: String(title).substring(0, 255),
      mimeType: String(mimeType).substring(0, 100),
      durationSeconds,
      buffer,
    });

    return res.status(201).json({
      success: true,
      recording,
      message: 'Recording uploaded. Playback remains available for 24 hours.',
    });
  } catch (error) {
    console.error('uploadRecording error:', error);
    return res.status(500).json({ success: false, message: 'Failed to upload recording' });
  }
};

export const muteAllParticipants = async (req, res) => {
  try {
    const access = await ensureRoomAccess(req.params.roomId, req.user, { requireManager: true });
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const [result] = await db.query(
      `UPDATE edumeet_participants
       SET mic_enabled = FALSE
       WHERE room_id = ? AND role = 'student' AND status IN ('joined', 'in_room')`,
      [req.params.roomId]
    );

    return res.json({ success: true, affected: result.affectedRows, message: 'All student microphones muted' });
  } catch (error) {
    console.error('muteAllParticipants error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mute participants' });
  }
};

export const removeParticipant = async (req, res) => {
  try {
    const { roomId, targetUserId } = req.params;
    const access = await ensureRoomAccess(roomId, req.user, { requireManager: true });
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    await db.query(
      `UPDATE edumeet_participants
       SET status = 'removed', left_at = NOW(), removed_by = ?
       WHERE room_id = ? AND user_id = ?`,
      [req.user.id, roomId, targetUserId]
    );

    return res.json({ success: true, message: 'Participant removed' });
  } catch (error) {
    console.error('removeParticipant error:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove participant' });
  }
};

export const spotlightParticipant = async (req, res) => {
  try {
    const { roomId, targetUserId } = req.params;
    const access = await ensureRoomAccess(roomId, req.user, { requireManager: true });
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    await db.query('UPDATE edumeet_participants SET spotlighted = FALSE WHERE room_id = ?', [roomId]);
    await db.query('UPDATE edumeet_participants SET spotlighted = TRUE WHERE room_id = ? AND user_id = ?', [roomId, targetUserId]);
    return res.json({ success: true, message: 'Participant spotlighted' });
  } catch (error) {
    console.error('spotlightParticipant error:', error);
    return res.status(500).json({ success: false, message: 'Failed to spotlight participant' });
  }
};

export const markAttendance = async (req, res) => {
  try {
    const access = await ensureRoomAccess(req.params.roomId, req.user, { requireManager: true });
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const [result] = await db.query(
      `UPDATE edumeet_participants
       SET attendance_marked = TRUE
       WHERE room_id = ? AND status IN ('joined', 'in_room', 'left')`,
      [req.params.roomId]
    );

    return res.json({ success: true, affected: result.affectedRows, message: 'Attendance marked' });
  } catch (error) {
    console.error('markAttendance error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark attendance' });
  }
};

export const getRoomDashboard = async (req, res) => {
  try {
    const access = await ensureRoomAccess(req.params.roomId, req.user);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const [participants, polls, files] = await Promise.all([
      loadParticipants(req.params.roomId),
      loadPolls(req.params.roomId, req.user.id),
      loadFiles(req.params.roomId),
    ]);

    const stats = {
      totalParticipants: participants.length,
      activeParticipants: participants.filter((p) => ['joined', 'in_room'].includes(p.status)).length,
      raisedHands: participants.filter((p) => p.hand_raised).length,
      attendanceMarked: participants.filter((p) => p.attendance_marked).length,
      filesShared: files.length,
      activePolls: polls.filter((p) => p.is_active).length,
    };

    return res.json({ success: true, stats, participants, polls, files });
  } catch (error) {
    console.error('getRoomDashboard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load EduMeet dashboard' });
  }
};

// ── Waiting Room ────────────────────────────────────────────────────────────

export const requestWaitingRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const [[room]] = await db.query('SELECT id FROM edumeet_rooms WHERE id = ?', [roomId]);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    await db.query(
      `INSERT INTO edumeet_waiting_room (room_id, user_id, display_name, status, requested_at)
       VALUES (?, ?, ?, 'waiting', NOW())
       ON DUPLICATE KEY UPDATE status = 'waiting', requested_at = NOW(), decided_at = NULL`,
      [roomId, userId, `${req.user.first_name} ${req.user.last_name}`]
    );

    return res.json({ success: true, message: 'Waiting for host approval' });
  } catch (error) {
    console.error('requestWaitingRoom error:', error);
    return res.status(500).json({ success: false, message: 'Failed to enter waiting room' });
  }
};

export const getWaitingRoom = async (req, res) => {
  try {
    const access = await ensureRoomAccess(req.params.roomId, req.user, { requireManager: true });
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const [rows] = await db.query(
      `SELECT w.*, u.first_name, u.last_name, u.email
       FROM edumeet_waiting_room w
       JOIN users u ON u.id = w.user_id
       WHERE w.room_id = ? AND w.status = 'waiting'
       ORDER BY w.requested_at ASC`,
      [req.params.roomId]
    );

    return res.json({ success: true, waiting: rows });
  } catch (error) {
    console.error('getWaitingRoom error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load waiting room' });
  }
};

export const admitFromWaitingRoom = async (req, res) => {
  try {
    const access = await ensureRoomAccess(req.params.roomId, req.user, { requireManager: true });
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const { targetUserId } = req.params;
    const action = req.body?.action === 'reject' ? 'rejected' : 'admitted';

    await db.query(
      `UPDATE edumeet_waiting_room SET status = ?, decided_at = NOW(), decided_by = ?
       WHERE room_id = ? AND user_id = ?`,
      [action, req.user.id, req.params.roomId, targetUserId]
    );

    if (action === 'admitted') {
      await db.query(
        `INSERT INTO edumeet_participants (room_id, user_id, role, status, joined_at, last_seen_at)
         VALUES (?, ?, 'student', 'joined', NOW(), NOW())
         ON DUPLICATE KEY UPDATE status = IF(status = 'removed', status, 'joined'), last_seen_at = NOW()`,
        [req.params.roomId, targetUserId]
      );
    }

    return res.json({ success: true, action, message: `Participant ${action}` });
  } catch (error) {
    console.error('admitFromWaitingRoom error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process waiting room decision' });
  }
};

export const checkWaitingStatus = async (req, res) => {
  try {
    const { roomId } = req.params;
    const [[row]] = await db.query(
      'SELECT status FROM edumeet_waiting_room WHERE room_id = ? AND user_id = ? ORDER BY requested_at DESC LIMIT 1',
      [roomId, req.user.id]
    );
    return res.json({ success: true, status: row?.status || null });
  } catch (error) {
    console.error('checkWaitingStatus error:', error);
    return res.status(500).json({ success: false, message: 'Failed to check waiting status' });
  }
};

// ── Breakout Rooms ──────────────────────────────────────────────────────────

export const createBreakoutRoom = async (req, res) => {
  try {
    const access = await ensureRoomAccess(req.params.roomId, req.user, { requireManager: true });
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const { title } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Breakout room title is required' });

    const [result] = await db.query(
      'INSERT INTO edumeet_breakout_rooms (parent_room_id, title, created_by) VALUES (?, ?, ?)',
      [req.params.roomId, title.trim(), req.user.id]
    );

    const [[row]] = await db.query('SELECT * FROM edumeet_breakout_rooms WHERE id = ?', [result.insertId]);
    return res.json({ success: true, breakoutRoom: row });
  } catch (error) {
    console.error('createBreakoutRoom error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create breakout room' });
  }
};

export const listBreakoutRooms = async (req, res) => {
  try {
    const access = await ensureRoomAccess(req.params.roomId, req.user);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const [rows] = await db.query(
      `SELECT br.*, u.first_name AS creator_first_name, u.last_name AS creator_last_name,
              (SELECT COUNT(*) FROM edumeet_breakout_participants bp WHERE bp.breakout_room_id = br.id AND bp.left_at IS NULL) AS participant_count
       FROM edumeet_breakout_rooms br
       JOIN users u ON u.id = br.created_by
       WHERE br.parent_room_id = ?
       ORDER BY br.created_at DESC`,
      [req.params.roomId]
    );

    return res.json({ success: true, breakoutRooms: rows });
  } catch (error) {
    console.error('listBreakoutRooms error:', error);
    return res.status(500).json({ success: false, message: 'Failed to list breakout rooms' });
  }
};

export const assignToBreakoutRoom = async (req, res) => {
  try {
    const access = await ensureRoomAccess(req.params.roomId, req.user, { requireManager: true });
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const { breakoutRoomId, userIds = [] } = req.body;
    if (!breakoutRoomId) return res.status(400).json({ success: false, message: 'breakoutRoomId required' });

    const [[br]] = await db.query('SELECT id FROM edumeet_breakout_rooms WHERE id = ? AND parent_room_id = ? AND status = ?', [breakoutRoomId, req.params.roomId, 'open']);
    if (!br) return res.status(404).json({ success: false, message: 'Breakout room not found or closed' });

    await Promise.all(
      userIds.map((uid) =>
        db.query(
          `INSERT INTO edumeet_breakout_participants (breakout_room_id, user_id)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE joined_at = CURRENT_TIMESTAMP, left_at = NULL`,
          [breakoutRoomId, uid]
        )
      )
    );

    return res.json({ success: true, message: `Assigned ${userIds.length} participant(s)` });
  } catch (error) {
    console.error('assignToBreakoutRoom error:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign to breakout room' });
  }
};

export const closeBreakoutRoom = async (req, res) => {
  try {
    const access = await ensureRoomAccess(req.params.roomId, req.user, { requireManager: true });
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    await db.query(
      'UPDATE edumeet_breakout_rooms SET status = ?, closed_at = NOW() WHERE id = ? AND parent_room_id = ?',
      ['closed', req.params.breakoutRoomId, req.params.roomId]
    );

    return res.json({ success: true, message: 'Breakout room closed' });
  } catch (error) {
    console.error('closeBreakoutRoom error:', error);
    return res.status(500).json({ success: false, message: 'Failed to close breakout room' });
  }
};

export const muteParticipant = async (req, res) => {
  try {
    const access = await ensureRoomAccess(req.params.roomId, req.user, { requireManager: true });
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    await db.query(
      'UPDATE edumeet_participants SET mic_enabled = 0 WHERE room_id = ? AND user_id = ?',
      [req.params.roomId, req.params.targetUserId]
    );

    return res.json({ success: true, message: 'Participant muted' });
  } catch (error) {
    console.error('muteParticipant error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mute participant' });
  }
};

export const listNotes = async (req, res) => {
  try {
    const access = await ensureRoomAccess(req.params.roomId, req.user);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });
    const notes = await loadNotes(req.params.roomId);
    return res.json({ success: true, notes });
  } catch (error) {
    console.error('listNotes error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load notes' });
  }
};

export const createNote = async (req, res) => {
  try {
    const { roomId } = req.params;
    const access = await ensureRoomAccess(roomId, req.user);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const noteText = String(req.body?.note_text || '').trim();
    const sourceMessageId = req.body?.source_message_id || null;
    if (!noteText) return res.status(400).json({ success: false, message: 'Note text is required' });

    const [result] = await db.query(
      'INSERT INTO edumeet_notes (room_id, user_id, source_message_id, note_text) VALUES (?, ?, ?, ?)',
      [roomId, req.user.id, sourceMessageId, noteText]
    );

    const [rows] = await db.query(
      `SELECT n.*, u.first_name, u.last_name
       FROM edumeet_notes n
       JOIN users u ON u.id = n.user_id
       WHERE n.id = ? LIMIT 1`,
      [result.insertId]
    );
    return res.status(201).json({ success: true, note: rows[0] || null });
  } catch (error) {
    console.error('createNote error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save note' });
  }
};

export const updateNote = async (req, res) => {
  try {
    const { roomId, noteId } = req.params;
    const access = await ensureRoomAccess(roomId, req.user);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const noteText = String(req.body?.note_text || '').trim();
    const pinned = req.body?.pinned;
    if (!noteText && typeof pinned !== 'boolean') {
      return res.status(400).json({ success: false, message: 'No note changes provided' });
    }

    const [existingRows] = await db.query('SELECT * FROM edumeet_notes WHERE id = ? AND room_id = ? LIMIT 1', [noteId, roomId]);
    if (!existingRows.length) return res.status(404).json({ success: false, message: 'Note not found' });

    const existing = existingRows[0];
    const canManageAny = MANAGEMENT_ROLES.has(req.user.role);
    if (!canManageAny && String(existing.user_id) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not allowed to edit this note' });
    }

    await db.query(
      'UPDATE edumeet_notes SET note_text = ?, pinned = ? WHERE id = ? AND room_id = ?',
      [noteText || existing.note_text, typeof pinned === 'boolean' ? Number(pinned) : existing.pinned, noteId, roomId]
    );

    const [rows] = await db.query(
      `SELECT n.*, u.first_name, u.last_name
       FROM edumeet_notes n
       JOIN users u ON u.id = n.user_id
       WHERE n.id = ? LIMIT 1`,
      [noteId]
    );
    return res.json({ success: true, note: rows[0] || null });
  } catch (error) {
    console.error('updateNote error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update note' });
  }
};

export const deleteNote = async (req, res) => {
  try {
    const { roomId, noteId } = req.params;
    const access = await ensureRoomAccess(roomId, req.user);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const [existingRows] = await db.query('SELECT * FROM edumeet_notes WHERE id = ? AND room_id = ? LIMIT 1', [noteId, roomId]);
    if (!existingRows.length) return res.status(404).json({ success: false, message: 'Note not found' });
    const existing = existingRows[0];
    const canManageAny = MANAGEMENT_ROLES.has(req.user.role);
    if (!canManageAny && String(existing.user_id) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not allowed to delete this note' });
    }

    await db.query('DELETE FROM edumeet_notes WHERE id = ? AND room_id = ?', [noteId, roomId]);
    return res.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    console.error('deleteNote error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete note' });
  }
};

export const getHandQueue = async (req, res) => {
  try {
    const access = await ensureRoomAccess(req.params.roomId, req.user);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });
    const queue = await loadHandQueue(req.params.roomId);
    return res.json({ success: true, queue });
  } catch (error) {
    console.error('getHandQueue error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load hand queue' });
  }
};

export const updateHandQueue = async (req, res) => {
  try {
    const { roomId, userId } = req.params;
    const access = await ensureRoomAccess(roomId, req.user, { requireManager: true });
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const action = String(req.body?.action || '').toLowerCase();
    if (!['accept', 'dismiss'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be accept or dismiss' });
    }

    await db.query(
      'UPDATE edumeet_hand_queue SET status = ?, updated_at = NOW() WHERE room_id = ? AND user_id = ? AND status = \"queued\"',
      [action === 'accept' ? 'accepted' : 'dismissed', roomId, userId]
    );

    if (action === 'accept') {
      await db.query('UPDATE edumeet_participants SET spotlighted = (user_id = ?) WHERE room_id = ?', [userId, roomId]);
    }

    const queue = await loadHandQueue(roomId);
    return res.json({ success: true, queue });
  } catch (error) {
    console.error('updateHandQueue error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update hand queue' });
  }
};

export const getLiveKitToken = async (req, res) => {
  try {
    const access = await ensureRoomAccess(req.params.roomId, req.user);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) {
      return res.status(503).json({ success: false, message: 'LiveKit not configured on this server' });
    }

    const { room } = access;
    const identity = String(req.user.id);
    const participantName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || identity;
    const roomName = `room-${room.id}`;

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: participantName,
      ttl: '4h',
    });
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    return res.json({
      success: true,
      token,
      url: process.env.LIVEKIT_PUBLIC_URL || 'wss://app.eduima.com/livekit',
      roomName,
      identity,
      participantName,
    });
  } catch (error) {
    console.error('getLiveKitToken error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate LiveKit token' });
  }
};
