/**
 * SUBSCRIPTION SYSTEM - INTEGRATION EXAMPLES
 * 
 * Real code examples showing how to integrate subscription enforcement
 * into existing controllers and routes.
 */

// ============================================================================
// EXAMPLE 1: Protecting User Creation with Plan Limits
// ============================================================================

// FILE: backend/controllers/userController.js

import User from '../models/User.js';
import UsageTracker from '../models/UsageTracker.js';
import Subscription from '../models/Subscription.js';
import AuditLog from '../models/AuditLog.js';

export const createUser = async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const schoolId = req.user.school_id;

    // 1. Check subscription is active (middleware already did this)
    const isActive = await Subscription.isSubscriptionActive(schoolId);
    if (!isActive) {
      return res.status(402).json({ 
        error: 'Subscription required to create users' 
      });
    }

    // 2. Check if school has exceeded user limit
    const exceeded = await UsageTracker.isLimitExceeded(schoolId, 'users_created');
    if (exceeded) {
      const usage = await UsageTracker.getUsage(schoolId, 'users_created');
      return res.status(402).json({
        error: 'User limit reached for your subscription plan',
        currentUsers: usage.current_value,
        maxUsers: usage.plan_limit,
        percentageUsed: '100%',
        action: 'Upgrade your subscription to add more users'
      });
    }

    // 3. Create user
    const user = await User.create({
      name,
      email,
      role,
      school_id: schoolId
    });

    // 4. Increment usage counter
    await UsageTracker.incrementUsage(schoolId, 'users_created', 1);

    // 5. Log the action
    await AuditLog.log(
      req.user.id,
      'user_created',
      'user',
      user.id,
      { name, email, role },
      req,
      'success'
    );

    res.status(201).json({
      message: 'User created successfully',
      user
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// ROUTE FILE: backend/routes/user.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { checkSubscriptionActive } from '../middleware/subscription.js';
import * as userController from '../controllers/userController.js';

const router = express.Router();

// User creation requires active subscription
router.post(
  '/create',
  authenticate,
  checkSubscriptionActive,  // ← Ensures subscription is active
  userController.createUser
);

export default router;

// ============================================================================
// EXAMPLE 2: Feature-Gating AI Exams
// ============================================================================

// FILE: backend/controllers/examController.js

import Exam from '../models/Exam.js';
import Subscription from '../models/Subscription.js';

export const generateAIExam = async (req, res) => {
  try {
    const { classId, topic, questionCount } = req.body;
    const schoolId = req.user.school_id;

    // 1. Check subscription is active (middleware)
    // 2. Check school has ai_exams feature (middleware)
    //    ← This is done by checkFeatureAccess('ai_exams')

    // 3. Call AI API to generate exam
    const exam = await Exam.generateAI({
      classId,
      topic,
      questionCount
    });

    res.status(201).json({
      message: 'AI exam generated successfully',
      exam
    });

  } catch (error) {
    console.error('Generate AI exam error:', error);
    res.status(500).json({ error: 'Failed to generate exam' });
  }
};

// ROUTE FILE: backend/routes/exam.js
import { checkFeatureAccess } from '../middleware/subscription.js';

router.post(
  '/generate-ai',
  authenticate,
  checkSubscriptionActive,           // ← Must have active subscription
  checkFeatureAccess('ai_exams'),   // ← Must have feature in plan
  examController.generateAIExam
);

// ============================================================================
// EXAMPLE 3: Display Subscription Status in Dashboard
// ============================================================================

// FILE: frontend/src/pages/Dashboard.jsx

import React, { useEffect } from 'react';
import { Box, Alert, Card, CardContent, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { SubscriptionStatus, UsageWarning } from '../components/SubscriptionStatus';

export default function Dashboard() {
  const { user } = useAuth();
  const { isActive, getPlanName, getDaysRemaining, fetchSubscriptionStatus } = useSubscription();

  useEffect(() => {
    if (user?.school_id) {
      fetchSubscriptionStatus(user.school_id);
    }
  }, [user, fetchSubscriptionStatus]);

  if (!isActive()) {
    return (
      <Alert severity="error">
        <strong>Access Denied</strong>
        <br />
        Your school's subscription has expired. Please contact your administrator.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Show subscription status at top */}
      <SubscriptionStatus compact />

      {/* Show warning if approaching limits */}
      <UsageWarning metric="users_created" threshold={80} />

      {/* Rest of dashboard */}
      <Card>
        <CardContent>
          <Typography variant="h6">
            Current Plan: {getPlanName()}
          </Typography>
          <Typography variant="body2">
            Expires in {getDaysRemaining()} days
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

// ============================================================================
// EXAMPLE 4: Conditional Feature Rendering
// ============================================================================

// FILE: frontend/src/pages/Exams.jsx

import { useSubscription } from '../contexts/SubscriptionContext';
import { FeatureAvailability } from '../components/SubscriptionStatus';

export default function Exams() {
  const { hasFeature } = useSubscription();

  return (
    <Box>
      <Typography variant="h5">Exam Tools</Typography>

      {/* This renders only if plan has AI exams feature */}
      <FeatureAvailability 
        featureName="ai_exams"
        fallback={
          <Alert severity="info">
            AI exam generation is available in Pro and Enterprise plans.
            Upgrade to unlock this feature.
          </Alert>
        }
      >
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6">Generate AI Exam</Typography>
            <AIExamGenerator />
          </CardContent>
        </Card>
      </FeatureAvailability>

      {/* This always renders */}
      <Card>
        <CardContent>
          <Typography variant="h6">Create Manual Exam</Typography>
          <ManualExamCreator />
        </CardContent>
      </Card>
    </Box>
  );
}

// ============================================================================
// EXAMPLE 5: Super Admin Subscription Management
// ============================================================================

// FILE: frontend/src/pages/SubscriptionManagement.jsx (excerpt)

async function handleUpgradeSchool() {
  try {
    const response = await api.post('/subscription/upgrade-subscription', {
      school_id: selectedSchool.id,
      new_plan_id: newPlanId
    });

    // Show success message
    console.log('Upgraded:', response.data.message);
    
    // Refresh data
    await loadSubscriptions();

  } catch (error) {
    console.error('Upgrade failed:', error.response.data.error);
  }
}

// ============================================================================
// EXAMPLE 6: Scheduled Nightly Job
// ============================================================================

// FILE: backend/server.js (add to main server initialization)

import cron from 'node-cron';
import Subscription from './models/Subscription.js';

// Initialize app...
const app = express();

// ... other middleware ...

// Schedule auto-suspension job to run every day at midnight UTC
cron.schedule('0 0 * * *', async () => {
  try {
    console.log(`[${new Date().toISOString()}] Running auto-suspend job...`);
    const count = await Subscription.autoSuspendExpired();
    console.log(`✓ Auto-suspended ${count} expired subscriptions`);
  } catch (error) {
    console.error('✗ Auto-suspend job failed:', error);
  }
});

// Optional: Schedule renewal reminders (every Monday at 8 AM UTC)
cron.schedule('0 8 * * 1', async () => {
  try {
    console.log('[Reminder Job] Checking for expiring subscriptions...');
    const expiring = await Subscription.getExpiringSubscriptions(7);
    
    // Send email reminders to school admins
    for (const sub of expiring) {
      // emailService.sendRenewalReminder(sub.school_id, sub.school_name);
    }
    
    console.log(`✓ Sent ${expiring.length} renewal reminders`);
  } catch (error) {
    console.error('Reminder job failed:', error);
  }
});

// ... rest of server setup ...

// ============================================================================
// EXAMPLE 7: Error Handling for Subscription Failures
// ============================================================================

// Client-side: Handling 402 Payment Required

async function createUser(userData) {
  try {
    const response = await api.post('/api/users/create', userData);
    return response.data;
  } catch (error) {
    if (error.response?.status === 402) {
      // Subscription issue - show upgrade prompt
      showUpgradeDialog({
        currentLimit: error.response.data.maxUsers,
        action: 'Upgrade to Pro plan (500 users) for just $49/month'
      });
    } else {
      showError(error.response?.data?.error || 'Failed to create user');
    }
  }
}

// Server-side: Custom error middleware
function subscriptionErrorHandler(err, req, res, next) {
  if (err.code === 'SUBSCRIPTION_EXPIRED') {
    return res.status(402).json({
      error: 'Subscription expired',
      daysExpired: err.daysExpired,
      renewUrl: '/api/subscription/restore-subscription'
    });
  }
  
  if (err.code === 'FEATURE_NOT_AVAILABLE') {
    return res.status(403).json({
      error: 'Feature not available in current plan',
      feature: err.feature,
      upgradeTo: err.recommendedPlan
    });
  }
  
  next(err);
}

app.use(subscriptionErrorHandler);

// ============================================================================
// EXAMPLE 8: Migration Helper - Assigning Subscriptions to Existing Schools
// ============================================================================

// FILE: backend/scripts/assign-initial-subscriptions.js
// Run once to assign Free plan to all existing schools

import Subscription from '../models/Subscription.js';
import School from '../models/School.js';

async function assignInitialSubscriptions() {
  try {
    const schools = await School.getAll();
    const freePlanId = 1; // Free plan ID
    
    let assigned = 0;
    
    for (const school of schools) {
      try {
        // Check if already has subscription
        const existing = await Subscription.getSchoolSubscription(school.id);
        if (!existing) {
          // Assign Free plan
          await Subscription.createSubscription(
            school.id,
            freePlanId,
            'monthly'
          );
          assigned++;
          console.log(`✓ Assigned Free plan to ${school.name}`);
        }
      } catch (err) {
        console.error(`✗ Failed to assign to ${school.name}:`, err.message);
      }
    }
    
    console.log(`\n✓ Assigned ${assigned} subscriptions`);
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run: node scripts/assign-initial-subscriptions.js

// ============================================================================
// EXAMPLE 9: Monitoring & Analytics
// ============================================================================

// FILE: backend/controllers/analyticsController.js

export const getSubscriptionAnalytics = async (req, res) => {
  try {
    // Get all stats
    const stats = await Subscription.getSubscriptionStats();
    
    // Calculate churn rate
    const cancelled = stats.filter(s => s.status === 'cancelled').length;
    const active = stats.filter(s => s.status === 'active').length;
    const churnRate = (cancelled / (active + cancelled) * 100).toFixed(2);
    
    // Calculate average revenue
    const revenue = await calculateRevenue();
    
    res.json({
      totalSchools: stats.length,
      activeSubscriptions: active,
      cancelledSubscriptions: cancelled,
      churnRate: `${churnRate}%`,
      totalRevenue: revenue.total,
      monthlyRecurringRevenue: revenue.mrr,
      averageRevenuePerSchool: revenue.arps,
      planBreakdown: stats
    });
    
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// ============================================================================
// EXAMPLE 10: Testing Subscription System
// ============================================================================

// FILE: backend/__tests__/subscription.test.js

import Subscription from '../models/Subscription.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import UsageTracker from '../models/UsageTracker.js';

describe('Subscription System', () => {
  
  // Test: Free plan user limit
  test('Should reject user creation when at limit', async () => {
    const schoolId = 1;
    const plan = await SubscriptionPlan.getPlanById(1); // Free plan
    
    // Create 50 users (limit)
    for (let i = 0; i < 50; i++) {
      await UsageTracker.incrementUsage(schoolId, 'users_created', 1);
    }
    
    // Try to create 51st user
    expect(() => 
      UsageTracker.incrementUsage(schoolId, 'users_created', 1)
    ).toThrow('Limit exceeded');
  });

  // Test: Feature gating
  test('Should show AI feature only for Pro plan', async () => {
    const freePlan = await SubscriptionPlan.getPlanById(1);
    const proPlan = await SubscriptionPlan.getPlanById(2);
    
    expect(SubscriptionPlan.hasFeature(freePlan, 'ai_exams')).toBe(false);
    expect(SubscriptionPlan.hasFeature(proPlan, 'ai_exams')).toBe(true);
  });

  // Test: Auto-suspension
  test('Should auto-suspend expired subscriptions', async () => {
    // Set end_date to yesterday
    await Subscription.suspendSubscription(1);
    
    // Run auto-suspend
    const count = await Subscription.autoSuspendExpired();
    
    expect(count).toBeGreaterThan(0);
    
    // Verify suspended
    const status = await Subscription.getSubscriptionStatus(1);
    expect(status.status).toBe('suspended');
  });

  // Test: Restoration
  test('Should restore access after payment', async () => {
    // School is suspended
    let status = await Subscription.getSubscriptionStatus(1);
    expect(status.status).toBe('suspended');
    
    // Restore
    await Subscription.restoreSubscription(1);
    
    // Verify restored
    status = await Subscription.getSubscriptionStatus(1);
    expect(status.status).toBe('active');
  });
});

// ============================================================================
// QUICK INTEGRATION CHECKLIST
// ============================================================================

/*
✓ MIDDLEWARE INTEGRATION
  [ ] Add checkSubscriptionActive to all resource-creation routes
  [ ] Add checkFeatureAccess('feature_name') to feature-gated routes
  [ ] Add attachSubscriptionStatus to dashboard routes

✓ USAGE TRACKING
  [ ] Call UsageTracker.isLimitExceeded() before creating resource
  [ ] Call UsageTracker.incrementUsage() after creating resource
  [ ] Implement for: users, classes, exams, etc.

✓ FRONTEND INTEGRATION
  [ ] Import SubscriptionProvider in App.jsx
  [ ] Import SubscriptionStatus in Dashboard.jsx
  [ ] Wrap AI features with FeatureAvailability
  [ ] Add UsageWarning to relevant pages
  [ ] Add "Subscription Management" menu for Super Admin

✓ SCHEDULED JOBS
  [ ] Install node-cron: npm install node-cron
  [ ] Add auto-suspend job to server.js
  [ ] (Optional) Add renewal reminder job
  [ ] (Optional) Add auto-renewal job for recurring billing

✓ TESTING
  [ ] Test: Create user on Free plan (50 limit)
  [ ] Test: Upgrade to Pro plan
  [ ] Test: Try AI exam on Free plan (should fail)
  [ ] Test: Use AI exam on Pro plan (should work)
  [ ] Test: Auto-suspend job runs nightly
  [ ] Test: Restore subscription brings access back

✓ DEPLOYMENT
  [ ] Assign all existing schools to Free plan
  [ ] Configure payment gateway (if needed)
  [ ] Set up email notifications
  [ ] Train Super Admin
  [ ] Monitor first week for issues
*/
