# RBAC Quick Start Guide

## 📦 Files Created/Modified

### New Files
- `backend/models/Role.js` - Role management model
- `backend/models/Permission.js` - Permission management model
- `backend/models/AuditLog.js` - Audit logging model
- `backend/middleware/permission.js` - Permission checking middleware
- `backend/routes/rbac.js` - RBAC API routes
- `backend/database/migrations/2025-12-27-add-rbac-system.sql` - Database migration
- `frontend/src/contexts/PermissionContext.jsx` - Global permission state
- `frontend/src/services/rbac.js` - RBAC API service
- `frontend/src/pages/RoleManagement.jsx` - Role management UI
- `RBAC_IMPLEMENTATION.md` - Complete documentation
- `RBAC_SETUP.md` - Setup and testing guide

### Modified Files
- `backend/server.js` - Added RBAC routes
- `backend/controllers/superAdminController.js` - Added audit logging
- `backend/models/User.js` - Added role management methods
- `frontend/src/App.jsx` - Added PermissionProvider, RoleManagement route
- `frontend/src/components/Sidebar.jsx` - Dynamic permission-based menu

## 🚀 5-Minute Setup

### Step 1: Apply Database Migration (1 min)
```bash
# Using phpMyAdmin or CLI
mysql -u root -p eduima < backend/database/migrations/2025-12-27-add-rbac-system.sql
```

### Step 2: Assign Roles to Users (1 min)
```sql
-- Assign Super Admin role to user 1
INSERT INTO user_roles (user_id, role_id, school_id) 
VALUES (1, 1, NULL);

-- Assign School Admin role to user 2 for school 1
INSERT INTO user_roles (user_id, role_id, school_id) 
VALUES (2, 2, 1);

-- Assign Faculty role to user 3 for school 1
INSERT INTO user_roles (user_id, role_id, school_id) 
VALUES (3, 3, 1);

-- Assign Student role to user 4 for school 1
INSERT INTO user_roles (user_id, role_id, school_id) 
VALUES (4, 4, 1);
```

### Step 3: Start Servers (1 min)
```bash
# Terminal 1 - Backend
cd backend && npm start
# Should see: 🚀 Server running on port 5000

# Terminal 2 - Frontend
cd frontend && npm run dev
# Should see: Local: http://localhost:5173
```

### Step 4: Test RBAC (1 min)
1. Open http://localhost:5173
2. Login as super admin
3. Click "Roles & Permissions" in sidebar
4. View roles, create custom role, manage permissions

### Step 5: View Audit Logs (1 min)
1. In Role Management page, click "Audit Logs" tab
2. See all actions performed in system
3. Filter by action, user, or entity type

## 🧪 Quick Tests

### Test Permission Check
```bash
# This should work (has role.list permission)
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/rbac/roles

# This should return 403 (no permission for users without role.list)
curl -H "Authorization: Bearer <user-token-without-permission>" \
  http://localhost:5000/api/rbac/roles
```

### Test Audit Logging
```bash
# View all audit logs
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/rbac/audit-logs

# View specific action logs
curl -H "Authorization: Bearer <token>" \
  "http://localhost:5000/api/rbac/audit-logs?action=school_suspended"

# Get statistics
curl -H "Authorization: Bearer <token>" \
  "http://localhost:5000/api/rbac/audit-logs/stats/actions?startDate=2025-12-01&endDate=2025-12-31"
```

### Test Frontend Permission Gate
```jsx
import { PermissionGate } from '../contexts/PermissionContext';

<PermissionGate permission="school.delete">
  <button>Delete School</button>
</PermissionGate>
```

## 📋 Common Tasks

### Create Custom Role
```javascript
// Via API
POST /api/rbac/roles
{
  "name": "Department Head",
  "description": "Manages department and its students",
  "scope": "school"
}

// Returns: { id: 5, name: "Department Head", ... }
```

### Assign Permissions to Role
```javascript
// Get all permissions first
GET /api/rbac/permissions

// Assign selected permissions
POST /api/rbac/roles/5/permissions
{
  "permissionIds": [10, 11, 12, 13, 14]
}
```

### Assign Role to User
```javascript
// Assign School Admin role to user 5
POST /api/rbac/users/5/roles
{
  "roleId": 2,
  "schoolId": 1
}
```

### Check User Permissions
```javascript
// Get user's roles
GET /api/rbac/users/5/roles

// Get user's permissions
GET /api/rbac/users/5/permissions
```

### Query Audit Logs
```javascript
// All logs
GET /api/rbac/audit-logs

// Specific action
GET /api/rbac/audit-logs?action=school_suspended&limit=50

// By user
GET /api/rbac/audit-logs?userId=1

// Date range with entity filter
GET /api/rbac/audit-logs?entityType=school&entityId=5

// With pagination
GET /api/rbac/audit-logs?limit=20&offset=40
```

## 🔍 Debugging Tips

### User Can't Access Feature
1. Check if user has role: `GET /api/rbac/users/{userId}/roles`
2. Check role permissions: `GET /api/rbac/roles/{roleId}`
3. Check audit log for denials: `GET /api/rbac/audit-logs?action=permission_check_failed`

### Permission Not Working in UI
1. Verify frontend permission check: `usePermissions()` hook
2. Check if permission exists: `GET /api/rbac/permissions`
3. Browser console for errors
4. Reload page to refresh permission cache

### API Returning 403
1. Check authentication token is valid
2. Verify permission is spelled correctly
3. Check permission is assigned to role
4. Verify role is assigned to user
5. Check audit log for specific denial reason

### Database Migration Failed
1. Check MySQL version (5.7+): `SELECT VERSION();`
2. Check user has CREATE TABLE permission
3. Check for conflicting table names
4. Review error message in MIGRATIONS.md file

## 📊 Default Roles Quick Reference

### Super Admin
- All permissions
- Manage everything system-wide
- Access: Platform-level

### School Admin
- User management (in own school)
- Class management
- Grading, announcements
- Reports (school-level)
- Access: School-level

### Faculty
- View own classes
- Submit grades
- Manage attendance
- Create announcements
- Access: School-level

### Student
- View own grades
- View announcements
- View class information
- Access: School-level

## 🎯 Next Actions

1. **Apply Migration**: Run SQL migration file
2. **Assign Roles**: Add user_roles entries to existing users
3. **Start Servers**: Run backend and frontend
4. **Test Access**: Login and verify permission gates work
5. **Review Logs**: Check audit logs for all actions

## 📚 Additional Resources

- Full documentation: `RBAC_IMPLEMENTATION.md`
- Setup guide: `RBAC_SETUP.md`
- API reference: See `backend/routes/rbac.js`
- Database schema: `backend/database/migrations/2025-12-27-add-rbac-system.sql`

## ⚠️ Important Notes

1. **Default Roles**: Cannot be deleted, only custom roles can be deleted
2. **Cascade Deletes**: Deleting a role removes all role_permissions entries
3. **School Scope**: School admins can only see/manage their own school users
4. **Audit Trail**: Cannot be deleted (append-only)
5. **Permission Names**: Case-sensitive, use dot notation (e.g., `user.list`)

## 🆘 Support

For issues:
1. Check audit logs: `GET /api/rbac/audit-logs`
2. Review error messages carefully
3. Verify all files were created correctly
4. Check database migration was applied
5. Ensure roles are assigned to users

Good luck! 🎉
