import db from '../config/database.js';
import crypto from 'crypto';
import { executeCode, evaluateAgainstTestCases } from '../services/codeExecutionService.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const generateInviteCode = () => crypto.randomBytes(4).toString('hex').toUpperCase();

const assertFaculty = (req, res) => {
  if (!['faculty', 'school_admin'].includes(req.user.role)) {
    res.status(403).json({ success: false, message: 'Only faculty or school admins can perform this action' });
    return false;
  }
  return true;
};

const getRoomWithAccess = async (roomId, userId, schoolId, requireFaculty = false) => {
  const [[room]] = await db.query(
    'SELECT * FROM codearena_rooms WHERE id = ? AND school_id = ?',
    [roomId, schoolId]
  );
  if (!room) return { error: 'Room not found', status: 404 };

  if (requireFaculty && room.creator_id !== userId) {
    return { error: 'Only the room creator can perform this action', status: 403 };
  }

  if (!requireFaculty) {
    const [[participant]] = await db.query(
      'SELECT id FROM codearena_participants WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );
    if (!participant && room.creator_id !== userId) {
      return { error: 'You are not a participant of this room', status: 403 };
    }
  }

  return { room };
};

// ---------------------------------------------------------------------------
// ROOM MANAGEMENT
// ---------------------------------------------------------------------------

export const createRoom = async (req, res) => {
  if (!assertFaculty(req, res)) return;
  try {
    const { title, description, duration_minutes = 60, mode = 'practice', max_attempts = 3 } = req.body;
    const { id: userId, school_id: schoolId } = req.user;

    if (!title || String(title).trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const invite_code = generateInviteCode();

    const [result] = await db.query(
      `INSERT INTO codearena_rooms (school_id, creator_id, title, description, duration_minutes, mode, invite_code, max_attempts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [schoolId, userId, String(title).trim(), description || null, Number(duration_minutes), mode, invite_code, Number(max_attempts)]
    );

    // Add creator as faculty participant
    await db.query(
      `INSERT INTO codearena_participants (room_id, user_id, role, status) VALUES (?, ?, 'faculty', 'active')`,
      [result.insertId, userId]
    );

    const [[room]] = await db.query('SELECT * FROM codearena_rooms WHERE id = ?', [result.insertId]);
    return res.status(201).json({ success: true, room });
  } catch (error) {
    console.error('createRoom error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create room' });
  }
};

export const listRooms = async (req, res) => {
  try {
    const { id: userId, school_id: schoolId, role } = req.user;
    const { status } = req.query;

    let query;
    const params = [schoolId, userId];

    if (['faculty', 'school_admin'].includes(role)) {
      // Faculty sees rooms they created
      query = `
        SELECT r.*, 
          (SELECT COUNT(*) FROM codearena_participants WHERE room_id = r.id AND role = 'student') AS student_count,
          (SELECT COUNT(*) FROM codearena_problems WHERE room_id = r.id) AS problem_count
        FROM codearena_rooms r
        WHERE r.school_id = ? AND r.creator_id = ?
        ${status ? 'AND r.status = ?' : ''}
        ORDER BY r.created_at DESC
      `;
      if (status) params.push(status);
    } else {
      // Students see rooms they're invited to / have joined
      query = `
        SELECT r.*,
          p.status AS my_status, p.join_time,
          (SELECT COUNT(*) FROM codearena_problems WHERE room_id = r.id) AS problem_count
        FROM codearena_rooms r
        JOIN codearena_participants p ON p.room_id = r.id AND p.user_id = ?
        WHERE r.school_id = ?
        ${status ? 'AND r.status = ?' : ''}
        ORDER BY r.created_at DESC
      `;
      params.unshift(userId);
      params.splice(1, 0, schoolId);
      if (status) params.push(status);
    }

    const [rooms] = await db.query(query, params);
    return res.json({ success: true, rooms });
  } catch (error) {
    console.error('listRooms error:', error);
    return res.status(500).json({ success: false, message: 'Failed to list rooms' });
  }
};

export const getRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { id: userId, school_id: schoolId } = req.user;

    const { room, error, status } = await getRoomWithAccess(roomId, userId, schoolId);
    if (error) return res.status(status).json({ success: false, message: error });

    // Fetch problems (hide test cases from students in exam mode)
    const isCreator = room.creator_id === userId;
    const [problems] = await db.query(
      'SELECT * FROM codearena_problems WHERE room_id = ? ORDER BY order_index ASC',
      [roomId]
    );

    const enrichedProblems = await Promise.all(
      problems.map(async (prob) => {
        let testCases = [];
        if (isCreator) {
          const [tc] = await db.query('SELECT * FROM codearena_test_cases WHERE problem_id = ?', [prob.id]);
          testCases = tc;
        } else if (room.mode === 'practice') {
          const [tc] = await db.query(
            'SELECT * FROM codearena_test_cases WHERE problem_id = ? AND is_hidden = FALSE',
            [prob.id]
          );
          testCases = tc;
        }
        return { ...prob, test_cases: testCases };
      })
    );

    const [[myParticipant]] = await db.query(
      'SELECT * FROM codearena_participants WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );

    return res.json({ success: true, room: { ...room, problems: enrichedProblems }, myParticipant });
  } catch (error) {
    console.error('getRoom error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get room' });
  }
};

export const updateRoom = async (req, res) => {
  if (!assertFaculty(req, res)) return;
  try {
    const { roomId } = req.params;
    const { id: userId, school_id: schoolId } = req.user;
    const { room, error, status } = await getRoomWithAccess(roomId, userId, schoolId, true);
    if (error) return res.status(status).json({ success: false, message: error });

    if (room.status === 'ended') {
      return res.status(400).json({ success: false, message: 'Cannot edit an ended room' });
    }

    const { title, description, duration_minutes, mode, max_attempts } = req.body;
    await db.query(
      `UPDATE codearena_rooms SET title = ?, description = ?, duration_minutes = ?, mode = ?, max_attempts = ? WHERE id = ?`,
      [
        title || room.title,
        description !== undefined ? description : room.description,
        duration_minutes || room.duration_minutes,
        mode || room.mode,
        max_attempts !== undefined ? Number(max_attempts) : room.max_attempts,
        roomId,
      ]
    );

    const [[updated]] = await db.query('SELECT * FROM codearena_rooms WHERE id = ?', [roomId]);
    return res.json({ success: true, room: updated });
  } catch (error) {
    console.error('updateRoom error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update room' });
  }
};

export const startRoom = async (req, res) => {
  if (!assertFaculty(req, res)) return;
  try {
    const { roomId } = req.params;
    const { id: userId, school_id: schoolId } = req.user;
    const { room, error, status } = await getRoomWithAccess(roomId, userId, schoolId, true);
    if (error) return res.status(status).json({ success: false, message: error });

    if (room.status !== 'draft') {
      return res.status(400).json({ success: false, message: `Room is already ${room.status}` });
    }

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + room.duration_minutes * 60_000);

    await db.query(
      `UPDATE codearena_rooms SET status = 'active', starts_at = ?, ends_at = ? WHERE id = ?`,
      [startsAt, endsAt, roomId]
    );

    return res.json({ success: true, message: 'Room started', starts_at: startsAt, ends_at: endsAt });
  } catch (error) {
    console.error('startRoom error:', error);
    return res.status(500).json({ success: false, message: 'Failed to start room' });
  }
};

export const endRoom = async (req, res) => {
  if (!assertFaculty(req, res)) return;
  try {
    const { roomId } = req.params;
    const { id: userId, school_id: schoolId } = req.user;
    const { room, error, status } = await getRoomWithAccess(roomId, userId, schoolId, true);
    if (error) return res.status(status).json({ success: false, message: error });

    if (room.status === 'ended') {
      return res.status(400).json({ success: false, message: 'Room already ended' });
    }

    await db.query(`UPDATE codearena_rooms SET status = 'ended', ends_at = NOW() WHERE id = ?`, [roomId]);
    return res.json({ success: true, message: 'Room ended' });
  } catch (error) {
    console.error('endRoom error:', error);
    return res.status(500).json({ success: false, message: 'Failed to end room' });
  }
};

export const deleteRoom = async (req, res) => {
  if (!assertFaculty(req, res)) return;
  try {
    const { roomId } = req.params;
    const { id: userId, school_id: schoolId } = req.user;
    const { room, error, status } = await getRoomWithAccess(roomId, userId, schoolId, true);
    if (error) return res.status(status).json({ success: false, message: error });

    await db.query('DELETE FROM codearena_rooms WHERE id = ?', [roomId]);
    return res.json({ success: true, message: 'Room deleted' });
  } catch (error) {
    console.error('deleteRoom error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete room' });
  }
};

// ---------------------------------------------------------------------------
// PARTICIPANT MANAGEMENT
// ---------------------------------------------------------------------------

export const inviteParticipants = async (req, res) => {
  if (!assertFaculty(req, res)) return;
  try {
    const { roomId } = req.params;
    const { id: userId, school_id: schoolId } = req.user;
    const { user_ids } = req.body;

    const { room, error, status } = await getRoomWithAccess(roomId, userId, schoolId, true);
    if (error) return res.status(status).json({ success: false, message: error });

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'user_ids array is required' });
    }

    // Verify all users belong to the same school and are active
    const [users] = await db.query(
      `SELECT id FROM users WHERE id IN (?) AND school_id = ? AND is_active = TRUE`,
      [user_ids, schoolId]
    );

    let added = 0;
    for (const user of users) {
      const [[existing]] = await db.query(
        'SELECT id FROM codearena_participants WHERE room_id = ? AND user_id = ?',
        [roomId, user.id]
      );
      if (!existing) {
        await db.query(
          `INSERT INTO codearena_participants (room_id, user_id, role, status) VALUES (?, ?, 'student', 'invited')`,
          [roomId, user.id]
        );
        added++;
      }
    }

    return res.json({ success: true, added, message: `${added} participant(s) invited` });
  } catch (error) {
    console.error('inviteParticipants error:', error);
    return res.status(500).json({ success: false, message: 'Failed to invite participants' });
  }
};

export const joinByCode = async (req, res) => {
  try {
    const { invite_code } = req.body;
    const { id: userId, school_id: schoolId } = req.user;

    if (!invite_code) {
      return res.status(400).json({ success: false, message: 'invite_code is required' });
    }

    const [[room]] = await db.query(
      `SELECT * FROM codearena_rooms WHERE invite_code = ? AND school_id = ?`,
      [String(invite_code).trim().toUpperCase(), schoolId]
    );

    if (!room) {
      return res.status(404).json({ success: false, message: 'Invalid invite code' });
    }

    if (room.status === 'ended') {
      return res.status(400).json({ success: false, message: 'This room has ended' });
    }

    const [[existing]] = await db.query(
      'SELECT id, status FROM codearena_participants WHERE room_id = ? AND user_id = ?',
      [room.id, userId]
    );

    if (existing) {
      return res.json({ success: true, room, already_member: true });
    }

    await db.query(
      `INSERT INTO codearena_participants (room_id, user_id, role, status) VALUES (?, ?, 'student', 'invited')`,
      [room.id, userId]
    );

    return res.json({ success: true, room });
  } catch (error) {
    console.error('joinByCode error:', error);
    return res.status(500).json({ success: false, message: 'Failed to join room' });
  }
};

export const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { id: userId, school_id: schoolId } = req.user;

    const [[room]] = await db.query(
      'SELECT * FROM codearena_rooms WHERE id = ? AND school_id = ?',
      [roomId, schoolId]
    );
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (room.status !== 'active') return res.status(400).json({ success: false, message: 'Room is not active' });

    const [[participant]] = await db.query(
      'SELECT * FROM codearena_participants WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );
    if (!participant) {
      return res.status(403).json({ success: false, message: 'You have not been invited to this room' });
    }

    await db.query(
      `UPDATE codearena_participants SET status = 'joined', join_time = NOW() WHERE room_id = ? AND user_id = ?`,
      [roomId, userId]
    );

    return res.json({ success: true, message: 'Joined room', room });
  } catch (error) {
    console.error('joinRoom error:', error);
    return res.status(500).json({ success: false, message: 'Failed to join room' });
  }
};

export const removeParticipant = async (req, res) => {
  if (!assertFaculty(req, res)) return;
  try {
    const { roomId, targetUserId } = req.params;
    const { id: userId, school_id: schoolId } = req.user;

    const { error, status } = await getRoomWithAccess(roomId, userId, schoolId, true);
    if (error) return res.status(status).json({ success: false, message: error });

    await db.query('DELETE FROM codearena_participants WHERE room_id = ? AND user_id = ?', [roomId, targetUserId]);
    return res.json({ success: true, message: 'Participant removed' });
  } catch (error) {
    console.error('removeParticipant error:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove participant' });
  }
};

export const getParticipants = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { id: userId, school_id: schoolId } = req.user;

    const { error, status } = await getRoomWithAccess(roomId, userId, schoolId);
    if (error) return res.status(status).json({ success: false, message: error });

    const [participants] = await db.query(
      `SELECT p.*, u.first_name, u.last_name, u.email,
         (SELECT COUNT(*) FROM codearena_submissions s WHERE s.room_id = ? AND s.user_id = p.user_id AND s.result = 'accepted') AS solved_count,
         (SELECT COUNT(DISTINCT s2.problem_id) FROM codearena_submissions s2 WHERE s2.room_id = ? AND s2.user_id = p.user_id) AS attempted_count
       FROM codearena_participants p
       JOIN users u ON u.id = p.user_id
       WHERE p.room_id = ?
       ORDER BY p.role DESC, u.first_name ASC`,
      [roomId, roomId, roomId]
    );

    return res.json({ success: true, participants });
  } catch (error) {
    console.error('getParticipants error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get participants' });
  }
};

// ---------------------------------------------------------------------------
// PROBLEM MANAGEMENT
// ---------------------------------------------------------------------------

export const addProblem = async (req, res) => {
  if (!assertFaculty(req, res)) return;
  try {
    const { roomId } = req.params;
    const { id: userId, school_id: schoolId } = req.user;

    const { room, error, status } = await getRoomWithAccess(roomId, userId, schoolId, true);
    if (error) return res.status(status).json({ success: false, message: error });

    if (room.status === 'ended') {
      return res.status(400).json({ success: false, message: 'Cannot add problems to an ended room' });
    }

    const { title, description, constraints, sample_input, sample_output, difficulty = 'basic', test_cases = [] } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Title and description are required' });
    }

    const [[{ maxOrder }]] = await db.query(
      'SELECT COALESCE(MAX(order_index), -1) AS maxOrder FROM codearena_problems WHERE room_id = ?',
      [roomId]
    );

    const [result] = await db.query(
      `INSERT INTO codearena_problems (room_id, title, description, constraints, sample_input, sample_output, difficulty, order_index)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [roomId, title, description, constraints || null, sample_input || null, sample_output || null, difficulty, maxOrder + 1]
    );

    const problemId = result.insertId;

    // Insert test cases
    for (const tc of test_cases) {
      if (tc.input_data !== undefined && tc.expected_output !== undefined) {
        await db.query(
          `INSERT INTO codearena_test_cases (problem_id, input_data, expected_output, is_hidden, time_limit_ms)
           VALUES (?, ?, ?, ?, ?)`,
          [problemId, String(tc.input_data), String(tc.expected_output), tc.is_hidden ? 1 : 0, tc.time_limit_ms || 2000]
        );
      }
    }

    const [[problem]] = await db.query('SELECT * FROM codearena_problems WHERE id = ?', [problemId]);
    const [testCasesResult] = await db.query('SELECT * FROM codearena_test_cases WHERE problem_id = ?', [problemId]);

    return res.status(201).json({ success: true, problem: { ...problem, test_cases: testCasesResult } });
  } catch (error) {
    console.error('addProblem error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add problem' });
  }
};

export const updateProblem = async (req, res) => {
  if (!assertFaculty(req, res)) return;
  try {
    const { roomId, problemId } = req.params;
    const { id: userId, school_id: schoolId } = req.user;

    const { error, status } = await getRoomWithAccess(roomId, userId, schoolId, true);
    if (error) return res.status(status).json({ success: false, message: error });

    const [[problem]] = await db.query(
      'SELECT * FROM codearena_problems WHERE id = ? AND room_id = ?',
      [problemId, roomId]
    );
    if (!problem) return res.status(404).json({ success: false, message: 'Problem not found' });

    const { title, description, constraints, sample_input, sample_output, difficulty } = req.body;

    await db.query(
      `UPDATE codearena_problems SET title = ?, description = ?, constraints = ?, sample_input = ?, sample_output = ?, difficulty = ? WHERE id = ?`,
      [
        title || problem.title,
        description || problem.description,
        constraints !== undefined ? constraints : problem.constraints,
        sample_input !== undefined ? sample_input : problem.sample_input,
        sample_output !== undefined ? sample_output : problem.sample_output,
        difficulty || problem.difficulty,
        problemId,
      ]
    );

    const [[updated]] = await db.query('SELECT * FROM codearena_problems WHERE id = ?', [problemId]);
    return res.json({ success: true, problem: updated });
  } catch (error) {
    console.error('updateProblem error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update problem' });
  }
};

export const deleteProblem = async (req, res) => {
  if (!assertFaculty(req, res)) return;
  try {
    const { roomId, problemId } = req.params;
    const { id: userId, school_id: schoolId } = req.user;

    const { error, status } = await getRoomWithAccess(roomId, userId, schoolId, true);
    if (error) return res.status(status).json({ success: false, message: error });

    await db.query('DELETE FROM codearena_problems WHERE id = ? AND room_id = ?', [problemId, roomId]);
    return res.json({ success: true, message: 'Problem deleted' });
  } catch (error) {
    console.error('deleteProblem error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete problem' });
  }
};

export const addTestCase = async (req, res) => {
  if (!assertFaculty(req, res)) return;
  try {
    const { roomId, problemId } = req.params;
    const { id: userId, school_id: schoolId } = req.user;

    const { error, status } = await getRoomWithAccess(roomId, userId, schoolId, true);
    if (error) return res.status(status).json({ success: false, message: error });

    const [[problem]] = await db.query('SELECT id FROM codearena_problems WHERE id = ? AND room_id = ?', [problemId, roomId]);
    if (!problem) return res.status(404).json({ success: false, message: 'Problem not found' });

    const { input_data, expected_output, is_hidden = false, time_limit_ms = 2000 } = req.body;
    if (input_data === undefined || expected_output === undefined) {
      return res.status(400).json({ success: false, message: 'input_data and expected_output are required' });
    }

    const [result] = await db.query(
      `INSERT INTO codearena_test_cases (problem_id, input_data, expected_output, is_hidden, time_limit_ms)
       VALUES (?, ?, ?, ?, ?)`,
      [problemId, String(input_data), String(expected_output), is_hidden ? 1 : 0, time_limit_ms]
    );

    const [[tc]] = await db.query('SELECT * FROM codearena_test_cases WHERE id = ?', [result.insertId]);
    return res.status(201).json({ success: true, test_case: tc });
  } catch (error) {
    console.error('addTestCase error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add test case' });
  }
};

export const deleteTestCase = async (req, res) => {
  if (!assertFaculty(req, res)) return;
  try {
    const { roomId, problemId, testCaseId } = req.params;
    const { id: userId, school_id: schoolId } = req.user;

    const { error, status } = await getRoomWithAccess(roomId, userId, schoolId, true);
    if (error) return res.status(status).json({ success: false, message: error });

    await db.query(
      'DELETE FROM codearena_test_cases WHERE id = ? AND problem_id = ?',
      [testCaseId, problemId]
    );
    return res.json({ success: true, message: 'Test case deleted' });
  } catch (error) {
    console.error('deleteTestCase error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete test case' });
  }
};

// ---------------------------------------------------------------------------
// CODE EXECUTION
// ---------------------------------------------------------------------------

export const runCode = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { id: userId, school_id: schoolId } = req.user;
    const { language, code, input = '' } = req.body;

    const { error, status } = await getRoomWithAccess(roomId, userId, schoolId);
    if (error) return res.status(status).json({ success: false, message: error });

    if (!language || !code) {
      return res.status(400).json({ success: false, message: 'language and code are required' });
    }

    // Mark participant as coding
    await db.query(
      `UPDATE codearena_participants SET status = 'coding' WHERE room_id = ? AND user_id = ? AND status NOT IN ('submitted','left')`,
      [roomId, userId]
    );

    const result = await executeCode({ language, code, input, timeoutMs: 5000 });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('runCode error:', error);
    return res.status(500).json({ success: false, message: 'Failed to execute code' });
  }
};

export const submitSolution = async (req, res) => {
  try {
    const { roomId, problemId } = req.params;
    const { id: userId, school_id: schoolId } = req.user;
    const { language, code } = req.body;

    if (!language || !code) {
      return res.status(400).json({ success: false, message: 'language and code are required' });
    }

    const { room, error, status } = await getRoomWithAccess(roomId, userId, schoolId);
    if (error) return res.status(status).json({ success: false, message: error });

    if (room.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Room is not active' });
    }

    const [[problem]] = await db.query(
      'SELECT * FROM codearena_problems WHERE id = ? AND room_id = ?',
      [problemId, roomId]
    );
    if (!problem) return res.status(404).json({ success: false, message: 'Problem not found' });

    // Check attempt limits (exam mode)
    const [[attemptRow]] = await db.query(
      'SELECT COUNT(*) AS cnt FROM codearena_submissions WHERE room_id = ? AND problem_id = ? AND user_id = ?',
      [roomId, problemId, userId]
    );
    const attempts = attemptRow.cnt;

    if (room.mode === 'exam' && attempts >= room.max_attempts) {
      return res.status(429).json({
        success: false,
        message: `Maximum attempts (${room.max_attempts}) reached for this problem`,
      });
    }

    // Load all test cases for evaluation
    const [testCases] = await db.query(
      'SELECT * FROM codearena_test_cases WHERE problem_id = ?',
      [problemId]
    );

    // Evaluate
    const evaluation = await evaluateAgainstTestCases({ language, code, testCases, timeoutMs: 5000 });

    let submissionResult = evaluation.overallResult || 'runtime_error';
    if (evaluation.error) {
      submissionResult = 'compilation_error';
    }

    // Save submission
    const [subInsert] = await db.query(
      `INSERT INTO codearena_submissions (room_id, problem_id, user_id, language, code, result, execution_time_ms, attempts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [roomId, problemId, userId, language, code, submissionResult, evaluation.totalExecutionTimeMs || 0, attempts + 1]
    );

    const submissionId = subInsert.insertId;

    // Save per-test-case results
    for (const r of evaluation.results) {
      await db.query(
        `INSERT INTO codearena_execution_results (submission_id, test_case_id, actual_output, is_passed, execution_time_ms, error_log)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [submissionId, r.test_case_id, r.actual_output || '', r.is_passed ? 1 : 0, r.execution_time_ms, r.error_log || null]
      );
    }

    // Update participant status
    const newParticipantStatus = submissionResult === 'accepted' ? 'submitted' : 'coding';
    await db.query(
      `UPDATE codearena_participants SET status = ? WHERE room_id = ? AND user_id = ?`,
      [newParticipantStatus, roomId, userId]
    );

    // In practice mode, return detailed per-test-case results
    // In exam mode, return only pass/fail count (no expected outputs revealed)
    let resultPayload;
    if (room.mode === 'practice') {
      resultPayload = evaluation.results;
    } else {
      resultPayload = evaluation.results.map((r) => ({
        test_case_id: r.test_case_id,
        is_passed: r.is_passed,
        execution_time_ms: r.execution_time_ms,
        timed_out: r.timed_out,
        error_log: r.error_log,
      }));
    }

    return res.json({
      success: true,
      submission_id: submissionId,
      result: submissionResult,
      passed: evaluation.results.filter((r) => r.is_passed).length,
      total: evaluation.results.length,
      execution_time_ms: evaluation.totalExecutionTimeMs,
      test_results: resultPayload,
    });
  } catch (error) {
    console.error('submitSolution error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit solution' });
  }
};

// ---------------------------------------------------------------------------
// RESULTS & DASHBOARD
// ---------------------------------------------------------------------------

export const getMySubmissions = async (req, res) => {
  try {
    const { roomId, problemId } = req.params;
    const { id: userId, school_id: schoolId } = req.user;

    const { error, status } = await getRoomWithAccess(roomId, userId, schoolId);
    if (error) return res.status(status).json({ success: false, message: error });

    const [submissions] = await db.query(
      `SELECT id, language, result, execution_time_ms, attempts, submitted_at
       FROM codearena_submissions
       WHERE room_id = ? AND problem_id = ? AND user_id = ?
       ORDER BY submitted_at DESC`,
      [roomId, problemId, userId]
    );

    return res.json({ success: true, submissions });
  } catch (error) {
    console.error('getMySubmissions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get submissions' });
  }
};

export const getRoomDashboard = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { id: userId, school_id: schoolId } = req.user;

    // Faculty-only route (verified in router via role check is in getRoomWithAccess)
    const { room, error, status } = await getRoomWithAccess(roomId, userId, schoolId, true);
    if (error) return res.status(status).json({ success: false, message: error });

    const [participants] = await db.query(
      `SELECT p.user_id, p.status, p.join_time, u.first_name, u.last_name, u.email,
         (SELECT COUNT(*) FROM codearena_submissions s WHERE s.room_id = ? AND s.user_id = p.user_id AND s.result = 'accepted') AS solved,
         (SELECT COUNT(DISTINCT s2.problem_id) FROM codearena_submissions s2 WHERE s2.room_id = ? AND s2.user_id = p.user_id) AS attempted,
         (SELECT COUNT(*) FROM codearena_submissions s3 WHERE s3.room_id = ? AND s3.user_id = p.user_id) AS total_submissions
       FROM codearena_participants p
       JOIN users u ON u.id = p.user_id
       WHERE p.room_id = ? AND p.role = 'student'
       ORDER BY solved DESC, p.join_time ASC`,
      [roomId, roomId, roomId, roomId]
    );

    const [problems] = await db.query(
      `SELECT p.id, p.title, p.difficulty,
         (SELECT COUNT(DISTINCT user_id) FROM codearena_submissions WHERE problem_id = p.id AND result = 'accepted') AS solved_by,
         (SELECT COUNT(DISTINCT user_id) FROM codearena_submissions WHERE problem_id = p.id) AS attempted_by
       FROM codearena_problems p
       WHERE p.room_id = ?
       ORDER BY p.order_index ASC`,
      [roomId]
    );

    return res.json({ success: true, room, participants, problems });
  } catch (error) {
    console.error('getRoomDashboard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get dashboard' });
  }
};

export const getSubmissionDetail = async (req, res) => {
  try {
    const { roomId, submissionId } = req.params;
    const { id: userId, school_id: schoolId, role } = req.user;

    const { room, error, status } = await getRoomWithAccess(roomId, userId, schoolId);
    if (error) return res.status(status).json({ success: false, message: error });

    const [[submission]] = await db.query(
      'SELECT * FROM codearena_submissions WHERE id = ? AND room_id = ?',
      [submissionId, roomId]
    );
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

    // Students can only see their own submissions
    const isFaculty = ['faculty', 'school_admin'].includes(role);
    if (!isFaculty && submission.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [results] = await db.query(
      `SELECT er.*, tc.input_data, tc.expected_output, tc.is_hidden
       FROM codearena_execution_results er
       JOIN codearena_test_cases tc ON tc.id = er.test_case_id
       WHERE er.submission_id = ?`,
      [submissionId]
    );

    // In exam mode, hide expected output from students
    let testResults = results;
    if (!isFaculty && room.mode === 'exam') {
      testResults = results.map(({ expected_output, input_data, ...r }) => r);
    }

    return res.json({ success: true, submission, test_results: testResults });
  } catch (error) {
    console.error('getSubmissionDetail error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get submission detail' });
  }
};

// ---------------------------------------------------------------------------
// AVAILABLE STUDENTS (for invite picker)
// ---------------------------------------------------------------------------

export const getAvailableStudents = async (req, res) => {
  if (!assertFaculty(req, res)) return;
  try {
    const { roomId } = req.params;
    const { id: userId, school_id: schoolId } = req.user;

    const { error, status } = await getRoomWithAccess(roomId, userId, schoolId, true);
    if (error) return res.status(status).json({ success: false, message: error });

    // All active students in the same school, annotated with whether already in room
    const [students] = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.email,
         CASE WHEN cp.id IS NOT NULL THEN TRUE ELSE FALSE END AS already_invited
       FROM users u
       LEFT JOIN codearena_participants cp ON cp.room_id = ? AND cp.user_id = u.id
       WHERE u.school_id = ? AND u.role = 'student' AND u.is_active = TRUE
       ORDER BY u.first_name ASC, u.last_name ASC`,
      [roomId, schoolId]
    );

    return res.json({ success: true, students });
  } catch (error) {
    console.error('getAvailableStudents error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch students' });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// ROOM HISTORY (for ended rooms)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Get comprehensive history of all submissions in a room (faculty only).
 * This provides complete archival data for ended rooms.
 */
export const getRoomHistory = async (req, res) => {
  if (!assertFaculty(req, res)) return;
  try {
    const { roomId } = req.params;
    const { id: userId, school_id: schoolId } = req.user;

    const { room, error, status } = await getRoomWithAccess(roomId, userId, schoolId, true);
    if (error) return res.status(status).json({ success: false, message: error });

    // Get all problems with their test cases
    const [problems] = await db.query(
      'SELECT * FROM codearena_problems WHERE room_id = ? ORDER BY order_index ASC',
      [roomId]
    );

    const enrichedProblems = await Promise.all(
      problems.map(async (prob) => {
        const [testCases] = await db.query(
          'SELECT * FROM codearena_test_cases WHERE problem_id = ?',
          [prob.id]
        );
        return { ...prob, test_cases: testCases };
      })
    );

    // Get all participants with their complete submission history
    const [participants] = await db.query(
      `SELECT p.*, u.first_name, u.last_name, u.email
       FROM codearena_participants p
       JOIN users u ON u.id = p.user_id
       WHERE p.room_id = ?
       ORDER BY u.first_name ASC, u.last_name ASC`,
      [roomId]
    );

    // For each participant, get all their submissions with full execution results
    const enrichedParticipants = await Promise.all(
      participants.map(async (participant) => {
        const [submissions] = await db.query(
          `SELECT s.*, 
             JSON_OBJECT(
               'id', p.id,
               'title', p.title,
               'difficulty', p.difficulty
             ) AS problem_details
           FROM codearena_submissions s
           JOIN codearena_problems p ON p.id = s.problem_id
           WHERE s.room_id = ? AND s.user_id = ?
           ORDER BY s.submitted_at DESC`,
          [roomId, participant.user_id]
        );

        // Get detailed execution results for each submission
        const enrichedSubmissions = await Promise.all(
          submissions.map(async (sub) => {
            const [results] = await db.query(
              `SELECT er.*, tc.input_data, tc.expected_output, tc.is_hidden
               FROM codearena_execution_results er
               JOIN codearena_test_cases tc ON tc.id = er.test_case_id
               WHERE er.submission_id = ?
               ORDER BY tc.id ASC`,
              [sub.id]
            );
            return { ...sub, execution_results: results };
          })
        );

        return { ...participant, submissions: enrichedSubmissions };
      })
    );

    return res.json({
      success: true,
      room,
      problems: enrichedProblems,
      participants: enrichedParticipants,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('getRoomHistory error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get room history' });
  }
};

export default {};
