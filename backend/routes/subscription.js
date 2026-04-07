import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { checkPermission } from '../middleware/permission.js';
import { checkSubscriptionActive, checkFeatureAccess } from '../middleware/subscription.js';
import Subscription from '../models/Subscription.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import UsageTracker from '../models/UsageTracker.js';
import AuditLog from '../models/AuditLog.js';
import db from '../config/database.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * USE CASE 1: Super Admin creates/manages subscription plans
 * Example: Create Pro plan with 500 users and AI features
 */
router.post('/plans', 
  checkPermission('manage_subscriptions'),
  async (req, res) => {
    try {
      const { name, max_users, features, price_monthly, price_annual } = req.body;

      // Validate input
      if (!name || !max_users || !features || typeof features !== 'object') {
        return res.status(400).json({ 
          error: 'Missing required fields: name, max_users, features' 
        });
      }

      const plan = await SubscriptionPlan.createPlan(
        name,
        max_users,
        features,
        price_monthly || 0,
        price_annual || 0
      );

      await AuditLog.log(
        req.user.id,
        'plan_created',
        'subscription_plan',
        plan.id,
        { name, max_users, features },
        req,
        'success'
      );

      res.status(201).json({
        message: 'Subscription plan created',
        plan
      });
    } catch (error) {
      console.error('Create plan error:', error);
      res.status(500).json({ error: 'Failed to create plan' });
    }
  }
);

/**
 * USE CASE 1: Get all plans (for Super Admin dashboard)
 */
router.get('/plans',
  checkPermission('view_subscriptions'),
  async (req, res) => {
    try {
      const plans = await SubscriptionPlan.getAllPlans();
      res.json(plans);
    } catch (error) {
      console.error('Get plans error:', error);
      res.status(500).json({ error: 'Failed to fetch plans' });
    }
  }
);

/**
 * USE CASE 2: Assign subscription plan to school
 * Example: Assign Pro plan to Lincoln High School
 * Result: School now has 500 user limit and AI features unlocked
 */
router.post('/assign-plan',
  checkPermission('manage_subscriptions'),
  async (req, res) => {
    try {
      const { school_id, plan_id, billing_cycle = 'monthly' } = req.body;

      if (!school_id || !plan_id) {
        return res.status(400).json({ 
          error: 'Missing required fields: school_id, plan_id' 
        });
      }

      // Verify plan exists
      const plan = await SubscriptionPlan.getPlanById(plan_id);
      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      // Check if school already has subscription
      const existing = await Subscription.getSchoolSubscription(school_id);
      if (existing && existing.status !== 'cancelled' && existing.status !== 'suspended') {
        return res.status(409).json({ 
          error: 'School already has active subscription',
          currentPlan: existing.plan_name
        });
      }

      const subscription = await Subscription.createSubscription(
        school_id,
        plan_id,
        billing_cycle
      );

      await AuditLog.log(
        req.user.id,
        'subscription_assigned',
        'subscription',
        subscription.id,
        { school_id, plan_id, plan_name: plan.name, max_users: plan.max_users },
        req,
        'success'
      );

      res.status(201).json({
        message: `Plan "${plan.name}" assigned to school`,
        subscription,
        plan_details: plan
      });
    } catch (error) {
      console.error('Assign plan error:', error);
      res.status(500).json({ error: 'Failed to assign plan' });
    }
  }
);

/**
 * USE CASE 3: Upgrade school subscription
 * Example: Upgrade school from Free (50 users) to Pro (500 users)
 * Result: Users immediately get access to AI features
 */
router.post('/upgrade-subscription',
  checkPermission('manage_subscriptions'),
  async (req, res) => {
    try {
      const { school_id, new_plan_id } = req.body;

      if (!school_id || !new_plan_id) {
        return res.status(400).json({ 
          error: 'Missing required fields: school_id, new_plan_id' 
        });
      }

      const currentSub = await Subscription.getSchoolSubscription(school_id);
      if (!currentSub) {
        return res.status(404).json({ error: 'No subscription found for school' });
      }

      const newPlan = await SubscriptionPlan.getPlanById(new_plan_id);
      if (!newPlan) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      const upgraded = await Subscription.upgradeSubscription(school_id, new_plan_id);

      await AuditLog.log(
        req.user.id,
        'subscription_upgraded',
        'subscription',
        upgraded.id,
        { 
          school_id, 
          from_plan: currentSub.plan_name,
          to_plan: newPlan.name,
          from_max_users: currentSub.max_users,
          to_max_users: newPlan.max_users
        },
        req,
        'success'
      );

      res.json({
        message: `Upgraded to "${newPlan.name}" plan`,
        subscription: upgraded,
        new_plan_details: newPlan
      });
    } catch (error) {
      console.error('Upgrade subscription error:', error);
      res.status(500).json({ error: 'Failed to upgrade subscription' });
    }
  }
);

/**
 * USE CASE 4: Get subscription status and expiry info
 * Used by Super Admin to see which subscriptions are expiring
 * Returns: active status, days until expiry, warnings
 */
router.get('/school/:school_id/status',
  checkPermission('view_subscriptions'),
  async (req, res) => {
    try {
      const { school_id } = req.params;
      
      const status = await Subscription.getSubscriptionStatus(school_id);
      const subscription = await Subscription.getSchoolSubscription(school_id);
      const usage = await UsageTracker.getAllUsage(school_id);

      res.json({
        ...status,
        subscription,
        usage_summary: usage.map(u => ({
          metric: u.metric_name,
          current: u.current_value,
          limit: u.plan_limit,
          percentage: ((u.current_value / u.plan_limit) * 100).toFixed(2) + '%'
        }))
      });
    } catch (error) {
      console.error('Get status error:', error);
      res.status(500).json({ error: 'Failed to get subscription status' });
    }
  }
);

/**
 * USE CASE 5: Auto-suspension on expiry
 * Called nightly by admin task scheduler
 * Finds all expired subscriptions and suspends them
 * Teachers/students lose access until payment recovery
 */
router.post('/auto-suspend-expired',
  checkPermission('manage_subscriptions'),
  async (req, res) => {
    try {
      const expiringSubscriptions = await Subscription.getExpiringSubscriptions(0);
      
      let suspendedCount = 0;
      const results = [];

      for (const sub of expiringSubscriptions) {
        try {
          const result = await Subscription.suspendSubscription(sub.school_id);
          suspendedCount++;
          results.push({
            school_id: sub.school_id,
            plan: sub.plan_name,
            status: 'suspended'
          });

          await AuditLog.log(
            req.user.id,
            'subscription_auto_suspended',
            'subscription',
            sub.id,
            { school_id: sub.school_id, reason: 'subscription_expired' },
            req,
            'success'
          );
        } catch (err) {
          console.error(`Failed to suspend school ${sub.school_id}:`, err);
          results.push({
            school_id: sub.school_id,
            plan: sub.plan_name,
            status: 'error',
            error: err.message
          });
        }
      }

      res.json({
        message: `Auto-suspended ${suspendedCount} expired subscriptions`,
        suspendedCount,
        results
      });
    } catch (error) {
      console.error('Auto-suspend error:', error);
      res.status(500).json({ error: 'Failed to auto-suspend subscriptions' });
    }
  }
);

/**
 * USE CASE 6: Restore subscription after payment
 * Called when payment is received
 * Immediately restores access to all features and data
 * No data loss - everything remains intact
 */
router.post('/restore-subscription',
  checkPermission('manage_subscriptions'),
  async (req, res) => {
    try {
      const { school_id, renewal_months = 12 } = req.body;

      if (!school_id) {
        return res.status(400).json({ error: 'Missing school_id' });
      }

      const subscription = await Subscription.getSchoolSubscription(school_id);
      if (!subscription) {
        return res.status(404).json({ error: 'No subscription found' });
      }

      const restored = await Subscription.restoreSubscription(school_id, renewal_months);

      await AuditLog.log(
        req.user.id,
        'subscription_restored',
        'subscription',
        restored.id,
        { 
          school_id, 
          plan: restored.plan_name,
          new_end_date: restored.end_date
        },
        req,
        'success'
      );

      res.json({
        message: 'Subscription restored successfully - all access restored',
        subscription: restored
      });
    } catch (error) {
      console.error('Restore subscription error:', error);
      res.status(500).json({ error: 'Failed to restore subscription' });
    }
  }
);

/**
 * ANALYTICS: Get subscription statistics
 * Super Admin dashboard shows: total schools, plans distribution, revenue
 */
router.get('/statistics',
  checkPermission('view_subscriptions'),
  async (req, res) => {
    try {
      const stats = await Subscription.getSubscriptionStats();
      
      // Get plan distribution
      const [plans] = await db.query(
        'SELECT plan_id, name as plan_name, COUNT(*) as schools FROM subscriptions s JOIN subscription_plans p ON s.plan_id = p.id WHERE s.status != ? GROUP BY s.plan_id, p.name',
        ['cancelled']
      );

      // Calculate revenue
      const [revenue] = await db.query(
        'SELECT SUM(CASE WHEN billing_cycle = "monthly" THEN (SELECT price_monthly FROM subscription_plans WHERE id = plan_id) ELSE (SELECT price_annual FROM subscription_plans WHERE id = plan_id) END) as total_revenue FROM subscriptions WHERE status = ?',
        ['active']
      );

      res.json({
        ...stats,
        planDistribution: plans,
        totalRevenue: revenue[0]?.total_revenue || 0
      });
    } catch (error) {
      console.error('Statistics error:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }
);

/**
 * Get all expiring subscriptions (within N days)
 * Used to send renewal reminders
 */
router.get('/expiring-soon/:days',
  checkPermission('view_subscriptions'),
  async (req, res) => {
    try {
      const days = parseInt(req.params.days) || 30;
      const expiring = await Subscription.getExpiringSubscriptions(days);
      
      res.json({
        days,
        count: expiring.length,
        subscriptions: expiring
      });
    } catch (error) {
      console.error('Expiring subscriptions error:', error);
      res.status(500).json({ error: 'Failed to fetch expiring subscriptions' });
    }
  }
);

/**
 * Cancel subscription (not the same as suspend)
 * Used when school owner cancels service
 */
router.post('/cancel-subscription',
  checkPermission('manage_subscriptions'),
  async (req, res) => {
    try {
      const { school_id } = req.body;

      const subscription = await Subscription.getSchoolSubscription(school_id);
      if (!subscription) {
        return res.status(404).json({ error: 'No subscription found' });
      }

      const [result] = await db.query(
        'UPDATE subscriptions SET status = ?, updated_at = NOW() WHERE school_id = ?',
        ['cancelled', school_id]
      );

      await AuditLog.log(
        req.user.id,
        'subscription_cancelled',
        'subscription',
        subscription.id,
        { school_id, plan: subscription.plan_name },
        req,
        'success'
      );

      res.json({
        message: 'Subscription cancelled',
        school_id
      });
    } catch (error) {
      console.error('Cancel subscription error:', error);
      res.status(500).json({ error: 'Failed to cancel subscription' });
    }
  }
);

export default router;
