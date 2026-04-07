#!/usr/bin/env node
import pool from './config/database.js';

(async () => {
  try {
    const [tables] = await pool.query("SHOW TABLES LIKE 'subscription%'");
    console.log('✓ Subscription tables exist:');
    tables.forEach(t => console.log('  -', Object.values(t)[0]));
    
    const [plans] = await pool.query('SELECT id, name, max_users FROM subscription_plans');
    console.log('\n✓ Default plans created:');
    plans.forEach(p => console.log('  - ' + p.name + ' (' + p.max_users + ' max users)'));
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
})();
