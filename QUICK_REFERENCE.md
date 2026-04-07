# 🎯 Quick Reference Card

## 🚀 Quick Start Commands

### Setup (First Time)
```powershell
.\setup.ps1
```

### Start Application
```powershell
.\start.ps1
```

### Manual Start
```powershell
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

---

## 🔗 URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | Main application |
| Backend API | http://localhost:5000 | REST API |
| Health Check | http://localhost:5000/health | Server status |
| phpMyAdmin | http://localhost/phpmyadmin | Database management |

---

## 👤 Default Login Credentials

### Super Admin
```
Email: superadmin@eduima.com
Password: SuperAdmin@123
```

### School Admin (Demo School)
```
Email: admin@demopublicschool.com
Password: Admin@123
```

### Faculty (Demo School)
```
Email: faculty@demopublicschool.com
Password: Faculty@123
```

### Student (Demo School)
```
Email: student@demopublicschool.com
Password: Student@123
```

---

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/login              Login
GET    /api/auth/me                 Get current user
POST   /api/auth/change-password    Change password
POST   /api/auth/logout             Logout
```

### Super Admin
```
GET    /api/super-admin/schools                      Get all schools
POST   /api/super-admin/schools                      Create school
GET    /api/super-admin/schools/:id                  Get school
GET    /api/super-admin/users                        Get all users
POST   /api/super-admin/users                        Create user
POST   /api/super-admin/users/:userId/reset-password Reset password
PATCH  /api/super-admin/users/:userId/toggle-status  Toggle user status
```

### School
```
GET    /api/school/dashboard/stats  Get dashboard statistics
GET    /api/school/users           Get school users
```

---

## 🗄️ Database Info

**Database Name:** `eduima_db`  
**Tables:**
- `schools` - School information
- `users` - All user accounts
- `sessions` - Session tracking

**Seed Data:**
```powershell
cd backend
npm run seed
```

---

## 🎨 Key Features

### ✅ Implemented (Phase 1)
- [x] JWT Authentication
- [x] Dark/Light Mode Toggle
- [x] Role-Based Access Control (4 roles)
- [x] Multi-Tenant Architecture
- [x] School Management (CRUD)
- [x] User Management
- [x] Password Reset
- [x] Subdomain Generation
- [x] Responsive Design
- [x] SPA Navigation
- [x] State Persistence

### 🚧 Planned (Phase 2)
- [ ] Student Enrollment
- [ ] Attendance System
- [ ] Grade Management
- [ ] Course Creation
- [ ] Reports & Analytics
- [ ] Email Notifications

---

## 🛠️ Common Commands

### Backend
```powershell
cd backend
npm install          # Install dependencies
npm run dev          # Start dev server
npm run seed         # Seed database
npm start            # Production start
```

### Frontend
```powershell
cd frontend
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Database
```powershell
# Create database
mysql -u root -p -e "CREATE DATABASE eduima_db;"

# Import schema
mysql -u root -p eduima_db < backend/database/schema.sql

# Access MySQL
mysql -u root -p
```

---

## 🔧 Troubleshooting

### Port Issues
```powershell
# Check port 5000 (backend)
netstat -ano | findstr :5000

# Check port 5173 (frontend)
netstat -ano | findstr :5173

# Kill process
taskkill /PID <PID> /F
```

### Clear Cache
```powershell
# Backend
cd backend
Remove-Item node_modules -Recurse -Force
npm install

# Frontend
cd frontend
Remove-Item node_modules -Recurse -Force
npm install
```

### Reset Database
```powershell
# In MySQL
mysql -u root -p
DROP DATABASE eduima_db;
CREATE DATABASE eduima_db;
USE eduima_db;
SOURCE backend/database/schema.sql;
exit

# Then seed
cd backend
npm run seed
```

---

## 📂 Project Structure

```
eduima/
├── backend/                 # API Server
│   ├── config/             # Database config
│   ├── controllers/        # Business logic
│   ├── middleware/         # Auth, validation
│   ├── models/             # DB models
│   ├── routes/             # API routes
│   └── database/           # Schema & seed
│
├── frontend/               # React App
│   └── src/
│       ├── components/     # UI components
│       ├── contexts/       # State management
│       ├── pages/          # Page components
│       └── services/       # API calls
│
├── setup.ps1              # Setup script
├── start.ps1              # Start script
└── *.md                   # Documentation
```

---

## 🎯 User Roles & Permissions

| Feature | Super Admin | School Admin | Faculty | Student |
|---------|-------------|--------------|---------|---------|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Manage Schools | ✅ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ✅* | ❌ | ❌ |
| Reset Passwords | ✅ | ✅* | ❌ | ❌ |
| View All Schools | ✅ | ❌ | ❌ | ❌ |
| School Stats | ✅ | ✅ | ❌ | ❌ |

*School Admin: Only for their school

---

## 🌐 Environment Variables

### Backend (.env)
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=eduima_db
JWT_SECRET=change-in-production
JWT_EXPIRE=24h
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🔐 Security Checklist

- [ ] Change JWT_SECRET in production
- [ ] Use strong database password
- [ ] Enable HTTPS
- [ ] Implement rate limiting
- [ ] Add input validation
- [ ] Configure CORS properly
- [ ] Regular security updates
- [ ] Use environment-specific configs

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| README.md | Project overview |
| SETUP_GUIDE.md | Detailed setup |
| QUICKSTART.md | Quick start guide |
| PROJECT_SUMMARY.md | Features & status |
| ARCHITECTURE.md | System design |
| CHECKLIST.md | Testing checklist |
| QUICK_REFERENCE.md | This file |

---

## 💡 Tips & Best Practices

1. **Always seed database after schema import**
   ```powershell
   cd backend
   npm run seed
   ```

2. **Check both servers are running**
   - Backend: Console shows "Server running on port 5000"
   - Frontend: Browser opens automatically at localhost:5173

3. **Use F12 (DevTools) for debugging**
   - Console: JavaScript errors
   - Network: API call issues
   - Application: localStorage/cookies

4. **Test in incognito mode** if issues persist
   - Eliminates cache/extension problems

5. **Keep both terminal windows open**
   - See real-time logs
   - Easier debugging

---

## 🎨 Customization Quick Tips

### Change Theme Colors
Edit `frontend/tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      primary: {
        // Change these values
        500: '#0ea5e9',
        600: '#0284c7',
      }
    }
  }
}
```

### Add New Route
1. Create page in `frontend/src/pages/`
2. Add route in `frontend/src/App.jsx`
3. Add link in `frontend/src/components/Sidebar.jsx`

### Add New API Endpoint
1. Create controller in `backend/controllers/`
2. Add route in `backend/routes/`
3. Register in `backend/server.js`

---

## 📞 Quick Help

**Can't login?**
- Check credentials (case-sensitive)
- Verify database was seeded
- Check browser console for errors

**Can't access a page?**
- Verify user role permissions
- Check if logged in
- Clear browser cache

**Backend not starting?**
- Check MySQL is running
- Verify .env configuration
- Check port 5000 is free

**Frontend not loading?**
- Check backend is running
- Verify VITE_API_URL in .env
- Check port 5173 is free

---

## ✅ Verification Checklist

Quick checks to ensure everything works:

- [ ] Can login with all 4 roles
- [ ] Theme toggle works
- [ ] Can create school
- [ ] Can reset password
- [ ] Can logout
- [ ] Page refresh works
- [ ] Navigation works
- [ ] No console errors

---

**Last Updated:** December 26, 2025  
**Version:** 1.0.0  
**Status:** Production Ready ✅

---

**Pro Tip:** Bookmark this file for quick access to common commands and credentials!
