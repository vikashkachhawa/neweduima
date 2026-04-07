import pool from '../config/database.js';

class Role {
  static async getAllRoles() {
    try {
      const [roles] = await pool.query(
        'SELECT id, name, description, scope FROM roles ORDER BY name'
      );
      return roles;
    } catch (error) {
      throw new Error(`Failed to fetch roles: ${error.message}`);
    }
  }

  static async getRoleById(id) {
    try {
      const [roles] = await pool.query(
        'SELECT id, name, description, scope FROM roles WHERE id = ?',
        [id]
      );
      return roles[0];
    } catch (error) {
      throw new Error(`Failed to fetch role: ${error.message}`);
    }
  }

  static async getRoleByName(name) {
    try {
      const [roles] = await pool.query(
        'SELECT id, name, description, scope FROM roles WHERE name = ?',
        [name]
      );
      return roles[0];
    } catch (error) {
      throw new Error(`Failed to fetch role: ${error.message}`);
    }
  }

  static async createRole(name, description, scope) {
    try {
      const [result] = await pool.query(
        'INSERT INTO roles (name, description, scope) VALUES (?, ?, ?)',
        [name, description, scope]
      );
      return result.insertId;
    } catch (error) {
      throw new Error(`Failed to create role: ${error.message}`);
    }
  }

  static async updateRole(id, name, description, scope) {
    try {
      await pool.query(
        'UPDATE roles SET name = ?, description = ?, scope = ?, updated_at = NOW() WHERE id = ?',
        [name, description, scope, id]
      );
      return true;
    } catch (error) {
      throw new Error(`Failed to update role: ${error.message}`);
    }
  }

  static async deleteRole(id) {
    try {
      // Don't allow deleting default roles
      const role = await this.getRoleById(id);
      if (!role) {
        throw new Error('Role not found');
      }

      const defaultRoles = ['Super Admin', 'School Admin', 'Faculty', 'Student'];
      if (defaultRoles.includes(role.name)) {
        throw new Error('Cannot delete default roles');
      }

      await pool.query('DELETE FROM roles WHERE id = ?', [id]);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete role: ${error.message}`);
    }
  }

  // Get permissions for a role
  static async getRolePermissions(roleId) {
    try {
      const [permissions] = await pool.query(
        `SELECT p.id, p.name, p.description, p.category
         FROM permissions p
         INNER JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = ?
         ORDER BY p.category, p.name`,
        [roleId]
      );
      return permissions;
    } catch (error) {
      throw new Error(`Failed to fetch role permissions: ${error.message}`);
    }
  }

  // Assign permission to role
  static async assignPermission(roleId, permissionId) {
    try {
      await pool.query(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [roleId, permissionId]
      );
      return true;
    } catch (error) {
      throw new Error(`Failed to assign permission: ${error.message}`);
    }
  }

  // Remove permission from role
  static async removePermission(roleId, permissionId) {
    try {
      await pool.query(
        'DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?',
        [roleId, permissionId]
      );
      return true;
    } catch (error) {
      throw new Error(`Failed to remove permission: ${error.message}`);
    }
  }

  // Batch assign permissions
  static async setRolePermissions(roleId, permissionIds) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Remove all existing permissions
      await connection.query(
        'DELETE FROM role_permissions WHERE role_id = ?',
        [roleId]
      );

      // Add new permissions
      if (permissionIds && permissionIds.length > 0) {
        for (const permissionId of permissionIds) {
          await connection.query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
            [roleId, permissionId]
          );
        }
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw new Error(`Failed to set role permissions: ${error.message}`);
    } finally {
      await connection.release();
    }
  }
}

export default Role;
