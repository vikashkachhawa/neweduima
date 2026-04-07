#!/usr/bin/env node
import pool from './config/database.js';

const sql = `
-- 1. FEATURE FLAGS
CREATE TABLE IF NOT EXISTS feature_flags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  feature_name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_global BOOLEAN DEFAULT FALSE,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. SCHOOL FEATURE OVERRIDES
CREATE TABLE IF NOT EXISTS school_feature_flags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  feature_id INT NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  enabled_at DATETIME,
  reason VARCHAR(255),
  updated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (feature_id) REFERENCES feature_flags(id),
  UNIQUE KEY (school_id, feature_id)
);

-- 3. ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS announcements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'notice',
  priority VARCHAR(50) DEFAULT 'medium',
  target_roles JSON,
  target_schools JSON,
  is_active BOOLEAN DEFAULT TRUE,
  published_at DATETIME,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 4. GLOBAL ACADEMIC TEMPLATES
CREATE TABLE IF NOT EXISTS global_academic_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type VARCHAR(50) DEFAULT 'holiday',
  name VARCHAR(100) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  applies_to_all_schools BOOLEAN DEFAULT TRUE,
  applicable_schools JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_start_date (start_date)
);

-- 5. FEATURE FLAG HISTORY
CREATE TABLE IF NOT EXISTS feature_flag_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT,
  feature_id INT NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  changed_by INT NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (feature_id) REFERENCES feature_flags(id),
  FOREIGN KEY (changed_by) REFERENCES users(id),
  FOREIGN KEY (school_id) REFERENCES schools(id)
);

-- INSERT DEFAULT FEATURE FLAGS
INSERT IGNORE INTO feature_flags (feature_name, description, is_global, is_enabled) VALUES
('ai_exams', 'AI-powered exam generation', FALSE, TRUE),
('advanced_analytics', 'Advanced analytics dashboard', FALSE, TRUE),
('api_access', 'REST API access for integrations', FALSE, TRUE),
('sso_integration', 'Single sign-on via OAuth', FALSE, FALSE),
('mobile_app', 'Mobile app access', FALSE, TRUE),
('video_streaming', 'Video streaming for classes', FALSE, FALSE),
('attendance_biometric', 'Biometric attendance tracking', FALSE, FALSE),
('parent_portal', 'Parent access portal', TRUE, TRUE),
('bulk_import', 'Bulk student/staff import', FALSE, TRUE);

-- CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_school_feature ON school_feature_flags(school_id, feature_id);
CREATE INDEX IF NOT EXISTS idx_announcement_published ON announcements(is_active, published_at);
CREATE INDEX IF NOT EXISTS idx_template_dates ON global_academic_templates(start_date, end_date);
`;

(async () => {
  try {
    console.log('Applying platform controls migration...\n');
    
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      const preview = statement.substring(0, 50).replace(/\n/g, ' ');
      console.log('  →', preview + '...');
      await pool.query(statement);
    }
    
    console.log('\n✓ Platform controls migration applied successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  }
})();
