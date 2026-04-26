import jwt from 'jsonwebtoken';
import db from '../config/database.js';

const ROOM_ROLE_MAP = {
  faculty: 'teacher',
  school_admin: 'admin',
  super_admin: 'admin',
  student: 'student',
};

const roomRoleForUser = (userRole) => ROOM_ROLE_MAP[userRole] || 'student';
const parseJson = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const roomChannel = (roomId) => `edumeet:${roomId}`;
const userChannel = (userId) => `edumeet:user:${userId}`;
const roomHostLocks = new Map();
const roomActiveScreenShare = new Map();

const getRoomLocks = (roomId) => roomHostLocks.get(String(roomId)) || { micLocked: false, videoLocked: false };

const getRoom = async (roomId) => {
  const [[room]] = await db.query('SELECT * FROM edumeet_rooms WHERE id = ? LIMIT 1', [roomId]);
  return room || null;
};

const getParticipantSnapshot = async (roomId) => {
  const [rows] = await db.query(
    `SELECT ep.room_id, ep.user_id, ep.role, ep.status, ep.hand_raised, ep.mic_enabled,
            ep.camera_enabled, ep.spotlighted, ep.attendance_marked, ep.low_bandwidth_mode,
            ep.audio_device_label, ep.video_quality, ep.joined_at, ep.last_seen_at,
            u.first_name, u.last_name, u.email
     FROM edumeet_participants ep
     JOIN users u ON u.id = ep.user_id
     WHERE ep.room_id = ? AND ep.status IN ('joined', 'in_room')
     ORDER BY FIELD(ep.role, 'admin', 'teacher', 'student'), ep.spotlighted DESC, u.first_name ASC`,
    [roomId]
  );
  return rows;
};

const getHandQueueSnapshot = async (roomId) => {
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

const getNotesSnapshot = async (roomId) => {
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

const getMessageById = async (messageId) => {
  const [[row]] = await db.query(
    `SELECT m.*, sender.first_name AS sender_first_name, sender.last_name AS sender_last_name,
            recipient.first_name AS recipient_first_name, recipient.last_name AS recipient_last_name
     FROM edumeet_messages m
     JOIN users sender ON sender.id = m.sender_id
     LEFT JOIN users recipient ON recipient.id = m.recipient_id
     WHERE m.id = ?`,
    [messageId]
  );
  return row ? { ...row, metadata: parseJson(row.metadata_json, null) } : null;
};

const ensureParticipant = async (roomId, user) => {
  await db.query(
    `INSERT INTO edumeet_participants (room_id, user_id, role, status, joined_at, last_seen_at)
     VALUES (?, ?, ?, 'in_room', NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       role = VALUES(role),
       status = IF(status = 'removed', status, 'in_room'),
       joined_at = COALESCE(joined_at, NOW()),
       last_seen_at = NOW()`,
    [roomId, user.id, roomRoleForUser(user.role)]
  );
};

const updateParticipantState = async (roomId, userId, fields) => {
  const updates = [];
  const params = [];
  Object.entries(fields).forEach(([key, value]) => {
    updates.push(`${key} = ?`);
    params.push(value);
  });
  if (!updates.length) return;
  params.push(roomId, userId);
  await db.query(`UPDATE edumeet_participants SET ${updates.join(', ')}, last_seen_at = NOW() WHERE room_id = ? AND user_id = ?`, params);
};

export const registerEduMeetSocket = (io) => {
  const eduMeetIO = io.of('/edumeet');

  const emitScreenShareStatus = (roomId, payload = null) => {
    eduMeetIO.to(roomChannel(roomId)).emit('screen-share:status', payload || { roomId, active: false });
  };

  eduMeetIO.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Missing auth token'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.user = decoded;
      socket.join(userChannel(decoded.id));
      return next();
    } catch {
      return next(new Error('Invalid auth token'));
    }
  });

  eduMeetIO.on('connection', (socket) => {
    socket.data.rooms = new Set();

    socket.on('meeting:join', async ({ roomId }) => {
      try {
        const room = await getRoom(roomId);
        if (!room) {
          socket.emit('meeting:error', { message: 'Room not found' });
          return;
        }
        if (room.status === 'ended') {
          socket.emit('room:ended', {
            roomId,
            message: 'This session has ended. Rejoining is disabled.',
          });
          return;
        }
        if (socket.data.user.role !== 'super_admin' && room.school_id !== socket.data.user.school_id) {
          socket.emit('meeting:error', { message: 'Access denied' });
          return;
        }

        await ensureParticipant(roomId, socket.data.user);
        socket.join(roomChannel(roomId));
        socket.data.rooms.add(String(roomId));
        const participants = await getParticipantSnapshot(roomId);
        eduMeetIO.to(roomChannel(roomId)).emit('participant:presence', participants);
        // WebRTC: notify existing peers, send existing peer list to newcomer
        socket.to(roomChannel(roomId)).emit('webrtc:new-peer', { userId: socket.data.user.id });
        const existingPeerIds = participants
          .filter((p) => p.user_id !== socket.data.user.id)
          .map((p) => ({ userId: p.user_id }));
        socket.emit('webrtc:existing-peers', existingPeerIds);
        socket.emit('host:locks', { roomId, ...getRoomLocks(roomId) });
        const existingScreenShare = roomActiveScreenShare.get(String(roomId));
        if (existingScreenShare) {
          socket.emit('screen-share:status', existingScreenShare);
        }
      } catch (error) {
        socket.emit('meeting:error', { message: 'Failed to join meeting room' });
      }
    });

    socket.on('meeting:leave', async ({ roomId }) => {
      try {
        await updateParticipantState(roomId, socket.data.user.id, { status: 'left', left_at: new Date() });
        socket.leave(roomChannel(roomId));
        socket.data.rooms.delete(String(roomId));
        const sharing = roomActiveScreenShare.get(String(roomId));
        if (sharing && String(sharing.userId) === String(socket.data.user.id)) {
          roomActiveScreenShare.delete(String(roomId));
          emitScreenShareStatus(roomId);
        }
        const participants = await getParticipantSnapshot(roomId);
        eduMeetIO.to(roomChannel(roomId)).emit('participant:presence', participants);
        eduMeetIO.to(roomChannel(roomId)).emit('webrtc:peer-left', { userId: socket.data.user.id });
      } catch {
        // ignore best-effort leave
      }
    });

    socket.on('screen-share:status', ({ roomId, active }) => {
      const isActive = Boolean(active);
      if (isActive) {
        const payload = {
          roomId,
          active: true,
          userId: socket.data.user.id,
          firstName: socket.data.user.first_name,
          lastName: socket.data.user.last_name,
        };
        roomActiveScreenShare.set(String(roomId), payload);
        emitScreenShareStatus(roomId, payload);
        return;
      }

      const sharing = roomActiveScreenShare.get(String(roomId));
      if (!sharing || String(sharing.userId) === String(socket.data.user.id)) {
        roomActiveScreenShare.delete(String(roomId));
        emitScreenShareStatus(roomId);
      }
    });

    socket.on('media:update', async ({ roomId, micEnabled, cameraEnabled, lowBandwidthMode, audioDeviceLabel, videoQuality }) => {
      try {
        const [[participant]] = await db.query(
          'SELECT role FROM edumeet_participants WHERE room_id = ? AND user_id = ?',
          [roomId, socket.data.user.id]
        );
        const isManager = participant && ['admin', 'teacher'].includes(participant.role);
        const locks = getRoomLocks(roomId);
        const nextMicEnabled = !isManager && locks.micLocked ? 0 : (micEnabled ? 1 : 0);
        const nextCameraEnabled = !isManager && locks.videoLocked ? 0 : (cameraEnabled ? 1 : 0);

        await updateParticipantState(roomId, socket.data.user.id, {
          mic_enabled: nextMicEnabled,
          camera_enabled: nextCameraEnabled,
          low_bandwidth_mode: lowBandwidthMode ? 1 : 0,
          audio_device_label: audioDeviceLabel || null,
          video_quality: videoQuality === 'low' ? 'low' : 'high',
          status: 'in_room',
        });
        const participants = await getParticipantSnapshot(roomId);
        eduMeetIO.to(roomChannel(roomId)).emit('participant:presence', participants);
      } catch {
        socket.emit('meeting:error', { message: 'Failed to update media state' });
      }
    });

    socket.on('participant:mute', async ({ roomId, targetUserId }) => {
      try {
        const [[participant]] = await db.query(
          'SELECT role FROM edumeet_participants WHERE room_id = ? AND user_id = ?',
          [roomId, socket.data.user.id]
        );
        if (!participant || !['admin', 'teacher'].includes(participant.role)) return;

        await db.query(
          `UPDATE edumeet_participants
           SET mic_enabled = FALSE, last_seen_at = NOW()
           WHERE room_id = ? AND user_id = ? AND status IN ('joined', 'in_room')`,
          [roomId, targetUserId]
        );

        const participants = await getParticipantSnapshot(roomId);
        eduMeetIO.to(roomChannel(roomId)).emit('participant:presence', participants);
        eduMeetIO.to(userChannel(targetUserId)).emit('participant:muted', { roomId, userId: targetUserId, byUserId: socket.data.user.id });
      } catch {
        socket.emit('meeting:error', { message: 'Failed to mute participant' });
      }
    });

    socket.on('host:locks:set', async ({ roomId, micLocked = false, videoLocked = false, muteAllNow = false, stopAllVideoNow = false }) => {
      try {
        const [[participant]] = await db.query(
          'SELECT role FROM edumeet_participants WHERE room_id = ? AND user_id = ?',
          [roomId, socket.data.user.id]
        );
        if (!participant || !['admin', 'teacher'].includes(participant.role)) return;

        const lockState = { micLocked: Boolean(micLocked), videoLocked: Boolean(videoLocked) };
        roomHostLocks.set(String(roomId), lockState);

        if (lockState.micLocked || muteAllNow) {
          await db.query(
            `UPDATE edumeet_participants
             SET mic_enabled = FALSE
             WHERE room_id = ? AND role = 'student' AND status IN ('joined', 'in_room')`,
            [roomId]
          );
        }
        if (lockState.videoLocked || stopAllVideoNow) {
          await db.query(
            `UPDATE edumeet_participants
             SET camera_enabled = FALSE
             WHERE room_id = ? AND role = 'student' AND status IN ('joined', 'in_room')`,
            [roomId]
          );
        }

        const participants = await getParticipantSnapshot(roomId);
        eduMeetIO.to(roomChannel(roomId)).emit('participant:presence', participants);
        eduMeetIO.to(roomChannel(roomId)).emit('host:locks', { roomId, ...lockState });
      } catch {
        socket.emit('meeting:error', { message: 'Failed to apply host media lock' });
      }
    });

    socket.on('hand:toggle', async ({ roomId, raised }) => {
      try {
        await updateParticipantState(roomId, socket.data.user.id, {
          hand_raised: raised ? 1 : 0,
          status: 'in_room',
        });
        if (raised) {
          const [[nextOrderRow]] = await db.query(
            'SELECT COALESCE(MAX(queue_order), 0) AS max_order FROM edumeet_hand_queue WHERE room_id = ? AND status = \"queued\"',
            [roomId]
          );
          await db.query(
            `INSERT INTO edumeet_hand_queue (room_id, user_id, status, queue_order)
             VALUES (?, ?, 'queued', ?)
             ON DUPLICATE KEY UPDATE status = 'queued', queue_order = VALUES(queue_order), raised_at = NOW()`,
            [roomId, socket.data.user.id, Number(nextOrderRow?.max_order || 0) + 1]
          );
        } else {
          await db.query(
            'UPDATE edumeet_hand_queue SET status = \"dismissed\", updated_at = NOW() WHERE room_id = ? AND user_id = ? AND status = \"queued\"',
            [roomId, socket.data.user.id]
          );
        }

        const participants = await getParticipantSnapshot(roomId);
        const queue = await getHandQueueSnapshot(roomId);
        eduMeetIO.to(roomChannel(roomId)).emit('participant:presence', participants);
        eduMeetIO.to(roomChannel(roomId)).emit('hand:queue', { roomId, queue });
      } catch {
        socket.emit('meeting:error', { message: 'Failed to update hand raise state' });
      }
    });

    socket.on('hand:queue:update', async ({ roomId, userId, action }) => {
      try {
        const [[participant]] = await db.query(
          'SELECT role FROM edumeet_participants WHERE room_id = ? AND user_id = ?',
          [roomId, socket.data.user.id]
        );
        if (!participant || !['admin', 'teacher'].includes(participant.role)) return;

        const normalizedAction = String(action || '').toLowerCase();
        if (!['accept', 'dismiss'].includes(normalizedAction)) return;

        await db.query(
          'UPDATE edumeet_hand_queue SET status = ?, updated_at = NOW() WHERE room_id = ? AND user_id = ? AND status = \"queued\"',
          [normalizedAction === 'accept' ? 'accepted' : 'dismissed', roomId, userId]
        );

        if (normalizedAction === 'accept') {
          await db.query('UPDATE edumeet_participants SET spotlighted = (user_id = ?) WHERE room_id = ?', [userId, roomId]);
        }

        const queue = await getHandQueueSnapshot(roomId);
        const participants = await getParticipantSnapshot(roomId);
        eduMeetIO.to(roomChannel(roomId)).emit('hand:queue', { roomId, queue });
        eduMeetIO.to(roomChannel(roomId)).emit('participant:presence', participants);
      } catch {
        socket.emit('meeting:error', { message: 'Failed to update hand queue' });
      }
    });

    socket.on('notes:create', async ({ roomId, noteText, sourceMessageId = null }) => {
      try {
        const trimmed = String(noteText || '').trim();
        if (!trimmed) return;
        await db.query(
          'INSERT INTO edumeet_notes (room_id, user_id, source_message_id, note_text) VALUES (?, ?, ?, ?)',
          [roomId, socket.data.user.id, sourceMessageId, trimmed]
        );
        const notes = await getNotesSnapshot(roomId);
        eduMeetIO.to(roomChannel(roomId)).emit('notes:updated', { roomId, notes });
      } catch {
        socket.emit('meeting:error', { message: 'Failed to create note' });
      }
    });

    socket.on('notes:update', async ({ roomId, noteId, noteText, pinned }) => {
      try {
        const [rows] = await db.query('SELECT user_id FROM edumeet_notes WHERE id = ? AND room_id = ? LIMIT 1', [noteId, roomId]);
        if (!rows.length) return;
        const isOwner = String(rows[0].user_id) === String(socket.data.user.id);
        const canManage = ['faculty', 'school_admin', 'super_admin'].includes(socket.data.user.role);
        if (!isOwner && !canManage) return;

        await db.query(
          'UPDATE edumeet_notes SET note_text = COALESCE(?, note_text), pinned = COALESCE(?, pinned), updated_at = NOW() WHERE id = ? AND room_id = ?',
          [noteText || null, typeof pinned === 'boolean' ? Number(pinned) : null, noteId, roomId]
        );

        const notes = await getNotesSnapshot(roomId);
        eduMeetIO.to(roomChannel(roomId)).emit('notes:updated', { roomId, notes });
      } catch {
        socket.emit('meeting:error', { message: 'Failed to update note' });
      }
    });

    socket.on('notes:delete', async ({ roomId, noteId }) => {
      try {
        const [rows] = await db.query('SELECT user_id FROM edumeet_notes WHERE id = ? AND room_id = ? LIMIT 1', [noteId, roomId]);
        if (!rows.length) return;
        const isOwner = String(rows[0].user_id) === String(socket.data.user.id);
        const canManage = ['faculty', 'school_admin', 'super_admin'].includes(socket.data.user.role);
        if (!isOwner && !canManage) return;

        await db.query('DELETE FROM edumeet_notes WHERE id = ? AND room_id = ?', [noteId, roomId]);
        const notes = await getNotesSnapshot(roomId);
        eduMeetIO.to(roomChannel(roomId)).emit('notes:updated', { roomId, notes });
      } catch {
        socket.emit('meeting:error', { message: 'Failed to delete note' });
      }
    });

    socket.on('reaction:send', ({ roomId, emoji }) => {
      eduMeetIO.to(roomChannel(roomId)).emit('reaction:received', {
        roomId,
        userId: socket.data.user.id,
        firstName: socket.data.user.first_name,
        lastName: socket.data.user.last_name,
        emoji,
        createdAt: new Date().toISOString(),
      });
    });

    socket.on('poll:new', ({ roomId, poll }) => {
      if (!roomId || !poll) return;
      eduMeetIO.to(roomChannel(roomId)).emit('poll:new', {
        roomId,
        poll,
        byUserId: socket.data.user.id,
        createdAt: new Date().toISOString(),
      });
    });

    socket.on('poll:update', ({ roomId, poll }) => {
      if (!roomId || !poll) return;
      eduMeetIO.to(roomChannel(roomId)).emit('poll:update', {
        roomId,
        poll,
        byUserId: socket.data.user.id,
        createdAt: new Date().toISOString(),
      });
    });

    socket.on('poll:end', ({ roomId, poll }) => {
      if (!roomId || !poll) return;
      eduMeetIO.to(roomChannel(roomId)).emit('poll:end', {
        roomId,
        poll,
        byUserId: socket.data.user.id,
        createdAt: new Date().toISOString(),
      });
    });

    socket.on('poll:delete', ({ roomId, pollId }) => {
      if (!roomId || !pollId) return;
      eduMeetIO.to(roomChannel(roomId)).emit('poll:delete', {
        roomId,
        pollId,
        byUserId: socket.data.user.id,
        createdAt: new Date().toISOString(),
      });
    });

    socket.on('recording:status', ({ roomId, active, title = '' }) => {
      eduMeetIO.to(roomChannel(roomId)).emit('recording:status', {
        roomId,
        active: Boolean(active),
        title,
        userId: socket.data.user.id,
        firstName: socket.data.user.first_name,
        lastName: socket.data.user.last_name,
        createdAt: new Date().toISOString(),
      });
    });

    socket.on('chat:send', async ({ roomId, content, recipientId = null, metadata = null }) => {
      try {
        const [result] = await db.query(
          `INSERT INTO edumeet_messages (room_id, sender_id, recipient_id, message_type, content, metadata_json)
           VALUES (?, ?, ?, 'text', ?, ?)`,
          [roomId, socket.data.user.id, recipientId || null, String(content || '').trim(), metadata ? JSON.stringify(metadata) : null]
        );
        const message = await getMessageById(result.insertId);
        if (!message) return;

        if (recipientId) {
          eduMeetIO.to(userChannel(socket.data.user.id)).emit('chat:message', message);
          eduMeetIO.to(userChannel(recipientId)).emit('chat:message', message);
        } else {
          eduMeetIO.to(roomChannel(roomId)).emit('chat:message', message);
        }
      } catch {
        socket.emit('meeting:error', { message: 'Failed to send message' });
      }
    });

    socket.on('whiteboard:draw', async ({ roomId, stroke }) => {
      try {
        await db.query(
          'INSERT INTO edumeet_whiteboard_events (room_id, user_id, event_type, payload_json) VALUES (?, ?, ?, ?)',
          [roomId, socket.data.user.id, 'draw', JSON.stringify(stroke || {})]
        );
        socket.to(roomChannel(roomId)).emit('whiteboard:draw', {
          roomId,
          userId: socket.data.user.id,
          stroke,
        });
      } catch {
        socket.emit('meeting:error', { message: 'Failed to sync whiteboard stroke' });
      }
    });

    socket.on('whiteboard:clear', async ({ roomId }) => {
      try {
        await db.query('DELETE FROM edumeet_whiteboard_events WHERE room_id = ?', [roomId]);
        eduMeetIO.to(roomChannel(roomId)).emit('whiteboard:clear', { roomId });
      } catch {
        socket.emit('meeting:error', { message: 'Failed to clear whiteboard' });
      }
    });

    socket.on('webrtc:offer', ({ toUserId, offer }) => {
      eduMeetIO.to(userChannel(toUserId)).emit('webrtc:offer', {
        fromUserId: socket.data.user.id,
        offer,
      });
    });

    socket.on('webrtc:answer', ({ toUserId, answer }) => {
      eduMeetIO.to(userChannel(toUserId)).emit('webrtc:answer', {
        fromUserId: socket.data.user.id,
        answer,
      });
    });

    socket.on('webrtc:ice-candidate', ({ toUserId, candidate }) => {
      eduMeetIO.to(userChannel(toUserId)).emit('webrtc:ice-candidate', {
        fromUserId: socket.data.user.id,
        candidate,
      });
    });

    // Waiting room: host broadcasts admit/reject; participants get notified
    socket.on('waiting:decide', async ({ roomId, targetUserId, action }) => {
      try {
        // only managers can emit this
        const [[participant]] = await db.query(
          'SELECT role FROM edumeet_participants WHERE room_id = ? AND user_id = ?',
          [roomId, socket.data.user.id]
        );
        if (!participant || !['admin', 'teacher'].includes(participant.role)) return;

        const status = action === 'admit' ? 'admitted' : 'rejected';
        await db.query(
          `UPDATE edumeet_waiting_room SET status = ?, decided_at = NOW(), decided_by = ?
           WHERE room_id = ? AND user_id = ?`,
          [status, socket.data.user.id, roomId, targetUserId]
        );

        if (status === 'admitted') {
          await db.query(
            `INSERT INTO edumeet_participants (room_id, user_id, role, status, joined_at, last_seen_at)
             VALUES (?, ?, 'student', 'joined', NOW(), NOW())
             ON DUPLICATE KEY UPDATE status = IF(status = 'removed', status, 'joined'), last_seen_at = NOW()`,
            [roomId, targetUserId]
          );
        }

        // Notify the waiting participant
        eduMeetIO.to(userChannel(targetUserId)).emit('waiting:decision', {
          roomId,
          action: status,
          decidedBy: { id: socket.data.user.id, firstName: socket.data.user.first_name },
        });

        // Refresh host's waiting room list
        const [waiting] = await db.query(
          `SELECT w.*, u.first_name, u.last_name FROM edumeet_waiting_room w
           JOIN users u ON u.id = w.user_id
           WHERE w.room_id = ? AND w.status = 'waiting'`,
          [roomId]
        );
        socket.emit('waiting:list', { roomId, waiting });

        if (status === 'admitted') {
          const participants = await getParticipantSnapshot(roomId);
          eduMeetIO.to(roomChannel(roomId)).emit('participant:presence', participants);
        }
      } catch {
        // ignore waiting decision errors
      }
    });

    socket.on('waiting:request', async ({ roomId }) => {
      try {
        const room = await getRoom(roomId);
        if (!room) return;
        await db.query(
          `INSERT INTO edumeet_waiting_room (room_id, user_id, display_name, status, requested_at)
           VALUES (?, ?, ?, 'waiting', NOW())
           ON DUPLICATE KEY UPDATE status = 'waiting', requested_at = NOW(), decided_at = NULL`,
          [roomId, socket.data.user.id, `${socket.data.user.first_name} ${socket.data.user.last_name}`]
        );
        // Notify all managers in the room
        const [waiting] = await db.query(
          `SELECT w.*, u.first_name, u.last_name FROM edumeet_waiting_room w
           JOIN users u ON u.id = w.user_id
           WHERE w.room_id = ? AND w.status = 'waiting'`,
          [roomId]
        );
        socket.to(roomChannel(roomId)).emit('waiting:knock', {
          roomId,
          userId: socket.data.user.id,
          firstName: socket.data.user.first_name,
          lastName: socket.data.user.last_name,
        });
        socket.to(roomChannel(roomId)).emit('waiting:list', { roomId, waiting });
      } catch {
        // ignore
      }
    });

    // Speaker activity (client sends audio level, server relays)
    socket.on('speaker:activity', ({ roomId, level }) => {
      socket.to(roomChannel(roomId)).emit('speaker:activity', {
        userId: socket.data.user.id,
        level: Math.min(1, Math.max(0, Number(level) || 0)),
      });
    });

    // Room end broadcast (organizer ends session, notify all participants)
    socket.on('room:end', ({ roomId }) => {
      try {
        // Broadcast end event to all participants in this room
        eduMeetIO.to(roomChannel(roomId)).emit('room:ended', {
          roomId,
          endedBy: socket.data.user.id,
          message: 'The organizer has ended this session.',
        });
        // Disconnect all participants from the room channel
        setTimeout(() => {
          eduMeetIO.to(roomChannel(roomId)).disconnectSockets();
        }, 500);
      } catch {
        // ignore room end errors
      }
    });

    socket.on('disconnect', async () => {
      try {
        await Promise.all(
          [...socket.data.rooms].map(async (roomId) => {
            const sharing = roomActiveScreenShare.get(String(roomId));
            if (sharing && String(sharing.userId) === String(socket.data.user.id)) {
              roomActiveScreenShare.delete(String(roomId));
              emitScreenShareStatus(roomId);
            }
            eduMeetIO.to(roomChannel(roomId)).emit('webrtc:peer-left', { userId: socket.data.user.id });
            await updateParticipantState(roomId, socket.data.user.id, { status: 'left', left_at: new Date() });
            const participants = await getParticipantSnapshot(roomId);
            eduMeetIO.to(roomChannel(roomId)).emit('participant:presence', participants);
            return true;
          })
        );
      } catch {
        // ignore on disconnect
      }
    });
  });

  return eduMeetIO;
};
