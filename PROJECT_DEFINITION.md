# 🎓 Eduima - Complete Project Definition & Feature Architecture

**Version:** 1.0.0  
**Status:** Active Development  
**Last Updated:** March 23, 2026

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Core Features](#core-features)
5. [User Roles & Access Control](#user-roles--access-control)
6. [Application Flows](#application-flows)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [File Structure](#file-structure)

---

## Project Overview

### What is Eduima?

Eduima is a **multi-tenant school management system** designed for educational institutions to manage students, faculty, school pages, content, and interactive learning games. The platform supports role-based access control, institutional data isolation, and modern interactive educational content.

### Core Objectives

- **Multi-tenancy:** Support multiple schools in a single deployment
- **Role-Based Access:** Different capabilities per user role
- **Security:** JWT authentication, password hashing, encrypted sessions
- **Educational Gaming:** Original in-app learning games for student engagement
- **School Community:** Social-style school page with posts, announcements, followers
- **Administrative Control:** Comprehensive dashboards for school and super admin management

---

## Technology Stack

### Frontend
- **Framework:** React 18 (modern hooks, context API)
- **Build Tool:** Vite (fast dev server, optimized builds)
- **UI Library:** Material-UI (MUI) - premium components
- **Styling:** MUI sx prop + custom CSS
- **State Management:** Redux Toolkit (centralized game state)
- **Routing:** React Router v6 (nested routes, protected routes)
- **HTTP Client:** Axios (REST API communication)
- **Additional Libraries:**
  - Blockly (visual block programming)
  - Framer Motion (animations)
  - Emoji Picker React

### Backend
- **Runtime:** Node.js (v18+)
- **Framework:** Express.js (REST API)
- **Database:** MySQL (relational data)
- **ORM:** mysql2 (lightweight driver)
- **Authentication:** JWT (jsonwebtoken)
- **Password Security:** bcryptjs (hashing)
- **Validation:** express-validator (input validation)
- **Task Scheduling:** node-cron (automated background jobs)
- **Development:** Nodemon (auto-reload)

### Infrastructure
- **Server:** XAMPP (local development)
- **Database Server:** MySQL (XAMPP bundled)
- **Frontend Server:** Vite dev server (port 5173)
- **Backend Server:** Express (port 5000)

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        BROWSER LAYER                           │
│                      (Client-Side React)                       │
└────────────────────────────────────────────────────────────────┘
                              │
                   ┌──────────┴──────────┐
                   │                     │
                   ▼                     ▼
         ┌──────────────────┐   ┌──────────────────┐
         │  Frontend Pages  │   │  Game Engine     │
         │  (Auth, Admin,   │   │  (Blockly VM,    │
         │   Faculty, Etc)  │   │   Educational    │
         │                  │   │   Gaming)        │
         └────────┬─────────┘   └────────┬─────────┘
                  │                      │
                  └──────────┬───────────┘
                             │
                   REST API (Axios)
                      JWT Bearer Tokens
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │      Express.js Backend Server         │
        │           (Port: 5000)                 │
        │                                        │
        │  ┌──────────────────────────────────┐ │
        │  │  Routes & Controllers            │ │
        │  │  - /api/auth (Login, Logout)    │ │
        │  │  - /api/super-admin (SA mgmt)   │ │
        │  │  - /api/school (School ops)     │ │
        │  │  - /api/school-page (Posts)     │ │
        │  │  - /api/subscription (Plans)    │ │
        │  │  - /api/rbac (Role mgmt)        │ │
        │  └──────────────────────────────────┘ │
        │                                        │
        │  ┌──────────────────────────────────┐ │
        │  │  Middleware Layer                │ │
        │  │  - JWT Verification              │ │
        │  │  - Role/Permission Checking      │ │
        │  │  - CORS & Error Handling         │ │
        │  └──────────────────────────────────┘ │
        └────────────────┬──────────────────────┘
                         │
                   SQL Queries
                    (mysql2)
                         │
                         ▼
        ┌────────────────────────────────────┐
        │      MySQL Database                │
        │      (eduima_db)                   │
        │                                    │
        │  Tables:                           │
        │  - schools                         │
        │  - users                           │
        │  - sessions                        │
        │  - school_pages                    │
        │  - posts                           │
        │  - subscriptions                   │
        │  - roles & permissions             │
        │  - announcements                   │
        │  - analytics                       │
        └────────────────────────────────────┘
```

---

## Core Features

### 1. 🔐 Authentication & Authorization

#### Features:
- **Login System:** Email/password authentication with JWT tokens
- **Role-Based Access Control (RBAC):** 4 distinct user roles
  - `super_admin`: Platform administrator
  - `school_admin`: School-level administrator
  - `faculty`: Teacher/instructor
  - `student`: Student learner
- **Password Security:**
  - Bcrypt hashing (salt rounds: 10)
  - First-login forced password change
  - Password reset functionality with temporary credentials
- **Session Management:**
  - JWT tokens stored in localStorage
  - Token-based API authentication
  - Automatic token refresh (if implemented)
- **Protected Routes:** ProtectedRoute component guards all pages based on role

#### Flow:
```
User Enters Credentials
    ↓
Frontend POST /api/auth/login
    ↓
Backend Validates Email & Password
    ↓
Generate JWT Token
    ↓
Return Token + User Data
    ↓
Frontend Stores in localStorage
    ↓
Redirect to Role-Specific Dashboard
    ↓
All API Requests Include Authorization Header
```

---

### 2. 🏫 Multi-Tenant School Management

#### Features:
- **School Creation:** Dynamic school setup with auto-generated credentials
- **Subdomain Generation:** Automatic unique subdomain per school (e.g., `myschool-city.eduima.com`)
- **School Isolation:** Data segregated per school_id in database
- **Module Activation:** Schools can enable/disable features (subscriptions)
- **School Cloning:** Duplicate a school configuration for quick setup

#### Data Relationships:
```
School (Parent Tenant)
├── Users (Multiple roles)
├── Announcements
├── School Page Posts
├── Faculty Profiles
├── Student Profiles
└── Subscriptions
```

---

### 3. 👥 User Management

#### Super Admin Capabilities:
- View all users across all schools
- Create new users with role assignment
- Reset user passwords (generates temporary password)
- Activate/deactivate user accounts
- Bulk user operations (if implemented)

#### School Admin Capabilities:
- Create/manage users within their school
- View faculty and student rosters
- Reset passwords for school users
- Manage faculty assignments

#### User Profile Data:
```
User Object:
{
  id: UUID,
  school_id: UUID (Foreign Key),
  email: String (Unique),
  password_hash: String (Bcrypted),
  first_name: String,
  last_name: String,
  role: Enum (super_admin, school_admin, faculty, student),
  is_active: Boolean,
  must_change_password: Boolean,
  created_at: Timestamp,
  updated_at: Timestamp
}
```

---

### 4. 📊 Dashboards (Role-Specific)

#### Super Admin Dashboard:
- **Statistics Panel:**
  - Total schools active
  - Total users across platform
  - Total subscriptions
  - Revenue/billing status
- **Quick Actions:**
  - Create new school
  - Manage all schools
  - Manage all users
  - View subscriptions
  - Access templates & settings

#### School Admin Dashboard:
- **School Statistics:**
  - Total faculty
  - Total students
  - Total active users
  - Subscription status
- **Quick Actions:**
  - Create/manage users
  - View school page performance
  - Manage announcements
  - Access school settings

#### Faculty Dashboard:
- **Profile:** View/edit faculty profile with qualifications
- **Schedule:** Class schedule and upcoming assignments
- **Classes:** Manage assigned classes
- **Students:** View enrolled students
- **Attendance:** Track/upload attendance
- **Performance:** Analytics and class stats

#### Student Dashboard:
- **Profile:** View/edit student information
- **Classes:** Enrolled classes
- **Assignments:** Assignment list and submissions
- **Performance:** Grades and analytics
- **Fun Learning:** Access to educational games

---

### 5. 🎮 Fun Learning - Educational Games (NEW)

#### Overview:
Interactive learning games built with original code (no external clones). Students earn points, unlock difficulty levels, and engage with curriculum-aligned content.

#### Games Included:

##### Game 1: Math Sprint ⚡
**Concept:** Timed arithmetic challenge with auto-difficulty progression

**Mechanics:**
- Timer-based gameplay (starts at 30s, +10s per correct answer)
- Dynamic question generation based on difficulty
- Auto-progression: Easy (0-49 pts) → Moderate (50-99 pts) → Hard (100+ pts)
- Scoring: +10 points per correct answer

**Difficulty Levels:**
- **Easy:** Addition/subtraction (2-20 range)
  - Example: `8 + 5 = ?, 15 - 7 = ?`
- **Moderate:** Multiplication, division, mixed operators (2-35 range)
  - Example: `12 × 7 = ?, 144 ÷ 12 = ?, 20 + 8 = ?`
- **Hard:** BODMAS expressions with brackets
  - Example: `(3 + 5) × 2 = ?, 20 - 3 × 4 = ?, (24 ÷ 3) + 5 = ?`

**UI Features:**
- Animated difficulty chip with icon indicators
- Linear progress bar (time tracking)
- Score/time display
- Status message feedback
- Character reactions on correct answers

---

##### Game 2: Sequence Recall 🧠
**Concept:** Memory-based number sequence game

**Mechanics:**
- Display a sequence of digits (hidden after 2.2 seconds)
- Player must type the exact sequence
- Difficulty increases per round (sequence length increases)
- Player-driven progression (no time limit, Round-based)

**Progression:**
- Round 1: 4 digits
- Round 2: 5 digits
- Round 3: 6 digits
- ...up to 9 digits max

**UI Features:**
- Round counter
- Momentary sequence display with blur effect
- Text input (space-separated digits)
- Hint system (shows correct sequence after wrong attempt)
- Replay round button

---

##### Game 3: Word Forge 🔤
**Concept:** Timed anagram solver

**Mechanics:**
- Display scrambled letters of a word
- Player unscrambles within time limit (45s)
- Scoring: +15 points per correct word, +unlimited time bonus based on difficulty
- Word pool: ALGORITHM, VARIABLE, FUNCTION, LOOP, BOOLEAN, NETWORK

**UI Features:**
- Large scrambled letter display
- Hint system (shows first letter of answer)
- Time tracker with warning state
- Score accumulator

---

##### Game 4: Orbit Quest 🪐
**Concept:** Astronomy-based planet identification

**Mechanics:**
- Read a clue about a planet
- Select correct planet from 4 multiple-choice options
- Scoring: +12 points per correct answer, +6 seconds bonus
- Difficulty: 8 planets with varying clue complexity

**Planets & Clues:**
1. Mercury - Smallest planet, closest to Sun
2. Venus - Hottest planet, thick cloudy air
3. Earth - Blue planet where we live
4. Mars - Red Planet
5. Jupiter - Largest with Great Red Spot
6. Saturn - Famous bright rings
7. Uranus - Rotates on side, blue-green
8. Neptune - Farthest major planet, fast winds

**UI Features:**
- Animated astronaut character (Captain Nova) with celebration effects
- Visual orbit diagram with planet dots
- Character dialogue changes per game state
- Particle burst on correct answer
- Time counter with visual progress

---

##### Game 5: Chem Lab ⚗️
**Concept:** Realistic chemistry reaction prediction (NEW)

**Mechanics:**
- Two reagents displayed with chemical formulas and pH
- Student predicts the outcome of mixing
- Animation shows chemical pour into flask
- Result flask shows student's predicted color first (even if wrong), then reveals actual reaction
- Character (Professor Catalyst) reacts to student's choices
- Scoring: +14 points per correct answer, +5 seconds bonus
- Difficulty auto-progression: Easy (0-59) → Moderate (60-129) → Hard (130+)

**Chemistry Scenarios:**

**Easy Mode:**
1. Hydrochloric Acid + Sodium Hydroxide → Neutralization (salt + water warms)
2. Vinegar + Baking Soda → CO₂ Fizzing

**Moderate Mode:**
1. Silver Nitrate + Sodium Chloride → White AgCl Precipitate
2. Copper Sulfate + Iron Nail → Reddish copper coating

**Hard Mode:**
1. Hydrochloric Acid + Zinc → Hydrogen gas bubbles
2. Universal Indicator + Ammonia → Blue-violet color shift

**Interactive Flow:**
1. User selects outcome
2. Flask shows animated pour streams (left + right chemicals)
3. Character performs mixing animation
4. Flask transitions to user's predicted color (even if wrong)
5. After 1.5s, reveals actual reaction
6. Character gives feedback
7. Next round loads automatically

**UI Features:**
- Two-beaker input display with chemical names, formulas, pH
- Animated pour streams during mixing
- Reaction flask with color-coded output
- Mode indicator (Easy/Moderate/Hard)
- Character (Professor Catalyst with bouncing animation)
- Prediction vs. Actual comparison on wrong answers

---

### 6. 📢 School Announcements

#### Features:
- Create announcements for school members
- Target specific user groups (faculty, students, all)
- Publication scheduling (if implemented)
- Announcement archive

#### Data Structure:
```
Announcement:
{
  id: UUID,
  school_id: UUID,
  title: String,
  content: String,
  created_by: UUID (User ID),
  target_role: Enum (all, faculty, student),
  status: Enum (draft, published),
  created_at: Timestamp,
  published_at: Timestamp
}
```

---

### 7. 🏫 School Pages (Social Features)

#### Features:
- **School Profile Page:** Public-facing school profile
- **Feed:** Posts from school admins
- **Followers System:** Users can follow schools
- **Posts:** Create, edit, publish, delete posts
- **Interactions:**
  - Likes on posts
  - Comments on posts
  - Comment moderation
- **Analytics:** View followers, post performance

#### Post Structure:
```
Post:
{
  id: UUID,
  school_id: UUID,
  title: String,
  content: String,
  media_url: String (Optional),
  created_by: UUID,
  status: Enum (draft, published),
  like_count: Integer,
  comment_count: Integer,
  created_at: Timestamp,
  published_at: Timestamp
}
```

---

### 8. 💳 Subscription Management

#### Features:
- **Subscription Plans:** Multiple tiered plans for schools
- **Plan Assignment:** Assign plans to schools
- **Upgrade/Downgrade:** Change subscription tier
- **Auto-Suspension:** Automatically suspend expired subscriptions
- **Restoration:** Restore suspended subscriptions
- **Statistics:** View subscription metrics (active, expired, revenue)
- **Expiration Alerts:** Track subscriptions expiring within N days

#### Subscription Data:
```
Subscription:
{
  id: UUID,
  school_id: UUID,
  plan_id: UUID,
  status: Enum (active, suspended, expired, cancelled),
  start_date: Date,
  end_date: Date,
  price: Decimal,
  billing_cycle: Enum (monthly, yearly),
  auto_renew: Boolean,
  suspended_at: Timestamp,
  cancelled_at: Timestamp
}
```

---

### 9. 📊 Analytics & Monitoring

#### Metrics Tracked:
- User login patterns
- Game play statistics
- School performance metrics
- Subscription metrics
- Post engagement
- Student progress tracking

#### Views:
- Timeline-based filtering
- Date range selection
- Performance dashboards

---

### 10. 🔒 Faculty Profiles

#### Features:
- Complete faculty information (name, email, phone, address)
- Qualifications and certifications
- Department/Subject assignment
- Profile picture
- Contact information visibility controls
- Schedule/availability

---

### 11. 📚 Role & Permission Management

#### Permission-Based Access:
- Fine-grained permissions per role
- Hierarchical role structure
- Super admin can assign custom permissions (if implemented)

#### Default Permissions by Role:
```
super_admin:
  - All platform operations
  - School CRUD
  - User management across schools
  - Subscription management
  - Template management

school_admin:
  - User management (within school)
  - Announcement creation
  - School page management
  - Dashboard access
  - Faculty/Student roster management

faculty:
  - Dashboard view (own stats)
  - Profile management
  - Student roster view
  - Assignment management
  - Attendance tracking

student:
  - Dashboard view (own stats)
  - Profile management
  - Class enrollment view
  - Assignment submission
  - Game access
```

---

## User Roles & Access Control

### Role Hierarchy

```
super_admin (Top Level)
    ↓
    └─→ Platform administration
        Platform statistics
        School management
        Global user management
        Subscription planning
        Template management

school_admin (School Level)
    ↓
    └─→ School administration
        School statistics
        School user management
        School page management
        Announcement creation
        Faculty/student roster

faculty (Educational)
    ↓
    └─→ Teaching operations
        Class management
        Student management
        Assignment creation
        Attendance tracking

student (End User)
    ↓
    └─→ Learning activities
        Dashboard access
        Educational games
        Assignment submission
        Profile management
```

### Access Control Matrix

| Feature | Super Admin | School Admin | Faculty | Student |
|---------|-------------|-------------|---------|---------|
| View Dashboard | ✅ | ✅ | ✅ | ✅ |
| Manage Schools | ✅ | ❌ | ❌ | ❌ |
| Manage Global Users | ✅ | ❌ | ❌ | ❌ |
| Manage School Users | ✅ | ✅ | ❌ | ❌ |
| Create Announcements | ✅ | ✅ | ❌ | ❌ |
| Manage School Page | ✅ | ✅ | ❌ | ❌ |
| Create Posts | ✅ | ✅ | ❌ | ❌ |
| Play Games | ✅ | ✅ | ✅ | ✅ |
| View Faculty Profile | ✅ | ✅ | ✅ | ✅ |
| View Student Profile | ✅ | ✅ | ✅ | ✅ |
| Manage Subscriptions | ✅ | ❌ | ❌ | ❌ |

---

## Application Flows

### Application Flow 1: Student Login & Game Access

```
START
  │
  ├─→ User visits app (http://localhost:5173)
  │   ├─→ App loads Login page
  │   └─→ User enters email & password
  │
  ├─→ POST /api/auth/login
  │   ├─→ Backend validates credentials
  │   ├─→ Compares bcrypted password
  │   └─→ Returns JWT + User object
  │
  ├─→ Frontend stores JWT in localStorage
  │   └─→ User redirected to /student/dashboard
  │
  ├─→ Student Dashboard renders
  │   ├─→ Sidebar menu with navigation
  │   ├─→ Main content area
  │   └─→ Fun Learning button visible
  │
  ├─→ User clicks "Fun Learning"
  │   └─→ Navigate to /student/fun-learning
  │
  ├─→ StudentFunLearning page renders
  │   ├─→ Game hub hero section
  │   ├─→ 5 game cards with CTAs
  │   └─→ Search/filter functionality
  │
  ├─→ User clicks "Play Here" on Math Sprint
  │   ├─→ Dialog opens with loading state
  │   ├─→ MathSprintGame component mounts
  │   └─→ Game timer starts (30 seconds)
  │
  ├─→ Game Loop Iteration:
  │   ├─→ Display math question
  │   ├─→ User enters answer
  │   ├─→ User clicks Submit
  │   │
  │   ├─→ IF answer correct:
  │   │   ├─→ Score +10
  │   │   ├─→ Time +10 seconds
  │   │   ├─→ Character celebrates (burst animation)
  │   │   └─→ Generate next question (level-aware)
  │   │
  │   └─→ IF answer wrong:
  │       ├─→ Show correct answer
  │       ├─→ No score bonus
  │       └─→ Generate next question
  │
  ├─→ Game End (Time = 0):
  │   ├─→ Final score displayed
  │   ├─→ Alert shows "Round finished"
  │   ├─→ Restart button enabled
  │   └─→ User can close dialog or replay
  │
  └─→ END

[Score Progression Example:]
  0-49 pts → EASY mode (addition/subtraction)
  50-99 pts → LEVEL UP to MODERATE (multiplication/division)
  100+ pts → LEVEL UP to HARD (BODMAS expressions)
```

---

### Application Flow 2: Super Admin School Management

```
START
  │
  ├─→ Super Admin logs in
  │   └─→ Dashboard loads
  │
  ├─→ Super Admin clicks "Manage Schools"
  │   └─→ Navigate to /superadmin/schools
  │
  ├─→ Schools page renders
  │   ├─→ List of all schools with:
  │   │   ├─→ School name
  │   │   ├─→ Location
  │   │   ├─→ Subdomain
  │   │   ├─→ Active status
  │   │   ├─→ User count
  │   │   └─→ Actions (Edit, Delete, Activate/Deactivate)
  │   └─→ "Create New School" button
  │
  ├─→ Click "Create New School"
  │   ├─→ Modal opens with form
  │   ├─→ Admin enters:
  │   │   ├─→ School name (required)
  │   │   ├─→ Location (required)
  │   │   ├─→ Email (required)
  │   │   ├─→ Phone (optional)
  │   │   └─→ Address (optional)
  │   └─→ Click "Create"
  │
  ├─→ POST /api/super-admin/schools
  │   ├─→ Backend validates input
  │   ├─→ Generates unique subdomain:
  │   │   └─→ Format: "{school_name_lower}-{location_lower}"
  │   │   └─→ Example: "myschool-newyork"
  │   ├─→ Creates school record
  │   ├─→ Auto-creates School Admin user:
  │   │   ├─→ Email: auto-generated
  │   │   ├─→ Password: temporary (must change on first login)
  │   │   └─→ Role: school_admin
  │   └─→ Returns new school + admin credentials
  │
  ├─→ Frontend displays:
  │   ├─→ Success message
  │   ├─→ Generated admin email
  │   ├─→ School ID
  │   └─→ Auto-generated credentials (admin can send to school)
  │
  ├─→ School added to list (refreshed)
  │   └─→ New school visible in table
  │
  ├─→ Super Admin clicks "Manage Users"
  │   └─→ Navigate to /superadmin/users
  │
  ├─→ Users page renders
  │   ├─→ List of ALL users across ALL schools
  │   ├─→ Filters by: School, Role, Status
  │   ├─→ Columns: Email, Name, Role, School, Status
  │   └─→ "Create New User" button
  │
  ├─→ Click "Create New User"
  │   ├─→ Modal opens (if subscription allows)
  │   ├─→ Admin enters:
  │   │   ├─→ School (dropdown)
  │   │   ├─→ Email (required, unique)
  │   │   ├─→ First/Last name
  │   │   ├─→ Role (dropdown)
  │   │   └─→ Password (auto-generated option)
  │   └─→ Click "Create"
  │
  ├─→ POST /api/super-admin/users
  │   ├─→ Check subscription plan active
  │   ├─→ Check user limit not exceeded
  │   ├─→ Hash password (bcrypt)
  │   ├─→ Create user record
  │   ├─→ Set must_change_password = true
  │   └─→ Return user object
  │
  ├─→ Frontend shows:
  │   ├─→ Success notification
  │   ├─→ New user email
  │   └─→ Temporary password (for delivery to user)
  │
  └─→ END
```

---

### Application Flow 3: Chemistry Lab Game - Wrong Answer Scenario

```
START (Chem Lab Game Active)
  │
  ├─→ Round loads with:
  │   ├─→ Left Reagent: "Hydrochloric Acid" (HCl, pH 1)
  │   ├─→ Right Reagent: "Sodium Hydroxide" (NaOH, pH 13)
  │   ├─→ Prompt: "Most likely observation after mixing equal amounts?"
  │   └─→ Options: [Neutralization..., CO2 bubbles, Sulfur crystals, Freezes]
  │
  ├─→ User clicks WRONG option: "Bright yellow sulfur crystals form"
  │   ├─→ reactionState set to 'mixing'
  │   ├─→ Buttons disabled during animation
  │   └─→ Character (Professor Catalyst) starts mixing animation
  │
  ├─→ Animation Phase (900ms):
  │   ├─→ Pour stream animation from left beaker
  │   │   └─→ Colored stream flows down (HCl color)
  │   ├─→ Pour stream animation from right beaker
  │   │   └─→ Colored stream flows down (NaOH color)
  │   ├─→ Flask shows mixing progress
  │   ├─→ Status message: "Mixing HCl with NaOH..."
  │   ├─→ Character performs stirring animation
  │   └─→ Character dialogue: "Steady hands. Pouring sequence in progress..."
  │
  ├─→ Reaction Reveal (at 950ms marker):
  │   ├─→ reactionState → 'wrong'
  │   ├─→ isWrongReveal → true
  │   ├─→ Flask color transitions to YELLOW
  │   │   (derived from user's predicted outcome: "sulfur crystals")
  │   ├─→ Reaction Flask displays:
  │   │   ├─→ "Predicted: Bright yellow sulfur crystals form"
  │   │   └─→ "Actual: Neutralization: salt + water, pH moves toward 7 and warms"
  │   ├─→ Character updates dialogue:
  │   │   └─→ "Interesting prediction. Let us compare it with actual chemistry."
  │   ├─→ Status message shows:
  │   │   └─→ "Your predicted result: ... | Actual reaction: ..."
  │   └─→ Score unchanged (user was wrong)
  │
  ├─→ Review Phase (1500ms delay):
  │   ├─→ Student can read actual vs predicted
  │   ├─→ Educational value: Correct understanding provided
  │   └─→ Learn from mistake
  │
  ├─→ Auto-Advance (after 1500ms):
  │   ├─→ reactionState → 'idle'
  │   ├─→ New round loads automatically
  │   ├─→ Different chemistry scenario
  │   └─→ Buttons re-enabled
  │
  └─→ END (Next Round)
```

---

### Application Flow 4: Faculty Profile Management

```
START
  │
  ├─→ Faculty user logs in
  │   └─→ Dashboard loads
  │
  ├─→ Faculty clicks "Profile"
  │   └─→ Navigate to /faculty/profile
  │
  ├─→ FacultyProfile page renders
  │   ├─→ Current profile information:
  │   │   ├─→ Name
  │   │   ├─→ Email
  │   │   ├─→ Phone
  │   │   ├─→ Address
  │   │   ├─→ Department
  │   │   ├─→ Qualifications
  │   │   └─→ Profile picture
  │   ├─→ Sticky header (remains visible when scrolling)
  │   ├─→ Three-column layout:
  │   │   ├─→ Left: Profile picture + basic info
  │   │   ├─→ Center: Detailed information (scrollable)
  │   │   └─→ Right: Quick stats/sidebar
  │   └─→ Edit buttons for each section
  │
  ├─→ Sections visible on scroll:
  │   ├─→ Personal Information
  │   ├─→ Qualifications & Certifications
  │   ├─→ Department & Subject Assignment
  │   ├─→ Contact Information
  │   └─→ Availability Schedule
  │
  ├─→ Faculty clicks "Edit Qualifications"
  │   ├─→ Modal opens with form
  │   ├─→ Can add qualifications:
  │   │   ├─→ Degree (B.A., M.A., Ph.D., etc.)
  │   │   ├─→ Field of Study
  │   │   ├─→ Institution
  │   │   └─→ Year Completed
  │   └─→ Click "Update"
  │
  ├─→ POST /api/faculty/profile/qualifications
  │   ├─→ Backend validates data
  │   ├─→ Updates user profile record
  │   └─→ Returns updated profile
  │
  ├─→ Frontend updates display
  │   ├─→ Qualifications section reflects changes
  │   ├─→ Success notification
  │   └─→ Profile picture updates if uploaded
  │
  └─→ END
```

---

## Database Schema

### Core Tables

#### Schools Table
```sql
CREATE TABLE schools (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    subdomain VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Users Table
```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    school_id VARCHAR(36) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    role ENUM('super_admin', 'school_admin', 'faculty', 'student') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    must_change_password BOOLEAN DEFAULT FALSE,
    profile_picture_url TEXT,
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);
```

#### Sessions Table
```sql
CREATE TABLE sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### School Pages Table
```sql
CREATE TABLE school_pages (
    id VARCHAR(36) PRIMARY KEY,
    school_id VARCHAR(36) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    logo_url TEXT,
    cover_image_url TEXT,
    follower_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);
```

#### Posts Table
```sql
CREATE TABLE posts (
    id VARCHAR(36) PRIMARY KEY,
    school_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    media_url TEXT,
    created_by VARCHAR(36) NOT NULL,
    status ENUM('draft', 'published') DEFAULT 'draft',
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
```

#### Subscriptions Table
```sql
CREATE TABLE subscriptions (
    id VARCHAR(36) PRIMARY KEY,
    school_id VARCHAR(36) NOT NULL UNIQUE,
    plan_id VARCHAR(36),
    status ENUM('active', 'suspended', 'expired', 'cancelled') DEFAULT 'active',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    price DECIMAL(10, 2),
    billing_cycle ENUM('monthly', 'yearly') DEFAULT 'monthly',
    auto_renew BOOLEAN DEFAULT TRUE,
    suspended_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);
```

#### Announcements Table
```sql
CREATE TABLE announcements (
    id VARCHAR(36) PRIMARY KEY,
    school_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    created_by VARCHAR(36) NOT NULL,
    target_role ENUM('all', 'faculty', 'student') DEFAULT 'all',
    status ENUM('draft', 'published') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

#### Roles & Permissions Table (for RBAC)
```sql
CREATE TABLE roles (
    id VARCHAR(36) PRIMARY KEY,
    school_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    id VARCHAR(36) PRIMARY KEY,
    role_id VARCHAR(36) NOT NULL,
    permission_name VARCHAR(255) NOT NULL,
    resource VARCHAR(255),
    action VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);
```

---

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | User login | No |
| POST | `/api/auth/logout` | User logout | Yes |
| POST | `/api/auth/change-password` | Change password (after first login) | Yes |
| POST | `/api/auth/reset-password` | Reset forgotten password | No |
| GET | `/api/auth/me` | Get current user info | Yes |

### Super Admin Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/super-admin/schools` | List all schools | Yes (SA) |
| POST | `/api/super-admin/schools` | Create new school | Yes (SA) |
| GET | `/api/super-admin/schools/:id` | Get school details | Yes (SA) |
| POST | `/api/super-admin/schools/:id/status` | Toggle school status | Yes (SA) |
| POST | `/api/super-admin/schools/:sourceId/clone` | Clone school config | Yes (SA) |
| GET | `/api/super-admin/users` | List all users | Yes (SA) |
| POST | `/api/super-admin/users` | Create new user | Yes (SA) |
| POST | `/api/super-admin/users/:userId/reset-password` | Reset user password | Yes (SA) |

### School Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/school/dashboard/stats` | School dashboard stats | Yes |
| GET | `/api/school/users` | List school users | Yes (SA) |
| POST | `/api/school/users` | Create user in school | Yes (SA) |
| GET | `/api/school/announcements` | List announcements | Yes |
| POST | `/api/school/announcements` | Create announcement | Yes (SA) |

### School Page Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/school-page/:schoolId/profile` | Get school page profile | No |
| GET | `/api/school-page/:schoolId/posts` | Get school posts | No |
| POST | `/api/school-page/posts` | Create post | Yes (Admin) |
| PUT | `/api/school-page/posts/:postId` | Update post | Yes (Admin) |
| DELETE | `/api/school-page/posts/:postId` | Delete post | Yes (Admin) |
| POST | `/api/school-page/posts/:postId/like` | Like post | Yes |
| GET | `/api/school-page/posts/:postId/comments` | Get post comments | No |
| POST | `/api/school-page/posts/:postId/comments` | Add comment | Yes |

### Subscription Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/subscription/plans` | List subscription plans | Yes |
| POST | `/api/subscription/assign-plan` | Assign plan to school | Yes (SA) |
| POST | `/api/subscription/upgrade-subscription` | Upgrade plan | Yes (SA) |
| GET | `/api/subscription/school/:schoolId/status` | Check subscription status | Yes |
| GET | `/api/subscription/statistics` | Subscription metrics | Yes (SA) |

---

## File Structure

```
eduima/
├── backend/
│   ├── config/
│   │   ├── database.js          # MySQL connection config
│   │   └── constants.js         # App constants
│   ├── controllers/
│   │   ├── authController.js               # Auth logic
│   │   ├── superAdminController.js         # Super admin operations
│   │   ├── schoolController.js             # School operations
│   │   ├── schoolPageController.js         # School page/posts
│   │   ├── facultyProfileController.js     # Faculty profiles
│   │   ├── subscriptionController.js       # Subscription management
│   │   ├── templateController.js           # Template management
│   │   └── passwordResetController.js      # Password reset
│   ├── middleware/
│   │   ├── authMiddleware.js    # JWT verification
│   │   ├── roleMiddleware.js    # Role-based access
│   │   └── errorHandler.js      # Error handling
│   ├── models/
│   │   ├── User.js              # User DB operations
│   │   ├── School.js            # School DB operations
│   │   ├── Post.js              # Post DB operations
│   │   ├── Subscription.js      # Subscription DB operations
│   │   └── Announcement.js      # Announcement DB operations
│   ├── routes/
│   │   ├── auth.js              # Auth endpoints
│   │   ├── superAdmin.js        # Super admin endpoints
│   │   ├── school.js            # School endpoints
│   │   ├── schoolPage.js        # School page endpoints
│   │   ├── subscription.js      # Subscription endpoints
│   │   ├── rbac.js              # Role/permission endpoints
│   │   └── schoolSetupTemplates.js   # Template endpoints
│   ├── services/
│   │   ├── authService.js       # Auth business logic
│   │   ├── emailService.js      # Email operations
│   │   └── analyticsService.js  # Analytics logic
│   ├── utils/
│   │   ├── validators.js        # Input validation
│   │   ├── generateCredentials.js # Auto-generate credentials
│   │   └── jwt.js               # JWT utilities
│   ├── database/
│   │   ├── schema.sql           # DB schema
│   │   ├── migrations/          # Migration scripts
│   │   └── seed.js              # Seed data
│   ├── server.js                # Express app entry
│   ├── package.json
│   └── .env                     # Backend config
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx           # Main layout wrapper
│   │   │   ├── Sidebar.jsx          # Navigation sidebar
│   │   │   ├── TopBar.jsx           # Top navigation bar
│   │   │   ├── ProtectedRoute.jsx   # Route protection component
│   │   │   ├── ThemeToggle.jsx      # Dark/light mode switch
│   │   │   └── [Other components]/
│   │   │
│   │   ├── pages/
│   │   │   ├── Login.jsx                      # Login page
│   │   │   ├── Dashboard.jsx                  # Role-specific dashboard
│   │   │   ├── StudentDashboard.jsx           # Student dashboard
│   │   │   ├── StudentProfile.jsx             # Student profile (sticky layout)
│   │   │   ├── StudentFunLearning.jsx         # Game hub
│   │   │   ├── FacultyProfile.jsx             # Faculty profile
│   │   │   ├── Schools.jsx                    # School list (SA)
│   │   │   ├── Users.jsx                      # User management (SA)
│   │   │   ├── Analytics.jsx                  # Analytics (SA)
│   │   │   ├── SubscriptionManagement.jsx     # Subscription mgmt (SA)
│   │   │   ├── SchoolPageProfile.jsx          # School page
│   │   │   └── [Other pages]/
│   │   │
│   │   ├── games/
│   │   │   ├── components/
│   │   │   │   ├── BlockEditor.jsx        # Blockly block editor
│   │   │   │   ├── GameCanvas.jsx         # Canvas renderer (Sprite Coder)
│   │   │   │   ├── ScoreBar.jsx           # Game score panel
│   │   │   │   └── SpriteCoder.jsx        # Sprite Coder game container
│   │   │   ├── store/
│   │   │   │   ├── gameSlice.js           # Redux slice (game state)
│   │   │   │   └── store.js               # Redux store factory
│   │   │   ├── vm/
│   │   │   │   └── useSpriteVM.js         # Sprite command VM
│   │   │   ├── styles/
│   │   │   │   └── funLearningTheme.js    # Game UI themes
│   │   │   └── [Game components]/
│   │   │
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx            # Auth state & methods
│   │   │   └── ThemeContext.jsx           # Theme state (dark/light)
│   │   │
│   │   ├── services/
│   │   │   ├── api.js                     # Axios API client
│   │   │   ├── authService.js             # Auth API calls
│   │   │   ├── schoolService.js           # School API calls
│   │   │   ├── subscriptionService.js     # Subscription API calls
│   │   │   └── [Other services]/
│   │   │
│   │   ├── App.jsx                        # Main app component
│   │   ├── main.jsx                       # React entry point
│   │   └── index.css                      # Global styles
│   │
│   ├── vite.config.js                     # Vite build config
│   ├── package.json
│   ├── .env                               # Frontend config
│   └── index.html
│
├── README.md                              # Project README
├── ARCHITECTURE.md                        # System architecture docs
├── PROJECT_SUMMARY.md                     # Features summary
├── PROJECT_DEFINITION.md                  # This file
├── setup.ps1                              # Windows setup script
├── start.ps1                              # Windows start script
└── QUICKSTART.md                          # Quick start guide
```

---

## Key Technologies & Patterns

### Frontend Patterns

**1. Protected Routes:**
```jsx
<ProtectedRoute 
  element={<StudentDashboard />} 
  requiredRoles={['student', 'faculty', 'school_admin', 'super_admin']}
/>
```

**2. Context-Based Auth:**
```jsx
const { user, login, logout, isLoading } = useContext(AuthContext);
```

**3. Redux for Game State (Sprite Coder):**
```jsx
const { sprites, level, score } = useSelector(state => state.game);
dispatch(executeStep(command));
```

**4. MUI Responsive Layout:**
```jsx
<Grid container spacing={2}>
  <Grid size={{ xs: 12, md: 8 }}>Content</Grid>
  <Grid size={{ xs: 12, md: 4 }}>Sidebar</Grid>
</Grid>
```

---

## Current Development Status

✅ **Completed:**
- Authentication system (login, logout, password change)
- Multi-tenant school architecture
- Role-based access control
- Dashboard landing pages (all 4 roles)
- Super admin school/user management
- School page module (posts, followers, comments)
- Subscription management system
- Faculty profile pages
- Entertainment games (Math Sprint, Sequence Recall, Word Forge, Orbit Quest)
- Chemistry Lab with realistic reactions
- Animated characters and celebration effects
- Interactive mixing animations in Chem Lab

⏳ **In Progress:**
- Enhanced game difficulty and progression
- Sprite Coder (visual block programming) optimization
- Analytics & monitoring dashboards

🔄 **Next Phase:**
- Backend persistence for game scores
- Leaderboard system
- Advanced scheduling features
- Video integration for school announcements
- Mobile app (React Native)
- Multiplayer game features

---

## Deployment Instructions

### Local Setup (XAMPP)
1. Start XAMPP (MySQL + Apache)
2. Create database from schema.sql
3. Backend: `npm install && npm run dev` (Port 5000)
4. Frontend: `npm install && npm run dev` (Port 5173)

### Production (Future)
- Containerize with Docker
- Deploy backend to cloud (AWS/GCP/Azure)
- Deploy frontend to CDN
- Configure DNS for multi-tenant subdomains

---

## Conclusion

Eduima is a comprehensive, scalable school management platform with integrated educational gaming. The modular architecture allows for rapid feature additions, and the role-based system ensures security and access control across multiple institutions.

For questions or updates, refer to additional documentation in the root `/` directory.

---

**Generated:** March 23, 2026  
**Project Owner:** EduIMA Development Team  
**License:** MIT
