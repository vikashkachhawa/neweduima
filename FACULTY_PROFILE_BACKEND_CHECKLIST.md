# Faculty Profile Backend Implementation Checklist

## Phase 1: Database Setup ✅
- [x] Create migration file: `2025-12-29-add-faculty-profiles.sql`
- [x] Define all 6 tables with relationships
- [x] Add proper indexes and constraints
- [x] Include foreign key relationships

### To Execute:
```bash
mysql -u root -p eduima_db < backend/database/migrations/2025-12-29-add-faculty-profiles.sql
```

---

## Phase 2: Backend API Implementation

### Step 1: Apply Migration
```bash
# Login to MySQL and apply migration
mysql -u root -p eduima_db < backend/database/migrations/2025-12-29-add-faculty-profiles.sql
```
- [ ] Confirm all 6 tables created successfully
- [ ] Verify indexes and constraints

### Step 2: Create Controllers

#### 2.1 Faculty Profile Controller
**File**: `backend/controllers/facultyProfileController.js`

```javascript
// Import models
import FacultyProfile from '../models/FacultyProfile.js';
import FacultyPost from '../models/FacultyPost.js';
import User from '../models/User.js';

export const getProfile = async (req, res) => {
  // GET /faculty-profile/faculty/:facultyId/profile
  // Return profile with first_name, last_name from users table
  // Include follower_count, following_count, posts_count
}

export const updateProfile = async (req, res) => {
  // PUT /faculty-profile/profile
  // Require authentication
  // Only allow updating own profile
  // Fields: bio, specialization, education, experience, banner_url, profile_image_url
}

export const getPublicProfiles = async (req, res) => {
  // GET /faculty-profile/school/:schoolId/profiles
  // Return all public profiles in school with pagination
  // Join with users table for name and email
}
```

#### 2.2 Faculty Post Controller
**File**: `backend/controllers/facultyPostController.js`

```javascript
// Import models
import FacultyPost from '../models/FacultyPost.js';
import FacultyProfile from '../models/FacultyProfile.js';

export const getPosts = async (req, res) => {
  // GET /faculty-profile/faculty/:facultyId/posts
  // Query params: status=published, limit=20, offset=0
  // Include author info (first_name, last_name) from users table
}

export const createPost = async (req, res) => {
  // POST /faculty-profile/posts
  // Require authentication
  // Body: title, content, post_type, allow_comments
  // Auto-increment posts_count in faculty_profiles
}

export const updatePost = async (req, res) => {
  // PUT /faculty-profile/posts/:postId
  // Require authentication
  // Only allow editing own posts in draft status
}

export const publishPost = async (req, res) => {
  // POST /faculty-profile/posts/:postId/publish
  // Change status from draft/scheduled to published
  // Set published_at to NOW()
  // Increment posts_count if first publish
}

export const deletePost = async (req, res) => {
  // DELETE /faculty-profile/posts/:postId
  // Require authentication
  // Only allow deleting own posts
  // Decrement posts_count
  // Cascade delete comments and likes
}
```

#### 2.3 Faculty Follower Controller
**File**: `backend/controllers/facultyFollowerController.js`

```javascript
import FacultyFollower from '../models/FacultyFollower.js';
import FacultyProfile from '../models/FacultyProfile.js';
import User from '../models/User.js';

export const getFollowers = async (req, res) => {
  // GET /faculty-profile/faculty/:facultyId/followers
  // Query params: status=approved, limit=50, offset=0
  // Include follower info from users table
}

export const followFaculty = async (req, res) => {
  // POST /faculty-profile/faculty/:facultyId/follow
  // Require authentication
  // Check if target profile requires approval
  // If requires approval, create follow request instead
  // Otherwise, create approved follower entry
  // Increment followers_count in faculty_profiles
  // Increment following_count for current user
}

export const unfollowFaculty = async (req, res) => {
  // DELETE /faculty-profile/faculty/:facultyId/follow
  // Require authentication
  // Delete follower entry
  // Decrement followers_count
  // Decrement following_count
}
```

#### 2.4 Faculty Follow Request Controller
**File**: `backend/controllers/facultyFollowRequestController.js`

```javascript
import FacultyFollowRequest from '../models/FacultyFollowRequest.js';
import FacultyFollower from '../models/FacultyFollower.js';
import FacultyProfile from '../models/FacultyProfile.js';

export const sendFollowRequest = async (req, res) => {
  // POST /faculty-profile/faculty/:facultyId/follow-request
  // Require authentication
  // Body: message (optional)
  // Check if already following or pending request
  // Create follow request with status=pending
}

export const getFollowRequests = async (req, res) => {
  // GET /faculty-profile/follow-requests
  // Require authentication
  // Query params: status=pending, limit=50, offset=0
  // Return requests for authenticated user
  // Include requester info from users table
}

export const respondToRequest = async (req, res) => {
  // POST /faculty-profile/follow-requests/:requestId/respond
  // Require authentication
  // Body: action (approve/reject/block)
  // If approve: create follower entry, update counters
  // Delete follow request after processing
  // Handle notifications (TODO)
}
```

#### 2.5 Faculty Post Like Controller
**File**: `backend/controllers/facultyPostLikeController.js`

```javascript
import FacultyPostLike from '../models/FacultyPostLike.js';
import FacultyPost from '../models/FacultyPost.js';

export const likePost = async (req, res) => {
  // POST /faculty-profile/posts/:postId/like
  // Require authentication
  // Check if already liked
  // Create like entry
  // Increment likes_count in faculty_posts
}

export const unlikePost = async (req, res) => {
  // DELETE /faculty-profile/posts/:postId/like
  // Require authentication
  // Delete like entry
  // Decrement likes_count in faculty_posts
}
```

#### 2.6 Faculty Post Comment Controller
**File**: `backend/controllers/facultyPostCommentController.js`

```javascript
import FacultyPostComment from '../models/FacultyPostComment.js';
import FacultyPost from '../models/FacultyPost.js';

export const getComments = async (req, res) => {
  // GET /faculty-profile/posts/:postId/comments
  // Query params: limit=20, offset=0
  // Include commenter info from users table
  // Only return approved comments
}

export const addComment = async (req, res) => {
  // POST /faculty-profile/posts/:postId/comments
  // Require authentication
  // Body: content
  // Create comment with status=approved
  // Increment comments_count in faculty_posts
}

export const updateComment = async (req, res) => {
  // PUT /faculty-profile/comments/:commentId
  // Require authentication
  // Only allow updating own comments
  // Update content field
}

export const deleteComment = async (req, res) => {
  // DELETE /faculty-profile/comments/:commentId
  // Require authentication
  // Only allow deleting own comments
  // Decrement comments_count in faculty_posts
}
```

### Step 3: Create Routes

**File**: `backend/routes/facultyProfile.js`

```javascript
import express from 'express';
import auth from '../middleware/auth.js';
import * as facultyProfileController from '../controllers/facultyProfileController.js';
import * as facultyPostController from '../controllers/facultyPostController.js';
import * as facultyFollowerController from '../controllers/facultyFollowerController.js';
import * as facultyFollowRequestController from '../controllers/facultyFollowRequestController.js';
import * as facultyPostLikeController from '../controllers/facultyPostLikeController.js';
import * as facultyPostCommentController from '../controllers/facultyPostCommentController.js';

const router = express.Router();

// Profile routes
router.get('/faculty/:facultyId/profile', facultyProfileController.getProfile);
router.put('/profile', auth, facultyProfileController.updateProfile);
router.get('/school/:schoolId/profiles', facultyProfileController.getPublicProfiles);

// Post routes
router.get('/faculty/:facultyId/posts', facultyPostController.getPosts);
router.post('/posts', auth, facultyPostController.createPost);
router.put('/posts/:postId', auth, facultyPostController.updatePost);
router.post('/posts/:postId/publish', auth, facultyPostController.publishPost);
router.delete('/posts/:postId', auth, facultyPostController.deletePost);

// Follower routes
router.get('/faculty/:facultyId/followers', facultyFollowerController.getFollowers);
router.post('/faculty/follow/:facultyId', auth, facultyFollowerController.followFaculty);
router.delete('/faculty/follow/:facultyId', auth, facultyFollowerController.unfollowFaculty);

// Follow request routes
router.post('/faculty/follow-request/:facultyId', auth, facultyFollowRequestController.sendFollowRequest);
router.get('/follow-requests', auth, facultyFollowRequestController.getFollowRequests);
router.post('/follow-requests/:requestId/respond', auth, facultyFollowRequestController.respondToRequest);

// Like routes
router.post('/posts/:postId/like', auth, facultyPostLikeController.likePost);
router.delete('/posts/:postId/like', auth, facultyPostLikeController.unlikePost);

// Comment routes
router.get('/posts/:postId/comments', facultyPostCommentController.getComments);
router.post('/posts/:postId/comments', auth, facultyPostCommentController.addComment);
router.put('/comments/:commentId', auth, facultyPostCommentController.updateComment);
router.delete('/comments/:commentId', auth, facultyPostCommentController.deleteComment);

export default router;
```

### Step 4: Register Routes in server.js

```javascript
// In backend/server.js
import facultyProfileRouter from './routes/facultyProfile.js';

// Add this after other route registrations
app.use('/api/faculty-profile', facultyProfileRouter);
```

### Implementation Priority

#### Priority 1: Core Profile & Posts
- [ ] Faculty profile CRUD
- [ ] Post creation and publishing
- [ ] Post deletion
- [ ] Get posts list

#### Priority 2: Social Features
- [ ] Follow/unfollow functionality
- [ ] Follower list
- [ ] Like/unlike posts

#### Priority 3: Advanced Features
- [ ] Follow request system
- [ ] Comments
- [ ] Comment moderation

#### Priority 4: Polish
- [ ] Error handling
- [ ] Validation
- [ ] Rate limiting
- [ ] Logging
- [ ] Notifications (optional)

### Testing Each Endpoint

```bash
# Test profile get
curl http://localhost:5000/api/faculty-profile/faculty/1/profile

# Test create post
curl -X POST http://localhost:5000/api/faculty-profile/posts \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello world","post_type":"text"}'

# Test follow
curl -X POST http://localhost:5000/api/faculty-profile/faculty/2/follow \
  -H "Authorization: Bearer TOKEN"

# Test like post
curl -X POST http://localhost:5000/api/faculty-profile/posts/1/like \
  -H "Authorization: Bearer TOKEN"

# Test add comment
curl -X POST http://localhost:5000/api/faculty-profile/posts/1/comments \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Great post!"}'
```

## Phase 3: Testing

- [ ] All endpoints return correct status codes
- [ ] Authentication is enforced on protected routes
- [ ] Authorization checks work (can't edit others' content)
- [ ] Counter increments/decrements work correctly
- [ ] Relationships are properly maintained
- [ ] Pagination works
- [ ] Error handling is comprehensive

## Phase 4: Documentation

- [ ] API documentation updated
- [ ] Database schema documented
- [ ] Error codes documented
- [ ] Examples provided for each endpoint

## Deployment

- [ ] Code reviewed
- [ ] All tests passing
- [ ] Migration tested on fresh database
- [ ] Performance tested with load
- [ ] Security audit completed
- [ ] Error logging configured
- [ ] Deployed to production

## Notes

- Use transactions for operations that affect multiple tables
- Always validate user input
- Check authentication on all POST/PUT/DELETE routes
- Log all operations for audit trail
- Consider caching for frequently accessed profiles
- Implement rate limiting to prevent abuse
- Add proper error messages for frontend

## Support

- All models are already created and tested
- All frontend components are ready
- Frontend service is fully implemented
- Just need to implement the backend controllers and routes

---

**Status**: Phase 1 Complete ✅, Phase 2 Ready to Start
**Last Updated**: 2025-12-29
