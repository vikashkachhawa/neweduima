import express from 'express';
import authMiddleware from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import roleMiddleware from '../middleware/role.js';
import {
  getSchoolPageProfile,
  updateSchoolPageProfile,
  createPost,
  getPosts,
  updatePost,
  publishPost,
  deletePost,
  followSchool,
  unfollowSchool,
  getFollowers,
  likePost,
  unlikePost,
  addComment,
  getComments,
  moderateComment
} from '../controllers/schoolPageController.js';

const router = express.Router();

// Public routes (no auth required)
router.get('/school/:schoolId/profile', optionalAuth, getSchoolPageProfile);
router.get('/school/:schoolId/posts', getPosts);
router.get('/school/:schoolId/followers', getFollowers);
router.post('/school/:schoolId/follow', followSchool);

// Protected routes (auth required)
router.post('/school/follow/:schoolId', authMiddleware, followSchool);
router.delete('/school/follow/:schoolId', authMiddleware, unfollowSchool);

// School Admin routes
router.put('/profile', authMiddleware, roleMiddleware('school_admin'), updateSchoolPageProfile);
router.post('/posts', authMiddleware, roleMiddleware('school_admin'), createPost);
router.put('/posts/:postId', authMiddleware, roleMiddleware('school_admin'), updatePost);
router.post('/posts/:postId/publish', authMiddleware, roleMiddleware('school_admin'), publishPost);
router.delete('/posts/:postId', authMiddleware, roleMiddleware('school_admin'), deletePost);

// Like/Unlike routes
router.post('/posts/:postId/like', authMiddleware, likePost);
router.delete('/posts/:postId/like', authMiddleware, unlikePost);

// Comment routes (public get, authenticated add)
router.get('/posts/:postId/comments', getComments);
router.post('/posts/:postId/comments', addComment);
router.put('/comments/:commentId/moderate', authMiddleware, roleMiddleware('school_admin'), moderateComment);

export default router;
