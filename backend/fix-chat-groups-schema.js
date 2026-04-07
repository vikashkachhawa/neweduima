import db from './config/database.js';

async function fixChatGroupsSchema() {
  try {
    console.log('Checking chat_groups table structure...');
    const [cols] = await db.query(`DESCRIBE chat_groups`);
    const colNames = cols.map(c => c.Field);
    console.log('Current columns:', colNames.join(', '));
    
    // Add deleted_at if missing
    if (!colNames.includes('deleted_at')) {
      await db.query(`ALTER TABLE chat_groups ADD COLUMN deleted_at DATETIME NULL COMMENT 'Soft delete timestamp'`);
      console.log('✅ Added deleted_at column');
    } else {
      console.log('✅ deleted_at column already exists');
    }
    
    // Add is_archived if missing
    if (!colNames.includes('is_archived')) {
      await db.query(`ALTER TABLE chat_groups ADD COLUMN is_archived BOOLEAN DEFAULT FALSE`);
      console.log('✅ Added is_archived column');
    } else {
      console.log('✅ is_archived column already exists');
    }
    
    // Add member_count if missing
    if (!colNames.includes('member_count')) {
      await db.query(`ALTER TABLE chat_groups ADD COLUMN member_count INT DEFAULT 1`);
      console.log('✅ Added member_count column');
    } else {
      console.log('✅ member_count column already exists');
    }
    
    // Verify changes
    const [updatedCols] = await db.query(`DESCRIBE chat_groups`);
    console.log('Updated columns:', updatedCols.map(c => c.Field).join(', '));
    
    console.log('✅ Schema fix complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

fixChatGroupsSchema();
