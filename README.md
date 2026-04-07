# Eduima - Multi-Tenant School Management System

A modern, responsive web application for managing multiple schools with role-based access control, subdomain routing, and dark/light mode support.

## Features

### Frontend
- React 18
- Vite
- React Router v6
- Tailwind CSS
## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- MySQL Server
- XAMPP (if using)

### Database Setup

1. Start MySQL server
2. Create database:
```sql
CREATE DATABASE eduima_db;
```

3. Run the database schema from `backend/database/schema.sql`

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
npm install
```

2. Create `.env` file:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=eduima_db
JWT_SECRET=your-secret-key-here
PORT=5000
FRONTEND_URL=http://localhost:5173
```

3. Start backend server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
npm install
```

2. Create `.env` file:
```
VITE_API_URL=http://localhost:5000/api
```

3. Start frontend development server:
```bash
npm run dev
```

4. Open browser at `http://localhost:5173`

## Default Super Admin Credentials

- Email: `superadmin@eduima.com`
- Password: `SuperAdmin@123`

## Project Structure

```
eduima/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── database/
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.jsx
│   └── index.html
└── README.md
```

## Usage

### Super Admin Functions
- Add new schools
- Auto-generate school subdomains
- Create School Admin accounts
- Reset user credentials
- View all schools and users

### School Admin Functions
- Manage faculty members
- Manage students
- View school dashboard

### Faculty Functions
- View assigned classes
- Manage attendance
- View student information

### Students Functions
- View dashboard
- Access course materials
- View attendance

## Subdomain Routing

When a school is created (e.g., "Aryan Public School, Ajmer"), the system generates:
- Subdomain: `aryanpublicschool-ajmer.mydomain.com`

All school users must access their portal through their school's subdomain.

## License

MIT
