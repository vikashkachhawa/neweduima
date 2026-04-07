#!/usr/bin/env node
import pool from './config/database.js';
import fs from 'fs';

const sql = fs.readFileSync('./database/migrations/2025-12-27-add-analytics-monitoring.sql', 'utf8');

(async () => {
  try {
    console.log('Applying analytics & monitoring migration...\n');
    
    const statements = sql.split(';').filter(s => s.trim());
    console.log(`Found ${statements.length} SQL statements to execute.`);
    
    for (const statement of statements) {
      if (statement.trim().startsWith('--')) continue;
      const preview = statement.substring(0, 50).replace(/\n/g, ' ').trim();
      if (preview) {
        console.log('  →', preview + '...');
        try {
          await pool.query(statement);
          console.log('    ✓ Executed');
        } catch (err) {
          console.error('    ✗ Failed:', err.message);
          throw err;
        }
      }
    }
    
    console.log('\n✓ Analytics & monitoring migration applied successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  }
})();
