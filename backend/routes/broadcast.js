import express from 'express';
import auth from '../middleware/auth.js';
import {
  createBroadcast,
  sendBroadcast,
  getMyBroadcasts,
  getBroadcastStats,
  deleteBroadcast,
  getInbox,
  markBroadcastRead,
  replyToBroadcast
} from '../controllers/broadcastController.js';

const router = express.Router();

/**
 * All routes require authentication
 */
router.use(auth);

/**
 * BROADCAST ROUTES
 */

/**
 * POST /api/broadcast/create
 * Create broadcast (draft)
 * Body: { title, message, broadcast_type, reply_enabled, scope_value }
 */
router.post('/create', createBroadcast);

/**
 * POST /api/broadcast/:broadcastId/send
 * Send broadcast (draft -> sent)
 */
router.post('/:broadcastId/send', sendBroadcast);

/**
 * GET /api/broadcast/my-broadcasts
 * Get broadcasts sent by current user
 * Query params: ?status=sent&limit=20
 */
router.get('/my-broadcasts', getMyBroadcasts);

/**
 * GET /api/broadcast/:broadcastId/stats
 * Get broadcast statistics (sender only)
 */
router.get('/:broadcastId/stats', getBroadcastStats);

/**
 * DELETE /api/broadcast/:broadcastId
 * Delete broadcast (draft only)
 */
router.delete('/:broadcastId', deleteBroadcast);

/**
 * GET /api/broadcast/inbox
 * Get broadcast inbox for recipient
 * Query params: ?sort=latest&limit=20&read_status=unread
 */
router.get('/inbox', getInbox);

/**
 * POST /api/broadcast/:broadcastId/mark-read
 * Mark broadcast as read
 */
router.post('/:broadcastId/mark-read', markBroadcastRead);

/**
 * POST /api/broadcast/:broadcastId/reply
 * Reply to broadcast (if enabled)
 * Body: { message }
 */
router.post('/:broadcastId/reply', replyToBroadcast);

export default router;
