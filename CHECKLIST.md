# 📋 Installation & Testing Checklist

## Pre-Installation Checklist

### Required Software
- [ ] Node.js v18+ installed
  - Run: `node --version`
  - Should show v18.0.0 or higher
- [ ] npm installed
  - Run: `npm --version`
  - Should show 9.0.0 or higher
- [ ] XAMPP installed
  - MySQL component available
- [ ] Text editor (VS Code recommended)

---

## Installation Steps

### Step 1: Setup Project
- [ ] Open PowerShell in project directory
- [ ] Run: `.\setup.ps1`
- [ ] Wait for all dependencies to install
- [ ] Check for success messages

### Step 2: Configure Backend
- [ ] Navigate to `backend` folder
- [ ] Copy `.env.example` to `.env` (if not done by setup.ps1)
- [ ] Open `.env` and verify/update:
  ```
  DB_HOST=localhost
  DB_USER=root
  DB_PASSWORD=           # Your MySQL password (blank for default)
  DB_NAME=eduima_db
  JWT_SECRET=eduima_jwt_secret_key_change_this_in_production_2024
  PORT=5000
  FRONTEND_URL=http://localhost:5173
  ```

### Step 3: Configure Frontend
- [ ] Navigate to `frontend` folder
- [ ] Copy `.env.example` to `.env` (if not done by setup.ps1)
- [ ] Open `.env` and verify:
  ```
  VITE_API_URL=http://localhost:5000/api
  ```

### Step 4: Start MySQL
- [ ] Open XAMPP Control Panel
- [ ] Click **Start** next to MySQL
- [ ] Wait for green "Running" status
- [ ] Verify MySQL is running (port 3306)

### Step 5: Create Database
- [ ] Open http://localhost/phpmyadmin
- [ ] Click **New** in left sidebar
- [ ] Database name: `eduima_db`
- [ ] Collation: `utf8mb4_unicode_ci`
- [ ] Click **Create**
- [ ] Verify database appears in left sidebar

### Step 6: Import Schema
- [ ] Select `eduima_db` in phpMyAdmin
- [ ] Click **Import** tab
- [ ] Click **Choose File**
- [ ] Navigate to: `c:\xampp\htdocs\eduima\backend\database\schema.sql`
- [ ] Click **Go**
- [ ] Wait for success message
- [ ] Verify 3 tables created:
  - [ ] schools
  - [ ] users
  - [ ] sessions

### Step 7: Seed Sample Data
- [ ] Open PowerShell in `backend` directory
- [ ] Run: `npm run seed`
- [ ] Wait for success messages
- [ ] Verify output shows:
  - [ ] ✅ Super Admin created
  - [ ] ✅ Demo School created
  - [ ] ✅ School Admin created
  - [ ] ✅ Faculty created
  - [ ] ✅ Student created

### Step 8: Start Application
- [ ] Open PowerShell in project root
- [ ] Run: `.\start.ps1`
- [ ] Wait for two new PowerShell windows to open
- [ ] Backend window shows: "Server running on port 5000"
- [ ] Frontend window shows: "Local: http://localhost:5173"
- [ ] No error messages in either window

---

## Testing Checklist

### Test 1: Access Application
- [ ] Open browser
- [ ] Navigate to: http://localhost:5173
- [ ] Login page loads successfully
- [ ] Theme toggle button visible (moon/sun icon)
- [ ] No console errors (F12 → Console)

### Test 2: Theme Toggle (Before Login)
- [ ] Click theme toggle button
- [ ] Page switches to dark mode
- [ ] Click again
- [ ] Page switches to light mode
- [ ] Refresh page
- [ ] Theme persists (same mode as before refresh)

### Test 3: Super Admin Login
- [ ] Enter email: `superadmin@eduima.com`
- [ ] Enter password: `SuperAdmin@123`
- [ ] Click **Login**
- [ ] Redirects to dashboard
- [ ] URL is: http://localhost:5173/dashboard
- [ ] Sidebar visible on left
- [ ] "Super Admin" role shown in sidebar
- [ ] Dashboard shows 4 stat cards
- [ ] Logout button visible

### Test 4: Super Admin Navigation
- [ ] Click **Dashboard** in sidebar
  - [ ] Stats display
  - [ ] Welcome message shows
- [ ] Click **Schools** in sidebar
  - [ ] School list displays
  - [ ] "Demo Public School" visible
  - [ ] "Add School" button visible
- [ ] Click **Users** in sidebar
  - [ ] User table displays
  - [ ] At least 4 users visible
  - [ ] Action buttons visible

### Test 5: Theme Toggle (After Login)
- [ ] Click theme toggle in sidebar
- [ ] Entire app switches theme
- [ ] Sidebar updates
- [ ] Content area updates
- [ ] Click different navigation items
- [ ] Theme persists across pages
- [ ] Refresh browser
- [ ] Theme still persists

### Test 6: Create New School
- [ ] Navigate to **Schools** page
- [ ] Click **Add School** button
- [ ] Modal opens
- [ ] Fill in form:
  - [ ] School Name: "Test School"
  - [ ] Location: "Delhi"
  - [ ] Email: test@school.com
  - [ ] Phone: +91-1234567890
  - [ ] Address: "Test Address"
  - [ ] Admin First Name: "Test"
  - [ ] Admin Last Name: "Admin"
  - [ ] Admin Email: admin@testschool.com
- [ ] Click **Create School**
- [ ] Success modal appears
- [ ] Subdomain shown: "testschool-delhi"
- [ ] Temporary password displayed
- [ ] Copy temporary password
- [ ] Click **Close**
- [ ] New school appears in list

### Test 7: User Management
- [ ] Navigate to **Users** page
- [ ] Find a user (not Super Admin)
- [ ] Click **Reset Password**
- [ ] Confirm dialog appears
- [ ] Click OK
- [ ] Alert shows new temporary password
- [ ] Copy temporary password
- [ ] Click **Deactivate**
- [ ] User status changes to "Inactive"
- [ ] Click **Activate**
- [ ] User status changes to "Active"

### Test 8: Logout & Re-login
- [ ] Click **Logout** button
- [ ] Redirects to login page
- [ ] Try accessing: http://localhost:5173/dashboard
- [ ] Redirects back to login page (protected route)
- [ ] Login again with Super Admin credentials
- [ ] Successfully redirected to dashboard

### Test 9: School Admin Login
- [ ] Logout if logged in
- [ ] Login with:
  - Email: `admin@demopublicschool.com`
  - Password: `Admin@123`
- [ ] Dashboard loads
- [ ] Sidebar shows "School Admin" role
- [ ] Different navigation items visible:
  - [ ] Dashboard
  - [ ] Faculty
  - [ ] Students
  - [ ] Reports
- [ ] Stats show school-specific data
- [ ] Try accessing: http://localhost:5173/schools
- [ ] Redirects to dashboard (not authorized)

### Test 10: Page Refresh Persistence
- [ ] Login as Super Admin
- [ ] Navigate to **Schools** page
- [ ] Note current URL and content
- [ ] Press F5 (refresh)
- [ ] Still on Schools page
- [ ] No redirect to Dashboard
- [ ] User still logged in
- [ ] Theme still same
- [ ] Navigate to **Users**
- [ ] Refresh again
- [ ] Still on Users page

### Test 11: Browser Back/Forward
- [ ] Navigate: Dashboard → Schools → Users
- [ ] Click browser back button
- [ ] Goes to Schools page
- [ ] Click back again
- [ ] Goes to Dashboard
- [ ] Click forward button
- [ ] Goes to Schools
- [ ] State maintained throughout

### Test 12: API Connectivity
- [ ] Open: http://localhost:5000/health
- [ ] Should see JSON response:
  ```json
  {
    "success": true,
    "message": "Server is running",
    "timestamp": "..."
  }
  ```
- [ ] In browser console (F12 → Network tab)
- [ ] Navigate between pages
- [ ] Check API calls are successful (200 status)
- [ ] No 401, 403, or 500 errors

### Test 13: Responsive Design
- [ ] Press F12 to open DevTools
- [ ] Click device toggle (Ctrl+Shift+M)
- [ ] Test different screen sizes:
  - [ ] Mobile (375px) - Sidebar behavior
  - [ ] Tablet (768px) - Layout adjusts
  - [ ] Desktop (1920px) - Full layout
- [ ] All content remains accessible
- [ ] No horizontal scrolling
- [ ] Buttons remain clickable

### Test 14: Error Handling
- [ ] Try logging in with wrong password
  - [ ] Error message displays
  - [ ] Doesn't crash
- [ ] Try creating school with existing name/location
  - [ ] Error message displays
- [ ] Stop backend server
  - [ ] Try logging in
  - [ ] Network error handled gracefully

### Test 15: Multiple Browser Tabs
- [ ] Login in first tab
- [ ] Open new tab
- [ ] Go to: http://localhost:5173
- [ ] Automatically goes to dashboard (already logged in)
- [ ] Logout in first tab
- [ ] Reload second tab
- [ ] Redirects to login (logout propagated)

---

## Verification Checklist

### Database
- [ ] Open phpMyAdmin
- [ ] Select `eduima_db`
- [ ] Check `schools` table
  - [ ] At least 1 school exists
  - [ ] Subdomain is unique
- [ ] Check `users` table
  - [ ] At least 4 users exist
  - [ ] Different roles present
  - [ ] Passwords are hashed
- [ ] Check relationships work
  - [ ] Users linked to schools

### Files Created
- [ ] Backend:
  - [ ] server.js exists
  - [ ] .env exists (not .env.example)
  - [ ] node_modules/ exists
  - [ ] All controllers created
  - [ ] All routes created
- [ ] Frontend:
  - [ ] src/App.jsx exists
  - [ ] .env exists (not .env.example)
  - [ ] node_modules/ exists
  - [ ] All pages created
  - [ ] All components created

### Documentation
- [ ] README.md exists
- [ ] SETUP_GUIDE.md exists
- [ ] QUICKSTART.md exists
- [ ] PROJECT_SUMMARY.md exists
- [ ] ARCHITECTURE.md exists
- [ ] This CHECKLIST.md exists

---

## Common Issues & Solutions

### Issue: "Module not found"
**Solution:**
```powershell
cd backend
Remove-Item node_modules -Recurse -Force
npm install

cd ../frontend
Remove-Item node_modules -Recurse -Force
npm install
```

### Issue: "Database connection failed"
**Solution:**
1. Check MySQL is running in XAMPP
2. Verify credentials in backend/.env
3. Test: `mysql -u root -p -e "SHOW DATABASES;"`

### Issue: "Port 5000 already in use"
**Solution:**
```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Issue: "CORS error"
**Solution:**
1. Check backend/.env has correct FRONTEND_URL
2. Check frontend/.env has correct VITE_API_URL
3. Restart both servers

### Issue: "Theme not persisting"
**Solution:**
1. Clear browser localStorage (F12 → Application → Local Storage)
2. Check browser allows localStorage
3. Try incognito mode

---

## Success Criteria

### ✅ Installation Successful When:
- [ ] No error messages during setup
- [ ] All dependencies installed
- [ ] Database created and seeded
- [ ] Both servers start without errors

### ✅ Application Functional When:
- [ ] Can login with all 4 roles
- [ ] Can navigate between pages
- [ ] Can create schools
- [ ] Can manage users
- [ ] Can reset passwords
- [ ] Theme toggle works
- [ ] State persists on refresh
- [ ] Logout works correctly

### ✅ Production Ready When:
- [ ] All tests pass
- [ ] No console errors
- [ ] No network errors
- [ ] Responsive on all devices
- [ ] All features work as expected
- [ ] Documentation complete

---

## Next Steps After Successful Installation

1. **Explore Features:**
   - Create multiple test schools
   - Test all user roles
   - Customize theme colors

2. **Phase 2 Planning:**
   - Student enrollment
   - Attendance system
   - Grade management
   - Course creation

3. **Deployment Planning:**
   - Domain registration
   - SSL certificates
   - Production database
   - Environment variables

4. **Customization:**
   - Add your branding
   - Modify color scheme
   - Add more features

---

## Support

If any step fails:
1. Check error messages carefully
2. Review SETUP_GUIDE.md
3. Check ARCHITECTURE.md for understanding
4. Verify all prerequisites met
5. Check MySQL is running
6. Check Node.js version

---

**Status:** [ ] All Checks Passed ✅  
**Date Tested:** _______________  
**Tested By:** _______________

---

**Congratulations! 🎉**
Your Eduima School Management System is ready to use!
