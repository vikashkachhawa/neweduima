-- RBAC System Migration
-- Adds role, permission, and audit logging support

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  scope ENUM('platform', 'school') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create junction table for role-permission mapping
CREATE TABLE IF NOT EXISTS role_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_role_permission (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Create user_roles junction table (supports multiple roles per user)
CREATE TABLE IF NOT EXISTS user_roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  school_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_role_school (user_id, role_id, school_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  changes JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  status ENUM('success', 'failure') DEFAULT 'success',
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_user_roles_school ON user_roles(school_id);

-- Insert default roles
INSERT INTO roles (name, description, scope) VALUES
  ('Super Admin', 'Full platform access', 'platform'),
  ('School Admin', 'School management and user management', 'school'),
  ('Faculty', 'Class and student management', 'school'),
  ('Student', 'View own academic information', 'school')
ON DUPLICATE KEY UPDATE description=description;

-- Insert default permissions by category
-- User Management
INSERT INTO permissions (name, description, category) VALUES
  ('user.list', 'View all users', 'user_management'),
  ('user.view', 'View user details', 'user_management'),
  ('user.create', 'Create new user', 'user_management'),
  ('user.edit', 'Edit user information', 'user_management'),
  ('user.delete', 'Delete user', 'user_management'),
  ('user.reset_password', 'Reset user password', 'user_management'),
  ('user.toggle_status', 'Activate/deactivate user', 'user_management')
ON DUPLICATE KEY UPDATE description=description;

-- School Management
INSERT INTO permissions (name, description, category) VALUES
  ('school.list', 'View all schools', 'school_management'),
  ('school.view', 'View school details', 'school_management'),
  ('school.create', 'Create new school', 'school_management'),
  ('school.edit', 'Edit school information', 'school_management'),
  ('school.delete', 'Delete school', 'school_management'),
  ('school.suspend', 'Suspend school', 'school_management'),
  ('school.activate', 'Activate school', 'school_management'),
  ('school.clone', 'Clone school', 'school_management')
ON DUPLICATE KEY UPDATE description=description;

-- Class Management
INSERT INTO permissions (name, description, category) VALUES
  ('class.list', 'View classes', 'class_management'),
  ('class.view', 'View class details', 'class_management'),
  ('class.create', 'Create class', 'class_management'),
  ('class.edit', 'Edit class', 'class_management'),
  ('class.delete', 'Delete class', 'class_management'),
  ('class.assign_students', 'Assign students to class', 'class_management')
ON DUPLICATE KEY UPDATE description=description;

-- Grading
INSERT INTO permissions (name, description, category) VALUES
  ('grade.list', 'View grades', 'grading'),
  ('grade.view_own', 'View own grades', 'grading'),
  ('grade.submit', 'Submit grades', 'grading'),
  ('grade.edit', 'Edit grades', 'grading'),
  ('grade.comment', 'Add grade comments', 'grading')
ON DUPLICATE KEY UPDATE description=description;

-- Announcements
INSERT INTO permissions (name, description, category) VALUES
  ('announcement.list', 'View announcements', 'announcements'),
  ('announcement.create', 'Create announcement', 'announcements'),
  ('announcement.edit', 'Edit announcement', 'announcements'),
  ('announcement.delete', 'Delete announcement', 'announcements')
ON DUPLICATE KEY UPDATE description=description;

-- Role Management
INSERT INTO permissions (name, description, category) VALUES
  ('role.list', 'View roles', 'role_management'),
  ('role.view', 'View role details', 'role_management'),
  ('role.create', 'Create custom role', 'role_management'),
  ('role.edit', 'Edit role', 'role_management'),
  ('role.delete', 'Delete role', 'role_management'),
  ('role.assign', 'Assign roles to users', 'role_management')
ON DUPLICATE KEY UPDATE description=description;

-- Reports
INSERT INTO permissions (name, description, category) VALUES
  ('report.view', 'View reports', 'reports'),
  ('report.analytics', 'View analytics', 'reports'),
  ('report.export', 'Export reports', 'reports')
ON DUPLICATE KEY UPDATE description=description;

-- Assign permissions to Super Admin role (all permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'Super Admin'),
  id
FROM permissions
ON DUPLICATE KEY UPDATE role_id=role_id;

-- Assign permissions to School Admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'School Admin'),
  id
FROM permissions
WHERE category IN ('user_management', 'class_management', 'grading', 'announcements', 'report')
  AND name NOT LIKE 'school.%'
ON DUPLICATE KEY UPDATE role_id=role_id;

-- Assign permissions to Faculty role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'Faculty'),
  id
FROM permissions
WHERE category IN ('class_management', 'grading', 'announcements')
  AND name NOT IN ('user.delete', 'user.toggle_status', 'class.delete', 'class.edit')
ON DUPLICATE KEY UPDATE role_id=role_id;

-- Assign permissions to Student role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'Student'),
  id
FROM permissions
WHERE name IN ('grade.view_own', 'announcement.list', 'class.list', 'report.view')
ON DUPLICATE KEY UPDATE role_id=role_id;
