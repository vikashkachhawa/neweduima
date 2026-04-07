import { api } from './index.js';

export const rbacService = {
  // ROLE MANAGEMENT
  getRoles: () => api.get('/rbac/roles'),
  getRoleById: (id) => api.get(`/rbac/roles/${id}`),
  createRole: (data) => api.post('/rbac/roles', data),
  updateRole: (id, data) => api.put(`/rbac/roles/${id}`, data),
  deleteRole: (id) => api.delete(`/rbac/roles/${id}`),
  setRolePermissions: (roleId, permissionIds) => 
    api.post(`/rbac/roles/${roleId}/permissions`, { permissionIds }),

  // PERMISSION MANAGEMENT
  getPermissions: () => api.get('/rbac/permissions'),
  getPermissionsByCategory: (category) => 
    api.get(`/rbac/permissions/category/${category}`),

  // USER ROLES
  getUserRoles: (userId) => api.get(`/rbac/users/${userId}/roles`),
  getUserPermissions: (userId) => api.get(`/rbac/users/${userId}/permissions`),
  assignRole: (userId, roleId, schoolId = null) => 
    api.post(`/rbac/users/${userId}/roles`, { roleId, schoolId }),
  removeRole: (userId, roleId, schoolId = null) => 
    api.delete(`/rbac/users/${userId}/roles/${roleId}`, { data: { schoolId } }),

  // AUDIT LOGS
  getAuditLogs: (filters = {}, limit = 100, offset = 0) => 
    api.get('/rbac/audit-logs', { params: { ...filters, limit, offset } }),
  getActionStats: (startDate, endDate) => 
    api.get('/rbac/audit-logs/stats/actions', { params: { startDate, endDate } }),
  getUserActivityStats: (startDate, endDate) => 
    api.get('/rbac/audit-logs/stats/users', { params: { startDate, endDate } })
};
