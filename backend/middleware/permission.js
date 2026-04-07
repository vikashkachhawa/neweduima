import Permission from '../models/Permission.js';
import AuditLog from '../models/AuditLog.js';

// Check if user has a specific permission
export const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const schoolId = req.user?.school_id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const hasPermission = await Permission.hasPermission(userId, requiredPermission, schoolId);

      if (!hasPermission) {
        await AuditLog.log(userId, 'permission_check_failed', 'permission', requiredPermission, null, req, 'failure', `Missing permission: ${requiredPermission}`);
        return res.status(403).json({ error: 'Permission denied' });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Check if user has any of the specified permissions
export const checkAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const schoolId = req.user?.school_id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const hasPermission = await Permission.hasAnyPermission(userId, permissions, schoolId);

      if (!hasPermission) {
        await AuditLog.log(userId, 'permission_check_failed', 'permission', null, { required: permissions }, req, 'failure', `Missing any of permissions: ${permissions.join(', ')}`);
        return res.status(403).json({ error: 'Permission denied' });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Check if user has all of the specified permissions
export const checkAllPermissions = (permissions) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const schoolId = req.user?.school_id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const hasPermission = await Permission.hasAllPermissions(userId, permissions, schoolId);

      if (!hasPermission) {
        await AuditLog.log(userId, 'permission_check_failed', 'permission', null, { required: permissions }, req, 'failure', `Missing all permissions: ${permissions.join(', ')}`);
        return res.status(403).json({ error: 'Permission denied' });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Super admin only
export const checkSuperAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      console.log('checkSuperAdmin: No user ID');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('checkSuperAdmin: User role:', userRole);

    // Check if user has super_admin role directly
    if (userRole === 'super_admin') {
      return next();
    }

    console.log('checkSuperAdmin: Access denied for role:', userRole);
    await AuditLog.log(userId, 'super_admin_access_denied', 'access', null, null, req, 'failure', 'Not a super admin');
    return res.status(403).json({ error: 'Super admin access required' });
  } catch (error) {
    console.error('Super admin check error:', error);
    res.status(500).json({ error: 'Access check failed' });
  }
};

// School admin check - ensures user can only access their own school
export const checkSchoolAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const userSchoolId = req.user?.school_id;
    const requestedSchoolId = req.params.schoolId ? parseInt(req.params.schoolId) : req.body?.school_id;

    if (!userId || !userSchoolId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Super admins can access any school
    const isSuperAdmin = req.user?.role === 'super_admin' || await Permission.hasPermission(userId, 'school.list');
    if (isSuperAdmin) {
      return next();
    }

    // School admins can only access their own school
    if (requestedSchoolId && requestedSchoolId !== userSchoolId) {
      await AuditLog.log(userId, 'school_access_denied', 'school', requestedSchoolId, null, req, 'failure', `Attempted to access school ${requestedSchoolId} but user belongs to school ${userSchoolId}`);
      return res.status(403).json({ error: 'Cannot access other schools' });
    }

    next();
  } catch (error) {
    console.error('School admin check error:', error);
    res.status(500).json({ error: 'Access check failed' });
  }
};

export default {
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  checkSuperAdmin,
  checkSchoolAdmin
};
