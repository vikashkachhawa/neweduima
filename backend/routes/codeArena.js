import express from 'express';
import auth from '../middleware/auth.js';
import {
  createRoom,
  listRooms,
  getRoom,
  updateRoom,
  startRoom,
  endRoom,
  deleteRoom,
  inviteParticipants,
  joinByCode,
  joinRoom,
  removeParticipant,
  getParticipants,
  addProblem,
  updateProblem,
  deleteProblem,
  addTestCase,
  deleteTestCase,
  runCode,
  submitSolution,
  getMySubmissions,
  getRoomDashboard,
  getSubmissionDetail,
  getAvailableStudents,
  getRoomHistory,
} from '../controllers/codeArenaController.js';

const router = express.Router();

router.use(auth);

// ── Room CRUD ──────────────────────────────────────────────────────────────
router.post('/rooms', createRoom);
router.get('/rooms', listRooms);
router.get('/rooms/:roomId', getRoom);
router.put('/rooms/:roomId', updateRoom);
router.delete('/rooms/:roomId', deleteRoom);

// ── Room lifecycle ─────────────────────────────────────────────────────────
router.post('/rooms/:roomId/start', startRoom);
router.post('/rooms/:roomId/end', endRoom);

// ── Participants ───────────────────────────────────────────────────────────
router.post('/rooms/:roomId/invite', inviteParticipants);
router.post('/join', joinByCode);
router.post('/rooms/:roomId/join', joinRoom);
router.delete('/rooms/:roomId/participants/:targetUserId', removeParticipant);
router.get('/rooms/:roomId/participants', getParticipants);

// ── Problems ───────────────────────────────────────────────────────────────
router.post('/rooms/:roomId/problems', addProblem);
router.put('/rooms/:roomId/problems/:problemId', updateProblem);
router.delete('/rooms/:roomId/problems/:problemId', deleteProblem);

// ── Test cases ─────────────────────────────────────────────────────────────
router.post('/rooms/:roomId/problems/:problemId/test-cases', addTestCase);
router.delete('/rooms/:roomId/problems/:problemId/test-cases/:testCaseId', deleteTestCase);

// ── Code execution ─────────────────────────────────────────────────────────
router.post('/rooms/:roomId/run', runCode);
router.post('/rooms/:roomId/problems/:problemId/submit', submitSolution);

// ── Submissions & results ──────────────────────────────────────────────────
router.get('/rooms/:roomId/problems/:problemId/my-submissions', getMySubmissions);
router.get('/rooms/:roomId/submissions/:submissionId', getSubmissionDetail);

// ── Teacher dashboard ──────────────────────────────────────────────────────
router.get('/rooms/:roomId/dashboard', getRoomDashboard);

// ── Room history (ended rooms) ─────────────────────────────────────────────
router.get('/rooms/:roomId/history', getRoomHistory);

// ── Available students for invite picker ──────────────────────────────────
router.get('/rooms/:roomId/available-students', getAvailableStudents);

export default router;
