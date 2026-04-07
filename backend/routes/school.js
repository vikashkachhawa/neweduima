import express from 'express';
import authMiddleware from '../middleware/auth.js';
import roleMiddleware from '../middleware/role.js';
import { getSchoolUsers, getDashboardStats, createUser, getAnnouncements, createAnnouncement, resetUserPassword, toggleUserStatus, getSchoolUser } from '../controllers/schoolController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Dashboard stats (all school roles)
router.get('/dashboard/stats', 
    roleMiddleware('school_admin', 'faculty', 'student'),
    getDashboardStats
);

// User management (school_admin only)
router.get('/users',
    roleMiddleware('school_admin'),
    getSchoolUsers
);

router.get('/users/:userId',
    roleMiddleware('school_admin'),
    getSchoolUser
);

router.post('/users',
    roleMiddleware('school_admin'),
    createUser
);

router.post('/users/:userId/reset-password',
    roleMiddleware('school_admin'),
    resetUserPassword
);

router.patch('/users/:userId/toggle-status',
    roleMiddleware('school_admin'),
    toggleUserStatus
);

// Announcements
router.get('/announcements',
    roleMiddleware('school_admin', 'faculty', 'student'),
    getAnnouncements
);

router.post('/announcements',
    roleMiddleware('school_admin'),
    createAnnouncement
);

export default router;
