-- Platform-Wide Controls for Super Admin
-- All controlled via database - NO redeployment needed

-- 1. FEATURE FLAGS (Enable/disable features per school)
CREATE TABLE IF NOT EXISTS feature_flags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  feature_name VARCHAR(100) UNIQUE NOT NULL,  -- "ai_exams", "analytics", "sso"
  description TEXT,
  is_global BOOLEAN DEFAULT FALSE,             -- TRUE = all schools, FALSE = selective
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. SCHOOL FEATURE OVERRIDES (per-school feature control)
CREATE TABLE IF NOT EXISTS school_feature_flags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  feature_id INT NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,             -- Override global setting
  enabled_at DATETIME,
  disabled_at DATETIME,
  reason VARCHAR(255),
  updated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (feature_id) REFERENCES feature_flags(id),
  UNIQUE KEY (school_id, feature_id)
);

-- 3. ANNOUNCEMENTS/CIRCULARS (global broadcasts)
CREATE TABLE IF NOT EXISTS announcements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  announcement_type ENUM('circular', 'notice', 'alert', 'maintenance') DEFAULT 'notice',
  priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  target_roles JSON,                           -- ["admin", "faculty", "student"] or null for all
  target_schools JSON,                         -- null = all schools, or specific school IDs
  is_published BOOLEAN DEFAULT FALSE,
  published_at DATETIME,
  expires_at DATETIME,                         -- Auto-hides after this date
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 4. GLOBAL ACADEMIC TEMPLATES (holidays, events, schedules)
CREATE TABLE IF NOT EXISTS global_academic_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_type ENUM('holiday', 'event', 'schedule', 'break') DEFAULT 'holiday',
  name VARCHAR(100) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  applies_to_all_schools BOOLEAN DEFAULT TRUE,
  specific_school_ids JSON,                    -- null = all, or ["1", "2", "3"]
  metadata JSON,                               -- Additional data (e.g., holiday_type: "national")
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_start_date (start_date)
);

-- 5. AUDIT LOG (already exists but enhanced)
-- Uses existing audit_logs table in RBAC system
-- Just ensures all platform changes are logged

-- 6. FEATURE FLAG HISTORY (track changes over time)
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

-- DEFAULT FEATURE FLAGS
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

-- INDEX FOR PERFORMANCE
CREATE INDEX idx_school_feature ON school_feature_flags(school_id, feature_id);
CREATE INDEX idx_announcement_published ON announcements(is_published, published_at);
CREATE INDEX idx_template_dates ON global_academic_templates(start_date, end_date);
