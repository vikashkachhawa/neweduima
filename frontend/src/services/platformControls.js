import api from './api';

export const platformControlsService = {
    // Feature Flags
    getAllFeatureFlags: async () => {
        const response = await api.get('/platform-controls/feature-flags');
        return response.data;
    },

    createFeatureFlag: async (flagData) => {
        const response = await api.post('/platform-controls/feature-flags', flagData);
        return response.data;
    },

    updateFeatureFlag: async (flagId, flagData) => {
        const response = await api.put(`/platform-controls/feature-flags/${flagId}`, flagData);
        return response.data;
    },

    toggleFeatureFlag: async (flagId) => {
        const response = await api.post(`/platform-controls/feature-flags/${flagId}/toggle`);
        return response.data;
    },

    deleteFeatureFlag: async (flagId) => {
        const response = await api.delete(`/platform-controls/feature-flags/${flagId}`);
        return response.data;
    },

    // School-Specific Feature Flags
    getSchoolFeatureFlags: async (schoolId) => {
        const response = await api.get(`/platform-controls/schools/${schoolId}/feature-flags`);
        return response.data;
    },

    setSchoolFeatureFlag: async (schoolId, flagId, enabled) => {
        const response = await api.post(`/platform-controls/schools/${schoolId}/feature-flags/${flagId}`, {
            enabled
        });
        return response.data;
    },

    resetSchoolFeatureFlag: async (schoolId, flagId) => {
        const response = await api.delete(`/platform-controls/schools/${schoolId}/feature-flags/${flagId}`);
        return response.data;
    },

    // Announcements
    getAllAnnouncements: async () => {
        const response = await api.get('/platform-controls/announcements');
        return response.data;
    },

    createAnnouncement: async (announcementData) => {
        const response = await api.post('/platform-controls/announcements', announcementData);
        return response.data;
    },

    updateAnnouncement: async (announcementId, announcementData) => {
        const response = await api.put(`/platform-controls/announcements/${announcementId}`, announcementData);
        return response.data;
    },

    deleteAnnouncement: async (announcementId) => {
        const response = await api.delete(`/platform-controls/announcements/${announcementId}`);
        return response.data;
    },

    publishAnnouncement: async (announcementId) => {
        const response = await api.post(`/platform-controls/announcements/${announcementId}/publish`);
        return response.data;
    },

    unpublishAnnouncement: async (announcementId) => {
        const response = await api.post(`/platform-controls/announcements/${announcementId}/unpublish`);
        return response.data;
    },

    getActiveAnnouncements: async () => {
        const response = await api.get('/platform-controls/announcements/active');
        return response.data;
    },

    markAnnouncementAsRead: async (announcementId) => {
        const response = await api.post(`/platform-controls/announcements/${announcementId}/read`);
        return response.data;
    },

    // Academic Templates
    getAllTemplates: async () => {
        const response = await api.get('/platform-controls/templates');
        return response.data;
    },

    createTemplate: async (templateData) => {
        const response = await api.post('/platform-controls/templates', templateData);
        return response.data;
    },

    updateTemplate: async (templateId, templateData) => {
        const response = await api.put(`/platform-controls/templates/${templateId}`, templateData);
        return response.data;
    },

    deleteTemplate: async (templateId) => {
        const response = await api.delete(`/platform-controls/templates/${templateId}`);
        return response.data;
    },

    applyTemplateToSchool: async (templateId, schoolId) => {
        const response = await api.post(`/platform-controls/templates/${templateId}/apply`, {
            schoolId
        });
        return response.data;
    },

    applyTemplateToAllSchools: async (templateId) => {
        const response = await api.post(`/platform-controls/templates/${templateId}/apply-all`);
        return response.data;
    },

    // Feature Flag History
    getFeatureFlagHistory: async (flagId, limit = 50) => {
        const response = await api.get(`/platform-controls/feature-flags/${flagId}/history`, {
            params: { limit }
        });
        return response.data;
    }
};
