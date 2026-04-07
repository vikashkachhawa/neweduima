-- School Page Module: Database Schema
-- Supports multi-tenant social page functionality per school

CREATE TABLE IF NOT EXISTS school_pages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL UNIQUE,
  banner_url VARCHAR(500),
  logo_url VARCHAR(500),
  description TEXT,
  vision_statement TEXT,
  achievements TEXT,
  follower_count INT DEFAULT 0,
  post_count INT DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  allow_comments BOOLEAN DEFAULT TRUE,
  require_follow_approval BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  INDEX idx_school_public (school_id, is_public)
);

CREATE TABLE IF NOT EXISTS school_posts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  post_type ENUM('text', 'image', 'video', 'announcement') DEFAULT 'text',
  status ENUM('draft', 'published', 'scheduled', 'archived') DEFAULT 'draft',
  published_at DATETIME,
  scheduled_at DATETIME,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  views_count INT DEFAULT 0,
  allow_comments BOOLEAN DEFAULT TRUE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_school_posts (school_id, status, published_at DESC),
  INDEX idx_published_posts (school_id, status, published_at DESC)
);

CREATE TABLE IF NOT EXISTS school_post_media (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  media_type ENUM('image', 'video') DEFAULT 'image',
  media_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  file_size INT,
  media_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES school_posts(id) ON DELETE CASCADE,
  INDEX idx_post_media (post_id)
);

CREATE TABLE IF NOT EXISTS school_post_versions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  title VARCHAR(255),
  content TEXT,
  changed_by INT,
  change_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES school_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id),
  INDEX idx_post_versions (post_id, created_at DESC)
);

CREATE TABLE IF NOT EXISTS school_followers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  follower_id INT,
  follower_email VARCHAR(255),
  follower_name VARCHAR(255),
  status ENUM('pending', 'approved', 'blocked') DEFAULT 'approved',
  is_staff BOOLEAN DEFAULT FALSE,
  followed_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_follower (school_id, follower_id),
  INDEX idx_school_followers (school_id, status),
  INDEX idx_follower_status (school_id, status, created_at DESC)
);

CREATE TABLE IF NOT EXISTS school_post_likes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  user_id INT,
  guest_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES school_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_like (post_id, user_id),
  INDEX idx_post_likes (post_id, created_at DESC)
);

CREATE TABLE IF NOT EXISTS school_post_comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  user_id INT,
  guest_name VARCHAR(255),
  guest_email VARCHAR(255),
  comment TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  moderation_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES school_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_post_comments (post_id, moderation_status, is_hidden, created_at DESC),
  INDEX idx_pinned_comments (post_id, is_pinned, created_at DESC)
);

CREATE TABLE IF NOT EXISTS school_page_reports (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT,
  post_id INT,
  comment_id INT,
  reporter_id INT,
  reporter_email VARCHAR(255),
  report_type ENUM('spam', 'inappropriate', 'harassment', 'misinformation', 'other') DEFAULT 'other',
  reason VARCHAR(500),
  status ENUM('pending', 'investigating', 'resolved', 'dismissed') DEFAULT 'pending',
  action_taken VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (post_id) REFERENCES school_posts(id),
  FOREIGN KEY (comment_id) REFERENCES school_post_comments(id),
  FOREIGN KEY (reporter_id) REFERENCES users(id),
  INDEX idx_reports (school_id, status, created_at DESC),
  INDEX idx_pending_reports (status, created_at DESC)
);

-- Insert default empty school pages for existing schools
INSERT IGNORE INTO school_pages (school_id) 
SELECT id FROM schools 
WHERE id NOT IN (SELECT school_id FROM school_pages);
