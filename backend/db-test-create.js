#!/usr/bin/env node
import pool from './config/database.js';

(async () => {
  try {
    const [[dbRow]] = await pool.query('SELECT DATABASE() as db');
    console.log('Using database:', dbRow.db);
    console.log('Creating test table __test_table ...');
    await pool.query('CREATE TABLE IF NOT EXISTS __test_table (id INT PRIMARY KEY AUTO_INCREMENT)');
    console.log('✓ Created test table');
    const [rows] = await pool.query("SHOW TABLES LIKE '__test_table'");
    console.log(rows.length ? '✓ Test table exists' : '✗ Test table missing');
    await pool.query('DROP TABLE IF EXISTS __test_table');
    console.log('✓ Dropped test table');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
})();
