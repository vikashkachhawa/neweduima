# Development Quick Start Guide

## Prerequisites Checklist
- [ ] Node.js installed (v18 or higher)
- [ ] MySQL running (XAMPP)
- [ ] Git (optional)

## Quick Setup (5 minutes)

### 1. Install Dependencies
```powershell
.\setup.ps1
```

### 2. Configure Database
1. Open phpMyAdmin: http://localhost/phpmyadmin
2. Create database: `eduima_db`
3. Import: `backend/database/schema.sql`

### 3. Update Environment Variables
Edit `backend/.env`:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=eduima_db
```

### 4. Start Application
```powershell
.\start.ps1
```

### 5. Access Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Default Credentials

### Super Admin
- Email: `superadmin@eduima.com`
- Password: `SuperAdmin@123`

### Demo School Admin
- Email: `admin@demopublicschool.com`
- Password: `Admin@123`

## Manual Start (Alternative)

### Backend:
```powershell
cd backend
npm run dev
```

### Frontend:
```powershell
cd frontend
npm run dev
```

## Testing Features

### 1. Super Admin Dashboard
- Login as Super Admin
- View all schools and users
- Add new school (automatically generates subdomain)
- Reset user passwords
- Manage user status

### 2. School Admin Dashboard
- Login as School Admin
- View school statistics
- Manage faculty and students (coming in Phase 2)

### 3. Dark/Light Mode
- Click theme toggle icon in sidebar
- Theme persists across sessions

### 4. Navigation
- Click sidebar menu items
- Page refreshes maintain current route
- No full page reloads during navigation

## Troubleshooting

### Port Already in Use
Backend (5000):
```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

Frontend (5173):
```powershell
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Database Connection Error
- Verify MySQL is running in XAMPP
- Check credentials in backend/.env
- Ensure eduima_db database exists

### Module Not Found
```powershell
cd backend
npm install

cd ../frontend
npm install
```

## Project Structure
```
eduima/
├── backend/          # Node.js/Express API
│   ├── config/       # Database config
│   ├── controllers/  # Route controllers
│   ├── middleware/   # Auth, role checks
│   ├── models/       # Database models
│   ├── routes/       # API routes
│   └── server.js     # Entry point
├── frontend/         # React/Vite app
│   └── src/
│       ├── components/  # Reusable components
│       ├── contexts/    # React contexts
│       ├── pages/       # Page components
│       └── services/    # API services
└── README.md
```

## Next Steps
- Explore Super Admin features
- Create test schools
- Test role-based access control
- Customize theme colors in tailwind.config.js

## Support
For issues or questions, check:
- README.md for detailed documentation
- Backend logs in terminal
- Browser console for frontend errors
