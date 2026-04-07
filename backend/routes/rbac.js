import express from 'express';
import Role from '../models/Role.js';
import Permission from '../models/Permission.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { checkSuperAdmin, checkPermission } from '../middleware/permission.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// ============ ROLE MANAGEMENT ============

// Get all roles
router.get('/roles', checkPermission('role.list'), async (req, res) => {
  try {
    const roles = await Role.getAllRoles();
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single role with permissions
router.get('/roles/:id', checkPermission('role.view'), async (req, res) => {
  try {
    const role = await Role.getRoleById(req.params.id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const permissions = await Role.getRolePermissions(role.id);
    res.json({ ...role, permissions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create custom role (Super Admin only)
router.post('/roles', checkSuperAdmin, async (req, res) => {
  try {
    const { name, description, scope } = req.body;

    if (!name || !scope) {
      return res.status(400).json({ error: 'Name and scope are required' });
    }

    const roleId = await Role.createRole(name, description, scope);
    
    await AuditLog.log(req.user.id, 'role_created', 'role', roleId, { name, description, scope }, req);

    res.status(201).json({ id: roleId, name, description, scope });
  } catch (error) {
    await AuditLog.log(req.user.id, 'role_created', 'role', null, req.body, req, 'failure', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Update role (Super Admin only)
router.put('/roles/:id', checkSuperAdmin, async (req, res) => {
  try {
    const { name, description, scope } = req.body;
    const roleId = req.params.id;

    const role = await Role.getRoleById(roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    await Role.updateRole(roleId, name || role.name, description || role.description, scope || role.scope);
    
    await AuditLog.log(req.user.id, 'role_updated', 'role', roleId, { old: role, new: { name, description, scope } }, req);

    res.json({ id: roleId, name: name || role.name, description: description || role.description, scope: scope || role.scope });
  } catch (error) {
    await AuditLog.log(req.user.id, 'role_updated', 'role', req.params.id, req.body, req, 'failure', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Delete role (Super Admin only)
router.delete('/roles/:id', checkSuperAdmin, async (req, res) => {
  try {
    const roleId = req.params.id;

    const role = await Role.getRoleById(roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    await Role.deleteRole(roleId);
    
    await AuditLog.log(req.user.id, 'role_deleted', 'role', roleId, role, req);

    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    await AuditLog.log(req.user.id, 'role_deleted', 'role', req.params.id, null, req, 'failure', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Set permissions for a role
router.post('/roles/:id/permissions', checkSuperAdmin, async (req, res) => {
  try {
    const { permissionIds } = req.body;
    const roleId = req.params.id;

    if (!permissionIds || !Array.isArray(permissionIds)) {
      return res.status(400).json({ error: 'permissionIds array is required' });
    }

    const role = await Role.getRoleById(roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    await Role.setRolePermissions(roleId, permissionIds);
    
    await AuditLog.log(req.user.id, 'role_permissions_updated', 'role', roleId, { permissionIds }, req);

    const permissions = await Role.getRolePermissions(roleId);
    res.json({ role, permissions });
  } catch (error) {
    await AuditLog.log(req.user.id, 'role_permissions_updated', 'role', req.params.id, req.body, req, 'failure', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ PERMISSION MANAGEMENT ============

// Get all permissions
router.get('/permissions', checkPermission('role.list'), async (req, res) => {
  try {
    const permissions = await Permission.getAllPermissions();
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get permissions by category
router.get('/permissions/category/:category', checkPermission('role.list'), async (req, res) => {
  try {
    const permissions = await Permission.getPermissionsByCategory(req.params.category);
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user permissions
router.get('/users/:userId/permissions', async (req, res) => {
  try {
    const userId = req.params.userId;
    const requestingUserId = req.user.id;

    // Users can view their own permissions; admins can view others
    if (userId != requestingUserId && req.user.role !== 'super_admin') {
      const hasPermission = await Permission.hasPermission(requestingUserId, 'user.view');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Permission denied' });
      }
    }

    const permissions = await Permission.getUserPermissions(userId, req.user.school_id);
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user roles
router.get('/users/:userId/roles', async (req, res) => {
  try {
    const userId = req.params.userId;
    const requestingUserId = req.user.id;

    // Users can view their own roles; admins can view others
    if (userId != requestingUserId && req.user.role !== 'super_admin') {
      const hasPermission = await Permission.hasPermission(requestingUserId, 'user.view');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Permission denied' });
      }
    }

    const roles = await User.getUserRoles(userId);
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign role to user (Super Admin or School Admin)
router.post('/users/:userId/roles', checkPermission('role.assign'), async (req, res) => {
  try {
    const { roleId, schoolId } = req.body;
    const userId = req.params.userId;

    if (!roleId) {
      return res.status(400).json({ error: 'roleId is required' });
    }

    const role = await Role.getRoleById(roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // School admins can only assign to their school
    if (req.user.role !== 'super_admin' && schoolId && schoolId !== req.user.school_id) {
      return res.status(403).json({ error: 'Can only assign roles in your school' });
    }

    await User.assignRole(userId, roleId, schoolId);
    
    await AuditLog.log(req.user.id, 'role_assigned', 'user', userId, { roleId, schoolId }, req);

    res.status(201).json({ message: 'Role assigned successfully' });
  } catch (error) {
    await AuditLog.log(req.user.id, 'role_assigned', 'user', req.params.userId, req.body, req, 'failure', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Remove role from user
router.delete('/users/:userId/roles/:roleId', checkPermission('role.assign'), async (req, res) => {
  try {
    const { userId, roleId } = req.params;
    const { schoolId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // School admins can only remove from their school
    if (req.user.role !== 'super_admin' && schoolId && schoolId !== req.user.school_id) {
      return res.status(403).json({ error: 'Can only remove roles in your school' });
    }

    await User.removeRole(userId, roleId, schoolId);
    
    await AuditLog.log(req.user.id, 'role_removed', 'user', userId, { roleId, schoolId }, req);

    res.json({ message: 'Role removed successfully' });
  } catch (error) {
    await AuditLog.log(req.user.id, 'role_removed', 'user', req.params.userId, { roleId: req.params.roleId }, req, 'failure', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ AUDIT LOGS ============

// Get audit logs
router.get('/audit-logs', checkPermission('role.list'), async (req, res) => {
  try {
    const { userId, action, entityType, entityId, status, limit = 100, offset = 0 } = req.query;

    const filters = {
      userId: userId ? parseInt(userId) : null,
      action,
      entityType,
      entityId: entityId ? parseInt(entityId) : null,
      status
    };

    const { logs, total } = await AuditLog.getAuditLogs(filters, parseInt(limit), parseInt(offset));

    res.json({ logs, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get action statistics
router.get('/audit-logs/stats/actions', checkPermission('role.list'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const stats = await AuditLog.getActionStats(startDate, endDate);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user activity statistics
router.get('/audit-logs/stats/users', checkPermission('role.list'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const stats = await AuditLog.getUserActivityStats(startDate, endDate);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
