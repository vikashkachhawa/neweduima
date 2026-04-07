import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const analyticsMigrationPath = path.join(__dirname, 'migrations', '2025-12-27-add-analytics-monitoring.sql');

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

let ensurePromise = null;

const parseStatements = (sql) => sql
  .split(';')
  .map((statement) => statement.trim())
  .filter(Boolean);

const getMissingTables = async () => {
  const missingTables = [];

  for (const tableName of ANALYTICS_TABLES) {
    const [rows] = await db.query('SHOW TABLES LIKE ?', [tableName]);
    if (!rows.length) {
      missingTables.push(tableName);
    }
  }

  return missingTables;
};

export const ensureAnalyticsSchema = async () => {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const missingTables = await getMissingTables();

      if (!missingTables.length) {
        return;
      }

      const migrationSql = await fs.readFile(analyticsMigrationPath, 'utf8');
      const statements = parseStatements(migrationSql);

      for (const statement of statements) {
        await db.query(statement);
      }

      console.log(`Initialized analytics schema: ${missingTables.join(', ')}`);
    })().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
};
