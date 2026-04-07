# 🎓 Eduima - Features & Flows Visual Guide

**Quick Reference for Application Workflows**

---

## Complete Feature Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            EDUIMA PLATFORM                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ SUPER ADMIN FEATURES ─────────────────────────────────────────────────────┐
│                                                                               │
│  Dashboard Metrics:                                                          │
│  ├─ Total Schools Active                                                     │
│  ├─ Total Users (All Schools)                                               │
│  ├─ Subscription Revenue                                                     │
│  └─ System Health Status                                                     │
│                                                                               │
│  School Management:                                                          │
│  ├─ Create New School (auto-subdomain generation)                           │
│  ├─ View All Schools                                                         │
│  ├─ Edit School Information                                                  │
│  ├─ Activate/Deactivate Schools                                             │
│  ├─ Clone School Configuration                                               │
│  └─ View School Statistics                                                   │
│                                                                               │
│  User Management:                                                            │
│  ├─ Create Users (Any Role)                                                 │
│  ├─ View All Users (All Schools)                                            │
│  ├─ Reset User Passwords                                                     │
│  ├─ Activate/Deactivate Accounts                                            │
│  ├─ Force Password Change on Next Login                                     │
│  └─ Export User Reports                                                      │
│                                                                               │
│  Subscription Management:                                                    │
│  ├─ Define Subscription Plans                                                │
│  ├─ Assign Plans to Schools                                                  │
│  ├─ Upgrade/Downgrade Subscriptions                                         │
│  ├─ View Subscription Metrics                                                │
│  ├─ Auto-Suspend Expired Subscriptions                                      │
│  └─ Send Expiration Alerts                                                   │
│                                                                               │
│  Template Management:                                                        │
│  ├─ Create Academic Templates (Streams, Exam Patterns)                      │
│  ├─ Define Holiday Presets                                                   │
│  ├─ Share Templates Across Schools                                           │
│  └─ Archive/Deprecate Templates                                              │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ SCHOOL ADMIN FEATURES ────────────────────────────────────────────────────┐
│                                                                               │
│  School Dashboard:                                                           │
│  ├─ Student Count                                                            │
│  ├─ Faculty Count                                                            │
│  ├─ Recent Activity                                                          │
│  └─ Subscription Status                                                      │
│                                                                               │
│  School User Management:                                                     │
│  ├─ Create New Users (Within School)                                        │
│  ├─ View School Users by Role                                                │
│  ├─ Reset User Passwords                                                     │
│  ├─ Manage Faculty Assignments                                               │
│  └─ Bulk Import Users (if enabled)                                          │
│                                                                               │
│  School Page Management:                                                     │
│  ├─ Edit School Profile Information                                          │
│  ├─ Upload School Logo & Cover Image                                        │
│  ├─ Create & Publish School Posts                                           │
│  ├─ View Follower List                                                       │
│  ├─ Moderate Comments on Posts                                               │
│  └─ View Post Analytics                                                      │
│                                                                               │
│  Announcements:                                                              │
│  ├─ Create Announcements                                                     │
│  ├─ Target by Role (Faculty/Students/All)                                   │
│  ├─ Schedule Publication (if enabled)                                        │
│  ├─ Archive Announcements                                                    │
│  └─ View Announcement Stats                                                  │
│                                                                               │
│  School Settings:                                                            │
│  ├─ Configure Active Modules                                                 │
│  ├─ Set School Policies                                                      │
│  ├─ Customize Appearance                                                     │
│  └─ Manage Integrations                                                      │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ FACULTY FEATURES ─────────────────────────────────────────────────────────┐
│                                                                               │
│  Profile Management:                                                         │
│  ├─ View/Edit Personal Information                                          │
│  ├─ Upload Profile Picture                                                   │
│  ├─ Add Qualifications & Certifications                                     │
│  ├─ List Subjects & Department                                               │
│  └─ Set Availability & Office Hours                                         │
│                                                                               │
│  Class Management:                                                           │
│  ├─ View Assigned Classes                                                     │
│  ├─ Create Class Announcements                                               │
│  ├─ Upload Assignments                                                       │
│  ├─ View Student Roster                                                      │
│  └─ Track Student Submissions                                                │
│                                                                               │
│  Schedule & Attendance:                                                      │
│  ├─ View Class Schedule                                                      │
│  ├─ Upload Attendance Records                                                │
│  ├─ View Attendance History                                                  │
│  └─ Generate Reports                                                         │
│                                                                               │
│  Performance Tracking:                                                       │
│  ├─ View Class Statistics                                                     │
│  ├─ Track Student Progress                                                    │
│  ├─ Generate Performance Reports                                             │
│  └─ Identify At-Risk Students                                                │
│                                                                               │
│  Student Interaction:                                                        │
│  ├─ Message Students                                                         │
│  ├─ Provide Feedback on Work                                                 │
│  ├─ Schedule Office Hours                                                    │
│  └─ Create Internal Notes                                                    │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ STUDENT FEATURES ─────────────────────────────────────────────────────────┐
│                                                                               │
│  Dashboard:                                                                  │
│  ├─ Enrolled Classes                                                         │
│  ├─ Upcoming Assignments                                                     │
│  ├─ Grade Summary                                                            │
│  └─ Performance Overview                                                     │
│                                                                               │
│  Profile Management:                                                         │
│  ├─ View/Edit Personal Information                                          │
│  ├─ Upload Profile Picture                                                   │
│  ├─ View Academic History                                                     │
│  ├─ List Parent/Guardian Contacts                                           │
│  └─ Update Contact Information                                               │
│                                                                               │
│  Class & Assignments:                                                        │
│  ├─ View Class Details                                                        │
│  ├─ Download Class Materials                                                 │
│  ├─ View Assignments                                                         │
│  ├─ Submit Assignments                                                       │
│  ├─ View Submission Status                                                    │
│  └─ View Grades & Feedback                                                   │
│                                                                               │
│  Performance Tracking:                                                       │
│  ├─ View Grades                                                              │
│  ├─ Attendance Record                                                        │
│  ├─ Performance Analytics                                                    │
│  └─ Progress Goals                                                           │
│                                                                               │
│  Fun Learning - Educational Games:  ◄── NEW FEATURES (Recent Add)          │
│  ├─ Math Sprint (Timed Arithmetic)                                          │
│  │   └─ Auto-difficulty progression (Easy → Moderate → Hard)               │
│  ├─ Sequence Recall (Memory Game)                                            │
│  │   └─ Round-based progressive difficulty                                  │
│  ├─ Word Forge (Anagram Solver)                                              │
│  │   └─ Timed word unscrambling                                             │
│  ├─ Orbit Quest (Planet Identification)                                      │
│  │   └─ Astronomy with visual solar system                                  │
│  └─ Chem Lab (Realistic Chemistry)                                           │
│      ├─ Animated mixing simulation                                           │
│      ├─ Wrong answer prediction visualization                               │
│      ├─ Character interactions (Professor Catalyst)                         │
│      └─ Difficulty progression (Easy → Moderate → Hard)                    │
│                                                                               │
│  School Community:                                                           │
│  ├─ View School Page                                                         │
│  ├─ Follow/Unfollow School                                                   │
│  ├─ Read School Posts                                                        │
│  ├─ Like Posts                                                               │
│  ├─ Comment on Posts                                                         │
│  └─ View Announcements                                                       │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Game Features Deep Dive

### Math Sprint - Smart Arithmetic Game

**Visual Representation:**
```
┌─────────────────────────────────┐
│   MATH SPRINT                   │
├─────────────────────────────────┤
│                                 │
│  Level: Easy  [| 50% progress]  │ (auto-based on score)
│  [Progress bar showing time]    │
│                                 │
│  ⏱️ Time: 45s                   │
│  ⭐ Score: 150                  │
│                                 │
│  ┌────────────────────────────┐ │
│  │    8 + 5 = ?               │ │
│  └────────────────────────────┘ │
│                                 │
│  [ Your answer:  13  ]          │
│            [Submit]             │
│                                 │
│  ✅ Correct! +10 points, +10s  │
│                                 │
└─────────────────────────────────┘

Difficulty Progression:
  0 ← Start
  |
  Easy (0-49 pts): +/- only
  |
  50 ← Level Up 🎯
  |
  Moderate (50-99 pts): ×, ÷ mixed
  |
  100 ← Level Up 🚀
  |
  Hard (100+ pts): BODMAS expressions
  |
  ∞ (endless play in hard mode)
```

**Question Types by Difficulty:**

Easy Mode:
- `8 + 2 = 10`
- `15 - 7 = 8`
- `3 + 9 = 12`

Moderate Mode:
- `12 × 7 = 84`
- `144 ÷ 12 = 12`
- `20 + 8 = 28`

Hard Mode:
- `(3 + 5) × 2 = 16` (brackets first)
- `20 - 3 × 4 = 8` (multiplication before subtraction)
- `(24 ÷ 3) + 5 = 13` (division then addition)

---

### Chem Lab - Interactive Chemistry

**Game Flow Diagram:**

```
┌─────────────── Chem Lab Game Loop ──────────────┐
│                                                  │
│  [1] Scenario Presented                         │
│      Left Reagent:  HCl (Hydrochloric Acid)    │
│      Right Reagent: NaOH (Sodium Hydroxide)    │
│      Prompt: "Most likely observation?"         │
│      Options: [Neutralization], [Bubbles], ... │
│                                                  │
│  [2] Student Selects Option                    │
│      → Mixing Animation Starts                  │
│      → Character Performs Action                │
│      → [MIXING STATE ACTIVE]                   │
│                                                  │
│  [3] Pour Animation (900ms)                    │
│      ┌─────────────────────┐                   │
│      │  Flask Animation    │                   │
│      │  Left stream ↘ ↙ Right stream           │
│      │  Color transition   │                   │
│      │  Bubble effects     │                   │
│      └─────────────────────┘                   │
│                                                  │
│  [4] Outcome Reveal                            │
│      IF Correct:                               │
│      ├─ Flask = Actual Result Color            │
│      ├─ Character celebrates                   │
│      ├─ Burst particles appear                 │
│      ├─ +14 points, +5 seconds                │
│      └─ Auto-load next round                   │
│                                                  │
│      IF Wrong:                                 │
│      ├─ Flask = User's Predicted Color First   │
│      ├─ Shows: "Predicted: ... | Actual: ..."  │
│      ├─ Character guides with dialogue         │
│      ├─ No points awarded                      │
│      ├─ Educational value: Compare prediction  │
│      └─ Auto-load next round after 1.5s        │
│                                                  │
└────────────────────────────────────────────────┘
```

**Easy Chemistry Reactions:**

1. **Acid-Base Neutralization**
   - Hydrochloric Acid (HCl) + Sodium Hydroxide (NaOH)
   - Correct Answer: Neutralization (salt + water forms, solution warms)
   - pH shifts from extreme to neutral (7)

2. **Gas Evolution**
   - Vinegar (Acetic Acid) + Baking Soda
   - Correct Answer: Rapid CO₂ fizzing/bubbles
   - Visual: Flask shows effervescence

**Moderate Chemistry Reactions:**

1. **White Precipitate Formation**
   - Silver Nitrate + Sodium Chloride
   - Correct Answer: White AgCl precipitate forms (insoluble)

2. **Displacement Reaction**
   - Copper Sulfate + Iron Nail
   - Correct Answer: Reddish copper coating appears on nail surface

**Hard Chemistry Reactions:**

1. **Gas Evolution (Hydrogen)**
   - Hydrochloric Acid + Zinc Metal
   - Correct Answer: Hydrogen gas bubbles vigorously

2. **Indicator Color Change**
   - Universal Indicator + Ammonia Solution
   - Correct Answer: Indicator shifts to blue-violet in basic environment

---

## User Journey Maps

### New Student Onboarding Flow

```
┌─ STUDENT ONBOARDING JOURNEY ───────────────────────────────┐
│                                                              │
│  [Step 1] User Receives Credentials                         │
│  Email: student@school.com                                  │
│  Password: Temp_Pass_2024!                                  │
│                                                              │
│  [Step 2] First Login                                       │
│  └─ Lands on Login Page                                     │
│     └─ Enters email & temporary password                    │
│        └─ System detects: must_change_password = true       │
│           └─ Redirects to ChangePasswordOnFirstLogin page   │
│              └─ Form: [Current], [New], [Confirm]          │
│                 └─ Password must be strong (12+ chars...)   │
│                    └─ Updates password                      │
│                       └─ Auto-redirects to StudentDashboard │
│                                                              │
│  [Step 3] Dashboard Orientation                             │
│  Sidebar visible with:                                      │
│  ├─ Dashboard                                                │
│  ├─ Profile                                                  │
│  ├─ Classes                                                  │
│  ├─ Assignments                                              │
│  ├─ Grades                                                   │
│  ├─ Fun Learning  ◄─ NEW! (Games)                          │
│  ├─ School Page                                              │
│  └─ Settings                                                 │
│                                                              │
│  [Step 4] Explore Profile                                   │
│  └─ Click Profile → Sticky 3-column layout loads           │
│     ├─ Left: Profile picture, basic info                   │
│     ├─ Center: Scrollable detailed info                    │
│     └─ Right: Quick statistics sidebar                     │
│                                                              │
│  [Step 5] Try First Game                                   │
│  └─ Click Fun Learning                                      │
│     └─ Game Hub renders with 5 game cards                  │
│        ├─ Math Sprint (Beginner)                            │
│        ├─ Sequence Recall (Intermediate)                    │
│        ├─ Word Forge (Advanced)                             │
│        ├─ Orbit Quest (Science)                             │
│        └─ Chem Lab (Science) ◄─ Most interactive!          │
│           └─ Click "Play Here"                              │
│              └─ Loading popup (1.2s animation)              │
│                 └─ Game launches!                           │
│                    └─ Student has fun + learns              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Admin Creates New School

```
┌─ SUPER ADMIN: CREATE SCHOOL WORKFLOW ──────────────────────┐
│                                                              │
│  [View] SuperAdmin Dashboard                                │
│  ├─ Navigation: "School Management"                         │
│  └─ Button: "Create New School" (green CTA)                │
│                                                              │
│  [Modal] School Creation Form Opens                         │
│  ├─ School Name: "Green Valley Academy"                    │
│  ├─ Location: "New York"                                    │
│  ├─ Email: "info@greenvalley.edu"                           │
│  ├─ Phone: "(555) 123-4567" (optional)                      │
│  ├─ Address: "123 Main St, NY" (optional)                   │
│  └─ Submit Button: "CREATE SCHOOL"                          │
│                                                              │
│  [Backend Processing]                                       │
│  ├─ Validate input                                           │
│  ├─ Generate unique subdomain:                              │
│  │  Algorithm: "{school_name_lower}-{location_lower}"      │
│  │  Result: "greenvalley-newyork"                           │
│  ├─ Create school record in DB                              │
│  ├─ Auto-generate School Admin credentials:                │
│  │  Email: "admin-{uuid}@greenvalley-newyork.eduima.com"   │
│  │  Password: "Temp_Pass_{randomChars}"                     │
│  │  Role: school_admin                                      │
│  │  Status: Active                                          │
│  └─ Commit transaction                                      │
│                                                              │
│  [Frontend Response]                                        │
│  ├─ Success message: "School created!"                     │
│  ├─ Display admin email                                     │
│  ├─ Display temporary password                              │
│  ├─ Copy-to-clipboard button                                │
│  ├─ Send Email option (to admin)                            │
│  └─ Close Modal → Refresh school list                       │
│                                                              │
│  [New School Appears in List]                              │
│  ├─ Name: Green Valley Academy                              │
│  ├─ Location: New York                                      │
│  ├─ Subdomain: greenvalley-newyork ✅                       │
│  ├─ Users: 1 (School Admin)                                │
│  ├─ Status: Active ✅                                       │
│  └─ Actions: [Edit] [View] [Deactivate]                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### Authentication & Authorization Flow

```
┌─ REQUEST ─────┐
│ POST /api/    │
│ auth/login    │
└────┬──────────┘
     │
     ├─ Headers: None
     └─ Body: { email, password }
        │
        ▼
     ┌─────────────────────────────┐
     │ Backend (Express)           │
     ├─────────────────────────────┤
     │ [1] Validate Input          │
     │ [2] Find User by Email      │
     │ [3] Compare Passwords       │
     │     (bcryptjs.compare)      │
     │ [4] Password Match?         │
     │     ├─ YES: Generate JWT    │
     │     │   jwt.sign({          │
     │     │     userId, email,    │
     │     │     role, schoolId,   │
     │     │     exp: now + 7days  │
     │     │   })                  │
     │     └─ NO: Return Error 401 │
     │ [5] Return Token + User     │
     └────┬──────────────────────────┘
          │
          ▼
     ┌─────────────────────────┐
     │ Frontend (React)        │
     ├─────────────────────────┤
     │ [1] Receive JWT         │
     │ [2] Store in localStorage
     │ [3] Set Auth context    │
     │ [4] Redirect per role   │
     │     ├─ super_admin →    │
     │     │  /superadmin/     │
     │     │  dashboard        │
     │     ├─ school_admin →   │
     │     │  /school/admin    │
     │     ├─ faculty →        │
     │     │  /faculty/        │
     │     │  dashboard        │
     │     └─ student →        │
     │        /student/        │
     │        dashboard        │
     └─────────────────────────┘

┌─ SUBSEQUENT REQUESTS ─────────────────────────────────┐
│                                                        │
│ GET /api/school/dashboard/stats                       │
│ Headers: {                                             │
│   Authorization: "Bearer {JWT_TOKEN_FROM_STORAGE}"   │
│ }                                                      │
│                                                        │
│  ↓                                                     │
│                                                        │
│ Backend Middleware: authMiddleware                    │
│ ├─ Extract token from Authorization header            │
│ ├─ Verify JWT signature                               │
│ ├─ Check token expiration                             │
│ ├─ Decode to get userId, role, schoolId              │
│ ├─ Token Valid? → Proceed                             │
│ └─ Token Invalid? → Return 401 Unauthorized           │
│                                                        │
│  ↓                                                     │
│                                                        │
│ Backend Middleware: roleMiddleware('school_admin')    │
│ ├─ Check decoded role == 'school_admin'              │
│ ├─ Role Correct? → Proceed                            │
│ └─ Role Wrong? → Return 403 Forbidden                │
│                                                        │
│  ↓                                                     │
│                                                        │
│ Backend Controller: Execute Logic                     │
│ ├─ User authenticated & authorized                    │
│ └─ Fetch school dashboard stats                       │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Subscription Model

```
┌─ SUBSCRIPTION LIFECYCLE ────────────────────────┐
│                                                  │
│  [Create]                                       │
│  School assigned subscription plan             │
│  ├─ Plan: Premium                              │
│  ├─ Price: $500/month                          │
│  ├─ Start: Today                               │
│  ├─ End: +30 days                              │
│  ├─ Status: ACTIVE                             │
│  └─ Auto-renew: TRUE                           │
│                                                  │
│  [Active Period]                               │
│  ├─ Users can access all premium features      │
│  ├─ School page active                         │
│  ├─ Games accessible                           │
│  └─ Admin functions enabled                    │
│                                                  │
│  [15 Days Before Expiration]                   │
│  └─ Send reminder email to school admin        │
│                                                  │
│  [Day of Expiration]                           │
│  ├─ Check auto_renew flag                      │
│  ├─ If TRUE: Auto-renew                        │
│  │  ├─ Charge payment (if integrated)         │
│  │  ├─ Extend end_date +30 days               │
│  │  └─ Status remains: ACTIVE                 │
│  │                                             │
│  └─ If FALSE: Expire                           │
│     ├─ Status: EXPIRED                         │
│     ├─ Disable non-critical features           │
│     └─ Send "Upgrade" prompt                   │
│                                                  │
│  [Suspension]                                  │
│  If unpaid/cancelled:                          │
│  ├─ Status: SUSPENDED                          │
│  ├─ suspended_at timestamp                     │
│  ├─ Most features disabled                     │
│  ├─ Read-only access allowed                   │
│  └─ Button: "Restore Subscription"             │
│                                                  │
│  [Restore]                                     │
│  Admin can restore if:                         │
│  ├─ Less than 90 days suspended                │
│  ├─ Payment resolved                           │
│  ├─ Status: SUSPENDED → ACTIVE                 │
│  └─ Resume normal operations                   │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## Responsive Layout Behavior

### Three-Column Sticky Layout (StudentProfile)

```
DESKTOP (md and up):
┌──────────────────────────────────────────────────────┐
│                   Top Bar / Header                   │
├──────────┬──────────────────────────────────┬────────┤
│          │                                  │        │
│ Sidebar  │  Center Content (Scrollable)    │ Right  │
│ (Sticky) │                                  │ Sidebar│
│          │  ├─ Personal Info               │(Sticky)│
│ - Logo   │  ├─ Qualifications              │        │
│ - Nav    │  ├─ Addresses                   │ Stats: │
│ - Etc    │  ├─ Schedule                    │ • Pts  │
│          │  │  (scrollable, independent)   │ • Lvl  │
│          │  └─ More sections...            │ • Rank │
│          │                                  │        │
├──────────┼──────────────────────────────────┼────────┤
│  Footer  │         Footer Span              │        │
└──────────┴──────────────────────────────────┴────────┘

TABLET (sm):
┌──────────────────────────────────────────────────────┐
│              Header (Compact)                        │
├────────────┬──────────────────┬─────────────────────┤
│ Sidebar    │ Center Content   │  Right Sidebar      │
│(Collapsible)│ (Scrollable)     │ (Below on scroll)   │
│            │                  │                     │
│ - Logo     │ Personal Info    │ When scrolled:      │
│ - Menu     │ Qualifications   │ Hidden below        │
│   (Icons)  │ Address          │ content             │
│            │ Schedule         │                     │
│            │ (scrollable)     │                     │
│            │                  │                     │
└────────────┴──────────────────┴─────────────────────┘

MOBILE (xs):
┌──────────────────────────────────┐
│     Header (Hamburger Menu)      │
├──────────────────────────────────┤
│                                  │
│  Full-Width Content              │
│  ├─ Personal Info                │
│  ├─ Qualifications               │
│  ├─ Address                      │
│  ├─ Schedule                     │
│  ├─ [Sidebar items stacked]      │
│  └─ Stats sidebar at end         │
│                                  │
├──────────────────────────────────┤
│  Bottom Navigation / Footer      │
└──────────────────────────────────┘

KEY DIFFERENCES:
- Desktop: Three columns, all sticky
- Tablet: Three columns, center scrolls, right sidebar sticky
- Mobile: Stacked vertically, full-width, bottom nav
- Independent scrolling maintained in center column across all layouts
```

---

## Summary of Recent Additions

```
✨ NEW IN THIS SESSION ✨

1. Math Sprint Enhancement
   └─ Auto-difficulty progression
   └─ Removed manual level tabs
   └─ Easy → Moderate → Hard based on score

2. Orbit Quest (Science Game)
   └─ 8 planets with clues
   └─ Captain Nova animated character
   └─ Visual solar system diagram
   └─ Celebration on correct answers

3. Chem Lab Overhaul
   └─ Realistic chemistry scenarios
   └─ Professor Catalyst character
   └─ Animated pour simulation
   └─ Wrong answer prediction display
   └─ Difficulty auto-progression
   └─ Educational chemistry formulas & pH values

4. Interactive Animations
   └─ Character mixing animations
   └─ Particle burst effects on correct answers
   └─ Flask color transitions
   └─ Pour stream animations
   └─ Reaction Flask with bubbles

5. Enhanced Game UX
   └─ Disabled buttons during animations
   └─ Character dialogue states
   └─ Status messages for game progression
   └─ Automatic round loading
```

---

**Document Version:** 1.0  
**Created:** March 23, 2026  
**Updated:** Ongoing Development
