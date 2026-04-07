import api from './api';

export const subscriptionService = {
    // Subscription Plans
    getAllPlans: async () => {
        const response = await api.get('/subscription/plans');
        return response.data;
    },

    createPlan: async (planData) => {
        const response = await api.post('/subscription/plans', planData);
        return response.data;
    },

    updatePlan: async (planId, planData) => {
        const response = await api.put(`/subscription/plans/${planId}`, planData);
        return response.data;
    },

    deletePlan: async (planId) => {
        const response = await api.delete(`/subscription/plans/${planId}`);
        return response.data;
    },

    // School Subscriptions
    getAllSubscriptions: async () => {
        const response = await api.get('/subscription/subscriptions');
        return response.data;
    },

    getSchoolSubscription: async (schoolId) => {
        const response = await api.get(`/subscription/schools/${schoolId}`);
        return response.data;
    },

    createSubscription: async (subscriptionData) => {
        const response = await api.post('/subscription/subscriptions', subscriptionData);
        return response.data;
    },

    updateSubscription: async (subscriptionId, subscriptionData) => {
        const response = await api.put(`/subscription/subscriptions/${subscriptionId}`, subscriptionData);
        return response.data;
    },

    cancelSubscription: async (subscriptionId) => {
        const response = await api.post(`/subscription/subscriptions/${subscriptionId}/cancel`);
        return response.data;
    },

    reactivateSubscription: async (subscriptionId) => {
        const response = await api.post(`/subscription/subscriptions/${subscriptionId}/reactivate`);
        return response.data;
    },

    upgradePlan: async (subscriptionId, newPlanId) => {
        const response = await api.post(`/subscription/subscriptions/${subscriptionId}/upgrade`, {
            newPlanId
        });
        return response.data;
    },

    downgradePlan: async (subscriptionId, newPlanId) => {
        const response = await api.post(`/subscription/subscriptions/${subscriptionId}/downgrade`, {
            newPlanId
        });
        return response.data;
    },

    // Usage Tracking
    getSchoolUsage: async (schoolId) => {
        const response = await api.get(`/subscription/usage/${schoolId}`);
        return response.data;
    },

    getAllUsage: async () => {
        const response = await api.get('/subscription/usage');
        return response.data;
    },

    // Alerts
    getUsageAlerts: async (schoolId = null) => {
        const params = schoolId ? { schoolId } : {};
        const response = await api.get('/subscription/alerts', { params });
        return response.data;
    },

    // Statistics
    getSubscriptionStats: async () => {
        const response = await api.get('/subscription/stats');
        return response.data;
    }
};
