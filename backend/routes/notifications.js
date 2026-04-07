import express from 'express';
import auth from '../middleware/auth.js';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead
} from '../controllers/notificationController.js';

const router = express.Router();

router.use(auth);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadNotificationCount);
router.post('/read-all', markAllNotificationsRead);
router.post('/:notificationId/read', markNotificationRead);

export default router;