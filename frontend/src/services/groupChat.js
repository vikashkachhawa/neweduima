import api from './api';

const API_BASE = '/group-chat';

/**
 * Group Chat Service
 * Handles all messaging for group chats
 */

const groupChat = {
  /**
   * Send message to group
   */
  sendMessage: async (groupId, message, messageType = 'text') => {
    const response = await api.post(`${API_BASE}/${groupId}/messages`, {
      message,
      message_type: messageType
    });
    return response.data;
  },

  /**
   * Get message history for group
   */
  getMessages: async (groupId, options = {}) => {
    const { limit = 50, offset = 0 } = options;
    const response = await api.get(`${API_BASE}/${groupId}/messages`, {
      params: { limit, offset }
    });
    return response.data;
  },

  /**
   * Mark message as read
   */
  markMessageRead: async (groupId, messageId) => {
    const response = await api.post(
      `${API_BASE}/${groupId}/messages/${messageId}/mark-read`
    );
    return response.data;
  },

  /**
   * Get unread message count for group
   */
  getUnreadCount: async (groupId) => {
    const response = await api.get(`${API_BASE}/${groupId}/unread-count`);
    return response.data;
  }
};

export default groupChat;
