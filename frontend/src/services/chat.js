import api from './api';

export const chatService = {
  getConnections: async () => {
    const response = await api.get('/chat/connections');
    return response.data?.connections || [];
  },

  getActiveChats: async () => {
    const response = await api.get('/chat/active');
    return response.data?.activeChats || [];
  },

  getUnreadCount: async () => {
    const response = await api.get('/chat/unread-count');
    return Number(response.data?.unreadCount || 0);
  },

  getMessages: async (userId, limit = 120) => {
    const response = await api.get(`/chat/messages/${userId}`, { params: { limit } });
    return response.data?.messages || [];
  },

  sendMessage: async (userId, message) => {
    const response = await api.post(`/chat/messages/${userId}`, { message });
    return response.data;
  },

  markRead: async (userId) => {
    const response = await api.post(`/chat/messages/${userId}/read`);
    return response.data;
  }
};
