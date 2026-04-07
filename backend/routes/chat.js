import express from 'express';
import auth from '../middleware/auth.js';
import {
  getChatConnections,
  getActiveChats,
  getUnreadChatCount,
  getConversationMessages,
  sendMessage,
  markConversationAsRead
} from '../controllers/chatController.js';

const router = express.Router();

router.use(auth);

router.get('/connections', getChatConnections);
router.get('/active', getActiveChats);
router.get('/unread-count', getUnreadChatCount);
router.get('/messages/:userId', getConversationMessages);
router.post('/messages/:userId', sendMessage);
router.post('/messages/:userId/read', markConversationAsRead);

export default router;
