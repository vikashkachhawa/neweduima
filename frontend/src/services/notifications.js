import api from './api';

export const notificationService = {
    getNotifications: async (limit = 20, offset = 0) => {
        const response = await api.get('/notifications', {
            params: { limit, offset }
        });

        return {
            notifications: response.data?.notifications || [],
            unreadCount: response.data?.unreadCount || 0
        };
    },

    getUnreadCount: async () => {
        const response = await api.get('/notifications/unread-count');
        return response.data?.unreadCount || 0;
    },

    markRead: async (notificationId) => {
        const response = await api.post(`/notifications/${notificationId}/read`);
        return response.data;
    },

    markAllRead: async () => {
        const response = await api.post('/notifications/read-all');
        return response.data;
    }
};