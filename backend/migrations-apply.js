#!/usr/bin/env node
import fs from 'fs';
import pool from './config/database.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const migrations = [
  './database/migrations/2025-12-27-add-analytics-monitoring.sql',
  './database/migrations/2025-12-27-add-rbac-system.sql',
  './database/migrations/2025-12-27-add-school-pages.sql',
  './database/migrations/2025-12-28-add-media-url-to-posts.sql',
  './database/migrations/2025-12-27-add-school-announcements.sql',
  './database/migrations/2025-12-27-add-status-modules.sql',
  './database/migrations/2025-12-27-add-subscriptions.sql',
  './database/migrations/2025-12-27-add-platform-controls.sql',
  './database/migrations/2025-12-27-add-superadmin-templates.sql',
  './database/migrations/2026-01-11-expand-faculty-image-fields.sql'
];

(async () => {
  try {
    for (const migrationPath of migrations) {
      const fullPath = path.join(__dirname, migrationPath);
      if (!fs.existsSync(fullPath)) {
        console.log(`⊘ Skipping ${migrationPath} (not found)`);
        continue;
      }

      const sql = fs.readFileSync(fullPath, 'utf8');
      const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

      console.log(`\nApplying ${path.basename(migrationPath)}...`);
      for (const statement of statements) {
        const preview = statement.substring(0, 50).replace(/\n/g, ' ');
        console.log('  →', preview + '...');
        await pool.query(statement);
      }
      console.log(`✓ ${path.basename(migrationPath)} completed`);
    }

    console.log('\n✓ All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  }
})();
