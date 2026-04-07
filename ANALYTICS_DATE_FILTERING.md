# Analytics Date Filtering Guide

## Overview
All analytics endpoints now support dynamic date filtering, allowing you to view historical data for any date or date range.

## Query Parameters

### Single Date Parameters
Use these for metrics that show data for a specific day:
- **`date`** - Format: `YYYY-MM-DD` (e.g., `2025-11-15`)

### Date Range Parameters
Use these for trends and time-series data:
- **`startDate`** - Format: `YYYY-MM-DD` (beginning of range)
- **`endDate`** - Format: `YYYY-MM-DD` (end of range)
- **`days`** - Number of days to look back (alternative to date range)
- **`hours`** - Number of hours to look back (for recent data)

### Additional Filters
- **`includeResolved`** - `true` or `false` (for storage alerts)

---

## Endpoints with Date Filtering

### 1. Platform Overview
**Endpoint:** `GET /api/analytics/overview`

**Parameters:**
- `date` - View metrics for a specific date

**Examples:**
```bash
# Current day (default)
curl http://localhost:5000/api/analytics/overview

# Specific date
curl http://localhost:5000/api/analytics/overview?date=2025-11-15

# One month ago
curl http://localhost:5000/api/analytics/overview?date=2025-11-27
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2025-11-15",
    "active_schools": 150,
    "total_logins": 3450,
    "active_users": 2890,
    "login_success_rate": 97.8,
    "avg_response_time": 245
  }
}
```

---

### 2. Login Trends
**Endpoint:** `GET /api/analytics/trends/logins`

**Parameters:**
- `days` - Number of days (default: 7)
- `startDate` - Beginning of range
- `endDate` - End of range

**Examples:**
```bash
# Last 30 days
curl http://localhost:5000/api/analytics/trends/logins?days=30

# Specific date range (last month)
curl http://localhost:5000/api/analytics/trends/logins?startDate=2025-11-01&endDate=2025-11-30

# Compare December to November
curl http://localhost:5000/api/analytics/trends/logins?startDate=2025-11-01&endDate=2025-12-27
```

**Response:**
```json
{
  "success": true,
  "days": 30,
  "trends": [
    {
      "metric_date": "2025-11-27",
      "total_logins": 3450,
      "total_active_users": 2890
    },
    {
      "metric_date": "2025-11-26",
      "total_logins": 3210,
      "total_active_users": 2750
    }
  ]
}
```

---

### 3. Storage Alerts
**Endpoint:** `GET /api/analytics/storage/alerts`

**Parameters:**
- `level` - `warning`, `critical`, or `emergency`
- `startDate` - Filter alerts from this date
- `endDate` - Filter alerts until this date
- `includeResolved` - Show resolved alerts (default: false)

**Examples:**
```bash
# Current active alerts
curl http://localhost:5000/api/analytics/storage/alerts

# All alerts from last month (including resolved)
curl http://localhost:5000/api/analytics/storage/alerts?startDate=2025-11-01&endDate=2025-11-30&includeResolved=true

# Critical alerts from last week
curl http://localhost:5000/api/analytics/storage/alerts?level=critical&startDate=2025-12-20
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "level": "critical",
  "alerts": [
    {
      "id": 15,
      "school_id": 42,
      "school_name": "Lincoln High School",
      "storage_used_gb": 48.5,
      "storage_limit_gb": 50,
      "percentage_used": 97,
      "alert_level": "critical",
      "created_at": "2025-11-20T14:30:00Z",
      "resolved_at": null
    }
  ]
}
```

---

### 4. Error Summary
**Endpoint:** `GET /api/analytics/errors/summary`

**Parameters:**
- `startDate` - Beginning of range
- `endDate` - End of range
- `hours` - Last N hours (default: 24)

**Examples:**
```bash
# Last 24 hours (default)
curl http://localhost:5000/api/analytics/errors/summary

# Last week
curl http://localhost:5000/api/analytics/errors/summary?hours=168

# Specific date range (last month)
curl http://localhost:5000/api/analytics/errors/summary?startDate=2025-11-01&endDate=2025-11-30
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "total_errors": 145,
    "total_requests": 125430,
    "error_rate": 0.12,
    "errors_by_type": [
      {
        "error_type": "ValidationError",
        "endpoint": "/api/users/create",
        "count": 45,
        "schools_affected": 12,
        "first_occurrence": "2025-11-01T08:15:00Z",
        "last_occurrence": "2025-11-30T16:45:00Z"
      }
    ]
  }
}
```

---

### 5. Error Details
**Endpoint:** `GET /api/analytics/errors/details`

**Parameters:**
- `startDate` - Beginning of range
- `endDate` - End of range
- `errorType` - Filter by error type
- `endpoint` - Filter by endpoint
- `schoolId` - Filter by school
- `limit` - Maximum results (default: 50)

**Examples:**
```bash
# All errors from last month
curl http://localhost:5000/api/analytics/errors/details?startDate=2025-11-01&endDate=2025-11-30

# ValidationErrors from specific school in November
curl http://localhost:5000/api/analytics/errors/details?errorType=ValidationError&schoolId=42&startDate=2025-11-01&endDate=2025-11-30&limit=100
```

---

### 6. Performance Metrics
**Endpoint:** `GET /api/analytics/performance`

**Parameters:**
- `days` - Number of days (default: 7)
- `startDate` - Beginning of range
- `endDate` - End of range

**Examples:**
```bash
# Last 30 days
curl http://localhost:5000/api/analytics/performance?days=30

# Specific month (November)
curl http://localhost:5000/api/analytics/performance?startDate=2025-11-01&endDate=2025-11-30

# Compare two months
curl http://localhost:5000/api/analytics/performance?startDate=2025-10-01&endDate=2025-11-30
```

**Response:**
```json
{
  "success": true,
  "days": 30,
  "metrics": {
    "overall_avg_response_time": 285,
    "trends": [
      {
        "metric_date": "2025-11-27",
        "avg_time": 245
      }
    ],
    "slowest_endpoints": [
      {
        "endpoint": "/api/reports/generate",
        "avg_response_time": 1250,
        "total_requests": 450,
        "slow_requests": 15
      }
    ]
  }
}
```

---

### 7. School Performance
**Endpoint:** `GET /api/analytics/schools/performance`

**Parameters:**
- `tier` - `top`, `good`, `average`, `needs_attention`, `at_risk`
- `limit` - Number of schools (default: 10)
- `date` - View rankings for a specific date

**Examples:**
```bash
# Current top performers
curl http://localhost:5000/api/analytics/schools/top-performers

# Top 20 schools on a specific date
curl http://localhost:5000/api/analytics/schools/top-performers?limit=20&date=2025-11-15

# Schools that needed attention last month
curl http://localhost:5000/api/analytics/schools/needs-attention?date=2025-11-30
```

**Response:**
```json
{
  "success": true,
  "tier": "top",
  "count": 10,
  "schools": [
    {
      "school_id": 15,
      "school_name": "Lincoln High School",
      "performance_score": 92,
      "engagement_score": 88,
      "feature_adoption_score": 95,
      "support_health_score": 90,
      "tier": "top"
    }
  ]
}
```

---

### 8. Feature Adoption
**Endpoint:** `GET /api/analytics/features/adoption`

**Parameters:**
- `date` - View adoption stats for a specific date

**Examples:**
```bash
# Current adoption
curl http://localhost:5000/api/analytics/features/adoption

# Adoption stats from last month
curl http://localhost:5000/api/analytics/features/adoption?date=2025-11-30
```

---

### 9. Revenue Metrics
**Endpoint:** `GET /api/analytics/revenue`

**Parameters:**
- `date` - View revenue for a specific date

**Examples:**
```bash
# Current MRR
curl http://localhost:5000/api/analytics/revenue

# MRR from last month
curl http://localhost:5000/api/analytics/revenue?date=2025-11-30
```

**Response:**
```json
{
  "success": true,
  "metrics": {
    "date": "2025-11-30",
    "total_mrr": 125000,
    "growth_rate": 15.5,
    "plan_distribution": [
      {"plan_name": "Free", "count": 50, "mrr": 0},
      {"plan_name": "Pro", "count": 75, "mrr": 75000},
      {"plan_name": "Enterprise", "count": 25, "mrr": 50000}
    ]
  }
}
```

---

### 10. Upsell Opportunities
**Endpoint:** `GET /api/analytics/revenue/upsell-opportunities`

**Parameters:**
- `date` - View opportunities based on specific date's usage

**Examples:**
```bash
# Current upsell opportunities
curl http://localhost:5000/api/analytics/revenue/upsell-opportunities

# Opportunities based on last month's data
curl http://localhost:5000/api/analytics/revenue/upsell-opportunities?date=2025-11-30
```

---

## Use Cases

### 1. View Last Month's Data
```bash
# Overview for November
curl http://localhost:5000/api/analytics/overview?date=2025-11-30

# Login trends for all of November
curl http://localhost:5000/api/analytics/trends/logins?startDate=2025-11-01&endDate=2025-11-30

# Performance metrics for November
curl http://localhost:5000/api/analytics/performance?startDate=2025-11-01&endDate=2025-11-30
```

### 2. Compare Two Months
```bash
# October vs November login trends
curl http://localhost:5000/api/analytics/trends/logins?startDate=2025-10-01&endDate=2025-11-30

# October vs November performance
curl http://localhost:5000/api/analytics/performance?startDate=2025-10-01&endDate=2025-11-30
```

### 3. Investigate Historical Issues
```bash
# All errors from a specific week
curl http://localhost:5000/api/analytics/errors/summary?startDate=2025-11-15&endDate=2025-11-21

# Storage alerts during that week
curl http://localhost:5000/api/analytics/storage/alerts?startDate=2025-11-15&endDate=2025-11-21&includeResolved=true
```

### 4. Track Growth Over Time
```bash
# Revenue growth comparison (last 3 months)
curl http://localhost:5000/api/analytics/revenue?date=2025-10-31
curl http://localhost:5000/api/analytics/revenue?date=2025-11-30
curl http://localhost:5000/api/analytics/revenue?date=2025-12-27

# School performance trends
curl http://localhost:5000/api/analytics/schools/performance?date=2025-10-31
curl http://localhost:5000/api/analytics/schools/performance?date=2025-11-30
curl http://localhost:5000/api/analytics/schools/performance?date=2025-12-27
```

---

## Date Format Requirements

- **Format:** `YYYY-MM-DD` (ISO 8601 date format)
- **Examples:**
  - ✅ `2025-11-15`
  - ✅ `2025-01-01`
  - ❌ `11/15/2025` (wrong format)
  - ❌ `15-11-2025` (wrong format)

---

## Default Behavior

When no date parameters are provided:
- Single date endpoints (`overview`, `revenue`, etc.) → Use **current date**
- Range endpoints (`trends`, `performance`) → Use **last 7 days**
- Error endpoints → Use **last 24 hours**

---

## Integration Examples

### JavaScript/Frontend
```javascript
// Get overview for specific date
const getOverview = async (date) => {
  const response = await fetch(
    `http://localhost:5000/api/analytics/overview?date=${date}`
  );
  return response.json();
};

// Get trends for date range
const getTrends = async (startDate, endDate) => {
  const response = await fetch(
    `http://localhost:5000/api/analytics/trends/logins?startDate=${startDate}&endDate=${endDate}`
  );
  return response.json();
};

// Example: Last 30 days
const today = new Date();
const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30));
const trends = await getTrends(
  thirtyDaysAgo.toISOString().split('T')[0],
  new Date().toISOString().split('T')[0]
);
```

### React Date Picker Integration
```jsx
const [startDate, setStartDate] = useState(new Date());
const [endDate, setEndDate] = useState(new Date());

const fetchAnalytics = async () => {
  const start = startDate.toISOString().split('T')[0];
  const end = endDate.toISOString().split('T')[0];
  
  const response = await fetch(
    `/api/analytics/trends/logins?startDate=${start}&endDate=${end}`
  );
  const data = await response.json();
  setTrends(data.trends);
};
```

---

## Benefits

✅ **Historical Analysis** - View data from any past date  
✅ **Trend Comparison** - Compare different time periods  
✅ **Issue Investigation** - Analyze specific date ranges when problems occurred  
✅ **Flexible Reporting** - Generate reports for any time frame  
✅ **Growth Tracking** - Monitor metrics over months/quarters  

---

## Testing

### Test Current Date (Default)
```bash
curl http://localhost:5000/api/analytics/overview
```

### Test Historical Date (1 month ago)
```bash
curl http://localhost:5000/api/analytics/overview?date=2025-11-27
```

### Test Date Range (Last 30 days)
```bash
curl "http://localhost:5000/api/analytics/trends/logins?startDate=2025-11-27&endDate=2025-12-27"
```

### Test with Multiple Filters
```bash
curl "http://localhost:5000/api/analytics/errors/details?startDate=2025-11-01&endDate=2025-11-30&errorType=ValidationError&limit=100"
```

---

## Notes

- All dates are stored in **UTC** in the database
- Date parameters are optional; defaults provide sensible current data
- Date ranges are inclusive (both start and end dates included)
- Use `includeResolved=true` to see historical resolved alerts
- Performance: Date filtering uses indexed columns for fast queries
