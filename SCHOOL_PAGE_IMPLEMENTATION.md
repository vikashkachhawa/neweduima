# School Page Module - Implementation Guide

## Overview

The School Page module enables schools to create and manage a public-facing digital presence within the EduIMA platform. It functions as a verified organization page similar to social media platforms, allowing schools to publish content, manage followers, and engage with their community.

## Architecture

### Database Schema

#### 1. **school_pages** - School Profile Management
Stores the school's public page profile metadata.

```sql
- id (PK)
- school_id (FK to schools)
- banner_url (VARCHAR 500)
- logo_url (VARCHAR 500)
- description (TEXT)
- vision_statement (TEXT)
- achievements (TEXT)
- follower_count (INT, default 0)
- post_count (INT, default 0)
- is_public (BOOLEAN, default true)
- allow_comments (BOOLEAN, default true)
- require_follow_approval (BOOLEAN, default false)
- created_at, updated_at
- Indices: idx_school_public(school_id, is_public)
```

#### 2. **school_posts** - Content Publishing
Individual posts/announcements published by school admins.

```sql
- id (PK)
- school_id (FK to schools)
- title (VARCHAR 255)
- content (TEXT)
- post_type (ENUM: text, image, video, announcement)
- status (ENUM: draft, published, scheduled, archived)
- published_at (DATETIME)
- scheduled_at (DATETIME, nullable)
- likes_count, comments_count, views_count (INT, default 0)
- allow_comments (BOOLEAN, default true)
- created_by (FK to users, nullable)
- changed_by (FK to users, nullable)
- created_at, updated_at
- Indices: idx_school_posts(school_id, status, published_at DESC)
```

#### 3. **school_post_media** - Post Attachments
Store images/videos associated with posts.

```sql
- id (PK)
- post_id (FK to school_posts)
- media_type (ENUM: image, video)
- media_url (VARCHAR 500)
- thumbnail_url (VARCHAR 500, nullable)
- file_size (INT)
- media_order (INT)
- created_at
```

#### 4. **school_post_versions** - Edit History
Track version history of posts for audit trails and potential rollback.

```sql
- id (PK)
- post_id (FK to school_posts)
- title (VARCHAR 255)
- content (TEXT)
- changed_by (FK to users, nullable)
- change_reason (VARCHAR 255)
- created_at
```

#### 5. **school_followers** - Subscription Management
Track who follows a school page with approval workflow support.

```sql
- id (PK)
- school_id (FK to schools)
- follower_id (FK to users, nullable - for authenticated users)
- follower_email (VARCHAR 255)
- follower_name (VARCHAR 255)
- status (ENUM: pending, approved, blocked)
- is_staff (BOOLEAN)
- followed_at (DATETIME)
- created_at
- Indices: idx_school_followers(school_id, status)
```

#### 6. **school_post_likes** - Engagement Metrics
Track likes on posts (supports both authenticated users and guest likes).

```sql
- id (PK)
- post_id (FK to school_posts)
- user_id (FK to users, nullable)
- guest_id (VARCHAR 255, nullable)
- created_at
- UNIQUE(post_id, user_id) - Prevent duplicate likes per user
```

#### 7. **school_post_comments** - Discussion System
Comments on posts with moderation controls (hide, pin, delete).

```sql
- id (PK)
- post_id (FK to school_posts)
- user_id (FK to users, nullable)
- guest_name (VARCHAR 255)
- guest_email (VARCHAR 255)
- comment (TEXT)
- is_pinned (BOOLEAN, default false)
- is_hidden (BOOLEAN, default false)
- moderation_status (ENUM: pending, approved, rejected)
- created_at, updated_at
- Indices: idx_post_comments(post_id, moderation_status, is_hidden, created_at DESC)
```

#### 8. **school_page_reports** - Content Moderation
User reports for inappropriate/spam content; admin review and action tracking.

```sql
- id (PK)
- school_id (FK to schools)
- post_id (FK to school_posts, nullable)
- comment_id (FK to school_post_comments, nullable)
- reporter_id (FK to users, nullable)
- report_type (ENUM: spam, inappropriate, harassment, misinformation, other)
- reason (TEXT)
- status (ENUM: pending, investigating, resolved, dismissed)
- action_taken (TEXT)
- created_at, updated_at
```

---

## Backend Implementation

### Models

#### SchoolPage.js
**Purpose**: Manage school page profile operations

**Key Methods**:
- `findBySchoolId(schoolId)` - Get page profile
- `updateProfile(schoolId, data)` - Update banner, logo, description, vision
- `getPublicPage(schoolId)` - Public-facing page view
- `incrementFollowerCount(schoolId)` / `decrementFollowerCount(schoolId)`
- `incrementPostCount(schoolId)` / `decrementPostCount(schoolId)`

#### SchoolPost.js (Currently named SchoolPostLike.js)
**Purpose**: Post lifecycle management (CRUD operations)

**Key Methods**:
- `create(schoolId, data)` - Create draft/scheduled/published post
- `findById(postId)` - Get single post
- `findBySchoolId(schoolId, options)` - List posts with pagination and status filtering
- `update(postId, data)` - Edit post content
- `publish(postId)` - Transition draft → published
- `delete(postId)` - Remove post and decrement count
- `incrementLikes(postId)` / `decrementLikes(postId)`
- `incrementComments(postId)` / `decrementComments(postId)`
- `incrementViews(postId)`

#### SchoolFollower.js
**Purpose**: Manage followers and follow requests

**Key Methods**:
- `create(schoolId, followerData)` - Add follower (guest or authenticated)
- `findBySchoolAndUser(schoolId, userId)` - Check follow status
- `findFollowersBySchool(schoolId, options)` - List followers with pagination
- `updateStatus(followerId, status)` - Approve/reject/block follower
- `delete(schoolId, userId)` - Unfollow
- `getFollowerCount(schoolId, status)` - Get statistics

#### SchoolPostComment.js
**Purpose**: Comment system with moderation controls

**Key Methods**:
- `create(postId, data)` - Add comment from user or guest
- `findByPostId(postId, options)` - List comments (excludes hidden/rejected)
- `findById(commentId)` - Get single comment
- `update(commentId, text)` - Edit comment
- `delete(commentId)` - Remove comment
- `pin(commentId)` / `unpin(commentId)` - Highlight important comments
- `hide(commentId)` - Soft delete comment

### Controller: schoolPageController.js

**17 Endpoint Handlers**:

#### Profile Management
1. `getSchoolPageProfile(req, res)`
   - Route: `GET /school/:schoolId/profile`
   - Auth: None
   - Returns: School page profile with banner, logo, description, stats

2. `updateSchoolPageProfile(req, res)`
   - Route: `PUT /profile`
   - Auth: school_admin role required
   - Input: { banner_url, logo_url, description, vision_statement, allow_comments, require_follow_approval }

#### Post Management
3. `createPost(req, res)`
   - Route: `POST /posts`
   - Auth: school_admin role required
   - Input: { title, content, post_type, status, media_url, allow_comments, scheduled_at }

4. `getPosts(req, res)`
   - Route: `GET /school/:schoolId/posts`
   - Auth: None (public)
   - Query: status, limit, offset
   - Returns: Array of published posts with pagination

5. `updatePost(req, res)`
   - Route: `PUT /posts/:postId`
   - Auth: school_admin role required
   - Input: { title, content, allow_comments }

6. `publishPost(req, res)`
   - Route: `POST /posts/:postId/publish`
   - Auth: school_admin role required
   - Transitions: draft → published

7. `deletePost(req, res)`
   - Route: `DELETE /posts/:postId`
   - Auth: school_admin role required
   - Removes post and decrements post_count

#### Follower Management
8. `followSchool(req, res)`
   - Route: `POST /school/:schoolId/follow`
   - Auth: Optional (supports guest email or authenticated user)
   - Input: { follower_email (optional), follower_name (optional) }
   - Creates pending or approved follower based on require_follow_approval setting

9. `unfollowSchool(req, res)`
   - Route: `DELETE /school/follow/:schoolId`
   - Auth: Required
   - Removes follower and decrements follower_count

10. `getFollowers(req, res)`
    - Route: `GET /school/:schoolId/followers`
    - Auth: None
    - Query: status, limit, offset
    - Returns: List of approved followers

#### Engagement
11. `likePost(req, res)`
    - Route: `POST /posts/:postId/like`
    - Auth: Required
    - Creates like and increments likes_count

12. `unlikePost(req, res)`
    - Route: `DELETE /posts/:postId/like`
    - Auth: Required
    - Removes like and decrements likes_count

13. `addComment(req, res)`
    - Route: `POST /posts/:postId/comments`
    - Auth: Optional (guest or authenticated)
    - Input: { comment, guest_name (optional), guest_email (optional) }

14. `getComments(req, res)`
    - Route: `GET /school/:schoolId/posts/:postId/comments`
    - Auth: None
    - Query: limit, offset
    - Returns: List of visible comments with pagination

#### Moderation
15. `moderateComment(req, res)`
    - Route: `PUT /comments/:commentId/moderate`
    - Auth: school_admin role required
    - Input: { action } where action in ['pin', 'unpin', 'hide', 'delete']

### Routes: schoolPage.js

**Public Routes** (no authentication):
- `GET /school/:schoolId/profile` - Get school page profile
- `GET /school/:schoolId/posts` - List published posts
- `GET /school/:schoolId/followers` - List approved followers
- `POST /school/:schoolId/follow` - Guest follow
- `GET /school/:schoolId/posts/:postId/comments` - Get post comments

**Protected Routes** (authentication required):
- `POST /school/follow/:schoolId` - Authenticated user follow
- `DELETE /school/follow/:schoolId` - Unfollow
- `POST /posts/:postId/like` - Like post
- `DELETE /posts/:postId/like` - Unlike post
- `POST /posts/:postId/comments` - Add comment

**Admin Routes** (school_admin role required):
- `PUT /profile` - Update school page profile
- `POST /posts` - Create post
- `PUT /posts/:postId` - Edit post
- `POST /posts/:postId/publish` - Publish post
- `DELETE /posts/:postId` - Delete post
- `PUT /comments/:commentId/moderate` - Moderate comment

---

## Frontend Implementation

### Services: schoolPage.js
API client with methods for all 17 backend endpoints:
- `getProfile(schoolId)` - Fetch school page profile
- `updateProfile(profileData)` - Update profile (admin)
- `getPosts(schoolId, options)` - Fetch posts with pagination
- `createPost(postData)` - Create new post (admin)
- `updatePost(postId, postData)` - Edit post (admin)
- `publishPost(postId)` - Publish post (admin)
- `deletePost(postId)` - Delete post (admin)
- `getFollowers(schoolId, options)` - List followers
- `followSchool(schoolId)` - Follow school
- `unfollowSchool(schoolId)` - Unfollow school
- `likePost(postId)` - Like post
- `unlikePost(postId)` - Unlike post
- `getComments(postId, options)` - Get post comments
- `addComment(postId, commentData)` - Add comment
- `moderateComment(commentId, action)` - Moderate comment (admin)

### Pages

#### SchoolPageProfile.jsx
**Purpose**: Main page for school page management and viewing

**Features**:
- Display school banner, logo, description, vision
- Show follower count and post count
- Follow/unfollow button (for non-admins)
- Edit profile modal for admins (update banner, logo, description, vision)
- Responsive grid layout using Material-UI
- Error handling and loading states

**States**:
- Profile data, loading, error
- Edit modal open/close
- Follow button loading state

#### SchoolPostFeed.jsx
**Component**: Displays posts and enables post creation

**Features**:
- Create post button (admin only) with modal form
  - Title and content text areas
  - Post type selector (text/image/video/announcement)
  - Status selector (draft/published/scheduled)
  - Media URL input
  - Allow comments toggle
- Post grid with pagination
- Each post displays:
  - Title, content, timestamp
  - Media (image/video) if present
  - Engagement stats (likes, comments, views)
  - Like button (toggles favorite icon)
  - Comment button opens comments modal
  - Share button (placeholder)
  - Admin menu for edit/delete
- Comments modal:
  - Comment input form (guest or authenticated)
  - List of comments with pagination
  - Admin moderation (hide, pin, delete)
- Error handling and loading states

**States**:
- Posts array, current page, total pages
- New post modal state and form data
- Selected post and comments
- Liked posts set (tracks which posts user liked)
- Comments loading and error states

### Integration

#### App.jsx Routes
Added new route:
```jsx
<Route
  path="/school-page/:schoolId"
  element={
    <ProtectedRoute allowedRoles={['school_admin']}>
      <SchoolPageProfile />
    </ProtectedRoute>
  }
/>
```

#### Sidebar Navigation
Added "School Page" link for school_admin role:
```jsx
links.push({ 
  path: `/school-page/${user?.school_id}`, 
  icon: <CampaignIcon />, 
  label: 'School Page', 
  permission: null 
});
```

---

## Security & Multi-Tenancy

### Data Isolation
- **Tenant Scoping**: All operations use `req.user.school_id` to ensure schools can only access their own data
- **Foreign Key Constraints**: Database-level constraints prevent cross-school data access
- **Role-Based Access**: Admin operations require `school_admin` role verification
- **Query Filtering**: All SELECT queries include `WHERE school_id = ?` filter

### Authentication & Authorization
- **Protected Routes**: POST/PUT/DELETE operations require authentication via `authMiddleware`
- **Role Verification**: Admin operations require `roleMiddleware('school_admin')`
- **Public Read**: GET operations for profiles and posts don't require authentication
- **Guest Support**: Followers and commenters can be guest users (email-based)

### Validation
- **Input Validation**: Required fields (title, content) validated before processing
- **URL Validation**: Media URLs validated for format
- **Duplicate Prevention**: Unique constraints prevent duplicate likes per user
- **Comment Visibility**: Soft-delete via `is_hidden` flag; rejected comments excluded from lists

---

## Usage Examples

### Creating a Post (Admin)
```javascript
const newPost = await schoolPageService.createPost({
  title: "Welcome to Our School Page",
  content: "Join us for exciting updates and announcements!",
  post_type: "text",
  status: "published",
  media_url: null,
  allow_comments: true
});
```

### Following a School (Guest)
```javascript
const follow = await schoolPageService.followSchool(schoolId);
// Input from frontend: { follower_email: "user@example.com", follower_name: "John Doe" }
```

### Adding a Comment
```javascript
const comment = await schoolPageService.addComment(postId, {
  comment: "Great post!",
  guest_name: "Jane Smith"
});
```

### Moderating a Comment (Admin)
```javascript
await schoolPageService.moderateComment(commentId, 'pin');
// Actions: 'pin', 'unpin', 'hide', 'delete'
```

---

## Future Enhancements

1. **Post Scheduling**: Implement cron job to auto-publish scheduled posts at scheduled_at time
2. **Media Upload**: File upload handler with validation and storage
3. **Content Reporting**: Admin dashboard for reviewing reported posts/comments
4. **Post Versions**: UI to view and potentially restore previous post versions
5. **Notifications**: Wire School Page activity into notification system
   - New post published → notify followers
   - Post liked → notify author
   - Comment added → notify post author
6. **Public Discovery**: Trending posts, featured schools, school page search
7. **Cross-Promotion**: Featured posts on school profile, announcements integration
8. **Analytics**: Track post reach, engagement trends, follower growth

---

## Troubleshooting

### Common Issues

**Issue**: Posts not appearing in feed
- **Check**: Verify post status is 'published' and published_at is before current time
- **Check**: Ensure follower status is 'approved' if require_follow_approval is true

**Issue**: Likes/comments not saving
- **Check**: Verify user is authenticated (JWT token valid)
- **Check**: Check database constraints; ensure post_id exists

**Issue**: School admin can't create posts
- **Check**: Verify user role is 'school_admin'
- **Check**: Verify user.school_id matches route schoolId

**Issue**: Comments not visible
- **Check**: Verify is_hidden is false and moderation_status is 'approved'
- **Check**: Check allow_comments is true on parent post

---

## API Reference

### Base URL
```
http://localhost:5000/api/school-page
```

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Error Codes
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `403 Forbidden` - Access denied (role/permission mismatch)
- `404 Not Found` - Resource not found
- `409 Conflict` - Already liked / duplicate action
- `500 Internal Server Error` - Server error

---

## Files Modified/Created

**Backend**:
- `database/migrations/2025-12-27-add-school-pages.sql` - Database schema
- `models/SchoolPage.js` - Profile management
- `models/SchoolPost.js` (named SchoolPostLike.js) - Post CRUD
- `models/SchoolFollower.js` - Follower management
- `models/SchoolPostComment.js` - Comment system
- `controllers/schoolPageController.js` - 17 endpoint handlers
- `routes/schoolPage.js` - 13 route definitions
- `server.js` - Route mounting

**Frontend**:
- `src/services/schoolPage.js` - API client
- `src/pages/SchoolPageProfile.jsx` - Main page
- `src/components/SchoolPageComponents/SchoolPostFeed.jsx` - Post feed & creation
- `src/App.jsx` - Route definition
- `src/components/Sidebar.jsx` - Navigation link

---

## Testing Checklist

- [ ] School admin can view their school page profile
- [ ] School admin can update profile (banner, logo, description, vision)
- [ ] School admin can create text/image/video posts
- [ ] Posts appear in feed after publishing
- [ ] Non-admin users can view public profiles and posts
- [ ] Users can follow/unfollow schools
- [ ] Follower count increments/decrements correctly
- [ ] Users can like/unlike posts
- [ ] Like count updates in real-time
- [ ] Users can add comments to posts
- [ ] Admin can hide/pin/delete comments
- [ ] Comments don't appear if hidden/rejected
- [ ] School A cannot see School B's posts/followers (multi-tenant isolation)
- [ ] Guests can follow schools without authentication
- [ ] Posts scheduled for future don't appear in feed until scheduled time

