import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const passwordResetService = {
    // Super Admin - Reset password for any user
    superAdminResetPassword: async (userId) => {
        try {
            const response = await api.post(`/password-reset/admin/reset-password/${userId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // School Admin - Reset password for users in their school
    schoolAdminResetPassword: async (userId) => {
        try {
            const response = await api.post(`/password-reset/school-admin/reset-password/${userId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Faculty - Reset password for students in their classes
    facultyResetPassword: async (studentId) => {
        try {
            const response = await api.post(`/password-reset/faculty/reset-student-password/${studentId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Change password on first login
    changePasswordOnFirstLogin: async (newPassword, confirmPassword) => {
        try {
            const response = await api.post('/password-reset/change-password-first-login', {
                newPassword,
                confirmPassword
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Get all users (Super Admin)
    getAllUsers: async () => {
        try {
            const response = await api.get('/password-reset/admin/users');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Get school users (School Admin)
    getSchoolUsers: async () => {
        try {
            const response = await api.get('/password-reset/school-admin/users');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Get faculty's students (Faculty)
    getFacultyStudents: async () => {
        try {
            const response = await api.get('/password-reset/faculty/students');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};

export default passwordResetService;
