# Password Reset System Implementation

## Overview
A comprehensive role-based password reset system has been implemented with the following features:

- **Super Admin**: Reset password for any user across all schools
- **School Admin**: Reset password for faculty and students in their school only
- **Faculty**: Reset password for students in their classes only
- **First Login**: Users with temporary passwords are forced to change password before accessing the system

## Backend Implementation

### Database Changes
**File**: `backend/migrations/add-password-reset-fields.js`

Added columns to `users` table:
- `temporary_password` (VARCHAR 255, NULL) - Stores the temporary password hash
- `password_reset_at` (TIMESTAMP) - When the password was reset
- `password_reset_expires_at` (TIMESTAMP) - When the temporary password expires (24 hours)
- `is_temporary_password` (BOOLEAN) - Flag to indicate temporary password
- `must_change_password` (BOOLEAN) - Flag to force password change on next login

### API Routes
**File**: `backend/routes/passwordResetRoutes.js`

**Base Path**: `/api/password-reset`

#### Super Admin Routes
- `POST /admin/reset-password/:userId` - Reset password for any user
- `GET /admin/users` - Get all users across all schools

#### School Admin Routes
- `POST /school-admin/reset-password/:userId` - Reset password for users in their school
- `GET /school-admin/users` - Get users in their school

#### Faculty Routes
- `POST /faculty/reset-student-password/:studentId` - Reset password for students in their classes
- `GET /faculty/students` - Get list of students in their classes

#### Auth Routes
- `POST /change-password-first-login` - Change password after temporary password login

### Controller
**File**: `backend/controllers/passwordResetController.js`

Key functions:
- `generateTemporaryPassword()` - Generates random 12-character password
- `superAdminResetPassword()` - Super admin password reset
- `schoolAdminResetPassword()` - School admin password reset (with school verification)
- `facultyResetPassword()` - Faculty password reset (with class enrollment verification)
- `changePasswordOnFirstLogin()` - Force password change for temporary passwords
- `getAllUsers()` - Get all users (Super Admin)
- `getSchoolUsers()` - Get school users (School Admin)
- `getFacultyStudents()` - Get faculty's students (Faculty)

## Frontend Implementation

### Services
**File**: `frontend/src/services/passwordReset.js`

Provides axios API client with methods:
- `superAdminResetPassword(userId)`
- `schoolAdminResetPassword(userId)`
- `facultyResetPassword(studentId)`
- `changePasswordOnFirstLogin(newPassword, confirmPassword)`
- `getAllUsers()`
- `getSchoolUsers()`
- `getFacultyStudents()`

### Components

#### 1. Change Password on First Login Page
**File**: `frontend/src/pages/ChangePasswordOnFirstLogin.jsx`

Features:
- Forces password change when `must_change_password` flag is true
- Password validation (minimum 8 characters)
- Shows password requirements
- Redirects to dashboard after successful change
- Auto-redirects if user doesn't need to change password

#### 2. Super Admin Password Management
**File**: `frontend/src/pages/SuperAdminPasswordManagement.jsx`

Features:
- View all users in the system
- Search users by name or email
- Reset password with single click
- Display temporary password in dialog
- Copy password to clipboard
- Shows user status (Active, Temporary Password, Must Change)

## Usage Flow

### For Super Admin
1. Navigate to `/super-admin/password-management`
2. Search for user
3. Click "Reset" button
4. Confirm reset
5. Copy temporary password
6. Share with user

### For School Admin
Similar to super admin, but:
1. Navigate to `/school-admin/password-management`
2. Only sees users in their school
3. Can only reset faculty and student passwords

### For Faculty
1. Navigate to `/faculty/password-management`
2. View list of students in their classes
3. Click "Reset" for a student
4. Copy temporary password
5. Share with student

### For User (with Temporary Password)
1. Login with temporary password and email
2. Automatically redirected to `ChangePasswordOnFirstLogin` page
3. Create new password (minimum 8 characters)
4. Password validated and updated
5. Redirected to dashboard
6. `must_change_password` flag cleared
7. `is_temporary_password` flag cleared

## Security Features

1. **Role-Based Access Control**
   - Each role can only reset passwords for appropriate users
   - School admins verified against school_id
   - Faculty verified against class enrollment

2. **Temporary Password Handling**
   - Random 12-character password generated
   - Not stored in plain text (bcrypt hashed)
   - Expires after 24 hours
   - Marked with flags for first-login enforcement

3. **Password Validation**
   - Minimum 8 characters required
   - Passwords must match on first change
   - Old password can be anything (temporary)

4. **Forced Password Change**
   - `must_change_password` flag prevents normal login
   - Middleware should redirect to change password page
   - Cannot bypass without changing password

## Integration Required

### 1. Login Middleware
Update authentication flow to check `must_change_password`:

```javascript
if (user.must_change_password) {
    return res.json({
        success: true,
        message: 'Must change password',
        mustChangePassword: true,
        token: token // For accessing the change password endpoint
    });
}
```

### 2. Frontend Routes
Add routes for new pages:

```javascript
<Route path="/change-password" element={<ChangePasswordOnFirstLogin />} />
<Route path="/super-admin/password-management" element={<SuperAdminPasswordManagement />} />
<Route path="/school-admin/password-management" element={<SchoolAdminPasswordManagement />} />
<Route path="/faculty/password-management" element={<FacultyPasswordManagement />} />
```

### 3. Run Migration
Execute the migration to add database fields:

```bash
node backend/migrations/add-password-reset-fields.js
```

## Database Schema

```sql
ALTER TABLE users ADD COLUMN temporary_password VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN password_reset_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN password_reset_expires_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN is_temporary_password BOOLEAN DEFAULT FALSE;
```

## Testing Checklist

- [ ] Super admin can reset any user password
- [ ] School admin can only reset users in their school
- [ ] School admin cannot reset super admin or other school users
- [ ] Faculty can only reset students in their classes
- [ ] Faculty cannot reset students from other classes
- [ ] Temporary password forces password change on login
- [ ] Password validation works (min 8 chars, must match)
- [ ] Users redirected to change password page
- [ ] Successful password change clears flags
- [ ] Password reset displays temporary password for copying
- [ ] 24-hour expiration is enforced

## Next Steps

1. Create `SchoolAdminPasswordManagement` component
2. Create `FacultyPasswordManagement` component
3. Integrate with login flow to enforce password change
4. Add email notifications for password resets
5. Add audit logging for password resets
6. Create admin dashboard widgets showing users needing password change
