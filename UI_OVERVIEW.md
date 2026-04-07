# 📸 Application Screens & UI Overview

## Login Page

```
┌─────────────────────────────────────────────────────────────────┐
│                                              [ 🌙 ] Theme Toggle │
│                                                                  │
│                          Eduima                                  │
│                  School Management System                        │
│                                                                  │
│           ┌─────────────────────────────────────┐               │
│           │         Login                       │               │
│           │                                     │               │
│           │  Email                              │               │
│           │  [your@email.com               ]    │               │
│           │                                     │               │
│           │  Password                           │               │
│           │  [••••••••••••                ]    │               │
│           │                                     │               │
│           │     [ Login ]                       │               │
│           │                                     │               │
│           │  Demo Credentials:                  │               │
│           │  Super Admin: superadmin@eduima.com │               │
│           │  Password: SuperAdmin@123           │               │
│           │  School Admin: admin@demo...        │               │
│           └─────────────────────────────────────┘               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Features:
- Clean, centered design
- Theme toggle in top-right
- Demo credentials displayed
- Gradient background
- Responsive layout

---

## Dashboard - Super Admin

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────┐                                                          │
│ │   Eduima    │  DASHBOARD                                               │
│ │ Super Admin │                                                          │
│ ├─────────────┤  Welcome back, Super!                                    │
│ │             │                                                          │
│ │ 📊 Dashboard│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ │ 🏫 Schools  │  │   🏫     │ │    ✅    │ │    👥    │ │    🟢    │  │
│ │ 👥 Users    │  │ Total    │ │  Active  │ │  Total   │ │  Active  │  │
│ │             │  │ Schools  │ │ Schools  │ │  Users   │ │  Users   │  │
│ ├─────────────┤  │    2     │ │    2     │ │    15    │ │    14    │  │
│ │             │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│ │ Super Admin │                                                          │
│ │ super@...   │  ┌────────────────────────────────────────────────┐    │
│ │ [ 🌙 ]      │  │  Recent Activity                                │    │
│ │ [ Logout ]  │  │  No recent activity to display.                 │    │
│ └─────────────┘  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Features:
- Left sidebar navigation (persistent)
- 4 statistics cards
- Recent activity section
- User info in sidebar
- Theme toggle
- Logout button

---

## Schools Management Page

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────┐                                                          │
│ │   Eduima    │  SCHOOLS                              [ Add School ]     │
│ │ Super Admin │                                                          │
│ ├─────────────┤                                                          │
│ │             │  ┌────────────────┐ ┌────────────────┐ ┌─────────────┐ │
│ │ 📊 Dashboard│  │ Demo Public    │ │ Test School    │ │ Aryan Public│ │
│ │ 🏫 Schools  │  │ School         │ │                │ │ School      │ │
│ │ 👥 Users    │  │ Mumbai         │ │ Delhi          │ │ Ajmer       │ │
│ │             │  │ [ Active ]     │ │ [ Active ]     │ │ [ Active ]  │ │
│ ├─────────────┤  │                │ │                │ │             │ │
│ │             │  │ Subdomain:     │ │ Subdomain:     │ │ Subdomain:  │ │
│ │ Super Admin │  │ demopublic...  │ │ testschool...  │ │ aryanpublic...│
│ │ super@...   │  │ Users: 4       │ │ Users: 3       │ │ Users: 2    │ │
│ │ [ 🌙 ]      │  │ info@demo.com  │ │ test@test.com  │ │ info@aryan...│
│ │ [ Logout ]  │  └────────────────┘ └────────────────┘ └─────────────┘ │
│ └─────────────┘                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Features:
- Grid layout of school cards
- Each card shows:
  - School name and location
  - Active status badge
  - Subdomain
  - User count
  - Contact email
- "Add School" button in top-right

---

## Add School Modal

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   🔒 Background (dimmed)                                │
│                                                                          │
│         ┌──────────────────────────────────────────────────┐            │
│         │  Add New School                                  │            │
│         │                                                  │            │
│         │  School Name *         Location *               │            │
│         │  [Aryan Public School] [Ajmer            ]      │            │
│         │                                                  │            │
│         │  Email                  Phone                   │            │
│         │  [info@aryan.com     ] [+91-1234567890  ]      │            │
│         │                                                  │            │
│         │  Address                                        │            │
│         │  [Ajmer, Rajasthan, India              ]       │            │
│         │                                                  │            │
│         │  ────────────── School Admin ─────────────      │            │
│         │                                                  │            │
│         │  First Name *          Last Name *              │            │
│         │  [John            ]    [Doe             ]      │            │
│         │                                                  │            │
│         │  Admin Email *                                  │            │
│         │  [admin@aryan.com                      ]       │            │
│         │                                                  │            │
│         │  [ Create School ]     [ Cancel ]               │            │
│         └──────────────────────────────────────────────────┘            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Features:
- Modal overlay
- Structured form with two sections
- School information
- Admin creation
- Clear field labels
- Action buttons

---

## Success Modal (After School Creation)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                                                                          │
│              ┌───────────────────────────────────────────┐              │
│              │              ┌─────┐                      │              │
│              │              │  ✅ │                      │              │
│              │              └─────┘                      │              │
│              │                                           │              │
│              │    School Created Successfully!          │              │
│              │                                           │              │
│              │  ┌────────────────────────────────────┐  │              │
│              │  │ School: Aryan Public School       │  │              │
│              │  │ Subdomain: aryanpublicschool-ajmer│  │              │
│              │  │ URL: https://aryanpublic-ajmer... │  │              │
│              │  │                                   │  │              │
│              │  │ Admin Credentials:                │  │              │
│              │  │ Email: admin@aryan.com            │  │              │
│              │  │ Temp Password: a7f3k9m2          │  │              │
│              │  │                                   │  │              │
│              │  │ ⚠️ Save these credentials!        │  │              │
│              │  └────────────────────────────────────┘  │              │
│              │                                           │              │
│              │           [ Close ]                       │              │
│              └───────────────────────────────────────────┘              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Features:
- Success icon
- School details displayed
- Generated subdomain shown
- Admin credentials (temporary password)
- Warning to save credentials
- Close button

---

## Users Management Page

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────┐                                                                  │
│ │   Eduima    │  ALL USERS                                                       │
│ │ Super Admin │  Manage users across all schools                                │
│ ├─────────────┤                                                                  │
│ │             │  ┌────────────────────────────────────────────────────────────┐ │
│ │ 📊 Dashboard│  │ Name      │ Email           │ Role    │ School  │ Status  │ │
│ │ 🏫 Schools  │  ├───────────┼─────────────────┼─────────┼─────────┼─────────┤ │
│ │ 👥 Users    │  │ Super     │ super@eduima.   │[SUPER   │ N/A     │[Active] │ │
│ │             │  │ Admin     │ com             │ ADMIN]  │         │         │ │
│ ├─────────────┤  │           │                 │         │         │ Reset PW│ │
│ │             │  ├───────────┼─────────────────┼─────────┼─────────┼─────────┤ │
│ │ Super Admin │  │ School    │ admin@demo...   │[SCHOOL  │ Demo    │[Active] │ │
│ │ super@...   │  │ Admin     │                 │ ADMIN]  │ Public  │         │ │
│ │ [ 🌙 ]      │  │           │                 │         │ School  │ Reset PW│ │
│ │ [ Logout ]  │  ├───────────┼─────────────────┼─────────┼─────────┼─────────┤ │
│ └─────────────┘  │ John      │ faculty@demo... │[FACULTY]│ Demo    │[Active] │ │
│                  │ Teacher   │                 │         │ Public  │         │ │
│                  │           │                 │         │ School  │ Reset PW│ │
│                  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Key Features:
- Tabular layout
- Role badges (color-coded)
- Status badges
- Action buttons (Reset Password, Deactivate/Activate)
- School association visible
- Filterable and sortable (future)

---

## Dashboard - School Admin

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────┐                                                          │
│ │   Eduima    │  DASHBOARD                                               │
│ │School Admin │                                                          │
│ ├─────────────┤  Welcome back, School!                                   │
│ │             │                                                          │
│ │ 📊 Dashboard│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ │ 👨‍🏫 Faculty │  │   👥     │ │   👨‍🏫   │ │   👨‍🎓   │ │    ✅    │  │
│ │ 👨‍🎓 Students│  │  Total   │ │ Faculty  │ │ Students │ │  Active  │  │
│ │ 📈 Reports  │  │  Users   │ │          │ │          │ │  Users   │  │
│ │             │  │    4     │ │    1     │ │    2     │ │    3     │  │
│ ├─────────────┤  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│ │             │                                                          │
│ │School Admin │  ┌────────────────────────────────────────────────┐    │
│ │ admin@...   │  │  Recent Activity                                │    │
│ │Demo Public  │  │  No recent activity to display.                 │    │
│ │ [ 🌙 ]      │  └────────────────────────────────────────────────┘    │
│ │ [ Logout ]  │                                                          │
│ └─────────────┘                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Features:
- Different navigation items (role-specific)
- School-specific statistics
- School name shown in sidebar
- Same layout structure
- Consistent UI

---

## Dark Mode Example

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ┏━━━━━━━━━━━━━┓                                       Dark Background   │
│ ┃   Eduima    ┃  DASHBOARD                                              │
│ ┃ Super Admin ┃                                       Light Text        │
│ ┣━━━━━━━━━━━━━┫                                                         │
│ ┃ Dark Sidebar┃  Welcome back, Super!                                   │
│ ┃             ┃                                                         │
│ ┃ 📊 Dashboard┃  ┏━━━━━━━━━━┓ ┏━━━━━━━━━━┓ ┏━━━━━━━━━━┓ ┏━━━━━━━━━┓ │
│ ┃ 🏫 Schools  ┃  ┃   🏫     ┃ ┃    ✅    ┃ ┃    👥    ┃ ┃    🟢   ┃ │
│ ┃ 👥 Users    ┃  ┃ Total    ┃ ┃  Active  ┃ ┃  Total   ┃ ┃  Active ┃ │
│ ┃             ┃  ┃ Schools  ┃ ┃ Schools  ┃ ┃  Users   ┃ ┃  Users  ┃ │
│ ┣━━━━━━━━━━━━━┫  ┃    2     ┃ ┃    2     ┃ ┃    15    ┃ ┃    14   ┃ │
│ ┃             ┃  ┗━━━━━━━━━━┛ ┗━━━━━━━━━━┛ ┗━━━━━━━━━━┛ ┗━━━━━━━━━┛ │
│ ┃ Super Admin ┃                Dark Cards                               │
│ ┃ super@...   ┃  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│ ┃ [ ☀️ ]      ┃  ┃  Recent Activity                                 ┃   │
│ ┃ [ Logout ]  ┃  ┃  No recent activity to display.                  ┃   │
│ ┗━━━━━━━━━━━━━┛  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Features:
- Complete color scheme inversion
- Dark backgrounds (#1f2937, #111827)
- Light text (#f9fafb)
- Maintained contrast
- Same layout, different colors
- Sun icon for theme toggle

---

## Mobile View (Responsive)

```
┌─────────────────┐
│    Eduima       │
│  ☰  [ 🌙 ]     │  ← Hamburger menu + Theme toggle
├─────────────────┤
│   DASHBOARD     │
│                 │
│ Welcome back!   │
│                 │
│ ┌─────────────┐ │
│ │    🏫       │ │
│ │  Total      │ │
│ │  Schools    │ │
│ │     2       │ │
│ └─────────────┘ │
│                 │
│ ┌─────────────┐ │
│ │    ✅       │ │
│ │  Active     │ │
│ │  Schools    │ │
│ │     2       │ │
│ └─────────────┘ │
│                 │
│ ┌─────────────┐ │
│ │    👥       │ │
│ │  Total      │ │
│ │  Users      │ │
│ │    15       │ │
│ └─────────────┘ │
│                 │
└─────────────────┘
```

### Key Features:
- Hamburger menu for navigation
- Stacked card layout
- Full-width components
- Touch-friendly buttons
- Optimized spacing

---

## Tablet View

```
┌────────────────────────────────────┐
│ ┌──────┐                           │
│ │Eduima│  DASHBOARD                │
│ │Admin │                           │
│ ├──────┤  Welcome back!            │
│ │ 📊   │                           │
│ │ 🏫   │  ┌────────┐  ┌────────┐  │
│ │ 👥   │  │  🏫    │  │   ✅   │  │
│ ├──────┤  │ Total  │  │ Active │  │
│ │Admin │  │Schools │  │Schools │  │
│ │[ 🌙 ]│  │   2    │  │   2    │  │
│ │Logout│  └────────┘  └────────┘  │
│ └──────┘                           │
│         ┌────────┐  ┌────────┐    │
│         │  👥    │  │   🟢   │    │
│         │ Total  │  │ Active │    │
│         │ Users  │  │ Users  │    │
│         │   15   │  │   14   │    │
│         └────────┘  └────────┘    │
└────────────────────────────────────┘
```

### Key Features:
- Narrower sidebar
- 2-column card layout
- Compressed navigation
- Readable text sizes

---

## Color Scheme

### Light Mode
```
Background:     #F9FAFB (gray-50)
Sidebar:        #FFFFFF (white)
Cards:          #FFFFFF (white)
Text Primary:   #111827 (gray-900)
Text Secondary: #6B7280 (gray-500)
Primary Blue:   #0EA5E9 (sky-500)
Borders:        #E5E7EB (gray-200)
```

### Dark Mode
```
Background:     #111827 (gray-900)
Sidebar:        #1F2937 (gray-800)
Cards:          #1F2937 (gray-800)
Text Primary:   #F9FAFB (gray-50)
Text Secondary: #9CA3AF (gray-400)
Primary Blue:   #38BDF8 (sky-400)
Borders:        #374151 (gray-700)
```

### Role Badge Colors
```
Super Admin:  Red (#DC2626)
School Admin: Blue (#2563EB)
Faculty:      Green (#16A34A)
Student:      Purple (#9333EA)
```

---

## Icons Used

- 📊 Dashboard
- 🏫 Schools
- 👥 Users
- 👨‍🏫 Faculty
- 👨‍🎓 Students
- 📈 Reports
- 📚 Classes/Courses
- ✅ Attendance/Active
- 📝 Grades
- 🌙 Dark Mode
- ☀️ Light Mode
- 🟢 Active Status
- ✅ Success
- ⚠️ Warning
- ❌ Error

---

## Loading States

```
┌─────────────────────────────────┐
│                                 │
│         ⏳                       │
│     Loading...                  │
│                                 │
│     [Spinner Animation]         │
│                                 │
└─────────────────────────────────┘
```

---

## Error States

```
┌─────────────────────────────────┐
│  ❌ Error                        │
│                                 │
│  Could not load data            │
│                                 │
│  [ Retry ]                      │
└─────────────────────────────────┘
```

---

## Empty States

```
┌─────────────────────────────────┐
│  📭 No Data                      │
│                                 │
│  No items to display            │
│                                 │
│  [ Add New ]                    │
└─────────────────────────────────┘
```

---

## UI Component Library

### Buttons
```
Primary:   [  Login  ]  (Blue background, white text)
Secondary: [  Cancel ]  (Gray background, dark text)
Danger:    [  Delete ]  (Red background, white text)
Ghost:     [  Close  ]  (Transparent, colored text)
```

### Input Fields
```
Text:      [________________________]
Email:     [user@example.com       ]
Password:  [••••••••••••            ]
Textarea:  [________________________]
           [________________________]
           [________________________]
```

### Badges
```
Status:    [ Active ]  [ Inactive ]
Role:      [ SUPER ADMIN ]  [ STUDENT ]
Count:     [ 15 ]
```

### Cards
```
┌─────────────────────┐
│ Card Title          │
│ ─────────────────── │
│ Card content here   │
│                     │
│ [ Action ]          │
└─────────────────────┘
```

---

## Animation & Transitions

### Theme Toggle
- Smooth color transition (300ms)
- Fade effect on background change
- No flicker or flash

### Page Navigation
- Instant content update
- No full page reload
- Sidebar remains static
- Content fades in smoothly

### Modal Open/Close
- Fade in background overlay
- Scale up modal from center
- Smooth close animation
- Background blur effect

### Hover Effects
- Cards: Slight shadow increase
- Buttons: Background color shift
- Links: Underline animation
- Nav items: Background highlight

---

This visual overview provides a complete picture of the application's UI/UX design and user experience.
