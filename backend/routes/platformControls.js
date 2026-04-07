import express from 'express';
import FeatureFlag from '../models/FeatureFlag.js';
import Announcement from '../models/Announcement.js';
import AcademicTemplate from '../models/AcademicTemplate.js';
import authMiddleware from '../middleware/auth.js';
import { checkSuperAdmin } from '../middleware/permission.js';
import { checkSubscriptionActive } from '../middleware/subscription.js';

const router = express.Router();

// All platform controls routes require authentication first
router.use(authMiddleware);

// All platform controls routes require Super Admin + Active subscription
router.use(checkSubscriptionActive);
router.use(checkSuperAdmin);

// ============================================
// FEATURE FLAGS ROUTES
// ============================================

// Get all features
router.get('/features', async (req, res) => {
  try {
    const features = await FeatureFlag.getAllFeatures();
    res.json({
      success: true,
      count: features.length,
      features
    });
  } catch (error) {
    console.error('Error getting features:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get features for specific school
router.get('/features/school/:schoolId', async (req, res) => {
  try {
    const features = await FeatureFlag.getFeaturesForSchool(req.params.schoolId);
    res.json({
      success: true,
      schoolId: req.params.schoolId,
      features
    });
  } catch (error) {
    console.error('Error getting school features:', error);
    res.status(500).json({ error: error.message });
  }
});

// Toggle feature globally
router.post('/features/:featureName/toggle-global', async (req, res) => {
  try {
    const { featureName } = req.params;
    const { isEnabled } = req.body;

    const result = await FeatureFlag.toggleGlobal(featureName, isEnabled, req.user.id);

    if (!result) {
      return res.status(404).json({ error: 'Feature not found' });
    }

    res.json({
      success: true,
      message: `Feature "${featureName}" ${isEnabled ? 'enabled' : 'disabled'} globally`,
      feature: featureName,
      status: isEnabled ? 'enabled' : 'disabled'
    });
  } catch (error) {
    console.error('Error toggling feature:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set feature for specific school
router.post('/features/:featureName/set-for-school', async (req, res) => {
  try {
    const { featureName } = req.params;
    const { schoolId, isEnabled, reason } = req.body;

    if (!schoolId) {
      return res.status(400).json({ error: 'schoolId is required' });
    }

    await FeatureFlag.setForSchool(schoolId, featureName, isEnabled, reason, req.user.id);

    res.json({
      success: true,
      message: `Feature "${featureName}" ${isEnabled ? 'enabled' : 'disabled'} for school ${schoolId}`,
      feature: featureName,
      schoolId,
      status: isEnabled ? 'enabled' : 'disabled'
    });
  } catch (error) {
    console.error('Error setting school feature:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get feature history
router.get('/features/:featureName/history', async (req, res) => {
  try {
    const { featureName } = req.params;
    const { schoolId } = req.query;

    const history = await FeatureFlag.getHistory(featureName, schoolId);

    res.json({
      success: true,
      feature: featureName,
      schoolId: schoolId || 'global',
      changes: history.length,
      history
    });
  } catch (error) {
    console.error('Error getting feature history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ANNOUNCEMENTS ROUTES
// ============================================

// Create announcement
router.post('/announcements', async (req, res) => {
  try {
    const { title, content, type, priority, targetRoles, targetSchools } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const announcement = await Announcement.create({
      title,
      content,
      type: type || 'notice',
      priority: priority || 'medium',
      targetRoles,
      targetSchools
    }, req.user.id);

    res.json({
      success: true,
      message: 'Announcement created',
      announcement
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all announcements (Super Admin view)
router.get('/announcements', async (req, res) => {
  try {
    const filters = {};
    if (req.query.type) filters.type = req.query.type;
    if (req.query.isActive !== undefined) filters.isActive = req.query.isActive === 'true';
    if (req.query.startDate) filters.startDate = req.query.startDate;
    if (req.query.endDate) filters.endDate = req.query.endDate;

    const announcements = await Announcement.getAll(filters);
    const stats = await Announcement.getStats();

    res.json({
      success: true,
      count: announcements.length,
      stats,
      announcements
    });
  } catch (error) {
    console.error('Error getting announcements:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single announcement
router.get('/announcements/:id', async (req, res) => {
  try {
    const announcement = await Announcement.getById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json({ success: true, announcement });
  } catch (error) {
    console.error('Error getting announcement:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update announcement
router.put('/announcements/:id', async (req, res) => {
  try {
    const updated = await Announcement.update(req.params.id, req.body, req.user.id);

    res.json({
      success: true,
      message: 'Announcement updated',
      announcement: updated
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deactivate announcement
router.post('/announcements/:id/deactivate', async (req, res) => {
  try {
    await Announcement.deactivate(req.params.id);

    res.json({
      success: true,
      message: 'Announcement deactivated'
    });
  } catch (error) {
    console.error('Error deactivating announcement:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ACADEMIC TEMPLATES ROUTES
// ============================================

// Create template
router.post('/templates', async (req, res) => {
  try {
    const { type, name, description, startDate, endDate, appliesToAllSchools, applicableSchools } = req.body;

    if (!name || !startDate) {
      return res.status(400).json({ error: 'Name and start date are required' });
    }

    const template = await AcademicTemplate.create({
      type: type || 'holiday',
      name,
      description,
      startDate,
      endDate,
      appliesToAllSchools,
      applicableSchools
    }, req.user.id);

    res.json({
      success: true,
      message: 'Academic template created',
      template
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all templates (Super Admin view)
router.get('/templates', async (req, res) => {
  try {
    const filters = {};
    if (req.query.type) filters.type = req.query.type;
    if (req.query.isActive !== undefined) filters.isActive = req.query.isActive === 'true';
    if (req.query.startDate) filters.startDate = req.query.startDate;
    if (req.query.endDate) filters.endDate = req.query.endDate;

    const templates = await AcademicTemplate.getAll(filters);
    const stats = await AcademicTemplate.getStats();

    res.json({
      success: true,
      count: templates.length,
      stats,
      templates
    });
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single template
router.get('/templates/:id', async (req, res) => {
  try {
    const template = await AcademicTemplate.getById(req.params.id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ success: true, template });
  } catch (error) {
    console.error('Error getting template:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update template
router.put('/templates/:id', async (req, res) => {
  try {
    const updated = await AcademicTemplate.update(req.params.id, req.body);

    res.json({
      success: true,
      message: 'Template updated',
      template: updated
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deactivate template
router.post('/templates/:id/deactivate', async (req, res) => {
  try {
    await AcademicTemplate.deactivate(req.params.id);

    res.json({
      success: true,
      message: 'Template deactivated'
    });
  } catch (error) {
    console.error('Error deactivating template:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get templates for specific school
router.get('/templates/school/:schoolId', async (req, res) => {
  try {
    const { type } = req.query;
    const templates = await AcademicTemplate.getForSchool(req.params.schoolId, type);

    res.json({
      success: true,
      schoolId: req.params.schoolId,
      count: templates.length,
      templates
    });
  } catch (error) {
    console.error('Error getting school templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DASHBOARD ROUTE
// ============================================

// Get platform control statistics
router.get('/dashboard', async (req, res) => {
  try {
    const features = await FeatureFlag.getAllFeatures();
    const announcementStats = await Announcement.getStats();
    const templateStats = await AcademicTemplate.getStats();

    res.json({
      success: true,
      dashboard: {
        features: {
          total: features.length,
          enabled: features.filter(f => f.is_enabled).length,
          disabled: features.filter(f => !f.is_enabled).length
        },
        announcements: announcementStats,
        templates: templateStats
      }
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
