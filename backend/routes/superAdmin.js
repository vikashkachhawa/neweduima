import express from 'express';
import { body } from 'express-validator';
import authMiddleware from '../middleware/auth.js';
import roleMiddleware from '../middleware/role.js';
import { checkSubscriptionActive } from '../middleware/subscription.js';
import {
    getAllSchools,
    createSchool,
    getSchoolById,
    setSchoolStatus,
    updateSchoolModules,
    cloneSchool,
    getAllUsers,
    createUser,
    resetUserPassword,
    toggleUserStatus
} from '../controllers/superAdminController.js';

const router = express.Router();

const createSchoolValidation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('School name is required')
        .isLength({ min: 2, max: 255 })
        .withMessage('School name must be between 2 and 255 characters'),
    body('location')
        .trim()
        .notEmpty()
        .withMessage('Location is required')
        .isLength({ min: 2, max: 255 })
        .withMessage('Location must be between 2 and 255 characters'),
    body('email')
        .optional({ values: 'falsy' })
        .trim()
        .isEmail()
        .withMessage('School email must be a valid email address'),
    body('countryCode')
        .trim()
        .notEmpty()
        .withMessage('Country code is required')
        .matches(/^\+\d{1,4}$/)
        .withMessage('Country code must be in format like +91 or +1'),
    body('phoneNumber')
        .trim()
        .notEmpty()
        .withMessage('Phone number is required')
        .matches(/^\d{6,15}$/)
        .withMessage('Phone number must contain 6 to 15 digits')
        .custom((phoneNumber, { req }) => {
            const code = (req.body.countryCode || '').trim();
            if (code === '+91' && phoneNumber.length !== 10) {
                throw new Error('For India (+91), phone number must contain exactly 10 digits');
            }
            return true;
        }),
    body('address')
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Address must be at most 1000 characters'),
    body('adminEmail')
        .trim()
        .notEmpty()
        .withMessage('Admin email is required')
        .isEmail()
        .withMessage('Admin email must be a valid email address'),
    body('adminFirstName')
        .trim()
        .notEmpty()
        .withMessage('Admin first name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Admin first name must be between 2 and 100 characters'),
    body('adminLastName')
        .trim()
        .notEmpty()
        .withMessage('Admin last name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Admin last name must be between 2 and 100 characters')
];

// All routes require authentication and super_admin role
router.use(authMiddleware);
router.use(roleMiddleware('super_admin'));

// School routes
router.get('/schools', getAllSchools);
router.post('/schools', createSchoolValidation, createSchool);
router.get('/schools/:id', getSchoolById);
router.post('/schools/:id/status', setSchoolStatus);
router.post('/schools/:id/modules', updateSchoolModules);
router.post('/schools/:sourceId/clone', cloneSchool);

// User routes
router.get('/users', getAllUsers);
router.post('/users', checkSubscriptionActive, createUser);
router.post('/users/:userId/reset-password', resetUserPassword);
router.patch('/users/:userId/toggle-status', toggleUserStatus);

export default router;
