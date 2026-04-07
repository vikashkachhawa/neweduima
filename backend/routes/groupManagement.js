import express from 'express';
import auth from '../middleware/auth.js';
import {
  createGroup,
  getMyGroups,
  getGroupDetails,
  addMembers,
  removeMember,
  makeAdmin,
  removeAdmin,
  renameGroup,
  deleteGroup
} from '../controllers/groupManagementController.js';

const router = express.Router();

/**
 * All routes require authentication
 */
router.use(auth);

/**
 * GROUP MANAGEMENT ROUTES
 */

/**
 * POST /api/group-management/create
 * Create new group
 * Body: { name, description, member_ids }
 */
router.post('/create', createGroup);

/**
 * GET /api/group-management/my-groups
 * Get all groups for current user
 * Query params: ?sort=latest&limit=20
 */
router.get('/my-groups', getMyGroups);

/**
 * GET /api/group-management/:groupId
 * Get group details with members
 */
router.get('/:groupId', getGroupDetails);

/**
 * POST /api/group-management/:groupId/add-members
 * Add members to group (admin only)
 * Body: { member_ids: [1, 2, 3] }
 */
router.post('/:groupId/add-members', addMembers);

/**
 * POST /api/group-management/:groupId/remove-member/:memberId
 * Remove member from group (admin only)
 */
router.post('/:groupId/remove-member/:memberId', removeMember);

/**
 * POST /api/group-management/:groupId/make-admin/:memberId
 * Promote member to admin (admin only)
 */
router.post('/:groupId/make-admin/:memberId', makeAdmin);

/**
 * POST /api/group-management/:groupId/remove-admin/:memberId
 * Demote admin to member (admin only)
 */
router.post('/:groupId/remove-admin/:memberId', removeAdmin);

/**
 * PUT /api/group-management/:groupId/rename
 * Rename group (admin only)
 * Body: { name }
 */
router.put('/:groupId/rename', renameGroup);

/**
 * DELETE /api/group-management/:groupId
 * Delete group (admin only, soft delete)
 */
router.delete('/:groupId', deleteGroup);

export default router;
