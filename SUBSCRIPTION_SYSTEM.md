# Subscription & Billing System - Complete Guide

## Overview

This document describes the complete subscription system implementation that enforces plan-based access and feature availability across the EduIMA platform. The system is controlled entirely by the Super Admin and affects real-time system behavior.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Database Schema](#database-schema)
3. [Core Models](#core-models)
4. [Middleware & Enforcement](#middleware--enforcement)
5. [API Routes](#api-routes)
6. [Use Cases with Examples](#use-cases-with-examples)
7. [Frontend Integration](#frontend-integration)
8. [Super Admin Dashboard](#super-admin-dashboard)
9. [Scheduled Jobs](#scheduled-jobs)
10. [Implementation Checklist](#implementation-checklist)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        EduIMA Platform                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐       ┌──────────────────┐                │
│  │  School/User     │       │  Super Admin     │                │
│  │  Requests        │       │  Controls        │                │
│  └────────┬─────────┘       └────────┬─────────┘                │
│           │                          │                           │
│           ├──────────────────────────┼──────────────────────┐   │
│           │                          │                      │   │
│           ▼                          ▼                      ▼   │
│   ┌─────────────────┐      ┌──────────────────┐   ┌────────────┐│
│   │ checkSubscription│      │ Subscription API │   │Subscription││
│   │Active           │      │ Routes           │   │Dashboard   ││
│   └────────┬────────┘      └─────────┬────────┘   └────────────┘│
│            │                         │                          │
│            ├─────────────────────────┤                          │
│            │                         │                          │
│   ┌────────▼────────┐    ┌──────────▼──────────┐               │
│   │ Database        │    │ Subscription Models │               │
│   │ (MySQL)         │    │ - SubscriptionPlan  │               │
│   │                 │    │ - Subscription      │               │
│   │ Tables:         │    │ - UsageTracker      │               │
│   │ - Plans         │    │ - AuditLog          │               │
│   │ - Subscriptions │    └─────────────────────┘               │
│   │ - Usage         │                                          │
│   │ - Invoices      │                                          │
│   └─────────────────┘                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Subscription controls everything** - Every API call involving resource creation is checked
2. **Feature-based access** - Plans define which features are available
3. **Usage tracking** - System tracks metric usage (users, classes, etc.)
4. **Auto-enforcement** - Scheduled jobs auto-suspend expired subscriptions
5. **Data safety** - Suspension doesn't delete data, restoration brings it back immediately
6. **Audit trail** - All subscription changes are logged

---

## Database Schema

### 1. subscription_plans

Defines available subscription tiers and their features.

```sql
CREATE TABLE subscription_plans (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE,           -- "Free", "Pro", "Enterprise"
  description TEXT,
  max_users INT,                     -- User limit for plan
  max_classes INT DEFAULT 999,       -- Class limit
  features JSON,                     -- { "ai_exams": true, "analytics": true, ... }
  price_monthly DECIMAL(10, 2),
  price_annual DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Default Plans:**

| Plan | Max Users | AI Exams | Analytics | API Access |
|------|-----------|----------|-----------|------------|
| Free | 50 | ❌ | ❌ | ❌ |
| Pro | 500 | ✅ | ✅ | ❌ |
| Enterprise | 9999 | ✅ | ✅ | ✅ |

### 2. subscriptions

Links schools to plans and tracks subscription lifecycle.

```sql
CREATE TABLE subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL UNIQUE,     -- One subscription per school
  plan_id INT NOT NULL,
  status ENUM('active', 'suspended', 'expired', 'cancelled'),
  billing_cycle ENUM('monthly', 'annual'),
  start_date DATE,
  end_date DATE,                     -- When subscription expires
  auto_renew BOOLEAN DEFAULT TRUE,
  last_payment_date DATETIME,
  next_payment_date DATE,
  payment_method VARCHAR(50),
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);
```

### 3. usage_tracking

Tracks consumption of limited resources.

```sql
CREATE TABLE usage_tracking (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  metric_name VARCHAR(100),          -- "users_created", "classes_created"
  current_value INT DEFAULT 0,
  plan_limit INT,                    -- Max allowed by current plan
  last_reset_date DATE,
  FOREIGN KEY (school_id) REFERENCES schools(id),
  UNIQUE KEY (school_id, metric_name)
);
```

### 4. subscription_invoices

Tracks billing and payments.

```sql
CREATE TABLE subscription_invoices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  subscription_id INT NOT NULL,
  amount DECIMAL(10, 2),
  status ENUM('pending', 'paid', 'failed', 'refunded'),
  due_date DATE,
  payment_date DATETIME,
  payment_method VARCHAR(50),
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);
```

---

## Core Models

### SubscriptionPlan.js

Manages subscription plan definitions and feature checking.

```javascript
// Get all plans
const plans = await SubscriptionPlan.getAllPlans();

// Get plan with full details
const plan = await SubscriptionPlan.getPlanById(planId);

// Check if plan has specific feature
const hasAI = SubscriptionPlan.hasFeature(plan, 'ai_exams'); // true/false

// Create custom plan (Super Admin only)
await SubscriptionPlan.createPlan('Custom', 200, {
  ai_exams: true,
  analytics: true,
  api_access: false
}, 99.99, 999.99);

// Update plan
await SubscriptionPlan.updatePlan(planId, { max_users: 300 });
```

### Subscription.js

Manages school subscriptions and their lifecycle.

```javascript
// Get current subscription for school
const sub = await Subscription.getSchoolSubscription(schoolId);

// Check if subscription is active
const isActive = await Subscription.isSubscriptionActive(schoolId);

// Get detailed status with expiry info
const status = await Subscription.getSubscriptionStatus(schoolId);
// Returns: {
//   status: 'active' | 'suspended' | 'expired',
//   planName: 'Pro',
//   daysUntilExpiry: 15,
//   isExpiringSoon: false
// }

// Check if school has feature access
const hasFeature = await Subscription.hasFeature(schoolId, 'ai_exams');

// Create new subscription
await Subscription.createSubscription(schoolId, planId, 'monthly');

// Upgrade to higher plan
await Subscription.upgradeSubscription(schoolId, newPlanId);

// Renew subscription
await Subscription.renewSubscription(schoolId);

// Suspend (on expiry or non-payment)
await Subscription.suspendSubscription(schoolId);

// Restore after payment
await Subscription.restoreSubscription(schoolId);

// Get subscriptions expiring within N days
const expiring = await Subscription.getExpiringSubscriptions(7);

// Auto-suspend all expired (run nightly)
await Subscription.autoSuspendExpired();

// Dashboard stats
const stats = await Subscription.getSubscriptionStats();
```

### UsageTracker.js

Enforces plan limits on resource creation.

```javascript
// Get current usage for metric
const usage = await UsageTracker.getUsage(schoolId, 'users_created');

// Check if limit exceeded
const exceeded = await UsageTracker.isLimitExceeded(schoolId, 'users_created');

// Try to use resource (throws error if limit exceeded)
await UsageTracker.incrementUsage(schoolId, 'users_created', 1);

// Get all usage for school
const all = await UsageTracker.getAllUsage(schoolId);

// Get percentage of limit used
const percentage = await UsageTracker.getUsagePercentage(schoolId, 'users_created');

// Reset monthly usage (on renewal)
await UsageTracker.resetMonthlyUsage(schoolId);
```

---

## Middleware & Enforcement

### checkSubscriptionActive

**File:** `backend/middleware/subscription.js`

Verifies school has active subscription before allowing resource-intensive operations.

```javascript
// In route file
router.post('/api/users/create',
  authenticate,
  checkSubscriptionActive,  // Must have active subscription
  userController.create
);
```

**Behavior:**
- ✅ Pass if subscription active and not expired
- ✅ Pass if user is Super Admin (bypasses check)
- ❌ Return 402 Payment Required if suspended
- ❌ Return 402 Payment Required if expired
- Returns detailed status message and plan details

### checkFeatureAccess

**File:** `backend/middleware/subscription.js`

Verifies school's plan includes specific feature.

```javascript
router.post('/api/exams/generate-ai',
  authenticate,
  checkFeatureAccess('ai_exams'),  // Feature guard
  examController.generateAI
);
```

**Behavior:**
- ✅ Pass if plan includes feature
- ✅ Pass if user is Super Admin
- ❌ Return 403 Forbidden with upgrade suggestion if feature unavailable
- Logs feature access denials for analytics

### attachSubscriptionStatus

**File:** `backend/middleware/subscription.js`

Attaches subscription info to request for display (warnings, expiry notices).

```javascript
router.get('/api/school/dashboard',
  authenticate,
  attachSubscriptionStatus,  // Adds req.subscriptionStatus
  schoolController.dashboard
);
```

---

## API Routes

### Base URL: `/api/subscription`

All endpoints require `manage_subscriptions` permission (Super Admin only).

#### Plans Management

##### `GET /plans`
Get all subscription plans.

```json
Response:
[
  {
    "id": 1,
    "name": "Free",
    "max_users": 50,
    "features": {"ai_exams": false, "analytics": false, "api_access": false},
    "price_monthly": 0,
    "price_annual": 0
  },
  {
    "id": 2,
    "name": "Pro",
    "max_users": 500,
    "features": {"ai_exams": true, "analytics": true, "api_access": false},
    "price_monthly": 49.00,
    "price_annual": 490.00
  }
]
```

##### `POST /plans`
Create new custom plan.

```json
Request:
{
  "name": "Standard",
  "max_users": 200,
  "features": {"ai_exams": true, "analytics": true, "api_access": false},
  "price_monthly": 29.99,
  "price_annual": 299.90
}

Response:
{
  "message": "Subscription plan created",
  "plan": { /* plan details */ }
}
```

#### Subscription Management

##### `POST /assign-plan`
Assign subscription plan to school.

```json
Request:
{
  "school_id": 123,
  "plan_id": 2,           // Pro plan
  "billing_cycle": "monthly"
}

Response:
{
  "message": "Plan 'Pro' assigned to school",
  "subscription": { /* subscription */ },
  "plan_details": { /* plan */ }
}
```

##### `POST /upgrade-subscription`
Upgrade school to higher plan.

```json
Request:
{
  "school_id": 123,
  "new_plan_id": 3        // Upgrade from Pro (2) to Enterprise (3)
}

Response:
{
  "message": "Upgraded to 'Enterprise' plan",
  "subscription": { /* updated */ },
  "new_plan_details": { /* plan */ }
}
```

##### `GET /school/:school_id/status`
Get subscription status and usage.

```json
Response:
{
  "hasSubscription": true,
  "plan": "Pro",
  "status": "active",
  "isActive": true,
  "startDate": "2024-01-15",
  "endDate": "2025-01-15",
  "daysUntilExpiry": 45,
  "isExpiringSoon": false,
  "usage_summary": [
    {
      "metric": "users_created",
      "current": 150,
      "limit": 500,
      "percentage": "30%"
    }
  ]
}
```

##### `POST /restore-subscription`
Restore subscription after payment.

```json
Request:
{
  "school_id": 123,
  "renewal_months": 12    // Extend for 1 year
}

Response:
{
  "message": "Subscription restored successfully - all access restored",
  "subscription": { /* restored */ }
}
```

##### `POST /auto-suspend-expired`
Find and suspend all expired subscriptions (run nightly).

```json
Response:
{
  "message": "Auto-suspended 7 expired subscriptions",
  "suspendedCount": 7,
  "results": [
    {
      "school_id": 456,
      "plan": "Pro",
      "status": "suspended"
    }
  ]
}
```

##### `GET /statistics`
Get subscription dashboard stats.

```json
Response:
{
  "totalSchools": 150,
  "activeSubscriptions": 145,
  "suspendedSubscriptions": 3,
  "planDistribution": [
    {"plan_name": "Free", "schools": 25, "totalUsers": 1200},
    {"plan_name": "Pro", "schools": 100, "totalUsers": 35000}
  ],
  "totalRevenue": 148800.00
}
```

##### `GET /expiring-soon/:days`
Get subscriptions expiring within N days.

```json
Response:
{
  "days": 30,
  "count": 5,
  "subscriptions": [
    {
      "school_id": 789,
      "school_name": "North Academy",
      "plan_name": "Pro",
      "end_date": "2025-01-15",
      "days_until_expiry": 3
    }
  ]
}
```

---

## Use Cases with Examples

### Use Case 1: Free Plan User Limit

**Scenario:** Lincoln High School (Free plan) has 50 users. They try to add the 51st user.

**Flow:**
1. School Admin calls `POST /api/users/create`
2. `checkSubscriptionActive` middleware passes (subscription is active)
3. `UsageTracker.isLimitExceeded('users_created')` returns `true` (50/50 limit reached)
4. Request fails with 402 response

**Code Example:**
```javascript
// In route handler (before creating user)
const exceeded = await UsageTracker.isLimitExceeded(schoolId, 'users_created');
if (exceeded) {
  return res.status(402).json({
    error: 'User limit reached',
    currentUsers: 50,
    maxUsers: 50,
    upgrade: 'Upgrade to Pro for 500 users'
  });
}

// Only reached if within limit
await UsageTracker.incrementUsage(schoolId, 'users_created', 1);
const user = await User.create(userData);
```

**Super Admin Action:**
```bash
POST /api/subscription/upgrade-subscription
{
  "school_id": 123,
  "new_plan_id": 2  # Pro plan with 500 users
}
```

**Result:** Immediately, all users can create more records.

---

### Use Case 2: Feature Unlock on Upgrade

**Scenario:** Riverside School upgrades from Free to Pro. AI exam generation should be available instantly.

**Before Upgrade:**
```javascript
// Fails with 403
POST /api/exams/generate-ai
Response: {
  error: 'Feature not available in current plan',
  feature: 'ai_exams',
  upgrade: 'Upgrade to Pro'
}
```

**Upgrade Process:**
```bash
POST /api/subscription/upgrade-subscription
{
  "school_id": 456,
  "new_plan_id": 2  # Pro plan
}
```

**After Upgrade:**
```javascript
// Succeeds immediately
POST /api/exams/generate-ai
Response: {
  examId: 789,
  status: 'generating',
  questions: 20
}
```

**Why it works:**
- `Subscription.upgradeSubscription()` updates plan_id in DB
- Next request to `checkFeatureAccess('ai_exams')` checks new plan
- Feature is now available for all users at school

---

### Use Case 3: Auto-Suspension on Expiry

**Scenario:** North Academy subscription expires 2025-01-15. Scheduled job auto-suspends them.

**Nightly Job (00:00 UTC):**
```javascript
cron.schedule('0 0 * * *', async () => {
  const count = await Subscription.autoSuspendExpired();
  console.log(`Suspended ${count} expired subscriptions`);
});
```

**What `autoSuspendExpired()` does:**
1. Finds all subscriptions where `end_date < NOW()` and `status = 'active'`
2. Updates them to `status = 'suspended'`
3. Logs each suspension to audit trail

**Admin Experience After Suspension:**
```javascript
GET /api/school/dashboard
Response: 402 Payment Required
{
  error: 'Subscription expired',
  planName: 'Pro',
  expiredDate: '2025-01-15',
  message: 'Please renew your subscription'
}
```

**Data Safety:**
- ✅ All students remain in database
- ✅ All classes remain
- ✅ All exams remain
- ✅ Nothing is deleted
- ✅ Admin dashboard just shows "Access Denied" message

**Restoration:**
```bash
POST /api/subscription/restore-subscription
{
  "school_id": 999,
  "renewal_months": 12
}
```

**Result:** All data immediately accessible again. No data loss.

---

### Use Case 4: Payment Recovery

**Scenario:** West High paid their overdue invoice. Super Admin restores access.

**Current Situation:**
```javascript
GET /api/subscription/school/789/status
{
  "status": "suspended",
  "daysExpired": 5,
  "planName": "Pro"
}
```

**Super Admin Verifies Payment:**
- Checks payment gateway/accounting system
- Confirms payment received

**Super Admin Restores:**
```bash
POST /api/subscription/restore-subscription
{
  "school_id": 789,
  "renewal_months": 12
}
```

**What Happens Internally:**
```javascript
// In Subscription.restoreSubscription()
1. Get current subscription
2. Calculate new end_date (add 12 months to today since expired)
3. Update: status = 'active', end_date = new_end_date
4. Log the restoration action
```

**Teacher Experience:**
- Immediately can access dashboard
- Can view all students (no data lost)
- Can create exams again
- Can view analytics

**Audit Log Entry:**
```javascript
{
  event: 'subscription_restored',
  performedBy: 'super_admin@system.edu',
  schoolId: 789,
  planName: 'Pro',
  newEndDate: '2025-12-15',
  timestamp: '2024-12-25T10:30:00Z',
  reason: 'Payment received'
}
```

---

## Frontend Integration

### 1. Add SubscriptionProvider to App

**File:** `frontend/src/App.jsx`

```javascript
import { SubscriptionProvider } from './contexts/SubscriptionContext';

function App() {
  return (
    <SubscriptionProvider>
      {/* Rest of app */}
    </SubscriptionProvider>
  );
}
```

### 2. Use Subscription Hook in Components

```javascript
import { useSubscription } from '../contexts/SubscriptionContext';

function Dashboard() {
  const { 
    isActive, 
    getPlanName, 
    hasFeature, 
    getDaysRemaining 
  } = useSubscription();

  if (!isActive()) {
    return <Alert severity="error">Subscription expired</Alert>;
  }

  return (
    <div>
      <h2>{getPlanName()}</h2>
      <p>Days left: {getDaysRemaining()}</p>
      
      {hasFeature('ai_exams') && (
        <Button>Generate AI Exam</Button>
      )}
    </div>
  );
}
```

### 3. Display Subscription Status

```javascript
import { SubscriptionStatus } from '../components/SubscriptionStatus';

function Dashboard() {
  return (
    <>
      <SubscriptionStatus /> {/* Shows full card with details */}
      {/* or */}
      <SubscriptionStatus compact /> {/* Shows compact alert */}
    </>
  );
}
```

### 4. Conditional Feature Display

```javascript
import { FeatureAvailability } from '../components/SubscriptionStatus';

function ExamTools() {
  return (
    <FeatureAvailability 
      featureName="ai_exams"
      fallback={
        <Alert>AI exams available in Pro plan</Alert>
      }
    >
      <AIExamGenerator />
    </FeatureAvailability>
  );
}
```

### 5. Show Usage Warnings

```javascript
import { UsageWarning } from '../components/SubscriptionStatus';

function UserManagement() {
  return (
    <>
      <UsageWarning metric="users_created" threshold={80} />
      {/* Shows warning at 80%+ usage */}
    </>
  );
}
```

---

## Super Admin Dashboard

**File:** `frontend/src/pages/SubscriptionManagement.jsx`

### Features

✅ View all subscription plans
✅ View all schools with subscriptions
✅ See subscription status (active/suspended/expired)
✅ See days until expiry
✅ Upgrade schools to higher plans
✅ Restore suspended subscriptions
✅ View subscription statistics and revenue
✅ See expiring subscriptions (send renewal reminders)
✅ Monitor plan distribution

### Usage

1. Super Admin clicks "Subscription Management" menu
2. Dashboard shows statistics:
   - Total schools
   - Active subscriptions
   - Suspended subscriptions
   - Monthly revenue
3. Plan distribution chart shows usage percentage
4. Table shows all subscriptions with actions:
   - Click "Upgrade" to upgrade school
   - Click "Restore" to restore suspended school
5. Can filter and sort by any column

---

## Scheduled Jobs

### Auto-Suspension Job

**Purpose:** Suspend expired subscriptions every night

**File:** `backend/server.js` (or separate scheduler)

```javascript
import cron from 'node-cron';
import Subscription from './models/Subscription.js';

// Every day at midnight UTC
cron.schedule('0 0 * * *', async () => {
  try {
    const count = await Subscription.autoSuspendExpired();
    console.log(`[${new Date().toISOString()}] Auto-suspended ${count} subscriptions`);
  } catch (error) {
    console.error('Auto-suspend job failed:', error);
  }
});
```

### Optional: Auto-Renewal Job

```javascript
// Every day at 1 AM UTC
cron.schedule('0 1 * * *', async () => {
  try {
    // Find subscriptions with auto_renew=true and next_payment_date <= today
    // Process payment
    // Renew subscription
  } catch (error) {
    console.error('Auto-renewal job failed:', error);
  }
});
```

### Optional: Renewal Reminder Job

```javascript
// Every Monday at 8 AM UTC
cron.schedule('0 8 * * 1', async () => {
  try {
    // Get subscriptions expiring within 7 days
    const expiring = await Subscription.getExpiringSubscriptions(7);
    // Send email reminder to school admins
  } catch (error) {
    console.error('Reminder job failed:', error);
  }
});
```

---

## Implementation Checklist

### Phase 1: Core Setup ✅
- [x] Create 4 database tables
- [x] Create SubscriptionPlan model
- [x] Create Subscription model
- [x] Create UsageTracker model
- [x] Create subscription middleware
- [x] Add subscription routes to server

### Phase 2: Integration (Currently Working)
- [ ] Install `node-cron` package: `npm install node-cron`
- [ ] Set up auto-suspension job in server.js
- [ ] Update user creation endpoint with usage tracking
- [ ] Update exam creation endpoint with feature check
- [ ] Update class creation endpoint with usage tracking
- [ ] Add SubscriptionProvider to frontend App.jsx
- [ ] Import SubscriptionStatus in Dashboard
- [ ] Add "Subscription Management" menu item for Super Admin

### Phase 3: Frontend Components
- [ ] Verify SubscriptionContext works
- [ ] Verify SubscriptionStatus component displays correctly
- [ ] Add FeatureAvailability wrapper around AI features
- [ ] Add UsageWarning to User Management page
- [ ] Build SubscriptionManagement dashboard

### Phase 4: Testing
- [ ] Test: Create user on Free plan (50 limit)
- [ ] Test: Upgrade school to Pro plan
- [ ] Test: Try to use feature on Free plan (should fail)
- [ ] Test: Use same feature on Pro plan (should work)
- [ ] Test: Auto-suspend job
- [ ] Test: Restore subscription

### Phase 5: Production
- [ ] Set up payment gateway integration (if needed)
- [ ] Configure email notifications
- [ ] Train Super Admin on dashboard
- [ ] Monitor first week of subscriptions
- [ ] Adjust usage limits based on real data

---

## Key Features Summary

| Feature | Free | Pro | Enterprise |
|---------|------|-----|-----------|
| Max Users | 50 | 500 | 9999 |
| Max Classes | 999 | 999 | 999 |
| AI Exams | ❌ | ✅ | ✅ |
| Analytics | ❌ | ✅ | ✅ |
| API Access | ❌ | ❌ | ✅ |
| Price/Month | Free | $49 | Custom |

---

## Troubleshooting

### Issue: Users can exceed user limit
**Solution:** Ensure `checkSubscriptionActive` + usage tracking middleware is in all user creation routes

### Issue: Feature appears when it shouldn't
**Solution:** Check that `checkFeatureAccess()` middleware is wrapping the route

### Issue: Subscription status doesn't update
**Solution:** Clear browser cache, verify `fetchSubscriptionStatus()` is called on login

### Issue: Auto-suspend job doesn't run
**Solution:** Verify `node-cron` is installed and job is registered in server.js

---

## Support & Customization

To modify subscription features:
1. Edit `subscription_plans` table
2. Update feature JSON: `{"feature_name": true/false}`
3. Add middleware check: `checkFeatureAccess('feature_name')`
4. No code changes needed!

To add new usage metrics:
1. Insert row into `usage_tracking`
2. Call `UsageTracker.incrementUsage(schoolId, 'metric_name', 1)` before creating resource
3. Dashboard automatically shows usage percentage

---

## Files Created/Modified

### Created Files
- `backend/middleware/subscription.js`
- `backend/routes/subscription.js`
- `backend/models/Subscription.js`
- `backend/models/SubscriptionPlan.js`
- `backend/models/UsageTracker.js`
- `backend/database/migrations/2025-12-27-add-subscriptions.sql`
- `backend/SUBSCRIPTION_USECASES.js`
- `frontend/src/contexts/SubscriptionContext.jsx`
- `frontend/src/components/SubscriptionStatus.jsx`
- `frontend/src/pages/SubscriptionManagement.jsx`

### Modified Files
- `backend/server.js` - Added subscription routes

### Next Steps
1. Install `node-cron`: `npm install node-cron`
2. Set up auto-suspension job in server.js
3. Add usage tracking to user/class/exam creation endpoints
4. Wrap AI exam features with `checkFeatureAccess('ai_exams')`
5. Add SubscriptionProvider to frontend
6. Test all use cases

---

Last Updated: 2025-01-15
