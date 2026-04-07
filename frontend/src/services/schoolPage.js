import api from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const BACKEND_BASE_URL = API_BASE_URL.replace('/api', ''); // Remove /api to get backend base URL

// Transform relative URLs to absolute URLs and add cache-busting version
const transformUrls = (data) => {
  if (!data) return data;
  const transformed = { ...data };
  const version = transformed.updated_at || transformed.updatedAt || Date.now();
  const addVersion = (url) => {
    if (!url) return url;
    // Avoid double-appending if a query already exists
    const hasQuery = url.includes('?');
    return hasQuery ? url : `${url}?v=${encodeURIComponent(version)}`;
  };
  if (transformed.banner_url && transformed.banner_url.startsWith('/uploads/')) {
    transformed.banner_url = addVersion(BACKEND_BASE_URL + transformed.banner_url);
  }
  if (transformed.logo_url && transformed.logo_url.startsWith('/uploads/')) {
    transformed.logo_url = addVersion(BACKEND_BASE_URL + transformed.logo_url);
  }
  if (transformed.author_logo_url && transformed.author_logo_url.startsWith('/uploads/')) {
    transformed.author_logo_url = addVersion(BACKEND_BASE_URL + transformed.author_logo_url);
    if (transformed.user_profile_image && transformed.user_profile_image.startsWith('/uploads/')) {
      transformed.user_profile_image = addVersion(BACKEND_BASE_URL + transformed.user_profile_image);
    }
  }
  if (transformed.media_url && transformed.media_url.startsWith('/uploads/')) {
    transformed.media_url = addVersion(BACKEND_BASE_URL + transformed.media_url);
  }
  if (Array.isArray(transformed.posts)) {
    transformed.posts = transformed.posts.map(post => transformUrls(post));
    if (Array.isArray(transformed.comments)) {
      transformed.comments = transformed.comments.map(comment => transformUrls(comment));
    }
  }
  return transformed;
};

export const schoolPageService = {
  // Profile
  getProfile: async (schoolId) => {
    const response = await api.get(`/school-page/school/${schoolId}/profile`);
    // Backend returns { success: true, page: {...} }
    const page = response.data?.page || response.data;
    return transformUrls(page);
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/school-page/profile', profileData);
    // Backend returns { success: true, message: '...', page: {...} }
    console.log('📤 updateProfile response:', response.data);
    const page = response.data?.page || response.data;
    return transformUrls(page);
  },

  // Posts
  getPosts: async (schoolId, options = {}) => {
    const params = new URLSearchParams({
      status: options.status || 'published',
      limit: options.limit || 20,
      offset: options.offset || 0
    });
    const response = await api.get(`/school-page/school/${schoolId}/posts?${params}`);
    const data = response.data;
    if (data.posts) {
      data.posts = data.posts.map(post => transformUrls(post));
    }
    return data;
  },

  createPost: async (postData) => {
    const response = await api.post('/school-page/posts', postData);
    return response.data;
  },

  updatePost: async (postId, postData) => {
    const response = await api.put(`/school-page/posts/${postId}`, postData);
    return response.data;
  },

  publishPost: async (postId) => {
    const response = await api.post(`/school-page/posts/${postId}/publish`);
    return response.data;
  },

  deletePost: async (postId) => {
    const response = await api.delete(`/school-page/posts/${postId}`);
    return response.data;
  },

  // Followers
  getFollowers: async (schoolId, options = {}) => {
    const params = new URLSearchParams({
      status: options.status || 'approved',
      limit: options.limit || 50,
      offset: options.offset || 0
    });
    const response = await api.get(`/school-page/school/${schoolId}/followers?${params}`);
    return response.data;
  },

  followSchool: async (schoolId) => {
    const response = await api.post(`/school-page/school/follow/${schoolId}`);
    return response.data;
  },

  unfollowSchool: async (schoolId) => {
    const response = await api.delete(`/school-page/school/follow/${schoolId}`);
    return response.data;
  },

  // Likes
  likePost: async (postId) => {
    const response = await api.post(`/school-page/posts/${postId}/like`);
    return response.data;
  },

  unlikePost: async (postId) => {
    const response = await api.delete(`/school-page/posts/${postId}/like`);
    return response.data;
  },

  // Comments
  getComments: async (postId, options = {}) => {
    const params = new URLSearchParams({
      limit: options.limit || 20,
      offset: options.offset || 0
    });
    const response = await api.get(`/school-page/posts/${postId}/comments?${params}`);
    const data = response.data;
    if (data.comments) {
      data.comments = data.comments.map(comment => transformUrls(comment));
    }
    return data;
  },

  addComment: async (postId, commentData) => {
    const response = await api.post(`/school-page/posts/${postId}/comments`, commentData);
    return response.data;
  },

  moderateComment: async (commentId, action) => {
    const response = await api.put(`/school-page/comments/${commentId}/moderate`, { action });
    return response.data;
  }
};
