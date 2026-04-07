-- Analytics & Monitoring System
-- Aggregated, read-only metrics for Super Admin dashboard

-- 1. PLATFORM METRICS (Daily aggregated data)
CREATE TABLE IF NOT EXISTS platform_metrics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  metric_date DATE NOT NULL UNIQUE,
  active_schools INT DEFAULT 0,
  total_active_users INT DEFAULT 0,
  total_logins INT DEFAULT 0,
  login_success_rate DECIMAL(5,2) DEFAULT 0,
  avg_response_time INT DEFAULT 0,  -- milliseconds
  total_errors INT DEFAULT 0,
  error_rate DECIMAL(5,2) DEFAULT 0,
  total_requests INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_metric_date (metric_date)
);

-- 2. SCHOOL USAGE TRACKING (Daily per school)
CREATE TABLE IF NOT EXISTS school_usage_stats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  stat_date DATE NOT NULL,
  active_users INT DEFAULT 0,
  total_logins INT DEFAULT 0,
  features_used JSON,  -- {"ai_exams": 45, "analytics": 23}
  storage_used_gb DECIMAL(10,2) DEFAULT 0,
  storage_limit_gb DECIMAL(10,2) DEFAULT 10,
  support_tickets INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id),
  UNIQUE KEY (school_id, stat_date),
  INDEX idx_school_date (school_id, stat_date),
  INDEX idx_storage (storage_used_gb, storage_limit_gb)
);

-- 3. HOURLY LOGIN PATTERNS
CREATE TABLE IF NOT EXISTS hourly_login_stats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stat_date DATE NOT NULL,
  hour_slot INT NOT NULL,  -- 0-23
  login_count INT DEFAULT 0,
  unique_users INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (stat_date, hour_slot),
  INDEX idx_date_hour (stat_date, hour_slot)
);

-- 4. ERROR TRACKING
CREATE TABLE IF NOT EXISTS error_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  error_type VARCHAR(100),  -- "500", "401", "404"
  endpoint VARCHAR(255),
  school_id INT,
  user_id INT,
  error_message TEXT,
  stack_trace TEXT,
  request_method VARCHAR(10),
  request_body TEXT,
  occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_error_type (error_type, occurred_at),
  INDEX idx_school_errors (school_id, occurred_at),
  INDEX idx_endpoint (endpoint, occurred_at)
);

-- 5. PERFORMANCE METRICS (Response time tracking)
CREATE TABLE IF NOT EXISTS performance_metrics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  metric_date DATE NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  avg_response_time INT,  -- milliseconds
  max_response_time INT,
  min_response_time INT,
  total_requests INT,
  slow_requests INT,  -- >1000ms
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (metric_date, endpoint),
  INDEX idx_date_endpoint (metric_date, endpoint),
  INDEX idx_slow_endpoints (avg_response_time DESC)
);

-- 6. STORAGE ALERTS
CREATE TABLE IF NOT EXISTS storage_alerts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  alert_level ENUM('warning', 'critical', 'emergency') DEFAULT 'warning',
  current_usage_gb DECIMAL(10,2),
  limit_gb DECIMAL(10,2),
  percentage_used DECIMAL(5,2),
  growth_rate_gb_per_week DECIMAL(10,2),
  projected_full_date DATE,
  notified_at TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id),
  INDEX idx_school_alerts (school_id, created_at),
  INDEX idx_unresolved (resolved_at, alert_level)
);

-- 7. FEATURE USAGE TRACKING
CREATE TABLE IF NOT EXISTS feature_usage_stats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stat_date DATE NOT NULL,
  feature_name VARCHAR(100) NOT NULL,
  schools_using INT DEFAULT 0,
  total_users INT DEFAULT 0,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (stat_date, feature_name),
  INDEX idx_date_feature (stat_date, feature_name)
);

-- 8. REVENUE TRACKING (Aggregated)
CREATE TABLE IF NOT EXISTS revenue_stats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stat_date DATE NOT NULL UNIQUE,
  mrr DECIMAL(10,2) DEFAULT 0,  -- Monthly Recurring Revenue
  free_schools INT DEFAULT 0,
  pro_schools INT DEFAULT 0,
  enterprise_schools INT DEFAULT 0,
  new_upgrades INT DEFAULT 0,
  downgrades INT DEFAULT 0,
  churn INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stat_date (stat_date)
);

-- 9. ALERT HISTORY (All alerts sent)
CREATE TABLE IF NOT EXISTS alert_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  alert_type VARCHAR(50),  -- "storage", "performance", "error", "churn_risk"
  severity ENUM('info', 'warning', 'critical', 'emergency'),
  school_id INT,
  title VARCHAR(255),
  message TEXT,
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_method VARCHAR(50),  -- "email", "sms", "both"
  acknowledged_at TIMESTAMP NULL,
  acknowledged_by INT NULL,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL,
  FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_school_alerts (school_id, created_at),
  INDEX idx_unresolved (resolved_at, severity)
);

-- 10. SCHOOL PERFORMANCE SCORES (Calculated daily)
CREATE TABLE IF NOT EXISTS school_performance_scores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  score_date DATE NOT NULL,
  engagement_score DECIMAL(5,2),  -- 0-100
  feature_adoption_score DECIMAL(5,2),  -- 0-100
  support_health_score DECIMAL(5,2),  -- 0-100 (inverse of tickets)
  overall_score DECIMAL(5,2),  -- 0-100 (average)
  rank_position INT,  -- 1-150
  performance_tier ENUM('top', 'good', 'average', 'needs_attention', 'at_risk'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id),
  UNIQUE KEY (school_id, score_date),
  INDEX idx_school_date (school_id, score_date),
  INDEX idx_performance_tier (performance_tier, score_date)
);


