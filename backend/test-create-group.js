import db from './config/database.js';

async function testCreateGroup() {
  try {
    console.log('Testing createGroup query...');
    
    const schoolId = 1;
    const name = 'Test Group ' + Date.now();
    const creatorId = 2;
    
    // Test 1: Check if chatgroups table has deleted_at column
    console.log('\n1. Checking table structure:');
    const [cols] = await db.query(`DESCRIBE chat_groups`);
    const colNames = cols.map(c => c.Field);
    console.log('   Columns:', colNames.join(', '));
    console.log('   Has deleted_at?', colNames.includes('deleted_at') ? '✅ YES' : '❌ NO');
    
    // Test 2: Try the exact query from createGroup
    console.log('\n2. Testing SELECT query with deleted_at:');
    try {
      const [[existing]] = await db.query(
        'SELECT id FROM chat_groups WHERE school_id = ? AND name = ? AND deleted_at IS NULL',
        [schoolId, name]
      );
      console.log('   ✅ Query succeeded, result:', existing);
    } catch (err) {
      console.log('   ❌ Query failed:', err.message);
      throw err;
    }
    
    // Test 3: Try INSERT
    console.log('\n3. Testing INSERT query:');
    try {
      const [result] = await db.query(
        `INSERT INTO chat_groups (school_id, name, description, created_by_id, member_count)
         VALUES (?, ?, ?, ?, ?)`,
        [schoolId, name, 'Test Description', creatorId, 1]
      );
      console.log('   ✅ INSERT succeeded, ID:', result.insertId);
    } catch (err) {
      console.log('   ❌ INSERT failed:', err.message);
      throw err;
    }
    
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testCreateGroup();
