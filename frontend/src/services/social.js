import api from './api';

export const socialService = {
  getSummary: async () => {
    const response = await api.get('/social/summary');
    return response.data?.summary || {
      connections: 0,
      incomingRequests: 0,
      outgoingRequests: 0,
      pagesFollowing: 0
    };
  },

  searchUsers: async (query, limit = 20) => {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const response = await api.get('/social/users/search', {
      params: { q: query.trim(), limit }
    });
    return response.data?.users || [];
  },

  getConnections: async () => {
    const response = await api.get('/social/connections');
    return response.data?.connections || [];
  },

  getRequests: async () => {
    const response = await api.get('/social/requests');
    return {
      incoming: response.data?.incoming || [],
      outgoing: response.data?.outgoing || []
    };
  },

  sendConnectionRequest: async (userId, message = '') => {
    const response = await api.post(`/social/connections/request/${userId}`, { message });
    return response.data;
  },

  respondToRequest: async (requestId, action) => {
    const response = await api.post(`/social/connections/respond/${requestId}`, { action });
    return response.data;
  },

  removeConnection: async (userId) => {
    const response = await api.delete(`/social/connections/${userId}`);
    return response.data;
  },

  searchPages: async (query, limit = 20) => {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const response = await api.get('/social/pages/search', {
      params: { q: query.trim(), limit }
    });
    return response.data?.pages || [];
  },

  getFollowingPages: async () => {
    const response = await api.get('/social/pages/following');
    return response.data?.pages || [];
  },

  followPage: async (schoolId) => {
    const response = await api.post(`/social/pages/${schoolId}/follow`);
    return response.data;
  },

  unfollowPage: async (schoolId) => {
    const response = await api.delete(`/social/pages/${schoolId}/follow`);
    return response.data;
  }
};
