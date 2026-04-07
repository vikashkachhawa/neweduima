# Faculty Profile System - Visual Architecture

## User Interface Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    FACULTY DASHBOARD                             │
│                                                                   │
│  ┌──────────────┬──────────────┬────────────────┬──────────────┐│
│  │ My Classes   │ Assignments  │ My Profile ✨ │   Schedule   ││
│  │              │              │  (NEW)          │              ││
│  └──────────────┴──────────────┴────────────────┴──────────────┘│
│                                                                   │
│  (Clicking "My Profile" navigates to Faculty Profile Page)       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 FACULTY PROFILE PAGE (/faculty/profile/:id)      │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Banner Image]                          [Edit Profile Button]│ │
│ │                                                               │ │
│ │ [Avatar]  John Doe                                           │ │
│ │           M.Sc Physics | 10 Years Experience                │ │
│ │           📧 john@school.com                                │ │
│ │                                                               │ │
│ │  [Follow] [Send Request]        42 Posts | 245 Followers    │ │
│ │                                                               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                     POST FEED (LEFT COLUMN)                  │ │
│ │                                                               │ │
│ │  ┌─────────────────────────────────────────────────────────┐ │
│ │  │ 📝 Create a Post (if owner)                            │ │
│ │  │ _______________________________________________         │ │
│ │  │ [What's on your mind?                    ] [Post]       │ │
│ │  └─────────────────────────────────────────────────────────┘ │
│ │                                                               │ │
│ │  ┌─────────────────────────────────────────────────────────┐ │
│ │  │ John Doe  • 2 hours ago                           [...]  │ │
│ │  │ Just finished an amazing lecture on Quantum  │ │
│ │  │ Mechanics today! Students were engaged.                │ │
│ │  │                                                         │ │
│ │  │ ❤️ 24    💬 5      📤 Share                            │ │
│ │  │ Show Comments ▼                                         │ │
│ │  └─────────────────────────────────────────────────────────┘ │
│ │                                                               │ │
│ │  ┌─────────────────────────────────────────────────────────┐ │
│ │  │ John Doe  • 5 hours ago                           [...]  │ │
│ │  │ New assignments are available on the portal.            │ │
│ │  │ Please submit before the deadline!                      │ │
│ │  │ [Image Thumbnail]                                       │ │
│ │  │                                                         │ │
│ │  │ ❤️ 18    💬 8      📤 Share                            │ │
│ │  │ [Comments Section Expanded]                            │ │
│ │  │ ┌─────────────────────────────────────────────────────┐│ │
│ │  │ │ Jane Smith: Great! Thanks for reminding           ││ │
│ │  │ │ Alex Kumar: Quick question about deadline         ││ │
│ │  │ │ ________________________                           ││ │
│ │  │ │ [Your comment              ] [Post]             ││ │
│ │  │ └─────────────────────────────────────────────────────┘│ │
│ │  └─────────────────────────────────────────────────────────┘ │
│ │                                                               │ │
│ │  ◄ 1 2 3 ►  (Pagination)                                    │ │
│ │                                                               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│ │ STATISTICS (RIGHT)   │  │ ABOUT (RIGHT)                    │ │
│ │ ─────────────────    │  │ ─────────────────────────────    │ │
│ │ Total Classes  5     │  │ Specialization: Physics & Math   │ │
│ │ Total Students 120   │  │ Education: M.Sc Applied Math     │ │
│ │ Avg Class Size 24    │  │ Experience: 10 years             │ │
│ │ Completion Rate 95%  │  │                                  │ │
│ └──────────────────────┘  └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React + MUI)                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  FacultyProfile.jsx ◄──────────► facultyProfile.js (Service)    │
│  ├─ Banner & Avatar                                               │
│  ├─ Profile Info                                                  │
│  ├─ Follow/Request Buttons                                        │
│  ├─ Edit Dialog                                                   │
│  └─ FacultyPostFeed Component                                     │
│     ├─ Post Creator                                               │
│     ├─ Post List                                                  │
│     ├─ Like/Comment UI                                            │
│     └─ Pagination                                                 │
│                                                                    │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                    REST API Calls (axios)
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js + Express)                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Routes (/api/faculty-profile/*)                                 │
│   ├─ GET /faculty/:id/profile                                    │
│   ├─ PUT /profile                                                │
│   ├─ GET /school/:schoolId/profiles                              │
│   ├─ GET/POST /faculty/:id/posts                                 │
│   ├─ POST /faculty/:id/follow                                    │
│   ├─ POST /faculty/:id/follow-request                            │
│   ├─ POST /posts/:id/like                                        │
│   └─ POST /posts/:id/comments                                    │
│                          ▼                                         │
│  Controllers (facultyProfileController.js, etc.)                 │
│   ├─ getProfile()          ┐                                      │
│   ├─ updateProfile()       │                                      │
│   ├─ createPost()          │ Business Logic                       │
│   ├─ followFaculty()       │                                      │
│   ├─ sendFollowRequest()   │                                      │
│   └─ ...                   ┘                                      │
│                          ▼                                         │
│  Models (Database Layer)                                         │
│   ├─ FacultyProfile.js                                           │
│   ├─ FacultyPost.js                                              │
│   ├─ FacultyFollower.js                                          │
│   ├─ FacultyFollowRequest.js                                     │
│   ├─ FacultyPostLike.js                                          │
│   └─ FacultyPostComment.js                                       │
│                          ▼                                         │
└──────────────────────────────┬──────────────────────────────────┘
                                │
                    MySQL Queries
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                      DATABASE (MySQL)                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌────────────────────────┐   ┌─────────────────────────────┐   │
│  │  faculty_profiles      │   │    faculty_posts             │   │
│  │  ─────────────────     │   │    ───────────────           │   │
│  │  id                    │   │    id                        │   │
│  │  faculty_id ◄──┬───────┼──►│    faculty_id                │   │
│  │  school_id     │       │   │    school_id                 │   │
│  │  banner_url    │       │   │    title                     │   │
│  │  profile_image │       │   │    content                   │   │
│  │  bio           │       │   │    post_type                 │   │
│  │  education     │       │   │    status                    │   │
│  │  followers_cnt │       │   │    published_at              │   │
│  │  posts_cnt     │       │   │    likes_count               │   │
│  └────────────────────────┘   │    comments_count            │   │
│                                │    created_at                │   │
│  ┌────────────────────────┐   └─────────────────────────────┘   │
│  │ faculty_followers      │                                       │
│  │ ────────────────       │   ┌──────────────────────────┐        │
│  │ id                     │   │ faculty_follow_requests  │        │
│  │ faculty_id ◄───────────┼──►│ ─────────────────────── │        │
│  │ follower_id            │   │ id                       │        │
│  │ follower_email         │   │ faculty_id               │        │
│  │ status                 │   │ requester_id             │        │
│  │ followed_at            │   │ status (pending/approved)│        │
│  └────────────────────────┘   │ message                  │        │
│                                │ created_at               │        │
│  ┌──────────────────────────┐ └──────────────────────────┘        │
│  │ faculty_post_likes       │                                      │
│  │ ──────────────────       │ ┌──────────────────────────┐        │
│  │ id                       │ │ faculty_post_comments    │        │
│  │ post_id ◄────────────────┼►│ ──────────────────────  │        │
│  │ user_id                  │ │ id                       │        │
│  │ created_at               │ │ post_id                  │        │
│  └──────────────────────────┘ │ user_id                  │        │
│                                │ content                  │        │
│                                │ status (approved/pending)│        │
│                                │ created_at               │        │
│                                └──────────────────────────┘        │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

## State Management Flow

```
FacultyProfile.jsx State:
├─ profile: {name, bio, education, experience, ...}
├─ loading: boolean
├─ error: string | null
├─ isFollowing: boolean
├─ followLoading: boolean
├─ editOpen: boolean
├─ showFollowers: boolean
├─ showRequestDialog: boolean
├─ followRequestSent: boolean
├─ requestMessage: string
└─ followersList: Array

↓ (useEffect on facultyId change)

Load profile via facultyProfileService.getProfile()
  └─ Returns: {id, faculty_id, bio, education, followers_count, ...}

↓ (User interaction)

Follow Button Click
  ├─ If requires_approval: showRequestDialog = true
  └─ Else: facultyProfileService.followFaculty()
     └─ POST /faculty-profile/faculty/:id/follow
        └─ Update isFollowing state

Like Post
  ├─ facultyProfileService.likePost(postId)
  └─ loadPosts() to refresh counts

Comment on Post
  ├─ facultyProfileService.addComment(postId, commentData)
  └─ handleLoadComments(postId) to refresh

Edit Profile
  ├─ facultyProfileService.updateProfile(formData)
  └─ loadProfile() to refresh
```

## API Call Sequence Diagrams

### Follow Faculty Flow
```
┌─────────────┐                                    ┌──────────┐
│   Browser   │                                    │  Server  │
└──────┬──────┘                                    └────┬─────┘
       │                                                 │
       │ 1. User clicks Follow button                   │
       │─────────────────────────────────────────────────>
       │                                                 │
       │                     2. Check if profile        │
       │                        requires_follow_approval│
       │                                                 │
       │                     3a. If yes:                │
       │<────── 201 Follow request created ────────────
       │                                                 │
       │        4a. Show "Request Sent"                 │
       │                                                 │
       │                     3b. If no:                 │
       │<─── 200 Follower relationship created ──────────
       │                                                 │
       │        4b. Update isFollowing = true           │
       │
```

### Post Creation & Engagement
```
┌─────────────┐                                    ┌──────────┐
│   Browser   │                                    │  Server  │
└──────┬──────┘                                    └────┬─────┘
       │                                                 │
       │ 1. User creates post                           │
       │─────────────────────────────────────────────────>
       │    (title, content, media_url)                 │
       │                                                 │
       │                     2. Create post             │
       │                        Increment posts_count   │
       │                                                 │
       │<────── 201 Post created ─────────────────────────
       │                                                 │
       │ 3. Post appears in feed (auto-refresh)         │
       │                                                 │
       │ 4. User likes post                             │
       │─────────────────────────────────────────────────>
       │    POST /posts/:id/like                        │
       │                                                 │
       │                     5. Create like entry       │
       │                        Increment likes_count   │
       │                                                 │
       │<────── 200 Like created ──────────────────────────
       │                                                 │
       │ 6. Heart icon fills red                        │
       │
       │ 7. User adds comment                           │
       │─────────────────────────────────────────────────>
       │    POST /posts/:id/comments                    │
       │                                                 │
       │                     8. Create comment          │
       │                        Increment comments_count│
       │                                                 │
       │<────── 201 Comment created ───────────────────────
       │                                                 │
       │ 9. Comment appears in expanded section         │
       │
```

## Component Hierarchy

```
Layout
└─ Container
   └─ FacultyProfile.jsx
      ├─ Paper (Banner)
      │  └─ Box (Edit button)
      ├─ Grid (Profile Header)
      │  ├─ Avatar
      │  ├─ Name & Stats
      │  ├─ Bio
      │  └─ Follow/Request Buttons
      ├─ Grid (Two-column layout)
      │  ├─ Left Column (md=8)
      │  │  └─ FacultyPostFeed.jsx
      │  │     ├─ Post Creator (if owner)
      │  │     ├─ Post List
      │  │     │  ├─ Post Card
      │  │     │  │  ├─ Author info
      │  │     │  │  ├─ Content
      │  │     │  │  ├─ Media
      │  │     │  │  ├─ Like/Comment/Share buttons
      │  │     │  │  └─ Comments Section (collapsed/expanded)
      │  │     │  │     ├─ Comment List
      │  │     │  │     └─ Comment Input
      │  │     │  └─ Delete Menu
      │  │     └─ Pagination
      │  │
      │  └─ Right Column (md=4)
      │     ├─ Statistics Paper
      │     │  ├─ Total Classes
      │     │  ├─ Total Students
      │     │  ├─ Avg Class Size
      │     │  └─ Completion Rate
      │     └─ About Paper
      │        ├─ Specialization
      │        ├─ Education
      │        └─ Experience
      │
      ├─ EditProfileDialog
      │  ├─ Bio TextField
      │  ├─ Specialization TextField
      │  ├─ Education TextField
      │  └─ Experience TextField
      │
      ├─ FollowRequestDialog
      │  ├─ Message TextField
      │  └─ Send Button
      │
      └─ FollowersDialog
         └─ Followers List
            └─ Follower Cards
```

## Database Relationship Diagram

```
┌──────────────────┐          ┌─────────────────────┐
│  users           │          │  faculty_profiles   │
│  ─────────────   │          │  ─────────────────  │
│  id (PK)         │◄──────────│  faculty_id (FK)    │
│  email           │ 1     1..1│  school_id          │
│  first_name      │          │  bio                │
│  last_name       │          │  education          │
│  role            │          │  followers_count    │
│                  │          │  posts_count        │
└────────┬─────────┘          └──────────┬──────────┘
         │                               │
         │                               │ 1
         │                               │
    1    │ N                             │
         │                               │
   ┌─────┴──────────────────┐            │
   │  faculty_posts         │            │
   │  ─────────────         │            │
   │  id (PK)               │            │
   │  faculty_id (FK) ◄─────┴────────────┤
   │  school_id             │            │
   │  title                 │            │
   │  content               │            │
   │  status                │            │
   │  published_at          │            │
   │  likes_count           │            │
   │  comments_count        │            │
   └─────┬──────────────────┘            │
         │                               │
     1   │ N          1   N              │
         │            │                 │
   ┌─────┴──┐  ┌──────┴───┐        ┌────┴──────────┐
   │ post_  │  │  post_   │        │faculty_        │
   │ likes  │  │comments  │        │followers       │
   │──────  │  │────────  │        │──────────      │
   │post_id │  │post_id   │        │faculty_id (FK)│
   │user_id │  │user_id   │        │follower_id(FK)│
   │created │  │content   │        │status         │
   └────────┘  │created   │        └────────────────┘
               └──────────┘              ▲
                    │                    │
                    │        ┌───────────┘
                    │        │
                    │    1   │ N
                    │        │
          ┌─────────┴───┐    │
          │faculty_     │◄───┘
          │follow_      │
          │requests     │
          │─────────── │
          │faculty_id  │
          │requester_id│
          │status      │
          └─────────────┘
```

## State Transition Diagram (Follow Request)

```
START
  │
  ▼
┌─────────────────────┐
│  Check profile      │
│  privacy settings   │
└────────┬────────────┘
         │
    ┌────┴────┐
    │          │
    ▼          ▼
┌────────────┐ ┌──────────────────────┐
│ Public    │ │ Private (approval req)│
│ Profile   │ │ Profile               │
└─────┬──────┘ └──────────┬─────────────┘
      │                   │
      ▼                   ▼
┌──────────────┐   ┌─────────────────────┐
│ Direct       │   │ Send Follow Request │
│ Follow       │   │ (status: pending)   │
│              │   └──────────┬──────────┘
│ followers_count++           │
│ following_count++           │
└──────┬───────┘              │
       │                      ▼
       │            ┌──────────────────┐
       │            │ Faculty reviews  │
       │            │ Pending requests │
       │            └────────┬─────────┘
       │                     │
       │            ┌────────┴─────────┐
       │            │                  │
       │            ▼                  ▼
       │     ┌────────────┐  ┌──────────────┐
       │     │ Reject     │  │ Accept       │
       │     └────────────┘  └──────┬───────┘
       │                            │
       │                            ▼
       │                  ┌──────────────────┐
       │                  │ Create Follower  │
       │                  │ followers_count++│
       │                  │ following_count++│
       │                  └──────────┬───────┘
       │                             │
       └─────────────┬───────────────┘
                     │
                     ▼
              ┌─────────────┐
              │ FOLLOWING   │
              └─────────────┘
```

---

This visual documentation helps understand:
- ✅ UI layout and navigation
- ✅ Data flow from frontend to database
- ✅ State management patterns
- ✅ API communication sequences
- ✅ Component hierarchy
- ✅ Database relationships
- ✅ State transitions
