import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  CircularProgress,
  Grid,
  Pagination,
  TextField,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import {
  FavoriteBorder as FavoriteBorderIcon,
  Favorite as FavoriteIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Upload as UploadIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { facultyProfileService } from '../../services/facultyProfile';
import { motion } from 'framer-motion';

export default function FacultyPostFeed({ facultyId, isOwner = false }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedComments, setExpandedComments] = useState({});
  const [postComments, setPostComments] = useState({});
  const [commentsLoading, setCommentsLoading] = useState({});
  const [newComment, setNewComment] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [error, setError] = useState(null);
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    post_type: 'text',
    status: 'published',
    media_url: null,
    allow_comments: true
  });

  const [uploadingMedia, setUploadingMedia] = useState(false);
  const ITEMS_PER_PAGE = 5;

  // Dummy posts for demonstration
  const dummyPosts = [
    {
      id: 'dummy-1',
      title: 'Welcome to My Faculty Profile!',
      content: 'I\'m excited to share educational content and engage with my students here. This is a great platform for collaboration and learning. Feel free to ask questions and share your thoughts!',
      author_name: 'Faculty Member',
      published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      media_url: null,
      likes_count: 24,
      comments_count: 5,
      allow_comments: true,
      faculty_id: facultyId,
      isDummy: true
    },
    {
      id: 'dummy-2',
      title: 'Upcoming Class Schedule Update',
      content: 'Just a reminder that we have an exciting session coming up next week. Topics will include advanced concepts and real-world applications. Please prepare your assignments and come with questions!',
      author_name: 'Faculty Member',
      published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      media_url: null,
      likes_count: 18,
      comments_count: 8,
      allow_comments: true,
      faculty_id: facultyId,
      isDummy: true
    },
    {
      id: 'dummy-3',
      title: 'Research Opportunities Available',
      content: 'I\'m looking for motivated students interested in collaborating on research projects. This is an excellent opportunity to gain hands-on experience and contribute to meaningful work. Contact me for more details!',
      author_name: 'Faculty Member',
      published_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      media_url: null,
      likes_count: 32,
      comments_count: 12,
      allow_comments: true,
      faculty_id: facultyId,
      isDummy: true
    }
  ];

  useEffect(() => {
    if (!facultyId) return;
    loadPosts();

    const refreshInterval = setInterval(() => {
      loadPosts();
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [facultyId, page]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await facultyProfileService.getPosts(facultyId, {
        status: isOwner ? 'published' : 'published',
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE
      });
      
      // If no posts exist, use dummy posts for demonstration
      const postsToDisplay = data.posts && data.posts.length > 0 ? data.posts : dummyPosts;
      setPosts(postsToDisplay);
      setTotalPages(Math.ceil((data.total || dummyPosts.length) / ITEMS_PER_PAGE));
    } catch (err) {
      // On error, still show dummy posts
      setPosts(dummyPosts);
      setTotalPages(1);
      setError('Showing sample posts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!formData.content.trim()) {
      alert('Please enter post content');
      return;
    }

    try {
      await facultyProfileService.createPost({
        ...formData,
        status: 'published'
      });
      setFormData({
        title: '',
        content: '',
        post_type: 'text',
        status: 'published',
        media_url: null,
        allow_comments: true
      });
      loadPosts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create post');
    }
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;

    try {
      await facultyProfileService.deletePost(postToDelete.id);
      setPosts(posts.filter(p => p.id !== postToDelete.id));
      setDeleteConfirmOpen(false);
      setPostToDelete(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete post');
    }
  };

  const handleLikePost = async (postId, isLiked) => {
    try {
      if (isLiked) {
        await facultyProfileService.unlikePost(postId);
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      } else {
        await facultyProfileService.likePost(postId);
        setLikedPosts(prev => new Set(prev).add(postId));
      }
      loadPosts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to like post');
    }
  };

  const handleLoadComments = async (postId) => {
    if (expandedComments[postId]) {
      setExpandedComments(prev => ({ ...prev, [postId]: false }));
      return;
    }

    try {
      setCommentsLoading(prev => ({ ...prev, [postId]: true }));
      const data = await facultyProfileService.getComments(postId);
      setPostComments(prev => ({ ...prev, [postId]: data.comments || [] }));
      setExpandedComments(prev => ({ ...prev, [postId]: true }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load comments');
    } finally {
      setCommentsLoading(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleAddComment = async (postId) => {
    const content = newComment[postId];
    if (!content || !content.trim()) return;

    try {
      await facultyProfileService.addComment(postId, { content });
      setNewComment(prev => ({ ...prev, [postId]: '' }));
      await handleLoadComments(postId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add comment');
    }
  };

  const handleMenuOpen = (e, postId) => {
    setAnchorEl(e.currentTarget);
    setSelectedPostId(postId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPostId(null);
  };

  if (loading && posts.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="30vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {isOwner && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Paper sx={{ p: 3, mb: 4, bgcolor: 'background.paper' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Create a Post
            </Typography>
            {formData.title && (
              <TextField
                fullWidth
                placeholder="Post title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                sx={{ mb: 2 }}
              />
            )}
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="What's on your mind?"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={handleCreatePost} disabled={uploadingMedia}>
                Post
              </Button>
            </Box>
          </Paper>
        </motion.div>
      )}

      <Box sx={{ mb: 4 }}>
        {posts.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No posts yet. {isOwner ? 'Create your first post!' : 'Check back later'}
            </Typography>
          </Paper>
        ) : (
          posts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                      <Avatar sx={{ width: 40, height: 40, bgcolor: '#8b5cf6' }}>
                        {post.author_name?.charAt(0) || 'F'}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {post.author_name || 'Faculty'} {post.isDummy && <Chip label="Demo" size="small" sx={{ ml: 1 }} />}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(post.published_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                    {!post.isDummy && isOwner && user?.id === post.faculty_id && (
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, post.id)}>
                        <MoreVertIcon />
                      </IconButton>
                    )}
                  </Box>

                  {post.title && (
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {post.title}
                    </Typography>
                  )}

                  <Typography variant="body2" sx={{ mb: 2, color: 'text.primary' }}>
                    {post.content}
                  </Typography>

                  {post.media_url && (
                    <Box
                      component="img"
                      src={post.media_url}
                      alt="Post media"
                      sx={{
                        width: '100%',
                        borderRadius: 1,
                        mb: 2,
                        maxHeight: 400,
                        objectFit: 'cover'
                      }}
                    />
                  )}

                  <Box sx={{ display: 'flex', gap: 2, mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
                    <Button
                      startIcon={likedPosts.has(post.id) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                      onClick={() => !post.isDummy && handleLikePost(post.id, likedPosts.has(post.id))}
                      sx={{ color: likedPosts.has(post.id) ? 'error.main' : 'text.secondary' }}
                      disabled={post.isDummy}
                    >
                      {post.likes_count || 0}
                    </Button>
                    <Button
                      startIcon={<CommentIcon />}
                      onClick={() => !post.isDummy && handleLoadComments(post.id)}
                      disabled={post.isDummy}
                    >
                      {post.comments_count || 0}
                    </Button>
                    <Button startIcon={<ShareIcon />} sx={{ color: 'text.secondary' }} disabled={post.isDummy}>
                      Share
                    </Button>
                  </Box>

                  {post.allow_comments && expandedComments[post.id] && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
                      {commentsLoading[post.id] ? (
                        <CircularProgress size={24} />
                      ) : (
                        <>
                          <Box sx={{ mb: 2, maxHeight: 300, overflowY: 'auto' }}>
                            {postComments[post.id]?.map((comment) => (
                              <Box key={comment.id} sx={{ mb: 2, p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {comment.first_name} {comment.last_name}
                                </Typography>
                                <Typography variant="body2">{comment.content}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(comment.created_at).toLocaleDateString()}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                          {user && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <TextField
                                fullWidth
                                size="small"
                                placeholder="Add a comment..."
                                value={newComment[post.id] || ''}
                                onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                              />
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleAddComment(post.id)}
                              >
                                Post
                              </Button>
                            </Box>
                          )}
                        </>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </Box>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, value) => setPage(value)}
          />
        </Box>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            setPostToDelete(posts.find(p => p.id === selectedPostId));
            setDeleteConfirmOpen(true);
            handleMenuClose();
          }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Post</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this post?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeletePost} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
