# Faculty Profile System - Quick Reference

## What's New?

Each faculty member now has a **social profile page** where they can:
- ✅ Create and share posts
- ✅ Follow other faculty members
- ✅ Receive and manage follow requests
- ✅ Like and comment on posts
- ✅ Customize their profile (bio, specialization, education, experience)

## Quick Start

### 1. Apply Database Migration
```bash
cd backend
mysql -u root -p eduima_db < database/migrations/2025-12-29-add-faculty-profiles.sql
```

### 2. Access Faculty Profile
**Frontend Route**: `/faculty/profile/:facultyId`

### 3. Create Backend API Endpoints

Follow the API endpoint list in `FACULTY_PROFILE_COMPLETE.md` to create:
- Profile controllers
- Post controllers  
- Follower controllers
- Follow request controllers

## Feature Overview

### Profile Management
- View own profile
- View other faculty profiles
- Edit profile information (bio, education, etc.)
- Upload banner and profile images

### Posts
- Create text/image posts
- Draft, schedule, or publish immediately
- Edit published posts
- Delete posts
- Track engagement (likes, comments, views)

### Social Interactions
- Like/unlike posts
- Comment on posts
- Follow/unfollow faculty
- Send follow requests with messages
- Accept/reject follow requests
- View follower list

### Privacy Settings
- Public/Private profile option
- Require follow approval option
- Comment moderation
- Block user functionality (ready for implementation)

## File Locations

### Frontend
```
frontend/src/
├── pages/FacultyProfile.jsx ← Main profile page
├── components/FacultyProfileComponents/FacultyPostFeed.jsx ← Post feed
└── services/facultyProfile.js ← API service
```

### Backend
```
backend/
├── models/
│   ├── FacultyProfile.js
│   ├── FacultyPost.js
│   ├── FacultyFollower.js
│   ├── FacultyFollowRequest.js
│   ├── FacultyPostLike.js
│   └── FacultyPostComment.js
└── database/migrations/2025-12-29-add-faculty-profiles.sql
```

## Database Tables Created

| Table | Purpose |
|-------|---------|
| `faculty_profiles` | Faculty profile information |
| `faculty_posts` | Posts created by faculty |
| `faculty_followers` | Follow relationships |
| `faculty_follow_requests` | Follow request workflow |
| `faculty_post_likes` | Post likes tracking |
| `faculty_post_comments` | Comments on posts |

## API Service Methods

All methods in `facultyProfile.js`:

```javascript
// Profile
getProfile(facultyId)
updateProfile(profileData)
getPublicFacultyProfiles(schoolId)

// Posts
getPosts(facultyId, options)
createPost(postData)
updatePost(postId, postData)
publishPost(postId)
deletePost(postId)

// Follow
followFaculty(facultyId)
unfollowFaculty(facultyId)
getFollowers(facultyId)

// Follow Requests
sendFollowRequest(facultyId, message)
getFollowRequests(options)
respondToFollowRequest(requestId, action)

// Interactions
likePost(postId)
unlikePost(postId)
getComments(postId)
addComment(postId, commentData)
updateComment(commentId, commentData)
deleteComment(commentId)
```

## Integration Steps

### Phase 1: Database & Models ✅ COMPLETE
- [x] Migration file created
- [x] All models created with full CRUD operations
- [x] Relationships defined

### Phase 2: Backend API (TODO)
- [ ] Apply migration
- [ ] Create controllers for each model
- [ ] Create routes
- [ ] Implement authentication checks
- [ ] Add validation middleware

### Phase 3: Testing (TODO)
- [ ] Unit tests for models
- [ ] Integration tests for APIs
- [ ] End-to-end tests for features

## Profile Comparison

### School Page
- One page per school
- Admin manages posts
- School followers
- School-wide announcements

### Faculty Profile
- One profile per faculty
- Faculty manages own posts
- Individual faculty followers
- Personal professional content

## Route Structure

```
Faculty Dashboard
├── Quick Actions
│   ├── My Profile ← NEW
│   ├── My Classes
│   ├── Assignments
│   └── ...
└── Posts Feed (in profile page)

Faculty Profile Page (/faculty/profile/:id)
├── Banner & Avatar
├── Profile Info
├── Follow/Unfollow Button
├── Posts Feed
│   ├── Create Post (if owner)
│   ├── Post List
│   │   ├── Like/Comment
│   │   └── Comments Section
│   └── Pagination
└── Stats & About (sidebar)
```

## Important Notes

1. **Profile Privacy**: When `require_follow_approval` is true:
   - Users must send a follow request
   - Faculty can accept/reject requests
   - Posts only visible to approved followers

2. **Post Status**:
   - `draft`: Only visible to owner
   - `scheduled`: Published at scheduled time
   - `published`: Visible based on profile privacy
   - `archived`: Hidden but kept for record

3. **Comments**: Can be moderated with approval workflow

4. **Engagement**: Tracks likes, comments, and views per post

## Next Steps After Implementation

1. Add notification system for:
   - New followers
   - Follow requests
   - Comments on posts
   - Likes on posts

2. Add search/discovery:
   - Search for faculty by name
   - Browse faculty by school
   - Trending posts/faculty

3. Add advanced features:
   - Share posts
   - Save posts
   - Report inappropriate content
   - Block users

## Questions?

Refer to `FACULTY_PROFILE_COMPLETE.md` for detailed documentation.
