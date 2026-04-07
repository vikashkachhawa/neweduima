# Platform Controls - Real Use Cases

**Date**: December 27, 2025  
**Status**: Ready for Production  
**Access**: Super Admin Only  
**Key Feature**: All controls work WITHOUT code redeployment

---

## Overview

The platform controls system gives Super Admins complete runtime control over platform features, announcements, and academic templates. No code changes. No server restarts. Changes apply immediately across all schools.

**API Base Path**: `/api/platform-controls`

---

## Real Use Case #1: AI Feature Rollout (Phased Deployment)

**Scenario**: EduIma launches AI-powered exam generation. It's ready, but wants to test with selected schools first, then gradually expand.

### Week 1: Beta Testing

**Goal**: Enable AI exams for only 2 partner schools (IPS Mumbai, DPS Delhi)

```bash
# Super Admin logs in and makes this API call
POST /api/platform-controls/features/ai_exams/set-for-school
{
  "schoolId": 1,
  "isEnabled": true,
  "reason": "Beta testing AI exams - partner school"
}

POST /api/platform-controls/features/ai_exams/set-for-school
{
  "schoolId": 2,
  "isEnabled": true,
  "reason": "Beta testing AI exams - partner school"
}
```

**What Happens**:
- Teachers at IPS Mumbai can see "AI Exam Generator" button in exam creation
- Teachers at other schools see this button is disabled/hidden
- Feature flag history logs the change with timestamp and reason
- No code deployment. No server restart.

**Backend Check** (Automatic in exam creation route):
```javascript
const canUseAI = await FeatureFlag.isEnabledForSchool(
  req.user.schoolId, 
  'ai_exams'
);
if (!canUseAI) {
  return res.status(403).json({ error: 'Feature not available' });
}
```

### Week 2: Expand to 5 More Schools

**Goal**: Feature is working well. Enable for 5 more schools.

```bash
POST /api/platform-controls/features/ai_exams/set-for-school
{
  "schoolId": 3,
  "isEnabled": true,
  "reason": "Beta expansion - Week 2"
}
# ... repeat for schoolIds 4, 5, 6, 7
```

- Instant: 5 more schools now have AI exams enabled
- Teachers see new feature immediately (no app refresh needed)
- Feature flag history shows all changes

### Week 4: Enable Globally

**Goal**: Feature is stable. Enable for all schools.

```bash
POST /api/platform-controls/features/ai_exams/toggle-global
{
  "isEnabled": true
}
```

**What Happens**:
- ALL schools now have AI exams enabled
- Individual school overrides still respected (if any school disabled it)
- No code change. No deployment.
- Super Admin can revert this with one API call if issues arise

### Audit Trail

```bash
# Check who enabled AI exams and when
GET /api/platform-controls/features/ai_exams/history
```

Returns:
```json
{
  "success": true,
  "feature": "ai_exams",
  "changes": 7,
  "history": [
    {
      "id": 1,
      "school_id": null,
      "feature_id": 1,
      "old_status": "disabled",
      "new_status": "enabled",
      "changed_by": "Admin1",
      "reason": null,
      "created_at": "2025-12-27 18:00:00"
    },
    {
      "id": 2,
      "school_id": 1,
      "feature_id": 1,
      "old_status": "changed",
      "new_status": "enabled",
      "changed_by": "Admin1",
      "reason": "Beta testing AI exams",
      "created_at": "2025-12-27 18:05:00"
    }
  ]
}
```

---

## Real Use Case #2: Publishing Circulars (School-wide Announcements)

**Scenario**: State announces emergency school closure due to weather. Super Admin needs to notify all principals and teachers immediately.

### Create Circular

**Goal**: Announce school closure to all admin and teachers (NOT to students)

```bash
POST /api/platform-controls/announcements
{
  "title": "Emergency: Schools Closed Tomorrow",
  "content": "All schools remain closed tomorrow (Dec 28) due to severe weather. Students: Stay home. Teachers: Check email for updates.",
  "type": "circular",
  "priority": "critical",
  "targetRoles": ["admin", "faculty"],
  "targetSchools": null
}
```

**Response**:
```json
{
  "success": true,
  "announcement": {
    "id": 1,
    "title": "Emergency: Schools Closed Tomorrow",
    "is_active": true,
    "published_at": "2025-12-27 09:30:00",
    "target_roles": ["admin", "faculty"],
    "target_schools": null
  }
}
```

**What Happens Immediately**:
- All 150+ schools receive this announcement
- Principals (admin role) see it on dashboard when they log in
- Teachers (faculty role) see it in announcements section
- Students don't see it (not in target_roles)
- Parents don't see it (not in target_roles)

### Target Specific Schools

**Goal**: Only announce maintenance window to 3 specific schools

```bash
POST /api/platform-controls/announcements
{
  "title": "Scheduled Maintenance: Dec 28, 11 PM - Jan 1, 6 AM",
  "content": "Platform will be unavailable for system maintenance. Backup data now.",
  "type": "maintenance",
  "priority": "high",
  "targetRoles": ["admin"],
  "targetSchools": [1, 2, 3]
}
```

**What Happens**:
- Only principals at schools 1, 2, 3 see this maintenance notice
- Other 147 schools are unaffected - they see no downtime
- Super Admin can target maintenance announcements to roll out infrastructure changes gradually

### Real Use Case: School Reopening Protocol

```bash
# Day 1: Announce reopening guidelines
POST /api/platform-controls/announcements
{
  "title": "School Reopening - Safety Protocol",
  "content": "Schools reopen tomorrow. All staff and students must follow safety guidelines: masks optional, temperature check at entry, sanitization kits available.",
  "type": "notice",
  "priority": "high",
  "targetRoles": ["admin", "faculty", "student"],
  "targetSchools": null
}
```

- Admins: Ensure proper compliance
- Teachers: Conduct briefing in classes
- Students: Know what to expect
- All in one announcement, zero deployment

### Update/Deactivate Circulars

```bash
# Update with new information
PUT /api/platform-controls/announcements/1
{
  "title": "UPDATE: Schools Reopening - New Guidelines",
  "content": "Updated protocol based on feedback..."
}

# Remove from view (when event passes)
POST /api/platform-controls/announcements/1/deactivate
```

---

## Real Use Case #3: Global Academic Calendar

**Scenario**: Ministry of Education announces national holidays and academic schedule. Super Admin adds them once; all schools' calendars update automatically.

### Add National Holiday

**Goal**: Add Diwali holiday to all school calendars

```bash
POST /api/platform-controls/templates
{
  "type": "holiday",
  "name": "Diwali Break",
  "description": "National holiday - Schools closed",
  "startDate": "2025-11-01",
  "endDate": "2025-11-03",
  "appliesToAllSchools": true
}
```

**What Happens**:
- ALL 150+ schools' calendars now show this holiday
- Teachers can't schedule classes on these dates
- Parents see it in calendar
- Attendance is auto-excused on these dates
- One API call. No code change. No redeployment.

### Regional/Custom Holidays

```bash
# Telangana Formation Day - only for schools in Telangana state
POST /api/platform-controls/templates
{
  "type": "holiday",
  "name": "Telangana Formation Day",
  "description": "State holiday",
  "startDate": "2025-06-02",
  "endDate": "2025-06-02",
  "appliesToAllSchools": false,
  "applicableSchools": [15, 16, 17, 18]  // Hyderabad region schools
}
```

- Schools 15-18 see this in their calendars
- Other schools don't see it
- Smart rule enforcement

### Academic Schedule Blocks

```bash
POST /api/platform-controls/templates
{
  "type": "schedule",
  "name": "Half-Yearly Exams Block",
  "description": "No regular classes - exam period",
  "startDate": "2025-10-01",
  "endDate": "2025-10-31",
  "appliesToAllSchools": true
}
```

- Calendar shows this as exam period
- Teachers can't schedule regular classes (system enforces)
- Exams can be scheduled during this period
- All schools aligned automatically

### Check What's Happening

```bash
# View all templates
GET /api/platform-controls/templates

# View only holidays in next 30 days
GET /api/platform-controls/templates?type=holiday&startDate=2025-12-27

# View what school 5 sees
GET /api/platform-controls/templates/school/5?type=holiday
```

---

## Real Use Case #4: Data Modification Audit Trail

**Scenario**: Parent complains that grades changed. Super Admin checks who made changes and when.

### Every Platform Control Change is Logged

```bash
# Get all changes made to feature flags
GET /api/platform-controls/features/ai_exams/history
```

Returns who, when, what changed:
```json
{
  "success": true,
  "history": [
    {
      "id": 1,
      "feature_id": 1,
      "old_status": "disabled",
      "new_status": "enabled",
      "changed_by": 1,
      "changed_by_name": "Rajesh Kumar",
      "created_at": "2025-12-27 10:00:00",
      "reason": "Global rollout - AI exams"
    },
    {
      "id": 2,
      "school_id": 5,
      "feature_id": 1,
      "old_status": "enabled",
      "new_status": "disabled",
      "changed_by": 3,
      "changed_by_name": "Priya Sharma",
      "created_at": "2025-12-27 11:00:00",
      "reason": "School requested temporary disable"
    }
  ]
}
```

### Compliance Reporting

```bash
# Dashboard shows who made what changes
GET /api/platform-controls/dashboard
```

Returns:
```json
{
  "success": true,
  "dashboard": {
    "features": {
      "total": 9,
      "enabled": 7,
      "disabled": 2
    },
    "announcements": {
      "total": 25,
      "active": 18
    },
    "templates": {
      "total": 120,
      "active": 85
    }
  }
}
```

---

## Integration with Existing Systems

### 1. Feature Flags + Permission System

```javascript
// In any controller - check if feature is available
if (!await req.checkFeature('video_streaming')) {
  return res.status(403).json({ error: 'Video streaming not enabled' });
}

// With decorator approach
router.post(
  '/upload-video',
  checkFeatureEnabled('video_streaming'),  // Middleware check
  uploadVideo
);
```

### 2. Announcements + Authentication

When teacher logs in:
```javascript
const announcements = await Announcement.getForUser(
  userId,
  schoolId,
  userRole  // 'faculty', 'admin', 'student'
);
```

Frontend shows relevant announcements based on role and school.

### 3. Academic Templates + Timetable System

When scheduling classes:
```javascript
const isHoliday = await AcademicTemplate.isHolidayToday(schoolId);
const upcoming = await AcademicTemplate.getUpcoming(schoolId, 30);

// System prevents class scheduling on holidays
if (isHoliday) {
  return res.status(400).json({ error: 'Cannot schedule on holiday' });
}
```

### 4. Subscription Enforcement

All platform controls require:
1. Super Admin role
2. Active subscription

```javascript
// Every platform controls route uses
router.use(checkSubscriptionActive);
router.use(checkSuperAdmin);
```

If subscription expires:
- Super Admin CAN'T toggle features
- New features can't be rolled out
- Emergency mode activates (only "parent_portal" and critical features remain)

---

## Architecture: Why This Works Without Redeployment

### Traditional Approach (Requires Redeployment)
```
Config File → Code Push → Server Restart → Feature Live
(Days of work)
```

### EduIma Platform Controls (Instant)
```
Database Update → API Call → Immediate (Cached for 5 min) → Feature Live
(Seconds)
```

### Feature Flag Caching

```javascript
// Cache expires every 5 minutes
if (now > cacheExpiry) {
  const features = await FeatureFlag.getAllFeatures();
  cacheExpiry = now + 5_MINUTES;  // Refresh every 5 minutes
}
```

- Minimal database load
- Changes visible within 5 minutes
- Can manually clear cache for immediate effect

---

## Key Endpoints Summary

### Feature Management
- `GET /api/platform-controls/features` - List all features
- `GET /api/platform-controls/features/school/:id` - Features for school
- `POST /api/platform-controls/features/:name/toggle-global` - Enable/disable globally
- `POST /api/platform-controls/features/:name/set-for-school` - Enable/disable for school
- `GET /api/platform-controls/features/:name/history` - Audit trail

### Announcements
- `POST /api/platform-controls/announcements` - Create
- `GET /api/platform-controls/announcements` - List all
- `GET /api/platform-controls/announcements/:id` - Get single
- `PUT /api/platform-controls/announcements/:id` - Update
- `POST /api/platform-controls/announcements/:id/deactivate` - Hide

### Academic Templates
- `POST /api/platform-controls/templates` - Create
- `GET /api/platform-controls/templates` - List all
- `GET /api/platform-controls/templates/school/:id` - For school
- `PUT /api/platform-controls/templates/:id` - Update
- `POST /api/platform-controls/templates/:id/deactivate` - Deactivate

### Dashboard
- `GET /api/platform-controls/dashboard` - Statistics & overview

---

## Security

All platform control endpoints require:
1. ✅ Valid JWT token (authentication)
2. ✅ Super Admin role (authorization)
3. ✅ Active school subscription (subscription check)
4. ✅ All changes logged with user ID and timestamp

No other user type can access these endpoints.

---

## Testing

```bash
# 1. Create feature override
curl -X POST http://localhost:5000/api/platform-controls/features/ai_exams/set-for-school \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "schoolId": 1,
    "isEnabled": true,
    "reason": "Testing feature flags"
  }'

# 2. Create announcement
curl -X POST http://localhost:5000/api/platform-controls/announcements \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Announcement",
    "content": "Testing circular feature",
    "type": "notice",
    "priority": "medium",
    "targetRoles": ["admin", "faculty"]
  }'

# 3. Add holiday
curl -X POST http://localhost:5000/api/platform-controls/templates \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "holiday",
    "name": "Test Holiday",
    "startDate": "2025-12-28",
    "endDate": "2025-12-30",
    "appliesToAllSchools": true
  }'
```

---

**Ready for production. All features functional. Zero code redeployment needed.**
