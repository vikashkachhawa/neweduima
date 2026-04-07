import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
    superAdminResetPassword,
    schoolAdminResetPassword,
    facultyResetPassword,
    changePasswordOnFirstLogin,
    getAllUsers,
    getSchoolUsers,
    getFacultyStudents
} from '../controllers/passwordResetController.js';

const router = express.Router();

// Middleware to ensure user is authenticated
router.use(authMiddleware);

// Super Admin Routes
router.post('/admin/reset-password/:userId', superAdminResetPassword);
router.get('/admin/users', getAllUsers);

// School Admin Routes
router.post('/school-admin/reset-password/:userId', schoolAdminResetPassword);
router.get('/school-admin/users', getSchoolUsers);

// Faculty Routes
router.post('/faculty/reset-student-password/:studentId', facultyResetPassword);
router.get('/faculty/students', getFacultyStudents);

// Auth Routes - Change password on first login
router.post('/change-password-first-login', changePasswordOnFirstLogin);

export default router;
