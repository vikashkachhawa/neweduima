import express from 'express';
import Analytics from '../models/Analytics.js';
import authMiddleware from '../middleware/auth.js';
import { checkSuperAdmin } from '../middleware/permission.js';
import { checkSubscriptionActive } from '../middleware/subscription.js';

const router = express.Router();

// All analytics routes require authentication first
router.use(authMiddleware);

// All analytics routes require Super Admin + Active subscription
router.use(checkSubscriptionActive);
router.use(checkSuperAdmin);

// ============================================
// DASHBOARD OVERVIEW
// ============================================

// Get complete dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const dashboard = await Analytics.getDashboard();
    
    res.json({
      success: true,
      dashboard
    });
  } catch (error) {
    console.error('Error getting dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get platform overview
router.get('/overview', async (req, res) => {
  try {
    const { date } = req.query; // Format: YYYY-MM-DD
    const overview = await Analytics.getPlatformOverview(date);
    
    res.json({
      success: true,
      overview
    });
  } catch (error) {
    console.error('Error getting overview:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// USAGE METRICS
// ============================================

// Get login trends
router.get('/trends/logins', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const { startDate, endDate } = req.query;
    const trends = await Analytics.getLoginTrends(days, startDate, endDate);
    
    res.json({
      success: true,
      days,
      trends
    });
  } catch (error) {
    console.error('Error getting login trends:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get hourly pattern
router.get('/trends/hourly', async (req, res) => {
  try {
    const date = req.query.date || null;
    const pattern = await Analytics.getHourlyPattern(date);
    
    res.json({
      success: true,
      date: date || new Date().toISOString().split('T')[0],
      pattern
    });
  } catch (error) {
    console.error('Error getting hourly pattern:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// STORAGE MONITORING
// ============================================

// Get storage alerts
router.get('/storage/alerts', async (req, res) => {
  try {
    const level = req.query.level || null; // warning, critical, emergency
    const { startDate, endDate, includeResolved } = req.query;
    const alerts = await Analytics.getStorageAlerts(
      level, 
      startDate, 
      endDate, 
      includeResolved === 'true'
    );
    
    res.json({
      success: true,
      count: alerts.length,
      level: level || 'all',
      alerts
    });
  } catch (error) {
    console.error('Error getting storage alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resolve storage alert
router.post('/storage/alerts/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query(
      'UPDATE storage_alerts SET resolved_at = NOW() WHERE id = ?',
      [id]
    );
    
    res.json({
      success: true,
      message: 'Storage alert resolved'
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ERROR MONITORING
// ============================================

// Get error summary
router.get('/errors/summary', async (req, res) => {
  try {
    const { startDate, endDate, hours = 24 } = req.query;
    const summary = await Analytics.getErrorSummary(startDate, endDate, parseInt(hours));
    
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error getting error summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get error details
router.get('/errors/details', async (req, res) => {
  try {
    const { errorType, endpoint, schoolId, limit = 50, startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM error_logs WHERE 1=1';
    const params = [];
    
    if (startDate) {
      query += ' AND DATE(occurred_at) >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND DATE(occurred_at) <= ?';
      params.push(endDate);
    }
    
    if (errorType) {
      query += ' AND error_type = ?';
      params.push(errorType);
    }
    
    if (endpoint) {
      query += ' AND endpoint = ?';
      params.push(endpoint);
    }
    
    if (schoolId) {
      query += ' AND school_id = ?';
      params.push(schoolId);
    }
    
    query += ' ORDER BY occurred_at DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const [errors] = await db.query(query, params);
    
    res.json({
      success: true,
      count: errors.length,
      errors
    });
  } catch (error) {
    console.error('Error getting error details:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PERFORMANCE METRICS
// ============================================

// Get performance metrics
router.get('/performance', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const { startDate, endDate } = req.query;
    const metrics = await Analytics.getPerformanceMetrics(days, startDate, endDate);
    
    res.json({
      success: true,
      days,
      metrics
    });
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SCHOOL PERFORMANCE
// ============================================

// Get school performance rankings
router.get('/schools/performance', async (req, res) => {
  try {
    const tier = req.query.tier || null; // top, good, average, needs_attention, at_risk
    const limit = parseInt(req.query.limit) || 10;
    const { date } = req.query;
    
    const schools = await Analytics.getSchoolPerformance(tier, limit, date);
    
    res.json({
      success: true,
      tier: tier || 'all',
      count: schools.length,
      schools
    });
  } catch (error) {
    console.error('Error getting school performance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get top performers
router.get('/schools/top-performers', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const { date } = req.query;
    const schools = await Analytics.getSchoolPerformance('top', limit, date);
    
    res.json({
      success: true,
      count: schools.length,
      schools
    });
  } catch (error) {
    console.error('Error getting top performers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get schools needing attention
router.get('/schools/needs-attention', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const { date } = req.query;
    const atRisk = await Analytics.getSchoolPerformance('at_risk', limit, date);
    const needsAttention = await Analytics.getSchoolPerformance('needs_attention', limit, date);
    
    res.json({
      success: true,
      count: atRisk.length + needsAttention.length,
      atRisk,
      needsAttention
    });
  } catch (error) {
    console.error('Error getting schools needing attention:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// FEATURE ADOPTION
// ============================================

// Get feature adoption stats
router.get('/features/adoption', async (req, res) => {
  try {
    const { date } = req.query;
    const stats = await Analytics.getFeatureAdoption(date);
    
    res.json({
      success: true,
      features: stats
    });
  } catch (error) {
    console.error('Error getting feature adoption:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// REVENUE & SUBSCRIPTIONS
// ============================================

// Get revenue metrics
router.get('/revenue', async (req, res) => {
  try {
    const { date } = req.query;
    const metrics = await Analytics.getRevenueMetrics(date);
    
    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Error getting revenue metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get upsell opportunities
router.get('/revenue/upsell-opportunities', async (req, res) => {
  try {
    const { date } = req.query;
    const opportunities = await Analytics.getUpsellOpportunities(date);
    
    res.json({
      success: true,
      opportunities
    });
  } catch (error) {
    console.error('Error getting upsell opportunities:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// EXPORT & REPORTS
// ============================================

// Export dashboard as JSON
router.get('/export/dashboard', async (req, res) => {
  try {
    const dashboard = await Analytics.getDashboard();
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="dashboard-${new Date().toISOString().split('T')[0]}.json"`);
    res.send(JSON.stringify(dashboard, null, 2));
  } catch (error) {
    console.error('Error exporting dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
