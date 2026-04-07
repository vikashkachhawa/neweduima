#!/usr/bin/env node
import pool from './config/database.js';

const ANALYTICS_TABLES = [
  'platform_metrics',
  'school_usage_stats',
  'hourly_login_stats',
  'error_logs',
  'performance_metrics',
  'storage_alerts',
  'feature_usage_stats',
  'revenue_stats',
  'alert_history',
  'school_performance_scores'
];

(async () => {
  try {
    const [[dbRow]] = await pool.query('SELECT DATABASE() as db');
    console.log('Using database:', dbRow.db);

    for (const tbl of ANALYTICS_TABLES) {
      const [rows] = await pool.query("SHOW TABLES LIKE ?", [tbl]);
      if (rows.length) {
        console.log('✓ Found table:', tbl);
      } else {
        console.log('✗ Missing table:', tbl);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('✗ Verification error:', error.message);
    process.exit(1);
  }
})();
