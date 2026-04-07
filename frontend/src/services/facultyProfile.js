import api from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const BACKEND_BASE_URL = API_BASE_URL.replace('/api', '');

// Transform relative URLs to absolute URLs
const transformUrls = (data) => {
  if (!data) return data;
  const transformed = { ...data };
  const version = transformed.updated_at || transformed.updatedAt || Date.now();
  const addVersion = (url) => {
    if (!url) return url;
    const hasQuery = url.includes('?');
    return hasQuery ? url : `${url}?v=${encodeURIComponent(version)}`;
  };
  if (transformed.banner_url && transformed.banner_url.startsWith('/uploads/')) {
    transformed.banner_url = addVersion(BACKEND_BASE_URL + transformed.banner_url);
  }
  if (transformed.profile_image_url && transformed.profile_image_url.startsWith('/uploads/')) {
    transformed.profile_image_url = addVersion(BACKEND_BASE_URL + transformed.profile_image_url);
  }
  if (transformed.author_profile_image_url && transformed.author_profile_image_url.startsWith('/uploads/')) {
    transformed.author_profile_image_url = addVersion(BACKEND_BASE_URL + transformed.author_profile_image_url);
  }
  if (transformed.media_url && transformed.media_url.startsWith('/uploads/')) {
    transformed.media_url = addVersion(BACKEND_BASE_URL + transformed.media_url);
  }
  if (Array.isArray(transformed.posts)) {
    transformed.posts = transformed.posts.map(post => transformUrls(post));
  }
  if (Array.isArray(transformed.comments)) {
    transformed.comments = transformed.comments.map(comment => transformUrls(comment));
  }
  return transformed;
};

export const facultyProfileService = {
  // Profile
  getProfile: async (facultyId) => {
    const response = await api.get(`/faculty-profile/faculty/${facultyId}/profile`);
    const profile = response.data?.profile || response.data;
    return transformUrls(profile);
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/faculty-profile/profile', profileData);
    const profile = response.data?.profile || response.data;
    return transformUrls(profile);
  },

  getPublicFacultyProfiles: async (schoolId, options = {}) => {
    const params = new URLSearchParams({
      limit: options.limit || 50,
      offset: options.offset || 0
    });
    const response = await api.get(`/faculty-profile/school/${schoolId}/profiles?${params}`);
    const data = response.data;
    if (data.profiles) {
      data.profiles = data.profiles.map(profile => transformUrls(profile));
    }
    return data;
  },

  // Posts
  getPosts: async (facultyId, options = {}) => {
    const params = new URLSearchParams({
      status: options.status || 'published',
      limit: options.limit || 20,
      offset: options.offset || 0
    });
    const response = await api.get(`/faculty-profile/faculty/${facultyId}/posts?${params}`);
    const data = response.data;
    if (data.posts) {
      data.posts = data.posts.map(post => transformUrls(post));
    }
    return data;
  },

  createPost: async (postData) => {
    const response = await api.post('/faculty-profile/posts', postData);
    return response.data;
  },

  updatePost: async (postId, postData) => {
    const response = await api.put(`/faculty-profile/posts/${postId}`, postData);
    return response.data;
  },

  publishPost: async (postId) => {
    const response = await api.post(`/faculty-profile/posts/${postId}/publish`);
    return response.data;
  },

  deletePost: async (postId) => {
    const response = await api.delete(`/faculty-profile/posts/${postId}`);
    return response.data;
  },

  // Followers
  getFollowers: async (facultyId, options = {}) => {
    const params = new URLSearchParams({
      status: options.status || 'approved',
      limit: options.limit || 50,
      offset: options.offset || 0
    });
    const response = await api.get(`/faculty-profile/faculty/${facultyId}/followers?${params}`);
    return response.data;
  },

  followFaculty: async (facultyId) => {
    const response = await api.post(`/faculty-profile/faculty/follow/${facultyId}`);
    return response.data;
  },

  unfollowFaculty: async (facultyId) => {
    const response = await api.delete(`/faculty-profile/faculty/follow/${facultyId}`);
    return response.data;
  },

  // Follow Requests
  sendFollowRequest: async (facultyId, message = null) => {
    const response = await api.post(`/faculty-profile/faculty/follow-request/${facultyId}`, { message });
    return response.data;
  },

  getFollowRequests: async (options = {}) => {
    const params = new URLSearchParams({
      status: options.status || 'pending',
      limit: options.limit || 50,
      offset: options.offset || 0
    });
    const response = await api.get(`/faculty-profile/follow-requests?${params}`);
    return response.data;
  },

  respondToFollowRequest: async (requestId, action) => {
    const response = await api.post(`/faculty-profile/follow-requests/${requestId}/respond`, { action });
    return response.data;
  },

  // Likes
  likePost: async (postId) => {
    const response = await api.post(`/faculty-profile/posts/${postId}/like`);
    return response.data;
  },

  unlikePost: async (postId) => {
    const response = await api.delete(`/faculty-profile/posts/${postId}/like`);
    return response.data;
  },

  // Comments
  getComments: async (postId, options = {}) => {
    const params = new URLSearchParams({
      limit: options.limit || 20,
      offset: options.offset || 0
    });
    const response = await api.get(`/faculty-profile/posts/${postId}/comments?${params}`);
    const data = response.data;
    if (data.comments) {
      data.comments = data.comments.map(comment => transformUrls(comment));
    }
    return data;
  },

  addComment: async (postId, commentData) => {
    const response = await api.post(`/faculty-profile/posts/${postId}/comments`, commentData);
    return response.data;
  },

  updateComment: async (commentId, commentData) => {
    const response = await api.put(`/faculty-profile/comments/${commentId}`, commentData);
    return response.data;
  },

  deleteComment: async (commentId) => {
    const response = await api.delete(`/faculty-profile/comments/${commentId}`);
    return response.data;
  }
};
