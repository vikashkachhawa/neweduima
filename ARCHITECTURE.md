# Eduima - System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                           │
│                     http://localhost:5173                        │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ HTTP/HTTPS
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REACT FRONTEND (Vite)                         │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │  Components                                                  │ │
│ │  - Layout (Sidebar + Content)                               │ │
│ │  - ThemeToggle (Dark/Light)                                 │ │
│ │  - ProtectedRoute                                            │ │
│ │                                                              │ │
│ │  Pages                                                       │ │
│ │  - Login                                                     │ │
│ │  - Dashboard (Role-specific)                                │ │
│ │  - Schools (Super Admin)                                    │ │
│ │  - Users (Super Admin)                                      │ │
│ │                                                              │ │
│ │  Contexts                                                    │ │
│ │  - AuthContext (User state, Login/Logout)                  │ │
│ │  - ThemeContext (Dark/Light mode)                          │ │
│ │                                                              │ │
│ │  Services                                                    │ │
│ │  - API Client (Axios)                                       │ │
│ │  - Auth Service                                             │ │
│ │  - Super Admin Service                                      │ │
│ │  - School Service                                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ REST API
                                 │ Authorization: Bearer <JWT>
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                  EXPRESS BACKEND SERVER                          │
│                    http://localhost:5000                         │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │  Routes                                                      │ │
│ │  /api/auth         - Authentication endpoints               │ │
│ │  /api/super-admin  - Super Admin endpoints                 │ │
│ │  /api/school       - School endpoints                       │ │
│ │                                                              │ │
│ │  Middleware                                                  │ │
│ │  - CORS                                                      │ │
│ │  - authMiddleware (JWT verification)                        │ │
│ │  - roleMiddleware (Role checking)                          │ │
│ │  - errorHandler                                             │ │
│ │                                                              │ │
│ │  Controllers                                                 │ │
│ │  - authController      (Login, Logout, Password)           │ │
│ │  - superAdminController (Schools, Users)                   │ │
│ │  - schoolController     (Dashboard, Stats)                 │ │
│ │                                                              │ │
│ │  Models                                                      │ │
│ │  - User    (Database operations)                           │ │
│ │  - School  (Database operations)                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ SQL Queries
                                 │ mysql2 driver
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                        MySQL DATABASE                            │
│                         (eduima_db)                              │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │  Tables                                                      │ │
│ │                                                              │ │
│ │  schools                                                     │ │
│ │  ├── id (PK)                                                │ │
│ │  ├── name                                                    │ │
│ │  ├── location                                               │ │
│ │  ├── subdomain (UNIQUE)                                     │ │
│ │  ├── email, phone, address                                  │ │
│ │  └── is_active, timestamps                                  │ │
│ │                                                              │ │
│ │  users                                                       │ │
│ │  ├── id (PK)                                                │ │
│ │  ├── school_id (FK -> schools.id)                          │ │
│ │  ├── email (UNIQUE)                                         │ │
│ │  ├── password_hash                                          │ │
│ │  ├── first_name, last_name                                  │ │
│ │  ├── role (ENUM: super_admin, school_admin, faculty, student) │ │
│ │  ├── is_active, must_change_password                       │ │
│ │  └── timestamps                                             │ │
│ │                                                              │ │
│ │  sessions                                                    │ │
│ │  ├── id (PK)                                                │ │
│ │  ├── user_id (FK -> users.id)                              │ │
│ │  ├── token_hash                                             │ │
│ │  └── expires_at, created_at                                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Authentication Flow

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│  User   │         │ Frontend│         │ Backend │
└────┬────┘         └────┬────┘         └────┬────┘
     │                   │                   │
     │ 1. Enter credentials                  │
     ├──────────────────>│                   │
     │                   │                   │
     │                   │ 2. POST /api/auth/login
     │                   ├──────────────────>│
     │                   │   {email, password}
     │                   │                   │
     │                   │                   │ 3. Verify password
     │                   │                   │    (bcrypt.compare)
     │                   │                   │
     │                   │ 4. JWT Token + User data
     │                   │<──────────────────┤
     │                   │                   │
     │                   │ 5. Store token    │
     │                   │    & user data    │
     │                   │    (localStorage) │
     │                   │                   │
     │ 6. Redirect to dashboard             │
     │<──────────────────┤                   │
     │                   │                   │
```

## API Request Flow with JWT

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│Frontend │         │ Backend │         │Database │
└────┬────┘         └────┬────┘         └────┬────┘
     │                   │                   │
     │ 1. API Request    │                   │
     │    + JWT Token    │                   │
     ├──────────────────>│                   │
     │  Authorization: Bearer <token>        │
     │                   │                   │
     │                   │ 2. Verify JWT     │
     │                   │    (authMiddleware)
     │                   │                   │
     │                   │ 3. Check Role     │
     │                   │    (roleMiddleware)
     │                   │                   │
     │                   │ 4. Query Database │
     │                   ├──────────────────>│
     │                   │                   │
     │                   │ 5. Return Data    │
     │                   │<──────────────────┤
     │                   │                   │
     │ 6. JSON Response  │                   │
     │<──────────────────┤                   │
     │                   │                   │
```

## School Creation Flow

```
Super Admin Dashboard
         │
         │ 1. Click "Add School"
         ▼
    ┌──────────────────┐
    │  School Form     │
    │  - Name          │
    │  - Location      │
    │  - Contact Info  │
    │  - Admin Details │
    └────────┬─────────┘
             │ 2. Submit
             ▼
    POST /api/super-admin/schools
             │
             ▼
    ┌──────────────────────┐
    │ Backend Processing   │
    │ 1. Generate subdomain│
    │    (schoolname-loc)  │
    │ 2. Create school     │
    │ 3. Hash temp password│
    │ 4. Create admin user │
    └────────┬─────────────┘
             │
             ▼
    ┌──────────────────────┐
    │   Database Inserts   │
    │ 1. INSERT INTO schools│
    │ 2. INSERT INTO users │
    └────────┬─────────────┘
             │
             ▼
    ┌──────────────────────┐
    │  Success Response    │
    │  - School details    │
    │  - Subdomain URL     │
    │  - Admin credentials │
    └────────┬─────────────┘
             │
             ▼
    Display Success Modal
         with credentials
```

## Multi-Tenant Data Isolation

```
┌─────────────────────────────────────────────────────────────┐
│                    Super Admin Access                        │
│  - Can see ALL schools                                       │
│  - Can see ALL users                                         │
│  - school_id = NULL in users table                          │
└─────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
     │  School A    │ │  School B    │ │  School C    │
     │  (school_id=1)│ │ (school_id=2)│ │ (school_id=3)│
     └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
            │                │                │
     ┌──────┴────────┐┌──────┴────────┐┌──────┴────────┐
     │ School Admin  ││ School Admin  ││ School Admin  │
     │ - See only    ││ - See only    ││ - See only    │
     │   School A    ││   School B    ││   School C    │
     │   users       ││   users       ││   users       │
     └───────┬───────┘└───────┬───────┘└───────┬───────┘
             │                │                │
     ┌───────┴────┐   ┌───────┴────┐  ┌───────┴────┐
     │ Faculty    │   │ Faculty    │  │ Faculty    │
     │ Students   │   │ Students   │  │ Students   │
     └────────────┘   └────────────┘  └────────────┘
```

## Component Hierarchy

```
App
├── ThemeProvider
│   └── AuthProvider
│       └── BrowserRouter
│           ├── Login (Public)
│           │   └── ThemeToggle
│           │
│           └── ProtectedRoute
│               └── Layout
│                   ├── Sidebar
│                   │   ├── Navigation Links (Role-based)
│                   │   ├── User Info
│                   │   ├── ThemeToggle
│                   │   └── Logout Button
│                   │
│                   └── Main Content
│                       ├── Dashboard
│                       │   └── StatCards
│                       ├── Schools
│                       │   ├── SchoolList
│                       │   └── AddSchoolModal
│                       └── Users
│                           └── UserTable
```

## State Management

```
┌──────────────────────────────────────────────────────────────┐
│                      Global State                             │
│                                                               │
│  ThemeContext                   AuthContext                  │
│  ├── theme: 'light'|'dark'      ├── user: {...}             │
│  └── toggleTheme()              ├── loading: boolean         │
│      │                          ├── login()                  │
│      ├─> localStorage          ├── logout()                 │
│      └─> document.classList    └── updateUser()             │
│                                     │                         │
│                                     ├─> localStorage          │
│                                     └─> API calls             │
└──────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                │           │           │
                ▼           ▼           ▼
           Login Page   Dashboard    Schools
           - No context - Use user   - Use user
                        - Use theme  - Use theme
```

## Routing Strategy

```
URL: /dashboard
     │
     ▼
Router Matches Route
     │
     ▼
ProtectedRoute Component
     │
     ├─> Check if user logged in
     │   ├─ Yes: Continue
     │   └─ No: Redirect to /login
     │
     ├─> Check user role
     │   ├─ Allowed: Render page
     │   └─ Not allowed: Redirect
     │
     ▼
Render Dashboard Component
     │
     └─> Wrapped in Layout
         ├─> Sidebar (visible)
         └─> Content Area (updates)
```

## Directory Structure

```
eduima/
│
├── backend/                    # Node.js/Express API
│   ├── config/                 # Configuration files
│   │   └── database.js         # MySQL connection
│   ├── controllers/            # Business logic
│   │   ├── authController.js
│   │   ├── superAdminController.js
│   │   └── schoolController.js
│   ├── middleware/             # Express middleware
│   │   ├── auth.js
│   │   ├── role.js
│   │   └── errorHandler.js
│   ├── models/                 # Data models
│   │   ├── User.js
│   │   └── School.js
│   ├── routes/                 # API routes
│   │   ├── auth.js
│   │   ├── superAdmin.js
│   │   └── school.js
│   ├── database/               # Database files
│   │   ├── schema.sql
│   │   └── seed.js
│   ├── .env                    # Environment variables
│   ├── package.json
│   └── server.js               # Entry point
│
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   │   ├── Layout.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── ThemeToggle.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── contexts/           # React contexts
│   │   │   ├── ThemeContext.jsx
│   │   │   └── AuthContext.jsx
│   │   ├── pages/              # Page components
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Schools.jsx
│   │   │   └── Users.jsx
│   │   ├── services/           # API services
│   │   │   ├── api.js
│   │   │   └── index.js
│   │   ├── App.jsx             # Main component
│   │   ├── main.jsx            # Entry point
│   │   └── index.css           # Global styles
│   ├── .env                    # Environment variables
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── index.html
│
├── setup.ps1                   # Setup automation
├── start.ps1                   # Start automation
└── README.md                   # Documentation
```

## Data Flow Example: Creating a School

```
1. User Input
   ↓
2. Form Validation (Frontend)
   ↓
3. API Call with JWT
   POST /api/super-admin/schools
   {
     name: "Aryan Public School",
     location: "Ajmer",
     email: "info@aryanschool.com",
     adminEmail: "admin@aryanschool.com",
     adminFirstName: "John",
     adminLastName: "Doe"
   }
   ↓
4. Backend Middleware
   - authMiddleware: Verify JWT
   - roleMiddleware: Check super_admin
   ↓
5. Controller Logic
   - Generate subdomain: "aryanpublicschool-ajmer"
   - Check if subdomain exists
   - Generate temporary password
   - Hash password
   ↓
6. Database Operations
   - INSERT INTO schools (...)
   - Get school.id
   - INSERT INTO users (school_id=id, ...)
   ↓
7. Response
   {
     success: true,
     school: { id, name, subdomain, url },
     admin: { id, email, tempPassword }
   }
   ↓
8. Frontend Updates
   - Show success modal
   - Display credentials
   - Refresh school list
```

---

This architecture provides:
✅ Separation of concerns
✅ Scalability
✅ Security
✅ Maintainability
✅ Clear data flow
✅ Role-based access
