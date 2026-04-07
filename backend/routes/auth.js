import express from 'express';
import { body } from 'express-validator';
import { login, getCurrentUser, changePassword, logout, updateProfileInterests } from '../controllers/authController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Login
router.post('/login',
    [
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    login
);

// Get current user
router.get('/me', authMiddleware, getCurrentUser);

// Update profile interests
router.put('/profile/interests', authMiddleware, updateProfileInterests);

// Change password
router.post('/change-password',
    authMiddleware,
    [
        body('newPassword')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .withMessage('Password must contain uppercase, lowercase, number and special character')
    ],
    changePassword
);

// Logout
router.post('/logout', authMiddleware, logout);

export default router;
