import db from './config/database.js';

async function testCreatePost() {
  try {
    const schoolId = 1; // Assuming school ID 1 exists
    const userId = 1; // Assuming user ID 1 exists
    
    console.log('Testing post creation...');
    
    // First check if we can insert a post
    const result = await db.query(
      `INSERT INTO school_posts (school_id, title, content, post_type, status, allow_comments, created_by, media_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [schoolId, 'Test Post', 'Test Content', 'text', 'published', true, userId, '/uploads/test.jpg']
    );
    
    console.log('Post created:', result[0]);
    
    // Now retrieve it
    const [posts] = await db.query('SELECT * FROM school_posts WHERE id = ?', [result[0].insertId]);
    console.log('Retrieved post:', posts[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testCreatePost();
