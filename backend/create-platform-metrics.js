#!/usr/bin/env node
import pool from './config/database.js';

const sql = `CREATE TABLE IF NOT EXISTS platform_metrics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  metric_date DATE NOT NULL UNIQUE,
  active_schools INT DEFAULT 0,
  total_active_users INT DEFAULT 0,
  total_logins INT DEFAULT 0,
  login_success_rate DECIMAL(5,2) DEFAULT 0,
  avg_response_time INT DEFAULT 0,
  total_errors INT DEFAULT 0,
  error_rate DECIMAL(5,2) DEFAULT 0,
  total_requests INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_metric_date (metric_date)
)`;

(async () => {
  try {
    const [[dbRow]] = await pool.query('SELECT DATABASE() as db');
    console.log('Using database:', dbRow.db);
    console.log('Creating table platform_metrics ...');
    await pool.query(sql);
    console.log('✓ Created platform_metrics');
    const [rows] = await pool.query("SHOW TABLES LIKE 'platform_metrics'");
    console.log(rows.length ? '✓ platform_metrics exists' : '✗ platform_metrics missing');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
})();
