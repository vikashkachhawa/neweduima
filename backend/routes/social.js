import express from 'express';
import auth from '../middleware/auth.js';
import {
  getConnectionSummary,
  searchUsers,
  sendConnectionRequest,
  respondToConnectionRequest,
  getConnectionRequests,
  getConnections,
  removeConnection,
  searchPages,
  getFollowingPages,
  followPage,
  unfollowPage
} from '../controllers/socialController.js';

const router = express.Router();

router.use(auth);

router.get('/summary', getConnectionSummary);
router.get('/users/search', searchUsers);
router.get('/connections', getConnections);
router.get('/requests', getConnectionRequests);
router.post('/connections/request/:userId', sendConnectionRequest);
router.post('/connections/respond/:requestId', respondToConnectionRequest);
router.delete('/connections/:userId', removeConnection);

router.get('/pages/search', searchPages);
router.get('/pages/following', getFollowingPages);
router.post('/pages/:schoolId/follow', followPage);
router.delete('/pages/:schoolId/follow', unfollowPage);

export default router;
