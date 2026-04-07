#!/usr/bin/env node
import pool from './config/database.js';
import fs from 'fs';

const sql = fs.readFileSync('./database/migrations/2025-12-27-add-school-announcements.sql', 'utf8');

(async () => {
  try {
    console.log('Applying school announcements migration...\n');
    const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
    for (const raw of statements) {
      const cleaned = raw
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .trim();
      if (!cleaned) continue;

      const preview = cleaned.substring(0, 60).replace(/\n/g, ' ').trim();
      console.log('  →', preview + '...');
      await pool.query(cleaned);
    }
    console.log('\n✓ School announcements migration applied successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  }
})();
