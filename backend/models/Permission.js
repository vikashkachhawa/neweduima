import pool from '../config/database.js';

class Permission {
  static async getAllPermissions() {
    try {
      const [permissions] = await pool.query(
        'SELECT id, name, description, category FROM permissions ORDER BY category, name'
      );
      return permissions;
    } catch (error) {
      throw new Error(`Failed to fetch permissions: ${error.message}`);
    }
  }

  static async getPermissionById(id) {
    try {
      const [permissions] = await pool.query(
        'SELECT id, name, description, category FROM permissions WHERE id = ?',
        [id]
      );
      return permissions[0];
    } catch (error) {
      throw new Error(`Failed to fetch permission: ${error.message}`);
    }
  }

  static async getPermissionByName(name) {
    try {
      const [permissions] = await pool.query(
        'SELECT id, name, description, category FROM permissions WHERE name = ?',
        [name]
      );
      return permissions[0];
    } catch (error) {
      throw new Error(`Failed to fetch permission: ${error.message}`);
    }
  }

  static async getPermissionsByCategory(category) {
    try {
      const [permissions] = await pool.query(
        'SELECT id, name, description, category FROM permissions WHERE category = ? ORDER BY name',
        [category]
      );
      return permissions;
    } catch (error) {
      throw new Error(`Failed to fetch permissions: ${error.message}`);
    }
  }

  static async createPermission(name, description, category) {
    try {
      const [result] = await pool.query(
        'INSERT INTO permissions (name, description, category) VALUES (?, ?, ?)',
        [name, description, category]
      );
      return result.insertId;
    } catch (error) {
      throw new Error(`Failed to create permission: ${error.message}`);
    }
  }

  static async updatePermission(id, name, description, category) {
    try {
      await pool.query(
        'UPDATE permissions SET name = ?, description = ?, category = ?, updated_at = NOW() WHERE id = ?',
        [name, description, category, id]
      );
      return true;
    } catch (error) {
      throw new Error(`Failed to update permission: ${error.message}`);
    }
  }

  static async deletePermission(id) {
    try {
      await pool.query('DELETE FROM permissions WHERE id = ?', [id]);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete permission: ${error.message}`);
    }
  }

  // Get permissions for user (across all roles)
  static async getUserPermissions(userId, schoolId = null) {
    try {
      let query = `
        SELECT DISTINCT p.id, p.name, p.description, p.category
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        INNER JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = ?
      `;
      const params = [userId];

      if (schoolId) {
        query += ' AND (ur.school_id = ? OR ur.school_id IS NULL)';
        params.push(schoolId);
      }

      query += ' ORDER BY p.category, p.name';

      const [permissions] = await pool.query(query, params);
      return permissions;
    } catch (error) {
      throw new Error(`Failed to fetch user permissions: ${error.message}`);
    }
  }

  // Check if user has specific permission
  static async hasPermission(userId, permissionName, schoolId = null) {
    try {
      let query = `
        SELECT COUNT(*) as count
        FROM role_permissions rp
        INNER JOIN user_roles ur ON rp.role_id = ur.role_id
        INNER JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = ? AND p.name = ?
      `;
      const params = [userId, permissionName];

      if (schoolId) {
        query += ' AND (ur.school_id = ? OR ur.school_id IS NULL)';
        params.push(schoolId);
      }

      const [result] = await pool.query(query, params);
      return result[0].count > 0;
    } catch (error) {
      throw new Error(`Failed to check permission: ${error.message}`);
    }
  }

  // Check if user has multiple permissions (all required)
  static async hasAllPermissions(userId, permissionNames, schoolId = null) {
    try {
      for (const permissionName of permissionNames) {
        const hasPermission = await this.hasPermission(userId, permissionName, schoolId);
        if (!hasPermission) {
          return false;
        }
      }
      return true;
    } catch (error) {
      throw new Error(`Failed to check permissions: ${error.message}`);
    }
  }

  // Check if user has any of the permissions
  static async hasAnyPermission(userId, permissionNames, schoolId = null) {
    try {
      for (const permissionName of permissionNames) {
        const hasPermission = await this.hasPermission(userId, permissionName, schoolId);
        if (hasPermission) {
          return true;
        }
      }
      return false;
    } catch (error) {
      throw new Error(`Failed to check permissions: ${error.message}`);
    }
  }

  // Get all permission categories
  static async getCategories() {
    try {
      const [categories] = await pool.query(
        'SELECT DISTINCT category FROM permissions ORDER BY category'
      );
      return categories.map(row => row.category);
    } catch (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }
  }
}

export default Permission;
