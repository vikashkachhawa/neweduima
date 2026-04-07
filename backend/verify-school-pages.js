import db from './config/database.js';

async function verifySchoolPageTables() {
  try {
    console.log('Verifying school page tables...\n');

    const tables = [
      'school_pages',
      'school_posts',
      'school_followers',
      'school_post_likes',
      'school_post_comments',
      'school_post_media',
      'school_post_versions',
      'school_page_reports'
    ];

    for (const table of tables) {
      const result = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`✓ ${table}: ${result[0].count} records`);
    }

    console.log('\n✅ All school page tables verified!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verifySchoolPageTables();
