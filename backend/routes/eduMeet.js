import express from 'express';
import auth from '../middleware/auth.js';
import {
  createRoom,
  listRooms,
  getIceConfig,
  getRoom,
  joinByCode,
  joinRoom,
  startRoom,
  endRoom,
  clearRoomHistory,
  getParticipants,
  getMessages,
  sendMessage,
  createPoll,
  listPolls,
  respondToPoll,
  endPoll,
  deletePoll,
  shareFile,
  listFiles,
  listRecordings,
  uploadRecording,
  downloadRecording,
  muteAllParticipants,
  muteParticipant,
  removeParticipant,
  spotlightParticipant,
  markAttendance,
  getRoomDashboard,
  requestWaitingRoom,
  getWaitingRoom,
  admitFromWaitingRoom,
  checkWaitingStatus,
  createBreakoutRoom,
  listBreakoutRooms,
  assignToBreakoutRoom,
  closeBreakoutRoom,
  getLiveKitToken,
  listNotes,
  createNote,
  updateNote,
  deleteNote,
  getHandQueue,
  updateHandQueue,
} from '../controllers/eduMeetController.js';

const router = express.Router();

// Public routes (no auth required)
router.get('/ice-config', getIceConfig);

// Protected routes
router.use(auth);

router.post('/rooms', createRoom);
router.get('/rooms', listRooms);
router.get('/rooms/:roomId', getRoom);
router.post('/join', joinByCode);
router.post('/rooms/:roomId/join', joinRoom);
router.post('/rooms/:roomId/start', startRoom);
router.post('/rooms/:roomId/end', endRoom);
router.delete('/rooms/:roomId/history', clearRoomHistory);
router.get('/rooms/:roomId/participants', getParticipants);
router.get('/rooms/:roomId/messages', getMessages);
router.post('/rooms/:roomId/messages', sendMessage);
router.get('/rooms/:roomId/polls', listPolls);
router.post('/rooms/:roomId/polls', createPoll);
router.post('/polls/:pollId/respond', respondToPoll);
router.post('/polls/:pollId/end', endPoll);
router.delete('/polls/:pollId', deletePoll);
router.get('/rooms/:roomId/files', listFiles);
router.post('/rooms/:roomId/files', shareFile);
router.get('/rooms/:roomId/recordings', listRecordings);
router.get('/recordings/:recordingId/download', downloadRecording);
router.post(
  '/rooms/:roomId/recordings/upload',
  express.raw({ type: ['video/webm', 'video/mp4', 'application/octet-stream'], limit: '500mb' }),
  uploadRecording
);
router.post('/rooms/:roomId/controls/mute-all', muteAllParticipants);
router.post('/rooms/:roomId/participants/:targetUserId/mute', muteParticipant);
router.post('/rooms/:roomId/participants/:targetUserId/remove', removeParticipant);
router.post('/rooms/:roomId/participants/:targetUserId/spotlight', spotlightParticipant);
router.post('/rooms/:roomId/attendance/mark', markAttendance);
router.get('/rooms/:roomId/dashboard', getRoomDashboard);

// Waiting room
router.post('/rooms/:roomId/waiting', requestWaitingRoom);
router.get('/rooms/:roomId/waiting', getWaitingRoom);
router.get('/rooms/:roomId/waiting/status', checkWaitingStatus);
router.post('/rooms/:roomId/waiting/:targetUserId/decide', admitFromWaitingRoom);

// Notes
router.get('/rooms/:roomId/notes', listNotes);
router.post('/rooms/:roomId/notes', createNote);
router.patch('/rooms/:roomId/notes/:noteId', updateNote);
router.delete('/rooms/:roomId/notes/:noteId', deleteNote);

// Raise hand queue
router.get('/rooms/:roomId/hand-queue', getHandQueue);
router.post('/rooms/:roomId/hand-queue/:userId', updateHandQueue);

// Breakout rooms
router.get('/rooms/:roomId/breakout', listBreakoutRooms);
router.post('/rooms/:roomId/breakout', createBreakoutRoom);
router.post('/rooms/:roomId/breakout/assign', assignToBreakoutRoom);
router.post('/rooms/:roomId/breakout/:breakoutRoomId/close', closeBreakoutRoom);

// LiveKit SFU token
router.get('/rooms/:roomId/livekit-token', getLiveKitToken);

export default router;
