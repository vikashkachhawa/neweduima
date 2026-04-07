import React, { createContext, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { rbacService } from '../services/rbac';

const PermissionContext = createContext(null);

export const PermissionProvider = ({ children }) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = React.useState([]);
  const [roles, setRoles] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  // Load user permissions on mount
  React.useEffect(() => {
    if (user?.id) {
      loadPermissions();
    }
  }, [user?.id]);

  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const [permissionsRes, rolesRes] = await Promise.all([
        rbacService.getUserPermissions(user.id),
        rbacService.getUserRoles(user.id)
      ]);
      setPermissions(permissionsRes.data);
      setRoles(rolesRes.data);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Check if user has a specific permission
  const hasPermission = useCallback((permissionName) => {
    return permissions.some(p => p.name === permissionName);
  }, [permissions]);

  // Check if user has any of the specified permissions
  const hasAnyPermission = useCallback((permissionNames) => {
    if (!Array.isArray(permissionNames)) {
      permissionNames = [permissionNames];
    }
    return permissionNames.some(name => permissions.some(p => p.name === name));
  }, [permissions]);

  // Check if user has all specified permissions
  const hasAllPermissions = useCallback((permissionNames) => {
    if (!Array.isArray(permissionNames)) {
      permissionNames = [permissionNames];
    }
    return permissionNames.every(name => permissions.some(p => p.name === name));
  }, [permissions]);

  // Check if user has a specific role
  const hasRole = useCallback((roleName) => {
    return roles.some(r => r.name === roleName);
  }, [roles]);

  // Check if user has any of the specified roles
  const hasAnyRole = useCallback((roleNames) => {
    if (!Array.isArray(roleNames)) {
      roleNames = [roleNames];
    }
    return roleNames.some(name => roles.some(r => r.name === name));
  }, [roles]);

  // Get user's permission names
  const getPermissionNames = useCallback(() => {
    return permissions.map(p => p.name);
  }, [permissions]);

  // Get user's role names
  const getRoleNames = useCallback(() => {
    return roles.map(r => r.name);
  }, [roles]);

  const value = {
    permissions,
    roles,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    getPermissionNames,
    getRoleNames,
    reloadPermissions: loadPermissions
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionProvider');
  }
  return context;
};

// Component to conditionally render based on permissions
export const PermissionGate = ({ permission, children, fallback = null }) => {
  const { hasPermission, loading } = usePermissions();

  if (loading) return null;
  if (!hasPermission(permission)) return fallback;
  return children;
};

// Component to conditionally render based on roles
export const RoleGate = ({ role, children, fallback = null }) => {
  const { hasRole, loading } = usePermissions();

  if (loading) return null;
  if (!hasRole(role)) return fallback;
  return children;
};
