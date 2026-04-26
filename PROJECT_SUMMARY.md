# 🎓 Eduima - Multi-Tenant School Management System

## Project Status: ✅ Phase 1–5 Complete | EduMeet Video — Active Development

> **Last updated:** April 13, 2026

---

## 🚀 What Has Been Built

### Architecture
- **Frontend:** React 18 + Vite + MUI (Material UI) + Socket.IO client
- **Backend:** Node.js + Express.js + Socket.IO (namespaced `/edumeet`)
- **Database:** MySQL with role/subscription/analytics schema
- **Authentication:** JWT-based with fine-grained RBAC middleware
- **Real-time:** WebSocket (Socket.IO) for chat, video signaling, presence
- **WebRTC:** P2P mesh (STUN-only) for EduMeet video conferencing
- **Deployment:** Linux server, Nginx reverse proxy, live at **https://eduima.com**

---

## ✅ Completed Features

### Phase 1 — Core Platform
- ✅ JWT authentication + bcrypt password hashing
- ✅ Forced password change for new accounts
- ✅ Password reset functionality
- ✅ Dark/light mode with localStorage persistence
- ✅ Responsive SPA layout (sidebar navigation, protected routes)
- ✅ Multi-tenant subdomain generation (`schoolname-location.mydomain.com`)
- ✅ Super Admin: school management, user management, password reset for users
- ✅ School Admin: school-specific dashboard and user statistics

### Phase 2 — RBAC & Faculty Profiles
- ✅ Fine-grained Role-Based Access Control (RBAC) middleware
- ✅ Permission system with 4 roles: Super Admin, School Admin, Faculty, Student
- ✅ Faculty profile pages with bio, qualifications, subjects, and office hours
- ✅ Profile photo upload and management
- ✅ Faculty directory with search and filter

### Phase 3 — School Pages & Announcements
- ✅ Public-facing school pages (about, staff, announcements)
- ✅ School Admin can manage announcements (create, edit, delete, pin)
- ✅ Announcement visibility controls (public / school-only)
- ✅ School branding (logo, banner, description)

### Phase 4 — Communication System
- ✅ Real-time private messaging (Socket.IO)
- ✅ Group chat rooms with member management
- ✅ Message history with pagination
- ✅ Online presence indicators
- ✅ Read receipts
- ✅ File sharing within chat (icon near send input)
- ✅ Chat panel integrated into main layout

### Phase 5 — Subscriptions, Analytics & Platform Controls
- ✅ Subscription plans (Free, Basic, Pro, Enterprise) with feature gating
- ✅ School-level subscription management by Super Admin
- ✅ **Analytics dashboard** with:
  - Date range filtering (presets + custom range)
  - User growth, message volume, active rooms metrics
  - Platform-wide and per-school views
- ✅ **Platform Controls:**
  - Feature toggles per school
  - Global maintenance mode
  - Rate limiting and usage quotas

### Phase 6 — EduMeet Video Conferencing
- ✅ WebRTC P2P mesh with STUN-only ICE negotiation
- ✅ Meeting rooms with unique 6-character room codes
- ✅ Copy room code button (one-click clipboard copy)
- ✅ Participant video tiles with name overlay
- ✅ Camera on/off and mic mute/unmute controls
- ✅ **Mute state visibility** — all participants see correct mute/camera state (numeric 0/1 flag parsing)
- ✅ Exit Room button
- ✅ Green-only speaking borders (no red border for muted)
- ✅ Hand-raise visible to all participants
- ✅ **Low bandwidth mode default** with network quality chip
- ✅ Mobile 2-user vertical layout (≤768px breakpoint)
- ✅ **Screen share** — shared content renders in main stage, participant tiles move to side rail
- ✅ Screen share fullscreen with exit button (mobile + desktop)
- ✅ Rotation-safe fullscreen (`objectFit: contain`)
- ✅ Tile 3-dot menu: fullscreen for all, mute for host
- ✅ **Host mute individual participant** via socket event
- ✅ Instant leave propagation (presence emitted on disconnect)
- ✅ Camera-off shows avatar immediately (no frozen frame)
- ✅ Chat panel input pinned to bottom with file icon near send
- ✅ Files/Recordings tabs removed from side panel
- ✅ Debug logging with `[EduMeet-RTC]` prefix for console filtering
- ⚠️ **Camera/mic toggle after join** — regression under active fix (see below)

---

## ⚠️ Active Issue — EduMeet AV Regression

**Problem:** After multiple iterations of fixing camera/mic toggle-off/on, a regression now causes video/audio to not work even on first join.

**Root cause:** Accumulated complexity in WebRTC sender management (`peerSendersRef`, `pendingRenegotiateRef`, `onsignalingstatechange` handler) introduced a double-offer race condition on initial negotiation.

**Last deployed bundle:** `index-dC7uTznd.js`

**Fix plan:** Surgically revert only WebRTC negotiation/sender code to a minimal battle-tested pattern while preserving all UI changes. Target: `createPeerConnection` addTrack loop + `onnegotiationneeded`-only renegotiation — no external `pendingRenegotiateRef` or `onsignalingstatechange`.

---

## 📁 Key File Structure

```
neweduima/
├── backend/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── eduMeetController.js         # EduMeet room CRUD, participant mute
│   │   ├── superAdminController.js
│   │   └── schoolController.js
│   ├── services/
│   │   └── eduMeetSocketService.js      # Socket.IO /edumeet namespace, WebRTC relay
│   ├── middleware/
│   │   ├── auth.js                      # JWT verification
│   │   └── role.js                      # RBAC role checking
│   ├── routes/
│   │   ├── auth.js
│   │   ├── edumeet.js
│   │   ├── superAdmin.js
│   │   └── school.js
│   ├── migrations-apply.js              # DB schema migration runner
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── EduMeetRoom.jsx          # ⭐ Main video room (WebRTC, tiles, chat, screen share)
│   │   │   ├── EduMeetLobby.jsx         # Room join/create
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Schools.jsx
│   │   │   ├── Users.jsx
│   │   │   └── FacultyProfile.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── services/
│   │   │   ├── api.js                   # Axios base config
│   │   │   └── edumeet.js               # EduMeet REST API helpers
│   │   └── contexts/
│   │       ├── AuthContext.jsx
│   │       └── ThemeContext.jsx
│   └── dist/                            # Built output, deployed to /var/www/eduima/frontend/dist/
```

---

## 🔐 User Roles

| Role | Access Level | Key Features |
|------|-------------|--------------|
| **Super Admin** | Platform-wide | School management, subscriptions, analytics, platform controls |
| **School Admin** | School-specific | Faculty/student management, announcements, school pages |
| **Faculty** | Limited | Profile, classes, EduMeet rooms |
| **Student** | Personal | Courses, attendance, EduMeet, chat |

---

## 🛠 Technology Stack

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **UI Library:** MUI (Material UI) v5
- **Routing:** React Router v6
- **Real-time:** Socket.IO client
- **HTTP Client:** Axios
- **State Management:** React Context + useRef

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MySQL
- **Real-time:** Socket.IO
- **Authentication:** JWT (jsonwebtoken) + bcryptjs
- **Environment:** dotenv

### Infrastructure
- **Server:** Linux (Ubuntu)
- **Reverse Proxy:** Nginx
- **Process Manager:** nodemon (dev) / PM2-compatible
- **SSL:** HTTPS via Nginx
- **Live URL:** https://eduima.com

---

## 🚀 Development Commands

### Backend
```bash
cd /home/cdshadmin/neweduima/backend
npm run dev          # nodemon server.js on port 5000
fuser -k 5000/tcp    # kill existing process before restart
```

### Frontend
```bash
cd /home/cdshadmin/neweduima/frontend
npm run build        # Vite build → dist/
cp -r dist/* /var/www/eduima/frontend/dist/   # deploy
```

### Test URLs
- App: https://eduima.com
- EduMeet test room: https://eduima.com/edumeet/rooms/4

---

## 📊 Database Tables (current)

| Table | Purpose |
|-------|---------|
| `schools` | Multi-tenant school records + subdomains |
| `users` | All roles, school association, password management |
| `sessions` | Token tracking |
| `faculty_profiles` | Extended faculty info (bio, qualifications, photo) |
| `edumeet_rooms` | Video room records (name, code, host, settings) |
| `edumeet_participants` | Active participant presence + AV state flags |
| `chat_messages` | Private and group messages |
| `chat_groups` | Group chat rooms + membership |
| `subscriptions` | School subscription plans + feature flags |
| `analytics_events` | Platform usage events for analytics dashboard |
| `platform_controls` | Global and per-school feature toggle overrides |

---

## 🎯 Roadmap — Remaining Work

### EduMeet (Immediate)
- [ ] Fix camera/mic toggle-off/on regression (AV broken after toggle)
- [ ] Whiteboard integration
- [ ] Recording stub

### Phase 7 (Planned)
- [ ] Student enrollment and course management
- [ ] Attendance marking by faculty
- [ ] Grade entry and reports
- [ ] Calendar integration
- [ ] Email notification system
- [ ] Bulk user import (CSV)
- [ ] Data export (PDF/CSV)

---

## 🔗 Documentation Index

| File | Topic |
|------|-------|
| `README.md` | Project overview |
| `SETUP_GUIDE.md` | Detailed setup |
| `RBAC_ARCHITECTURE.md` | Role/permission design |
| `FACULTY_PROFILE_IMPLEMENTATION_SUMMARY.md` | Faculty profile feature |
| `SCHOOL_PAGE_IMPLEMENTATION.md` | School pages feature |
| `COMMUNICATION_SYSTEM_DESIGN.md` | Chat system design |
| `SUBSCRIPTION_SYSTEM.md` | Subscription plans |
| `ANALYTICS_IMPLEMENTATION_COMPLETE.md` | Analytics dashboard |
| `PLATFORM_CONTROLS_IMPLEMENTATION_COMPLETE.md` | Platform controls |
| `CHAT_SYSTEM_ANALYSIS.md` | Chat architecture |

---

**Live URL:** https://eduima.com | **Backend Port:** 5000 | **Frontend build:** Vite → `/var/www/eduima/frontend/dist/`
