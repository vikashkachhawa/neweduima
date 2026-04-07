import api from './api';

const API_BASE = '/broadcast';

/**
 * Broadcast Service
 * Handles broadcast creation, sending, and tracking
 */

const broadcast = {
  /**
   * Create broadcast (draft)
   */
  createBroadcast: async (title, message, broadcastType, replyEnabled = false, scopeValue = null) => {
    const response = await api.post(`${API_BASE}/create`, {
      title,
      message,
      broadcast_type: broadcastType,
      reply_enabled: replyEnabled,
      scope_value: scopeValue
    });
    return response.data;
  },

  /**
   * Send broadcast (draft -> sent)
   */
  sendBroadcast: async (broadcastId) => {
    const response = await api.post(`${API_BASE}/${broadcastId}/send`);
    return response.data;
  },

  /**
   * Get broadcasts sent by current user
   */
  getMyBroadcasts: async (options = {}) => {
    const { status = 'sent', limit = 20 } = options;
    const response = await api.get(`${API_BASE}/my-broadcasts`, {
      params: { status, limit }
    });
    return response.data;
  },

  /**
   * Get broadcast statistics (sender only)
   */
  getBroadcastStats: async (broadcastId) => {
    const response = await api.get(`${API_BASE}/${broadcastId}/stats`);
    return response.data;
  },

  /**
   * Delete broadcast (draft only)
   */
  deleteBroadcast: async (broadcastId) => {
    const response = await api.delete(`${API_BASE}/${broadcastId}`);
    return response.data;
  },

  /**
   * Get broadcast inbox for recipient
   */
  getInbox: async (options = {}) => {
    const { sort = 'latest', limit = 20, read_status = undefined } = options;
    const params = { sort, limit };
    if (read_status) params.read_status = read_status;

    const response = await api.get(`${API_BASE}/inbox`, { params });
    return response.data;
  },

  /**
   * Mark broadcast as read
   */
  markBroadcastRead: async (broadcastId) => {
    const response = await api.post(`${API_BASE}/${broadcastId}/mark-read`);
    return response.data;
  },

  /**
   * Reply to broadcast (if enabled)
   */
  replyToBroadcast: async (broadcastId, message) => {
    const response = await api.post(`${API_BASE}/${broadcastId}/reply`, {
      message
    });
    return response.data;
  }
};

export default broadcast;
