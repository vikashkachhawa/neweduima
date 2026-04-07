# RBAC (Role-Based Access Control) System Implementation Guide

## Overview

A complete role-based access control system has been integrated into EduIma, enabling granular permission management, audit logging, and dynamic access control based on user roles and permissions.

## Architecture

### Database Schema

#### Tables
- **roles**: Stores role definitions (Super Admin, School Admin, Faculty, Student + custom roles)
- **permissions**: Stores individual permissions organized by category
- **role_permissions**: Junction table mapping roles to permissions
- **user_roles**: Junction table assigning roles to users with scope (school-level or platform-level)
- **audit_logs**: Tracks all critical actions for compliance and debugging

### Components

#### Backend

**Models:**
- `Role.js`: Role management, permission assignment
- `Permission.js`: Permission checking, user permission retrieval
- `AuditLog.js`: Audit event logging and querying
- `User.js`: Extended with role management methods

**Middleware:**
- `permission.js`: Middleware functions for permission enforcement
  - `checkPermission(permissionName)`: Enforce single permission
  - `checkAnyPermission(permissionNames)`: Enforce any of multiple permissions
  - `checkAllPermissions(permissionNames)`: Enforce all permissions
  - `checkSuperAdmin()`: Super admin only access
  - `checkSchoolAdmin()`: School-scoped access control

**Controllers:**
- `superAdminController.js`: Updated with audit logging on critical actions
  - School status changes (suspend/delete)
  - User password resets
  - User status toggles

**Routes:**
- `rbac.js`: Complete RBAC API endpoints
  - Role CRUD operations
  - Permission management
  - User role assignment
  - Audit log retrieval and statistics

#### Frontend

**Contexts:**
- `PermissionContext.jsx`: Global permission state management
  - `usePermissions()` hook for checking permissions/roles
  - `PermissionGate` component for conditional rendering
  - `RoleGate` component for role-based rendering

**Services:**
- `rbac.js`: API service for all RBAC endpoints

**Pages:**
- `RoleManagement.jsx`: Super admin interface for managing roles and viewing audit logs

**Components:**
- Updated `Sidebar.jsx`: Dynamic menu based on permissions
  - Shows/hides menu items based on user permissions
  - Fallback to role-based display for backward compatibility

## Default Roles

### Super Admin
- **Scope**: Platform
- **Permissions**: All permissions
- **Responsibilities**: 
  - Manage schools and users
  - Manage roles and permissions
  - View audit logs and analytics
  - System configuration

### School Admin
- **Scope**: School
- **Permissions**: User, class, grading, announcements, and reports management
- **Responsibilities**: 
  - Manage faculty and students
  - Configure classes
  - View school-level reports

### Faculty
- **Scope**: School
- **Permissions**: Class management, grading, announcements
- **Responsibilities**: 
  - Manage classes and attendance
  - Submit grades
  - Create announcements

### Student
- **Scope**: School
- **Permissions**: View own grades, view announcements, view classes
- **Responsibilities**: 
  - View grades and class information
  - View announcements

## Permission Categories

### user_management
- `user.list`: View all users
- `user.view`: View user details
- `user.create`: Create new user
- `user.edit`: Edit user information
- `user.delete`: Delete user
- `user.reset_password`: Reset user password
- `user.toggle_status`: Activate/deactivate user

### school_management
- `school.list`: View all schools
- `school.view`: View school details
- `school.create`: Create new school
- `school.edit`: Edit school information
- `school.delete`: Delete school
- `school.suspend`: Suspend school
- `school.activate`: Activate school
- `school.clone`: Clone school

### class_management
- `class.list`: View classes
- `class.view`: View class details
- `class.create`: Create class
- `class.edit`: Edit class
- `class.delete`: Delete class
- `class.assign_students`: Assign students to class

### grading
- `grade.list`: View grades
- `grade.view_own`: View own grades
- `grade.submit`: Submit grades
- `grade.edit`: Edit grades
- `grade.comment`: Add grade comments

### announcements
- `announcement.list`: View announcements
- `announcement.create`: Create announcement
- `announcement.edit`: Edit announcement
- `announcement.delete`: Delete announcement

### role_management
- `role.list`: View roles
- `role.view`: View role details
- `role.create`: Create custom role
- `role.edit`: Edit role
- `role.delete`: Delete role
- `role.assign`: Assign roles to users

### reports
- `report.view`: View reports
- `report.analytics`: View analytics
- `report.export`: Export reports

## Implementation Examples

### Backend: Protecting Routes

```javascript
// Single permission check
router.delete('/schools/:id', checkPermission('school.delete'), async (req, res) => {
  // Only users with 'school.delete' permission can access
});

// Multiple permissions (any)
router.get('/reports', checkAnyPermission(['report.view', 'report.analytics']), async (req, res) => {
  // Users with either permission can access
});

// Multiple permissions (all)
router.post('/grades', checkAllPermissions(['grade.submit', 'grade.edit']), async (req, res) => {
  // Users must have both permissions
});

// Super admin only
router.post('/system-config', checkSuperAdmin, async (req, res) => {
  // Only super admins can access
});
```

### Backend: Audit Logging

```javascript
import AuditLog from '../models/AuditLog.js';

// Log successful action
await AuditLog.log(
  req.user.id,
  'school_suspended',
  'school',
  schoolId,
  { old_status: 'active', new_status: 'suspended' },
  req,
  'success',
  'Non-payment'
);

// Log failed action
await AuditLog.log(
  req.user.id,
  'user_deletion_attempted',
  'user',
  userId,
  null,
  req,
  'failure',
  'Permission denied'
);
```

### Frontend: Checking Permissions

```javascript
import { usePermissions } from '../contexts/PermissionContext';

function MyComponent() {
  const { hasPermission, hasRole, loading } = usePermissions();

  if (loading) return <div>Loading...</div>;

  // Check single permission
  if (hasPermission('school.delete')) {
    return <button>Delete School</button>;
  }

  // Check multiple permissions
  if (hasPermission('school.list') && hasPermission('school.view')) {
    return <SchoolsList />;
  }

  // Check role
  if (hasRole('Super Admin')) {
    return <SuperAdminPanel />;
  }

  return <div>No access</div>;
}
```

### Frontend: Conditional Rendering

```javascript
import { PermissionGate, RoleGate } from '../contexts/PermissionContext';

function Dashboard() {
  return (
    <div>
      <PermissionGate permission="school.list">
        <SchoolsSection />
      </PermissionGate>

      <PermissionGate permission="role.list">
        <RoleManagementSection />
      </PermissionGate>

      <RoleGate role="Super Admin">
        <SystemSettingsSection />
      </RoleGate>
    </div>
  );
}
```

## API Endpoints

### Role Management

**GET /api/rbac/roles**
- Get all roles
- Required permission: `role.list`

**GET /api/rbac/roles/:id**
- Get role with permissions
- Required permission: `role.view`

**POST /api/rbac/roles**
- Create new custom role
- Required: Super Admin only

**PUT /api/rbac/roles/:id**
- Update role
- Required: Super Admin only

**DELETE /api/rbac/roles/:id**
- Delete custom role
- Required: Super Admin only

**POST /api/rbac/roles/:id/permissions**
- Set permissions for role
- Required: Super Admin only
- Body: `{ permissionIds: [1, 2, 3] }`

### Permission Management

**GET /api/rbac/permissions**
- Get all permissions
- Required permission: `role.list`

**GET /api/rbac/permissions/category/:category**
- Get permissions by category
- Required permission: `role.list`

### User Roles

**GET /api/rbac/users/:userId/roles**
- Get user roles
- Required: Self or `user.view` permission

**GET /api/rbac/users/:userId/permissions**
- Get user permissions
- Required: Self or `user.view` permission

**POST /api/rbac/users/:userId/roles**
- Assign role to user
- Required permission: `role.assign`
- Body: `{ roleId: 1, schoolId: null }`

**DELETE /api/rbac/users/:userId/roles/:roleId**
- Remove role from user
- Required permission: `role.assign`

### Audit Logs

**GET /api/rbac/audit-logs**
- Get audit logs with filters
- Required permission: `role.list`
- Query params: `userId`, `action`, `entityType`, `entityId`, `status`, `limit`, `offset`

**GET /api/rbac/audit-logs/stats/actions**
- Get action statistics
- Required permission: `role.list`
- Query params: `startDate`, `endDate`

**GET /api/rbac/audit-logs/stats/users**
- Get user activity statistics
- Required permission: `role.list`
- Query params: `startDate`, `endDate`

## Migration & Setup

### 1. Apply Database Migration

Run the migration file to create all RBAC tables:
```sql
source backend/database/migrations/2025-12-27-add-rbac-system.sql
```

### 2. Initialize User Roles

Assign roles to existing users:
```javascript
import User from './models/User.js';
import Role from './models/Role.js';

// Get or create role
const superAdminRole = await Role.getRoleByName('Super Admin');

// Assign to user
await User.assignRole(userId, superAdminRole.id, null);
```

### 3. Environment Verification

Ensure both servers are running:
```bash
# Backend
npm start  # Port 5000

# Frontend
npm run dev  # Port 5173+
```

## Audit Logging

All critical actions are automatically logged:

- **School Actions**: suspend, delete, activate, create, update
- **User Actions**: create, edit, delete, password_reset, activate, deactivate
- **Role Actions**: create, update, delete, assign, remove, permissions_update
- **Access Denials**: failed permission checks, unauthorized access attempts

### Log Structure
```javascript
{
  id: 1,
  user_id: 5,
  action: 'school_suspended',
  entity_type: 'school',
  entity_id: 10,
  changes: { old_status: 'active', new_status: 'suspended' },
  ip_address: '192.168.1.1',
  user_agent: 'Mozilla/5.0...',
  status: 'success',
  reason: 'Non-payment',
  created_at: '2025-12-27T10:30:00Z'
}
```

## Security Considerations

1. **Permission Checks**: Always verify permissions at both middleware (backend) and component (frontend) levels
2. **Scope Validation**: School-scoped roles cannot access other schools' resources
3. **Audit Trail**: All critical actions are logged with user, timestamp, IP, and reason
4. **Password Resets**: Trigger `must_change_password` flag for security
5. **Session Invalidation**: Sessions are invalidated when school status changes
6. **Cascading Effects**: Suspending a school automatically deactivates all users

## Best Practices

1. **Use Least Privilege**: Assign minimum necessary permissions
2. **Regular Audits**: Review audit logs monthly for suspicious activities
3. **Custom Roles**: Create custom roles for specific use cases rather than using defaults
4. **Permission Categories**: Group related permissions for easier management
5. **Testing**: Test permission checks with different roles before deployment
6. **Documentation**: Keep permission matrix updated as new features are added

## Troubleshooting

### User can't access feature they should

1. Check if user has required permission: `GET /api/rbac/users/:userId/permissions`
2. Verify role is assigned: `GET /api/rbac/users/:userId/roles`
3. Check role permissions: `GET /api/rbac/roles/:roleId`
4. Reload browser to refresh permission cache

### Permission check failing in API

1. Verify middleware is applied to route
2. Check user token contains `id` and optionally `school_id`
3. Review audit logs for denial reason: `GET /api/rbac/audit-logs?action=permission_check_failed`
4. Ensure permission name matches exactly

### Database migration failed

1. Check MySQL version (5.7+)
2. Verify user has CREATE TABLE permissions
3. Check for existing tables and use `IF NOT EXISTS` clauses
4. Review error in `backend/database/MIGRATIONS.md`

## Future Enhancements

1. **Dynamic Permission Creation**: Allow Super Admins to create custom permissions
2. **Role Templates**: Pre-configured role templates for common scenarios
3. **Time-based Permissions**: Temporary permission elevation
4. **Delegation**: Allow admins to delegate specific permissions
5. **Approval Workflows**: Require approval for sensitive operations
6. **Real-time Alerts**: Notify on suspicious audit events
