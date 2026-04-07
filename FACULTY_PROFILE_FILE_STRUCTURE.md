# Faculty Profile System - File Structure

## Complete File Inventory

### Frontend Components

#### Profile Page
**File**: `frontend/src/pages/FacultyProfile.jsx`
- Main profile page component
- Displays profile header with banner and avatar
- Shows profile information and statistics
- Implements follow/unfollow functionality
- Follow request workflow
- Edit profile dialog
- Followers list view
- Integrates with FacultyPostFeed

#### Post Feed Component
**File**: `frontend/src/components/FacultyProfileComponents/FacultyPostFeed.jsx`
- Post creation composer (for profile owner)
- Post list with pagination
- Post display with media support
- Like/unlike functionality
- Comment section with expansion
- Post deletion with confirmation
- Loading states and error handling

### Frontend Services

#### Faculty Profile API Service
**File**: `frontend/src/services/facultyProfile.js`
- Profile CRUD operations
- Post management (create, read, update, delete, publish)
- Follow/unfollow operations
- Follow request management
- Post interaction (like, unlike)
- Comment operations (create, read, update, delete)
- URL transformation for image caching

### Backend Models

#### Faculty Profile Model
**File**: `backend/models/FacultyProfile.js`
- `findByFacultyId()` - Get profile by faculty user ID
- `create()` - Create new faculty profile
- `updateProfile()` - Update profile information
- `getPublicProfile()` - Get public-facing profile
- `incrementFollowerCount()` - Increment followers
- `decrementFollowerCount()` - Decrement followers
- `incrementPostCount()` - Increment posts
- `decrementPostCount()` - Decrement posts
- `incrementFollowingCount()` - Increment following
- `decrementFollowingCount()` - Decrement following
- `findBySchoolId()` - Get all profiles in school

#### Faculty Post Model
**File**: `backend/models/FacultyPost.js`
- `create()` - Create new post
- `findById()` - Get post by ID
- `findByFacultyId()` - Get posts by faculty
- `findBySchoolId()` - Get posts in school
- `update()` - Update post
- `publish()` - Publish draft/scheduled post
- `delete()` - Delete post
- `incrementLikes()` - Increment like count
- `decrementLikes()` - Decrement like count
- `incrementComments()` - Increment comment count
- `decrementComments()` - Decrement comment count

#### Faculty Follower Model
**File**: `backend/models/FacultyFollower.js`
- `create()` - Add follower
- `findByFacultyAndUser()` - Get specific follower relationship
- `findFollowersByFaculty()` - List followers
- `updateStatus()` - Update follower status
- `delete()` - Remove follower
- `getFollowerCount()` - Get total followers
- `isFollowing()` - Check if user is following

#### Faculty Follow Request Model
**File**: `backend/models/FacultyFollowRequest.js`
- `create()` - Send follow request
- `findById()` - Get request by ID
- `findByFacultyAndRequester()` - Get specific request
- `findByFaculty()` - Get requests for faculty (pending)
- `findByRequester()` - Get requests sent by user
- `updateStatus()` - Update request status (approve/reject/block)
- `delete()` - Delete request
- `deleteByFacultyAndRequester()` - Delete specific request
- `getPendingRequestCount()` - Count pending requests

#### Faculty Post Like Model
**File**: `backend/models/FacultyPostLike.js`
- `create()` - Add like
- `findByPostAndUser()` - Check if user liked post
- `delete()` - Remove like
- `getLikesCount()` - Get total likes on post

#### Faculty Post Comment Model
**File**: `backend/models/FacultyPostComment.js`
- `create()` - Add comment
- `findById()` - Get comment by ID
- `findByPostId()` - Get comments on post
- `update()` - Update comment
- `updateStatus()` - Update moderation status
- `delete()` - Delete comment
- `getCommentsCount()` - Get comment count

### Database Migration

**File**: `backend/database/migrations/2025-12-29-add-faculty-profiles.sql`

**Tables Created**:
1. `faculty_profiles` - Faculty profile information
2. `faculty_posts` - Post content
3. `faculty_followers` - Follow relationships
4. `faculty_follow_requests` - Follow request workflow
5. `faculty_post_likes` - Like tracking
6. `faculty_post_comments` - Comments

### Documentation

**Files**:
- `FACULTY_PROFILE_COMPLETE.md` - Comprehensive documentation
- `FACULTY_PROFILE_QUICK_START.md` - Quick reference guide
- `FACULTY_PROFILE_FILE_STRUCTURE.md` - This file

## File Dependencies

```
FacultyProfile.jsx
├── Imports from useAuth
├── Imports Layout component
├── Imports Material-UI components
├── Imports icons from @mui/icons-material
├── Imports framer-motion for animations
├── Imports FacultyPostFeed component
└── Imports facultyProfileService

FacultyPostFeed.jsx
├── Imports useAuth
├── Imports Material-UI components
├── Imports icons
├── Imports framer-motion
└── Imports facultyProfileService

facultyProfile.js (service)
└── Imports api (axios instance)

FacultyProfile.js (model)
└── Imports db (database connection)

FacultyPost.js (model)
└── Imports db

FacultyFollower.js (model)
└── Imports db

FacultyFollowRequest.js (model)
└── Imports db

FacultyPostLike.js (model)
└── Imports db

FacultyPostComment.js (model)
└── Imports db
```

## API Endpoints (To Be Implemented)

### Profile Endpoints
```
GET    /faculty-profile/faculty/{facultyId}/profile
       Returns full faculty profile with stats

PUT    /faculty-profile/profile
       Update logged-in user's profile

GET    /faculty-profile/school/{schoolId}/profiles
       Get all public profiles in a school
```

### Post Endpoints
```
GET    /faculty-profile/faculty/{facultyId}/posts
       Get posts by faculty (paginated)

POST   /faculty-profile/posts
       Create new post

PUT    /faculty-profile/posts/{postId}
       Update post (draft only)

POST   /faculty-profile/posts/{postId}/publish
       Publish draft or scheduled post

DELETE /faculty-profile/posts/{postId}
       Delete post (owner only)
```

### Follow Endpoints
```
POST   /faculty-profile/faculty/follow/{facultyId}
       Follow faculty member

DELETE /faculty-profile/faculty/follow/{facultyId}
       Unfollow faculty member

GET    /faculty-profile/faculty/{facultyId}/followers
       Get followers of faculty
```

### Follow Request Endpoints
```
POST   /faculty-profile/faculty/follow-request/{facultyId}
       Send follow request

GET    /faculty-profile/follow-requests
       Get pending follow requests

POST   /faculty-profile/follow-requests/{requestId}/respond
       Accept or reject follow request
```

### Interaction Endpoints
```
POST   /faculty-profile/posts/{postId}/like
       Like post

DELETE /faculty-profile/posts/{postId}/like
       Unlike post

GET    /faculty-profile/posts/{postId}/comments
       Get comments on post

POST   /faculty-profile/posts/{postId}/comments
       Add comment to post

PUT    /faculty-profile/comments/{commentId}
       Update comment

DELETE /faculty-profile/comments/{commentId}
       Delete comment
```

## Configuration Required

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

### Backend Routes
Create new file: `backend/routes/facultyProfile.js`
```javascript
router.get('/faculty/:facultyId/profile', ...)
router.put('/profile', auth, ...)
router.get('/school/:schoolId/profiles', ...)
// ... all endpoints
```

Create new controller: `backend/controllers/facultyProfileController.js`
```javascript
export const getProfile = async (req, res) => { ... }
export const updateProfile = async (req, res) => { ... }
// ... all controller methods
```

## Security Considerations

### Authentication Required For:
- Creating posts
- Updating own profile
- Deleting own posts
- Following/unfollowing
- Sending/responding to follow requests
- Commenting on posts

### Authorization:
- Users can only edit their own profile
- Users can only delete their own posts
- Users can only delete their own comments
- Follow requests go to the target faculty
- Private profile posts only visible to approved followers

### Validation:
- Post content length limits
- Comment content limits
- Rate limiting on post creation
- Follow request rate limiting

## Performance Optimization

### Database Indexes
- faculty_profiles: `idx_faculty_profile`, `idx_school_faculty`
- faculty_posts: `idx_faculty_posts`, `idx_school_faculty_posts`
- faculty_followers: `idx_faculty_followers`
- faculty_follow_requests: `idx_pending_requests`
- faculty_post_likes: `idx_post_likes`
- faculty_post_comments: `idx_post_comments`

### Query Optimization
- Pagination implemented (default 20 items per page)
- Relationships use LEFT JOIN for efficient data retrieval
- Count operations indexed
- Status-based filtering for efficient queries

### Caching Strategy
- URL transformation with version query params for image caching
- Auto-refresh every 30 seconds in post feed
- Lazy load comments

## Testing Strategy

### Unit Tests (models)
- Test CRUD operations
- Test counter increments/decrements
- Test relationship queries

### Integration Tests (API)
- Test endpoint authentication
- Test authorization (user can only edit own content)
- Test post creation and visibility
- Test follow workflows

### E2E Tests (UI)
- Create and publish post
- Follow/unfollow faculty
- Send and respond to follow requests
- Like and comment on posts
- Edit own profile

## Deployment Checklist

- [ ] Apply migration to production database
- [ ] Create all backend controllers
- [ ] Create all backend routes
- [ ] Set up proper authentication middleware
- [ ] Add rate limiting
- [ ] Configure CORS if needed
- [ ] Set up image upload handling
- [ ] Test all endpoints
- [ ] Set up error logging
- [ ] Configure notifications (optional)

## Future Enhancements

1. **Notifications**: Notify on follow requests, likes, comments
2. **Search**: Faculty search and discovery
3. **Feed**: School-wide faculty feed
4. **Trending**: Trending posts and faculty
5. **Messaging**: Direct messaging between faculty
6. **Badges**: Achievement badges for faculty
7. **Analytics**: Track engagement metrics
8. **Moderation**: Flag inappropriate content
9. **Backup**: Export/import profile data
10. **Theme**: Profile customization (colors, layouts)
