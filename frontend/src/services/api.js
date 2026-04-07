import axios from 'axios';
import { getErrorMessage } from '../utils/errorHandling';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.log('API Error:', error.response?.status, error.response?.data);
        const requestUrl = error.config?.url || '';
        const isLoginRequest = requestUrl.includes('/auth/login');
        
        // Handle suspension/deletion
        if (error.response?.status === 403) {
            const message = error.response?.data?.message;
            // Only logout if it's a school suspension/deletion, not permission denied
            if (message && (message.includes('suspended') || message.includes('deleted'))) {
                console.log('School suspended/deleted, logging out');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login?error=' + encodeURIComponent(message);
                return Promise.reject(error);
            }
            // For other 403 errors (like insufficient permissions), just return the error
            console.log('Permission denied, but keeping user logged in');
        }
        
        // Handle unauthorized - but only if token is actually invalid
        if (error.response?.status === 401) {
            if (isLoginRequest) {
                return Promise.reject(error);
            }

            console.log('Unauthorized (401), logging out');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }

        error.displayMessage = getErrorMessage(error);
        
        return Promise.reject(error);
    }
);

export default api;
