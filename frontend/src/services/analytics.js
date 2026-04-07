import api from './api';

export const analyticsService = {
    // Dashboard
    getDashboard: async (params = {}) => {
        const response = await api.get('/analytics/dashboard', { params });
        return response.data;
    },

    // Overview
    getOverview: async (date = null) => {
        const params = date ? { date } : {};
        const response = await api.get('/analytics/overview', { params });
        return response.data;
    },

    // Login Trends
    getLoginTrends: async (days = 7, startDate = null, endDate = null) => {
        const params = { days };
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        const response = await api.get('/analytics/trends/logins', { params });
        return response.data;
    },

    getHourlyPattern: async (date = null) => {
        const params = date ? { date } : {};
        const response = await api.get('/analytics/trends/hourly', { params });
        return response.data;
    },

    // Storage Monitoring
    getStorageAlerts: async (level = null, startDate = null, endDate = null, includeResolved = false) => {
        const params = { includeResolved };
        if (level) params.level = level;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        const response = await api.get('/analytics/storage/alerts', { params });
        return response.data;
    },

    resolveStorageAlert: async (id) => {
        const response = await api.post(`/analytics/storage/alerts/${id}/resolve`);
        return response.data;
    },

    // Error Monitoring
    getErrorSummary: async (startDate = null, endDate = null, hours = 24) => {
        const params = { hours };
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        const response = await api.get('/analytics/errors/summary', { params });
        return response.data;
    },

    getErrorDetails: async (filters = {}) => {
        const response = await api.get('/analytics/errors/details', { params: filters });
        return response.data;
    },

    // Performance Metrics
    getPerformanceMetrics: async (days = 7, startDate = null, endDate = null) => {
        const params = { days };
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        const response = await api.get('/analytics/performance', { params });
        return response.data;
    },

    // School Performance
    getSchoolPerformance: async (tier = null, limit = 10, date = null) => {
        const params = { limit };
        if (tier) params.tier = tier;
        if (date) params.date = date;
        const response = await api.get('/analytics/schools/performance', { params });
        return response.data;
    },

    getTopPerformers: async (limit = 10, date = null) => {
        const params = { limit };
        if (date) params.date = date;
        const response = await api.get('/analytics/schools/top-performers', { params });
        return response.data;
    },

    getNeedsAttention: async (limit = 10, date = null) => {
        const params = { limit };
        if (date) params.date = date;
        const response = await api.get('/analytics/schools/needs-attention', { params });
        return response.data;
    },

    // Feature Adoption
    getFeatureAdoption: async (date = null) => {
        const params = date ? { date } : {};
        const response = await api.get('/analytics/features/adoption', { params });
        return response.data;
    },

    // Revenue & Subscriptions
    getRevenueMetrics: async (date = null) => {
        const params = date ? { date } : {};
        const response = await api.get('/analytics/revenue', { params });
        return response.data;
    },

    getUpsellOpportunities: async (date = null) => {
        const params = date ? { date } : {};
        const response = await api.get('/analytics/revenue/upsell-opportunities', { params });
        return response.data;
    },

    // Export
    exportDashboard: async () => {
        const response = await api.get('/analytics/export/dashboard');
        return response.data;
    }
};
