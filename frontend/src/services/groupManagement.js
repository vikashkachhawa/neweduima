import api from './api';

const API_BASE = '/group-management';

/**
 * Group Management Service
 * Handles group creation, member management, admin controls
 */

const groupManagement = {
  /**
   * Create new group
   */
  createGroup: async (name, description = '', memberIds = []) => {
    const response = await api.post(`${API_BASE}/create`, {
      name,
      description,
      member_ids: memberIds
    });
    return response.data;
  },

  /**
   * Get all groups for current user
   */
  getMyGroups: async (options = {}) => {
    const { sort = 'latest', limit = 20 } = options;
    const response = await api.get(`${API_BASE}/my-groups`, {
      params: { sort, limit }
    });
    return response.data;
  },

  /**
   * Get group details with members
   */
  getGroupDetails: async (groupId) => {
    const response = await api.get(`${API_BASE}/${groupId}`);
    return response.data;
  },

  /**
   * Add members to group (admin only)
   */
  addMembers: async (groupId, memberIds) => {
    const response = await api.post(`${API_BASE}/${groupId}/add-members`, {
      member_ids: memberIds
    });
    return response.data;
  },

  /**
   * Remove member from group (admin only)
   */
  removeMember: async (groupId, memberId) => {
    const response = await api.post(
      `${API_BASE}/${groupId}/remove-member/${memberId}`
    );
    return response.data;
  },

  /**
   * Promote member to admin (admin only)
   */
  makeAdmin: async (groupId, memberId) => {
    const response = await api.post(
      `${API_BASE}/${groupId}/make-admin/${memberId}`
    );
    return response.data;
  },

  /**
   * Demote admin to member (admin only)
   */
  removeAdmin: async (groupId, memberId) => {
    const response = await api.post(
      `${API_BASE}/${groupId}/remove-admin/${memberId}`
    );
    return response.data;
  },

  /**
   * Rename group (admin only)
   */
  renameGroup: async (groupId, name) => {
    const response = await api.put(`${API_BASE}/${groupId}/rename`, {
      name
    });
    return response.data;
  },

  /**
   * Delete group (admin only, soft delete)
   */
  deleteGroup: async (groupId) => {
    const response = await api.delete(`${API_BASE}/${groupId}`);
    return response.data;
  }
};

export default groupManagement;
