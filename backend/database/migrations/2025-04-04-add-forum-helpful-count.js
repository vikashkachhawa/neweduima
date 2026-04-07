import db from '../../config/database.js';
const addHelpfulCountToForum = async () => {
  try {
    console.log('📝 Adding helpful_count columns to forum tables...');

    // Add helpful_count to forum_questions
    await db.query(
      `ALTER TABLE forum_questions ADD COLUMN helpful_count INT DEFAULT 0 AFTER replies_count`
    ).catch(() => {
      console.log('  helpful_count column already exists in forum_questions');
    });

    // Add helpful_count to forum_replies
    await db.query(
      `ALTER TABLE forum_replies ADD COLUMN helpful_count INT DEFAULT 0 AFTER reply_text`
    ).catch(() => {
      console.log('  helpful_count column already exists in forum_replies');
    });

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

addHelpfulCountToForum();
