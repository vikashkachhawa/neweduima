# Complete Setup Guide - Eduima School Management System

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Database Setup](#database-setup)
4. [Running the Application](#running-the-application)
5. [Features Overview](#features-overview)
6. [User Roles & Credentials](#user-roles--credentials)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **MySQL Server** - Included in XAMPP
- **XAMPP** - [Download](https://www.apachefriends.org/)

### Verify Installation
Open PowerShell and run:
```powershell
node --version
npm --version
```

---

## Installation

### Option 1: Automated Setup (Recommended)

1. **Open PowerShell in the project directory:**
   ```powershell
   cd c:\xampp\htdocs\eduima
   ```

2. **Run the setup script:**
   ```powershell
   .\setup.ps1
   ```

   This will:
   - Install all backend dependencies
   - Install all frontend dependencies
   - Create environment configuration files
   - Provide database setup instructions

### Option 2: Manual Setup

#### Backend Setup
```powershell
cd backend
npm install
copy .env.example .env
```

#### Frontend Setup
```powershell
cd frontend
npm install
copy .env.example .env
```

---

## Database Setup

### Step 1: Start MySQL
1. Open XAMPP Control Panel
2. Click **Start** next to MySQL
3. Wait for the status to show "Running"

### Step 2: Create Database

**Method A: Using phpMyAdmin**
1. Open: http://localhost/phpmyadmin
2. Click **New** in the left sidebar
3. Database name: `eduima_db`
4. Collation: `utf8mb4_unicode_ci`
5. Click **Create**

**Method B: Using MySQL Command Line**
```powershell
mysql -u root -p -e "CREATE DATABASE eduima_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### Step 3: Import Schema

**Method A: Using phpMyAdmin**
1. Select `eduima_db` from the left sidebar
2. Click **Import** tab
3. Click **Choose File**
4. Select: `c:\xampp\htdocs\eduima\backend\database\schema.sql`
5. Click **Go**

**Method B: Using MySQL Command Line**
```powershell
mysql -u root -p eduima_db < backend\database\schema.sql
```

### Step 4: Seed Sample Data

From the backend directory:
```powershell
cd backend
npm run seed
```

This creates:
- 1 Super Admin account
- 1 Demo School
- Sample users for each role

---

## Running the Application

### Option 1: Automated Start (Recommended)

```powershell
.\start.ps1
```

This opens two PowerShell windows:
- Backend server (Port 5000)
- Frontend server (Port 5173)

Press any key in the original window to stop both servers.

### Option 2: Manual Start

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

### Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **API Health Check:** http://localhost:5000/health

---

## Features Overview

### ✅ Implemented Features (Phase 1)

#### Authentication System
- ✅ JWT-based authentication
- ✅ Role-based access control
- ✅ Password change functionality
- ✅ Forced password change for new users
- ✅ Secure session management

#### Dark/Light Mode
- ✅ Toggle between themes
- ✅ Persistent theme storage
- ✅ Smooth transitions
- ✅ System-wide theme application

#### Super Admin Features
- ✅ Dashboard with statistics
- ✅ School management (CRUD operations)
- ✅ Automatic subdomain generation
- ✅ User management across all schools
- ✅ Password reset functionality
- ✅ User activation/deactivation
- ✅ School Admin creation

#### School Admin Features
- ✅ School-specific dashboard
- ✅ User statistics
- ✅ Access to school users

#### Modern UI/UX
- ✅ Responsive design
- ✅ Persistent sidebar navigation
- ✅ SPA routing (no full page reloads)
- ✅ State persistence on refresh
- ✅ Loading states
- ✅ Error handling
- ✅ Professional color scheme

### 🚧 Coming in Phase 2
- Student enrollment management
- Faculty assignment and scheduling
- Attendance tracking
- Grade management
- Course management
- Reports and analytics
- Email notifications
- File uploads
- Advanced search and filters

---

## User Roles & Credentials

### Default Credentials

#### Super Admin
```
Email: superadmin@eduima.com
Password: SuperAdmin@123
```

**Capabilities:**
- Manage all schools
- Create schools with auto-generated subdomains
- Create and manage users across all schools
- Reset any user's password
- Activate/deactivate users
- View system-wide statistics

#### School Admin (Demo School)
```
Email: admin@demopublicschool.com
Password: Admin@123
```

**Capabilities:**
- View school dashboard
- Manage faculty members
- Manage students
- View school-specific reports

#### Faculty (Demo School)
```
Email: faculty@demopublicschool.com
Password: Faculty@123
```

**Capabilities:**
- View assigned classes
- Mark attendance
- View student information

#### Student (Demo School)
```
Email: student@demopublicschool.com
Password: Student@123
```

**Capabilities:**
- View courses
- View attendance
- Check grades

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

**Backend (Port 5000):**
```powershell
netstat -ano | findstr :5000
# Note the PID
taskkill /PID <PID> /F
```

**Frontend (Port 5173):**
```powershell
netstat -ano | findstr :5173
# Note the PID
taskkill /PID <PID> /F
```

#### 2. Database Connection Error

**Check MySQL Status:**
- Open XAMPP Control Panel
- Ensure MySQL is running
- Click **Admin** to open phpMyAdmin

**Verify Credentials:**
Edit `backend/.env`:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=         # Leave blank if no password
DB_NAME=eduima_db
```

**Test Connection:**
```powershell
mysql -u root -p -e "SHOW DATABASES;"
```

#### 3. Module Not Found Errors

**Reinstall Dependencies:**
```powershell
# Backend
cd backend
Remove-Item node_modules -Recurse -Force
npm install

# Frontend
cd ../frontend
Remove-Item node_modules -Recurse -Force
npm install
```

#### 4. CORS Errors

**Check Backend Configuration:**
Ensure `backend/.env` has:
```
FRONTEND_URL=http://localhost:5173
```

**Check Frontend Configuration:**
Ensure `frontend/.env` has:
```
VITE_API_URL=http://localhost:5000/api
```

#### 5. Dark Mode Not Persisting

**Clear Browser Cache:**
- Press `Ctrl + Shift + Delete`
- Clear cached images and files
- Reload the page

**Check Browser Console:**
- Press `F12`
- Look for localStorage errors

#### 6. Blank Page After Login

**Check Browser Console:**
- Press `F12`
- Look for JavaScript errors
- Check Network tab for failed API calls

**Verify Database:**
```powershell
cd backend
npm run seed
```

---

## Development Tips

### File Structure
```
eduima/
├── backend/
│   ├── config/          # Database configuration
│   ├── controllers/     # Business logic
│   ├── middleware/      # Auth, validation
│   ├── models/          # Database models
│   ├── routes/          # API endpoints
│   ├── database/        # SQL schema & seed
│   └── server.js        # Entry point
├── frontend/
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── contexts/    # React Context (Auth, Theme)
│       ├── pages/       # Page components
│       ├── services/    # API integration
│       └── App.jsx      # Main app component
└── README.md
```

### Environment Variables

**Backend (.env):**
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=eduima_db
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRE=24h
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:5000/api
```

### API Endpoints

**Authentication:**
- POST `/api/auth/login`
- GET `/api/auth/me`
- POST `/api/auth/change-password`
- POST `/api/auth/logout`

**Super Admin:**
- GET `/api/super-admin/schools`
- POST `/api/super-admin/schools`
- GET `/api/super-admin/schools/:id`
- GET `/api/super-admin/users`
- POST `/api/super-admin/users`
- POST `/api/super-admin/users/:userId/reset-password`
- PATCH `/api/super-admin/users/:userId/toggle-status`

**School:**
- GET `/api/school/dashboard/stats`
- GET `/api/school/users`

---

## Next Steps

1. **Explore the Application:**
   - Login with Super Admin credentials
   - Create a new school
   - Observe auto-generated subdomain
   - Test user management features

2. **Customize Theme:**
   - Edit `frontend/tailwind.config.js`
   - Modify color schemes
   - Add custom components

3. **Extend Functionality:**
   - Add more API endpoints in `backend/routes/`
   - Create new pages in `frontend/src/pages/`
   - Implement Phase 2 features

4. **Deploy to Production:**
   - Set up proper domain and subdomains
   - Configure SSL certificates
   - Use production database
   - Set strong JWT secrets
   - Enable environment-specific configs

---

## Support & Resources

- **Documentation:** README.md
- **Quick Start:** QUICKSTART.md
- **Database Schema:** backend/database/schema.sql
- **API Documentation:** Test endpoints using Postman/Thunder Client

---

## Security Notes

⚠️ **Important for Production:**

1. Change default JWT_SECRET in `.env`
2. Use strong passwords for database
3. Enable HTTPS
4. Implement rate limiting
5. Add input validation
6. Enable CORS only for trusted domains
7. Regular security audits
8. Keep dependencies updated

---

**Built with:** React, Node.js, Express, MySQL, Tailwind CSS  
**Version:** 1.0.0  
**License:** MIT
