import express from 'express';
import auth from '../middleware/auth.js';
import {
  sendMessage,
  getMessages,
  markMessageRead,
  getUnreadCount
} from '../controllers/groupChatController.js';

const router = express.Router();

/**
 * All routes require authentication
 */
router.use(auth);

/**
 * GROUP CHAT ROUTES
 */

/**
 * POST /api/group-chat/:groupId/messages
 * Send message to group
 */
router.post('/:groupId/messages', sendMessage);

/**
 * GET /api/group-chat/:groupId/messages
 * Get group message history
 * Query params: ?limit=50&offset=0
 */
router.get('/:groupId/messages', getMessages);

/**
 * POST /api/group-chat/:groupId/messages/:messageId/mark-read
 * Mark message as read
 */
router.post('/:groupId/messages/:messageId/mark-read', markMessageRead);

/**
 * GET /api/group-chat/:groupId/unread-count
 * Get unread message count in group
 */
router.get('/:groupId/unread-count', getUnreadCount);

export default router;
