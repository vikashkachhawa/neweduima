# Platform Controls - Quick Start Guide

## What You Get

Super Admin-only controls to dynamically manage your platform WITHOUT code redeployment:

✅ **Feature Flags** - Rollout features to selected schools gradually  
✅ **Announcements** - Send notifications to specific roles and schools  
✅ **Academic Templates** - Add holidays and schedules globally  
✅ **Audit Trail** - Complete change history for compliance  

---

## Setup (Already Done ✓)

Database tables created:
- `feature_flags` - Feature on/off switch
- `school_feature_flags` - Per-school overrides
- `announcements` - Messages to users
- `global_academic_templates` - Holidays and schedules
- `feature_flag_history` - Audit trail

Models created:
- `FeatureFlag.js` - Feature management
- `Announcement.js` - Notification management
- `AcademicTemplate.js` - Calendar management

Routes: `/api/platform-controls` (requires Super Admin + active subscription)

---

## 3-Minute Tutorial

### 1. Enable AI Exams for School #1 Only

```bash
curl -X POST http://localhost:5000/api/platform-controls/features/ai_exams/set-for-school \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schoolId": 1,
    "isEnabled": true,
    "reason": "Beta testing"
  }'
```

**Result**: School 1 teachers see AI Exam Generator button. Other schools don't.

### 2. Send Emergency Announcement

```bash
curl -X POST http://localhost:5000/api/platform-controls/announcements \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "School Closed Today",
    "content": "All schools remain closed due to weather.",
    "type": "circular",
    "priority": "critical",
    "targetRoles": ["admin", "faculty"]
  }'
```

**Result**: Admins and teachers see this announcement on next login.

### 3. Add Diwali Holiday to All Calendars

```bash
curl -X POST http://localhost:5000/api/platform-controls/templates \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "holiday",
    "name": "Diwali Break",
    "description": "National holiday",
    "startDate": "2025-11-01",
    "endDate": "2025-11-03",
    "appliesToAllSchools": true
  }'
```

**Result**: All schools' calendars show Diwali break. Teachers can't schedule classes.

---

## Real-World Workflow

### Monday: Launch AI Feature

```bash
# Enable for 5 test schools
for school_id in 1 2 3 4 5; do
  curl -X POST http://localhost:5000/api/platform-controls/features/ai_exams/set-for-school \
    -H "Authorization: Bearer TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"schoolId\": $school_id, \"isEnabled\": true, \"reason\": \"Week 1 beta\"}"
done
```

### Wednesday: Expand to 10 More Schools

```bash
for school_id in {6..15}; do
  curl -X POST http://localhost:5000/api/platform-controls/features/ai_exams/set-for-school \
    ...same call...
done
```

### Friday: Go Global

```bash
curl -X POST http://localhost:5000/api/platform-controls/features/ai_exams/toggle-global \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isEnabled": true}'
```

**No code change. No server restart. Feature live for all 150+ schools.**

---

## Available Features (Default)

| Feature | Default | Use Case |
|---------|---------|----------|
| `ai_exams` | ON | AI exam generation |
| `advanced_analytics` | ON | Analytics dashboard |
| `api_access` | ON | Third-party integrations |
| `sso_integration` | OFF | Google/Microsoft login |
| `mobile_app` | ON | Mobile app access |
| `video_streaming` | OFF | Video classes |
| `attendance_biometric` | OFF | Biometric attendance |
| `parent_portal` | ON | Parent access |
| `bulk_import` | ON | Bulk student import |

---

## Check What's Happening

```bash
# View all feature statuses
curl http://localhost:5000/api/platform-controls/features \
  -H "Authorization: Bearer TOKEN"

# View features for School #5
curl http://localhost:5000/api/platform-controls/features/school/5 \
  -H "Authorization: Bearer TOKEN"

# View AI exam changes history
curl http://localhost:5000/api/platform-controls/features/ai_exams/history \
  -H "Authorization: Bearer TOKEN"

# View all announcements
curl http://localhost:5000/api/platform-controls/announcements \
  -H "Authorization: Bearer TOKEN"

# View dashboard stats
curl http://localhost:5000/api/platform-controls/dashboard \
  -H "Authorization: Bearer TOKEN"
```

---

## Advanced: Target-Specific Announcements

```bash
# Only Tamil Nadu schools, only to principals
curl -X POST http://localhost:5000/api/platform-controls/announcements \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Tamil Nadu Board Requirement",
    "content": "New submission format required...",
    "type": "notice",
    "priority": "high",
    "targetRoles": ["admin"],
    "targetSchools": [10, 11, 12, 13, 14]  # Only TN schools
  }'
```

---

## Advanced: Regional Academic Calendar

```bash
# Monsoon break only for coastal schools
curl -X POST http://localhost:5000/api/platform-controls/templates \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "break",
    "name": "Monsoon Break",
    "startDate": "2025-07-01",
    "endDate": "2025-07-15",
    "appliesToAllSchools": false,
    "applicableSchools": [25, 26, 27, 28]  # Coastal schools only
  }'
```

---

## Integration in Code

When feature is disabled, app automatically:

**Frontend**: Hide button/menu item
```javascript
const { hasFeature } = useSubscription();
if (!hasFeature('ai_exams')) {
  return null;  // Don't show feature
}
```

**Backend**: Reject request
```javascript
const enabled = await FeatureFlag.isEnabledForSchool(schoolId, 'ai_exams');
if (!enabled) return res.status(403).json({ error: 'Feature not available' });
```

---

## Troubleshooting

**Q: Changes not visible immediately?**  
A: Feature flags cache for 5 minutes. Changes visible within 5 min max.

**Q: Want immediate effect?**  
A: The cache is transparent - most deployments don't need immediate refresh.

**Q: Can school admin override Super Admin settings?**  
A: No. Super Admin controls are final. School admins can't change.

**Q: What if I make a mistake?**  
A: Revert instantly:
```bash
curl -X POST http://localhost:5000/api/platform-controls/features/ai_exams/toggle-global \
  -H "Authorization: Bearer TOKEN" \
  -d '{"isEnabled": false}'
```

**Q: How do I audit changes?**  
A: Every change is logged with user ID, timestamp, and reason:
```bash
curl http://localhost:5000/api/platform-controls/features/ai_exams/history \
  -H "Authorization: Bearer TOKEN"
```

---

## API Reference

### Feature Flags
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/features` | List all features |
| GET | `/features/school/:id` | Features for school |
| POST | `/features/:name/toggle-global` | Enable/disable everywhere |
| POST | `/features/:name/set-for-school` | Enable/disable for one school |
| GET | `/features/:name/history` | View change history |

### Announcements
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/announcements` | Create announcement |
| GET | `/announcements` | List all |
| GET | `/announcements/:id` | Get single |
| PUT | `/announcements/:id` | Edit |
| POST | `/announcements/:id/deactivate` | Hide announcement |

### Templates
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/templates` | Create template |
| GET | `/templates` | List all |
| GET | `/templates/school/:id` | Templates for school |
| PUT | `/templates/:id` | Edit |
| POST | `/templates/:id/deactivate` | Deactivate |

### Dashboard
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/dashboard` | Stats and overview |

---

## Next Steps

1. ✅ System is ready - all models, routes, and migrations applied
2. ✅ Use the real use cases guide for practical examples
3. ✅ All changes are audited and logged
4. ✅ Feature flags cache for performance (5 min TTL)
5. ✅ Works with existing RBAC and subscription systems

---

**Start using platform controls immediately. No further setup needed.**
