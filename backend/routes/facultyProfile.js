import express from 'express';
import auth from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import facultyProfileController from '../controllers/facultyProfileController.js';

const router = express.Router();

// Public routes
// Get faculty profile (public)
router.get('/faculty/:facultyId/profile', optionalAuth, facultyProfileController.getProfile);

// Get all faculty profiles for a school
router.get('/school/:schoolId/profiles', facultyProfileController.getSchoolFacultyProfiles);

// Get faculty posts
router.get('/faculty/:facultyId/posts', facultyProfileController.getFacultyPosts);

// Get post comments
router.get('/posts/:postId/comments', facultyProfileController.getPostComments);

// Get followers of a faculty
router.get('/faculty/:facultyId/followers', facultyProfileController.getFollowers);

// Protected routes (require authentication)

// Update own profile
router.put('/profile', auth, facultyProfileController.updateProfile);

// Posts
router.post('/posts', auth, facultyProfileController.createPost);
router.put('/posts/:postId', auth, facultyProfileController.updatePost);
router.post('/posts/:postId/publish', auth, facultyProfileController.publishPost);
router.delete('/posts/:postId', auth, facultyProfileController.deletePost);

// Likes
router.post('/posts/:postId/like', auth, facultyProfileController.likePost);
router.delete('/posts/:postId/like', auth, facultyProfileController.unlikePost);

// Comments
router.post('/posts/:postId/comments', auth, facultyProfileController.addComment);
router.put('/comments/:commentId', auth, facultyProfileController.updateComment);
router.delete('/comments/:commentId', auth, facultyProfileController.deleteComment);

// Followers
router.get('/faculty/:facultyId/followers', facultyProfileController.getFollowers);
router.get('/following', auth, facultyProfileController.getFollowing);

// Follow operations
router.post('/faculty/:facultyId/follow', auth, facultyProfileController.followFaculty);
router.delete('/faculty/:facultyId/follow', auth, facultyProfileController.unfollowFaculty);

// Follow requests
router.post('/faculty/:facultyId/follow-request', auth, facultyProfileController.sendFollowRequest);
router.get('/follow-requests', auth, facultyProfileController.getFollowRequests);
router.post('/follow-requests/:requestId/respond', auth, facultyProfileController.respondToFollowRequest);
router.post('/follow-requests/:requestId/accept', auth, facultyProfileController.acceptFollowRequest);
router.post('/follow-requests/:requestId/reject', auth, facultyProfileController.rejectFollowRequest);

export default router;
