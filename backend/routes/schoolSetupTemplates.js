import express from 'express';
import authMiddleware from '../middleware/auth.js';
import roleMiddleware from '../middleware/role.js';
import {
  listStreamTemplatesForSchool,
  listExamPatternTemplatesForSchool,
  listHolidayPresetsForSchool
} from '../controllers/templateController.js';

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware('school_admin'));

router.get('/streams', listStreamTemplatesForSchool);
router.get('/exam-patterns', listExamPatternTemplatesForSchool);
router.get('/holiday-presets', listHolidayPresetsForSchool);

export default router;
