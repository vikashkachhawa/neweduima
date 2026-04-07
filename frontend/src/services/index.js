import api from './api';
import { analyticsService } from './analytics';
import { subscriptionService } from './subscription';
import { platformControlsService } from './platformControls';
import { superAdminTemplateService, schoolTemplateService } from './templates';

export { api, analyticsService, subscriptionService, platformControlsService, superAdminTemplateService, schoolTemplateService };

export const authService = {
    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.success) {
            localStorage.setItem('token', response.data.token);

            // Normalize user shape to include both camelCase and snake_case for school id
            const normalizedUser = {
                ...response.data.user,
                school_id: response.data.user.schoolId ?? response.data.user.school_id ?? null,
                must_change_password: response.data.user.mustChangePassword ?? response.data.user.must_change_password ?? false,
                mustChangePassword: response.data.user.mustChangePassword ?? response.data.user.must_change_password ?? false,
                profileInterests: response.data.user.profileInterests || response.data.user.profile_interests || []
            };

            localStorage.setItem('user', JSON.stringify(normalizedUser));
            response.data.user = normalizedUser;
        }
        return response.data;
    },

    getCurrentUser: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    },

    changePassword: async (currentPassword, newPassword) => {
        const response = await api.post('/auth/change-password', {
            currentPassword,
            newPassword
        });
        return response.data;
    },

    logout: async () => {
        await api.post('/auth/logout');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    },

    getUser: () => {
        const user = localStorage.getItem('user');
        if (!user) return null;

        const parsed = JSON.parse(user);
        if (parsed && parsed.school_id === undefined && parsed.schoolId !== undefined) {
            parsed.school_id = parsed.schoolId;
        }
        if (parsed && parsed.must_change_password === undefined) {
            parsed.must_change_password = parsed.mustChangePassword ?? false;
        }
        if (parsed && parsed.mustChangePassword === undefined) {
            parsed.mustChangePassword = parsed.must_change_password ?? false;
        }
        if (parsed && parsed.profileInterests === undefined) {
            parsed.profileInterests = parsed.profile_interests ?? [];
        }
        return parsed;
    },

    updateProfileInterests: async (interests) => {
        const response = await api.put('/auth/profile/interests', { interests });
        return response.data;
    }
};

export const superAdminService = {
    getAllSchools: async () => {
        const response = await api.get('/super-admin/schools');
        return response.data;
    },

    createSchool: async (schoolData) => {
        const response = await api.post('/super-admin/schools', schoolData);
        return response.data;
    },

    setSchoolStatus: async (schoolId, status, reason = null) => {
        const response = await api.post(`/super-admin/schools/${schoolId}/status`, { status, reason });
        return response.data;
    },

    updateSchoolModules: async (schoolId, modules) => {
        const response = await api.post(`/super-admin/schools/${schoolId}/modules`, { modules });
        return response.data;
    },

    cloneSchool: async (sourceId, payload) => {
        const response = await api.post(`/super-admin/schools/${sourceId}/clone`, payload);
        return response.data;
    },

    getSchoolById: async (id) => {
        const response = await api.get(`/super-admin/schools/${id}`);
        return response.data;
    },

    getAllUsers: async (schoolId = null) => {
        const params = schoolId ? { schoolId } : {};
        const response = await api.get('/super-admin/users', { params });
        return response.data;
    },

    createUser: async (userData) => {
        const response = await api.post('/super-admin/users', userData);
        return response.data;
    },

    resetUserPassword: async (userId) => {
        const response = await api.post(`/super-admin/users/${userId}/reset-password`);
        return response.data;
    },

    toggleUserStatus: async (userId, isActive) => {
        const response = await api.patch(`/super-admin/users/${userId}/toggle-status`, { isActive });
        return response.data;
    }
};

export const schoolService = {
    getDashboardStats: async () => {
        const response = await api.get('/school/dashboard/stats');
        return response.data;
    },

    getSchoolUsers: async () => {
        const response = await api.get('/school/users');
        return response.data;
    },

    getUserById: async (userId) => {
        const response = await api.get(`/school/users/${userId}`);
        return response.data;
    },

    createUser: async (userData) => {
        const response = await api.post('/school/users', userData);
        return response.data;
    },

    resetUserPassword: async (userId) => {
        const response = await api.post(`/school/users/${userId}/reset-password`);
        return response.data;
    },

    toggleUserStatus: async (userId, isActive) => {
        const response = await api.patch(`/school/users/${userId}/toggle-status`, { isActive });
        return response.data;
    },

    getAnnouncements: async () => {
        const response = await api.get('/school/announcements');
        return response.data;
    },

    createAnnouncement: async (announcementData) => {
        const response = await api.post('/school/announcements', announcementData);
        return response.data;
    }
};
