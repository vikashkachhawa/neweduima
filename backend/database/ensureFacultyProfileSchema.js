import db from '../config/database.js';

let ensurePromise = null;

const tableExists = async (tableName) => {
  const [rows] = await db.query('SHOW TABLES LIKE ?', [tableName]);
  return rows.length > 0;
};

const ensureFacultyProfilesTable = async () => {
  if (!(await tableExists('faculty_profiles'))) {
    await db.query(`
      CREATE TABLE faculty_profiles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        faculty_id INT NOT NULL UNIQUE,
        school_id INT NOT NULL,
        banner_url VARCHAR(500),
        profile_image_url VARCHAR(500),
        bio TEXT,
        specialization VARCHAR(255),
        education VARCHAR(255),
        experience VARCHAR(100),
        followers_count INT DEFAULT 0,
        following_count INT DEFAULT 0,
        posts_count INT DEFAULT 0,
        is_public BOOLEAN DEFAULT TRUE,
        allow_comments BOOLEAN DEFAULT TRUE,
        require_follow_approval BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        INDEX idx_faculty_profile (faculty_id, school_id),
        INDEX idx_school_faculty (school_id, is_public)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
};

const ensureFacultyPostsTable = async () => {
  if (!(await tableExists('faculty_posts'))) {
    await db.query(`
      CREATE TABLE faculty_posts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        faculty_id INT NOT NULL,
        school_id INT NOT NULL,
        title VARCHAR(255),
        content TEXT NOT NULL,
        post_type ENUM('text', 'image', 'video', 'resource') DEFAULT 'text',
        status ENUM('draft', 'published', 'scheduled', 'archived') DEFAULT 'draft',
        media_url VARCHAR(500),
        published_at DATETIME,
        scheduled_at DATETIME,
        likes_count INT DEFAULT 0,
        comments_count INT DEFAULT 0,
        views_count INT DEFAULT 0,
        allow_comments BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        INDEX idx_faculty_posts (faculty_id, status, published_at),
        INDEX idx_school_faculty_posts (school_id, faculty_id, status, published_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
};

const ensureFacultyFollowersTable = async () => {
  if (!(await tableExists('faculty_followers'))) {
    await db.query(`
      CREATE TABLE faculty_followers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        faculty_id INT NOT NULL,
        follower_id INT NOT NULL,
        follower_email VARCHAR(255),
        follower_name VARCHAR(255),
        status ENUM('pending', 'approved', 'blocked') DEFAULT 'approved',
        followed_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_faculty_follower (faculty_id, follower_id),
        INDEX idx_faculty_followers (faculty_id, status),
        INDEX idx_follower_status (faculty_id, status, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
};

const ensureFacultyFollowRequestsTable = async () => {
  if (!(await tableExists('faculty_follow_requests'))) {
    await db.query(`
      CREATE TABLE faculty_follow_requests (
        id INT PRIMARY KEY AUTO_INCREMENT,
        faculty_id INT NOT NULL,
        requester_id INT NOT NULL,
        requester_email VARCHAR(255),
        requester_name VARCHAR(255),
        status ENUM('pending', 'approved', 'rejected', 'blocked') DEFAULT 'pending',
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_follow_request (faculty_id, requester_id),
        INDEX idx_pending_requests (faculty_id, status),
        INDEX idx_requester_requests (requester_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
};

const ensureFacultyPostLikesTable = async () => {
  if (!(await tableExists('faculty_post_likes'))) {
    await db.query(`
      CREATE TABLE faculty_post_likes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        post_id INT NOT NULL,
        user_id INT,
        guest_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES faculty_posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_post_like (post_id, user_id),
        INDEX idx_post_likes (post_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
};

const ensureFacultyPostCommentsTable = async () => {
  if (!(await tableExists('faculty_post_comments'))) {
    await db.query(`
      CREATE TABLE faculty_post_comments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        post_id INT NOT NULL,
        user_id INT,
        guest_email VARCHAR(255),
        guest_name VARCHAR(255),
        content TEXT NOT NULL,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
        likes_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES faculty_posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_post_comments (post_id, status, created_at),
        INDEX idx_user_comments (user_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
};

export const ensureFacultyProfileSchema = async () => {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await ensureFacultyProfilesTable();
      await ensureFacultyPostsTable();
      await ensureFacultyFollowersTable();
      await ensureFacultyFollowRequestsTable();
      await ensureFacultyPostLikesTable();
      await ensureFacultyPostCommentsTable();
      console.log('Initialized faculty profile schema');
    })().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
};