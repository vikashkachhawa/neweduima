# Analytics & Monitoring - Quick Reference

**Status**: ✅ Production Ready  
**Access**: Super Admin Only  
**Base URL**: `/api/analytics`

---

## API Endpoints

### Dashboard & Overview
```
GET /api/analytics/dashboard
```
Complete dashboard with all metrics.

```
GET /api/analytics/overview
```
Platform overview: active schools, users, login rate, response time, system status.

---

### Usage Metrics
```
GET /api/analytics/trends/logins?days=7
```
Login trends for last N days (default: 7).

```
GET /api/analytics/trends/hourly?date=2025-12-27
```
Hourly login pattern for specific date (default: today).

---

### Storage Monitoring
```
GET /api/analytics/storage/alerts?level=critical
```
Get storage alerts. Levels: `warning` (90%), `critical` (95%), `emergency` (99%).

```
POST /api/analytics/storage/alerts/:id/resolve
```
Mark storage alert as resolved.

---

### Error Monitoring
```
GET /api/analytics/errors/summary
```
Error summary (last 24 hours): total errors, error rate, top errors.

```
GET /api/analytics/errors/details?errorType=500&endpoint=/api/school/reports&limit=50
```
Detailed error logs with filters.

---

### Performance Metrics
```
GET /api/analytics/performance?days=7
```
Response time trends and slowest endpoints.

---

### School Performance
```
GET /api/analytics/schools/performance?tier=top&limit=10
```
School rankings by performance tier.

Tiers: `top`, `good`, `average`, `needs_attention`, `at_risk`.

```
GET /api/analytics/schools/top-performers?limit=10
```
Top performing schools (engagement score >80%).

```
GET /api/analytics/schools/needs-attention?limit=10
```
Schools needing intervention (score <40%).

---

### Feature Adoption
```
GET /api/analytics/features/adoption
```
Feature adoption rates across all schools.

---

### Revenue & Subscriptions
```
GET /api/analytics/revenue
```
Revenue metrics: MRR, growth, plan distribution.

```
GET /api/analytics/revenue/upsell-opportunities
```
Schools ready for plan upgrades (Free→Pro, Pro→Enterprise).

---

### Export
```
GET /api/analytics/export/dashboard
```
Export complete dashboard as JSON file.

---

## Scheduled Jobs

### Daily Monitoring (1:00 AM UTC)
Collects:
- Platform metrics (active schools, users, logins)
- School usage stats (per school)
- Performance scores
- Revenue stats

### Storage Alerts (Every 4 hours)
Checks:
- Schools >90% storage (warning)
- Schools >95% storage (critical)
- Schools >99% storage (emergency)

### Auto-Suspend (Midnight UTC)
Suspends expired subscriptions.

---

## Response Examples

### Dashboard Overview
```json
{
  "success": true,
  "dashboard": {
    "overview": {
      "date": "2025-12-27",
      "activeSchools": 142,
      "totalSchools": 150,
      "activePercentage": "94.7",
      "totalActiveUsers": 8432,
      "totalLogins": 12847,
      "loginSuccessRate": 97.3,
      "avgResponseTime": 240,
      "systemStatus": "normal"
    },
    "trends": [...],
    "errors": {...},
    "performance": {...},
    "revenue": {...}
  }
}
```

### Storage Alert
```json
{
  "success": true,
  "count": 3,
  "alerts": [
    {
      "id": 1,
      "school_id": 15,
      "school_name": "St. Xavier's School",
      "plan_name": "Pro",
      "alert_level": "critical",
      "current_usage_gb": 47.2,
      "limit_gb": 50,
      "percentage_used": 94.4,
      "growth_rate_gb_per_week": 2.1,
      "projected_full_date": "2026-01-03",
      "created_at": "2025-12-27T10:30:00Z"
    }
  ]
}
```

### Error Summary
```json
{
  "success": true,
  "summary": {
    "totalErrors": 847,
    "totalRequests": 124523,
    "errorRate": 0.68,
    "status": "warning",
    "topErrors": [
      {
        "error_type": "500",
        "endpoint": "/api/school/reports/generate",
        "count": 423,
        "schools_affected": 12,
        "first_occurrence": "2025-12-27T11:00:00Z",
        "last_occurrence": "2025-12-27T14:30:00Z"
      }
    ]
  }
}
```

### School Performance
```json
{
  "success": true,
  "count": 10,
  "schools": [
    {
      "school_id": 1,
      "school_name": "Delhi Public School",
      "plan_name": "Enterprise",
      "engagement_score": 92.0,
      "feature_adoption_score": 85.0,
      "support_health_score": 90.0,
      "overall_score": 89.0,
      "rank_position": 1,
      "performance_tier": "top",
      "active_users": 2847,
      "total_logins": 5234,
      "support_tickets": 2
    }
  ]
}
```

### Upsell Opportunities
```json
{
  "success": true,
  "opportunities": {
    "freeToPro": [
      {
        "id": 42,
        "name": "Greenwood Academy",
        "current_plan": "Free",
        "active_users": 234,
        "storage_used_gb": 9.2
      }
    ],
    "proToEnterprise": [
      {
        "id": 8,
        "name": "St. Paul's School",
        "current_plan": "Pro",
        "active_users": 487,
        "storage_used_gb": 45.3
      }
    ],
    "potentialRevenue": 3400
  }
}
```

---

## Testing

```bash
# Get dashboard
curl http://localhost:5000/api/analytics/dashboard \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>"

# Get storage alerts
curl http://localhost:5000/api/analytics/storage/alerts?level=critical \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>"

# Get error summary
curl http://localhost:5000/api/analytics/errors/summary \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>"

# Get top performers
curl http://localhost:5000/api/analytics/schools/top-performers?limit=5 \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>"

# Get upsell opportunities
curl http://localhost:5000/api/analytics/revenue/upsell-opportunities \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>"
```

---

## Database Tables

| Table | Purpose | Records |
|-------|---------|---------|
| `platform_metrics` | Daily platform aggregates | 365/year |
| `school_usage_stats` | Daily per-school stats | 150 × 365 |
| `hourly_login_stats` | Hourly login patterns | 24 × 365 |
| `error_logs` | Error tracking | Growing |
| `performance_metrics` | Endpoint response times | Growing |
| `storage_alerts` | Storage warnings | Active only |
| `feature_usage_stats` | Feature adoption | 9 × 365 |
| `revenue_stats` | Revenue metrics | 365/year |
| `alert_history` | All alerts sent | Growing |
| `school_performance_scores` | School rankings | 150 × 365 |

---

## Alert Thresholds

### Storage
- **Warning** (90%): Email notification
- **Critical** (95%): Email + SMS + dashboard banner
- **Emergency** (99%): Block uploads + urgent call

### Performance
- **Normal**: <500ms response time
- **Warning**: 500-1000ms
- **Critical**: >1000ms

### Error Rate
- **Normal**: <0.5%
- **Warning**: 0.5% - 1%
- **Critical**: >1%

### Login Failures
- **Normal**: <5% failure rate
- **Warning**: 5% - 10%
- **Critical**: >10%

---

## Monitoring Service Methods

```javascript
import MonitoringService from './services/MonitoringService.js';

// Collect platform metrics
await MonitoringService.collectPlatformMetrics();

// Collect school usage stats
await MonitoringService.collectSchoolUsageStats();

// Check storage alerts
await MonitoringService.checkStorageAlerts();

// Calculate performance scores
await MonitoringService.calculatePerformanceScores();

// Collect revenue stats
await MonitoringService.collectRevenueStats();

// Run all (scheduled daily at 1 AM)
await MonitoringService.runDailyMonitoring();
```

---

## Integration Points

### With RBAC
- Super Admin role required for all analytics endpoints
- All access audited in `audit_logs`

### With Subscriptions
- Active subscription required to access analytics
- Revenue metrics track MRR, upgrades, downgrades

### With Platform Controls
- Feature adoption tracked automatically
- Feature flags influence usage patterns

### With Error Handling
- Automatic error logging via middleware
- Pattern detection for repeated failures

---

## Key Features

✅ **Aggregated Data** - No individual user tracking  
✅ **Read-Only** - Super Admin cannot modify historical data  
✅ **Proactive Alerts** - Issues detected before users complain  
✅ **Actionable Insights** - Every metric tied to action  
✅ **Performance Tracking** - Response time monitoring  
✅ **Revenue Optimization** - Upsell opportunity detection  
✅ **School Health** - Performance scoring and rankings  

---

**Analytics system ready. All features operational. Zero additional setup needed.**
