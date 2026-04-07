import db from '../config/database.js';

let ensurePromise = null;

const tableExists = async (tableName) => {
  const [rows] = await db.query('SHOW TABLES LIKE ?', [tableName]);
  return rows.length > 0;
};

const ensurePermissionsTable = async () => {
  if (!(await tableExists('permissions'))) {
    await db.query(`
      CREATE TABLE permissions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) UNIQUE NOT NULL,
        description VARCHAR(255),
        category VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table: permissions');
  }
};

const ensureRolesTable = async () => {
  if (!(await tableExists('roles'))) {
    await db.query(`
      CREATE TABLE roles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(255),
        scope VARCHAR(50) NOT NULL DEFAULT 'school',
        school_id INT,
        is_custom BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_role_name_school (name, school_id),
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Table: roles');
  }
};

const ensureRolePermissionsTable = async () => {
  if (!(await tableExists('role_permissions'))) {
    await db.query(`
      CREATE TABLE role_permissions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        role_id INT NOT NULL,
        permission_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_role_permission (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Table: role_permissions');
  }
};

const ensureUserRolesTable = async () => {
  if (!(await tableExists('user_roles'))) {
    await db.query(`
      CREATE TABLE user_roles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        role_id INT NOT NULL,
        school_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_user_role_school (user_id, role_id, school_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Table: user_roles');
  }
};

const ensureAuditLogsTable = async () => {
  if (!(await tableExists('audit_logs'))) {
    await db.query(`
      CREATE TABLE audit_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INT,
        old_value JSON,
        new_value JSON,
        ip_address VARCHAR(45),
        user_agent VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_audit_user_action (user_id, action),
        INDEX idx_audit_entity (entity_type, entity_id)
      )
    `);
    console.log('✅ Table: audit_logs');
  }
};

export const ensureRBACSchema = async () => {
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    try {
      console.log('🔧 Ensuring RBAC Schema...');
      await ensurePermissionsTable();
      await ensureRolesTable();
      await ensureRolePermissionsTable();
      await ensureUserRolesTable();
      await ensureAuditLogsTable();
      console.log('✅ RBAC Schema Ready!');
    } catch (error) {
      console.error('❌ Error ensuring RBAC schema:', error.message);
      throw error;
    }
  })();

  return ensurePromise;
};
