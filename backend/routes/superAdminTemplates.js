import express from 'express';
import authMiddleware from '../middleware/auth.js';
import roleMiddleware from '../middleware/role.js';
import {
  createStreamTemplate,
  listStreamTemplates,
  createExamPatternTemplate,
  listExamPatternTemplates,
  createHolidayPreset,
  listHolidayPresets
} from '../controllers/templateController.js';

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware('super_admin'));

router.get('/streams', listStreamTemplates);
router.post('/streams', createStreamTemplate);

router.get('/exam-patterns', listExamPatternTemplates);
router.post('/exam-patterns', createExamPatternTemplate);

router.get('/holiday-presets', listHolidayPresets);
router.post('/holiday-presets', createHolidayPreset);

export default router;
