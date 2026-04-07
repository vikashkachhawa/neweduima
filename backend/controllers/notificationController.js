import Notification from '../models/Notification.js';

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.listForUser(req.user.id, {
      limit: req.query.limit,
      offset: req.query.offset
    });
    const unreadCount = await Notification.countUnread(req.user.id);

    res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

export const getUnreadNotificationCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countUnread(req.user.id);
    res.json({ success: true, unreadCount });
  } catch (error) {
    console.error('Get unread notification count error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch unread count' });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const marked = await Notification.markRead(Number(req.params.notificationId), req.user.id);

    if (!marked) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.markAllRead(req.user.id);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark all notifications as read' });
  }
};