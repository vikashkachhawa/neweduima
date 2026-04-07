#!/usr/bin/env node
import pool from './config/database.js';

const statements = [
`CREATE TABLE IF NOT EXISTS school_usage_stats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  stat_date DATE NOT NULL,
  active_users INT DEFAULT 0,
  total_logins INT DEFAULT 0,
  features_used JSON,
  storage_used_gb DECIMAL(10,2) DEFAULT 0,
  storage_limit_gb DECIMAL(10,2) DEFAULT 10,
  support_tickets INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id),
  UNIQUE KEY (school_id, stat_date),
  INDEX idx_school_date (school_id, stat_date),
  INDEX idx_storage (storage_used_gb, storage_limit_gb)
)`,
`CREATE TABLE IF NOT EXISTS hourly_login_stats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stat_date DATE NOT NULL,
  hour_slot INT NOT NULL,
  login_count INT DEFAULT 0,
  unique_users INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (stat_date, hour_slot),
  INDEX idx_date_hour (stat_date, hour_slot)
)`,
`CREATE TABLE IF NOT EXISTS error_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  error_type VARCHAR(100),
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
)`,
`CREATE TABLE IF NOT EXISTS performance_metrics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  metric_date DATE NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  avg_response_time INT,
  max_response_time INT,
  min_response_time INT,
  total_requests INT,
  slow_requests INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (metric_date, endpoint),
  INDEX idx_date_endpoint (metric_date, endpoint),
  INDEX idx_slow_endpoints (avg_response_time DESC)
)`,
`CREATE TABLE IF NOT EXISTS storage_alerts (
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
)`,
`CREATE TABLE IF NOT EXISTS feature_usage_stats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stat_date DATE NOT NULL,
  feature_name VARCHAR(100) NOT NULL,
  schools_using INT DEFAULT 0,
  total_users INT DEFAULT 0,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (stat_date, feature_name),
  INDEX idx_date_feature (stat_date, feature_name)
)`,
`CREATE TABLE IF NOT EXISTS revenue_stats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stat_date DATE NOT NULL UNIQUE,
  mrr DECIMAL(10,2) DEFAULT 0,
  free_schools INT DEFAULT 0,
  pro_schools INT DEFAULT 0,
  enterprise_schools INT DEFAULT 0,
  new_upgrades INT DEFAULT 0,
  downgrades INT DEFAULT 0,
  churn INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stat_date (stat_date)
)`,
`CREATE TABLE IF NOT EXISTS alert_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  alert_type VARCHAR(50),
  severity ENUM('info', 'warning', 'critical', 'emergency'),
  school_id INT,
  title VARCHAR(255),
  message TEXT,
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_method VARCHAR(50),
  acknowledged_at TIMESTAMP NULL,
  acknowledged_by INT NULL,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL,
  FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_school_alerts (school_id, created_at),
  INDEX idx_unresolved (resolved_at, severity)
)`,
`CREATE TABLE IF NOT EXISTS school_performance_scores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  score_date DATE NOT NULL,
  engagement_score DECIMAL(5,2),
  feature_adoption_score DECIMAL(5,2),
  support_health_score DECIMAL(5,2),
  overall_score DECIMAL(5,2),
  rank_position INT,
  performance_tier ENUM('top', 'good', 'average', 'needs_attention', 'at_risk'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id),
  UNIQUE KEY (school_id, score_date),
  INDEX idx_school_date (school_id, score_date),
  INDEX idx_performance_tier (performance_tier, score_date)
)`
];

(async () => {
  try {
    const [[dbRow]] = await pool.query('SELECT DATABASE() as db');
    console.log('Using database:', dbRow.db);
    for (const sql of statements) {
      const preview = sql.substring(0, 40).replace(/\n/g, ' ');
      console.log('Creating:', preview + '...');
      await pool.query(sql);
      console.log('  ✓ Done');
    }
    console.log('Verifying tables...');
    for (const name of ['school_usage_stats','hourly_login_stats','error_logs','performance_metrics','storage_alerts','feature_usage_stats','revenue_stats','alert_history','school_performance_scores']) {
      const [rows] = await pool.query('SHOW TABLES LIKE ?', [name]);
      console.log(rows.length ? '✓ ' + name : '✗ ' + name + ' missing');
    }
    process.exit(0);
  } catch (error) {
    console.error('✗ Bootstrap error:', error.message);
    process.exit(1);
  }
})();
