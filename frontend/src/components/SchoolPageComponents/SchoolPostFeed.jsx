import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
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
  Divider,
  Avatar
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
  FormatBold as FormatBoldIcon,
  FormatItalic as FormatItalicIcon,
  FormatUnderlined as FormatUnderlinedIcon,
  FormatListBulleted as FormatListBulletedIcon,
  FormatListNumbered as FormatListNumberedIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { schoolPageService } from '../../services/schoolPage';

export default function SchoolPostFeed({ schoolId, isAdmin }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Track expanded comments per post
  const [expandedComments, setExpandedComments] = useState({});
  const [postComments, setPostComments] = useState({});
  const [commentsLoading, setCommentsLoading] = useState({});
  const [newComment, setNewComment] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [error, setError] = useState(null);
  const [likedPosts, setLikedPosts] = useState(new Set());

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    post_type: 'text',
    status: 'published',
    media_url: null,
    allow_comments: true
  });

  const ITEMS_PER_PAGE = 4;

  useEffect(() => {
    if (!schoolId) return;
    loadPosts();
    
    // Auto-refresh posts every 30 seconds
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing posts...');
      loadPosts();
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [schoolId, page]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await schoolPageService.getPosts(schoolId, {
        status: isAdmin ? 'published' : 'published',
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE
      });
      setPosts(data.posts || []);
      setTotalPages(Math.ceil((data.total || 0) / ITEMS_PER_PAGE));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const resetComposer = () => {
    setFormData({
      title: '',
      content: '',
      post_type: 'text',
      status: 'published',
      media_url: null,
      allow_comments: true
    });
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleMediaUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        media_url: reader.result,
        post_type: file.type.startsWith('video') ? 'video' : 'image'
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleCreatePost = async () => {
    try {
      setLoading(true);
      console.log('Submitting post with formData:', formData);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = formData.content || '';
      const plain = (tempDiv.textContent || tempDiv.innerText || '').trim();
      const derivedTitle = formData.title && formData.title.trim() ? formData.title.trim() : (plain ? plain.substring(0, 60) : 'Post');

      await schoolPageService.createPost({
        ...formData,
        title: derivedTitle
      });
      resetComposer();
      setPage(1);
      await loadPosts();
      setError(null);
    } catch (err) {
      console.error('Post creation error:', err);
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  // Rich text editor handlers
  const editorRef = React.useRef(null);
  const execFormat = (cmd) => {
    document.execCommand(cmd, false, null);
    // Update content from editor
    if (editorRef.current) {
      setFormData(prev => ({ ...prev, content: editorRef.current.innerHTML }));
    }
  };
  const handleEditorInput = () => {
    if (editorRef.current) {
      setFormData(prev => ({ ...prev, content: editorRef.current.innerHTML }));
    }
  };

  const mediaInputRef = React.useRef(null);
  const triggerMediaPicker = () => {
    if (mediaInputRef.current) mediaInputRef.current.click();
  };

  const handleLikePost = async (postId) => {
    try {
      if (likedPosts.has(postId)) {
        await schoolPageService.unlikePost(postId);
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      } else {
        await schoolPageService.likePost(postId);
        setLikedPosts(prev => new Set(prev).add(postId));
      }
      await loadPosts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to like post');
    }
  };

  const handleOpenComments = async (post) => {
    const postId = post.id;
    // Toggle expansion
    if (expandedComments[postId]) {
      setExpandedComments(prev => ({ ...prev, [postId]: false }));
    } else {
      setExpandedComments(prev => ({ ...prev, [postId]: true }));
      // Load comments if not already loaded
      if (!postComments[postId]) {
        await loadComments(postId);
      }
    }
  };

  const loadComments = async (postId) => {
    try {
      setCommentsLoading(prev => ({ ...prev, [postId]: true }));
      const data = await schoolPageService.getComments(postId, {
        limit: 50,
        offset: 0
      });
      setPostComments(prev => ({ ...prev, [postId]: data.comments || [] }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load comments');
    } finally {
      setCommentsLoading(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleAddComment = async (postId) => {
    const commentText = newComment[postId];
    if (!commentText || !commentText.trim()) return;

    try {
      await schoolPageService.addComment(postId, {
        comment: commentText,
        guest_name: !user ? 'Guest' : `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
      });
      setNewComment(prev => ({ ...prev, [postId]: '' }));
      await loadComments(postId);
      await loadPosts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add comment');
    }
  };

  const handleMenuOpen = (event, postId) => {
    setAnchorEl(event.currentTarget);
    setSelectedPostId(postId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPostId(null);
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await schoolPageService.deletePost(postId);
        await loadPosts();
        handleMenuClose();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete post');
      }
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Inline Post Composer (Admin Only) */}
      {isAdmin && (
        <Paper sx={{ 
          mb: { xs: 2, sm: 3 }, 
          p: { xs: 1.5, sm: 2, md: 2.5 }, 
          borderRadius: { xs: '8px', sm: '12px' }
        }}>
          {/* Rich Text Editor with inline toolbar */}
          <Box sx={{ mt: 0 }}>
            <Box sx={{ position: 'relative' }}>
              {/* Embedded toolbar inside editor (bottom-left) */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  display: 'flex',
                  gap: 0.5,
                  bgcolor: 'action.hover',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '20px',
                  px: 1,
                  py: 0.5,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  overflowX: { xs: 'auto', sm: 'visible' }
                }}
              >
                <IconButton 
                  size="small" 
                  onClick={() => execFormat('bold')}
                  sx={{ fontSize: { xs: '1rem', sm: '1.5rem' } }}
                ><FormatBoldIcon fontSize="small" /></IconButton>
                <IconButton 
                  size="small" 
                  onClick={() => execFormat('italic')}
                  sx={{ fontSize: { xs: '1rem', sm: '1.5rem' } }}
                ><FormatItalicIcon fontSize="small" /></IconButton>
                <IconButton 
                  size="small" 
                  onClick={() => execFormat('underline')}
                  sx={{ fontSize: { xs: '1rem', sm: '1.5rem' } }}
                ><FormatUnderlinedIcon fontSize="small" /></IconButton>
                <IconButton 
                  size="small" 
                  onClick={() => execFormat('insertUnorderedList')}
                  sx={{ fontSize: { xs: '1rem', sm: '1.5rem' } }}
                ><FormatListBulletedIcon fontSize="small" /></IconButton>
                <IconButton 
                  size="small" 
                  onClick={() => execFormat('insertOrderedList')}
                  sx={{ fontSize: { xs: '1rem', sm: '1.5rem' } }}
                ><FormatListNumberedIcon fontSize="small" /></IconButton>
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                <IconButton 
                  size="small" 
                  onClick={triggerMediaPicker}
                  sx={{ fontSize: { xs: '1rem', sm: '1.5rem' } }}
                ><UploadIcon fontSize="small" /></IconButton>
                <input
                  ref={mediaInputRef}
                  type="file"
                  hidden
                  accept="image/*,video/*"
                  onChange={handleMediaUpload}
                />
              </Box>

              {/* Editable area */}
              <Box
                ref={editorRef}
                onInput={handleEditorInput}
                sx={{
                  minHeight: { xs: 140, sm: 180 },
                  p: { xs: 2, sm: 2.5 },
                  pb: { xs: 4.5, sm: 5.5 },
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: { xs: '8px', sm: '12px' },
                  bgcolor: 'background.paper',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
                  lineHeight: 1.6,
                  outline: 'none',
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  '&:focus': { borderColor: 'primary.main' },
                  '&:empty:before': {
                    content: 'attr(data-placeholder)',
                    color: 'text.secondary'
                  }
                }}
                contentEditable
                suppressContentEditableWarning
                data-placeholder="What's on your mind?"
              />
            </Box>
          </Box>
          {/* Submit */}
          <Box sx={{ 
            mt: { xs: 1.5, sm: 2 }, 
            display: 'flex', 
            gap: { xs: 0.5, sm: 1 },
            flexWrap: 'wrap'
          }}>
            <Button
              variant="contained"
              onClick={handleCreatePost}
              disabled={loading || !formData.content.trim()}
              sx={{ 
                px: { xs: 2, sm: 3 },
                fontSize: { xs: '0.85rem', sm: '1rem' },
                py: { xs: 0.7, sm: 1 }
              }}
            >
              {loading ? <CircularProgress size={20} /> : 'Post'}
            </Button>
          </Box>
        </Paper>
      )}

      {error && (
        <Paper sx={{ 
          p: { xs: 1.5, sm: 2 }, 
          bgcolor: 'error.light', 
          borderLeft: '4px solid', 
          borderColor: 'error.main', 
          mb: 2
        }}>
          <Typography color="error" sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>{error}</Typography>
        </Paper>
      )}

      {/* Posts Timeline */}
      {loading && !posts.length ? (
        <Box display="flex" justifyContent="center" py={{ xs: 2, sm: 4 }}>
          <CircularProgress />
        </Box>
      ) : posts.length === 0 ? (
        <Typography 
          color="textSecondary" 
          align="center" 
          sx={{ 
            py: { xs: 2, sm: 4 },
            fontSize: { xs: '0.9rem', sm: '1rem' }
          }}
        >
          No posts yet
        </Typography>
      ) : (
        <Box>
          {posts.map(post => (
            <Paper
              key={post.id}
              sx={{
                mb: { xs: 1.5, sm: 2 },
                borderRadius: { xs: '8px', sm: '12px' },
                overflow: 'hidden',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)' }
              }}
            >
              {/* Post Header */}
              <Box sx={{ 
                p: { xs: 1.5, sm: 2 }, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, minWidth: 0 }}>
                  <Avatar
                    src={post.author_logo_url || undefined}
                    alt={post.author_name || 'Author'}
                    sx={{ 
                      width: { xs: 28, sm: 32 }, 
                      height: { xs: 28, sm: 32 },
                      flexShrink: 0
                    }}
                  />
                  <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 600, 
                        color: 'primary.main',
                        fontSize: { xs: '0.8rem', sm: '0.9rem' },
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <a href={`/users`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        {post.author_name || 'Unknown'}
                      </a>
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="textSecondary"
                      sx={{
                        fontSize: { xs: '0.7rem', sm: '0.75rem' },
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {new Date(post.published_at || post.created_at).toLocaleDateString()} at{' '}
                      {new Date(post.published_at || post.created_at).toLocaleTimeString()}
                    </Typography>
                  </Box>
                </Box>
                {isAdmin && (
                  <IconButton
                    onClick={(e) => handleMenuOpen(e, post.id)}
                    size="small"
                    sx={{ color: 'text.secondary' }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
              <Box sx={{ px: 2, pt: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  {post.title}
                </Typography>
              </Box>

              {/* Post Media - Full Width */}
              {post.media_url && post.post_type === 'video' && (
                <Box sx={{ width: '100%', overflow: 'hidden', my: 1.5 }}>
                  <Box
                    component="video"
                    src={post.media_url}
                    controls
                    sx={{
                      width: '100%',
                      maxHeight: '600px',
                      objectFit: 'contain',
                      display: 'block',
                      bgcolor: 'background.default'
                    }}
                  />
                </Box>
              )}
              {post.media_url && post.post_type !== 'video' && (
                <Box sx={{ width: '100%', overflow: 'hidden', my: 1.5 }}>
                  <Box
                    component="img"
                    src={post.media_url}
                    alt={post.title}
                    sx={{
                      width: '100%',
                      maxHeight: '600px',
                      objectFit: 'contain',
                      display: 'block',
                      bgcolor: 'background.default'
                    }}
                  />
                </Box>
              )}

              {/* Post Content - Full Width */}
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="body1" sx={{ lineHeight: 1.8, fontSize: '0.95rem' }}>
                  {post.content}
                </Typography>

                {/* Engagement Stats */}
                {(post.likes_count > 0 || post.comments_count > 0) && (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      px: 2,
                      py: 1,
                      borderTop: '1px solid',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      my: 1
                    }}
                  >
                    {post.likes_count > 0 && (
                      <Typography variant="caption" color="textSecondary">
                        <FavoriteIcon sx={{ fontSize: '14px', mr: 0.5, color: 'error.main' }} />
                        {post.likes_count} {post.likes_count === 1 ? 'Like' : 'Likes'}
                      </Typography>
                    )}
                    {post.comments_count > 0 && (
                      <Typography 
                        variant="caption" 
                        color="textSecondary"
                        sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                        onClick={() => handleOpenComments(post)}
                      >
                        {post.comments_count} {post.comments_count === 1 ? 'Comment' : 'Comments'}
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Action Buttons */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 1,
                    px: 2,
                    pb: 1
                  }}
                >
                  <Button
                    size="small"
                    startIcon={likedPosts.has(post.id) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                    onClick={() => handleLikePost(post.id)}
                    sx={{
                      color: likedPosts.has(post.id) ? 'error.main' : 'text.secondary',
                      fontWeight: 500,
                      justifyContent: 'center',
                      '&:hover': { bgcolor: 'action.hover' },
                      textTransform: 'none'
                    }}
                  >
                    Like
                  </Button>
                  <Button
                    size="small"
                    startIcon={<CommentIcon />}
                    onClick={() => handleOpenComments(post)}
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 500,
                      justifyContent: 'center',
                      '&:hover': { bgcolor: 'action.hover' },
                      textTransform: 'none'
                    }}
                  >
                    Comment
                  </Button>
                  <Button
                    size="small"
                    startIcon={<ShareIcon />}
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 500,
                      justifyContent: 'center',
                      '&:hover': { bgcolor: 'action.hover' },
                      textTransform: 'none'
                    }}
                  >
                    Share
                  </Button>
                </Box>
              </Box>

              {/* Inline Comments Section */}
              {expandedComments[post.id] && (
                <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 1 }}>
                  {/* Add Comment Form */}
                  {post.allow_comments && (
                    <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                        <Avatar
                          src={user?.profile_image || undefined}
                          alt={user?.first_name || 'User'}
                          sx={{ width: 32, height: 32 }}
                        />
                        <Box sx={{ flex: 1 }}>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="Write a comment..."
                            value={newComment[post.id] || ''}
                            onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddComment(post.id);
                              }
                            }}
                            sx={{ bgcolor: 'background.paper' }}
                          />
                        </Box>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleAddComment(post.id)}
                          disabled={!newComment[post.id]?.trim() || commentsLoading[post.id]}
                        >
                          Post
                        </Button>
                      </Box>
                    </Box>
                  )}

                  {/* Comments List */}
                  <Box sx={{ px: 2, pb: 2 }}>
                    {commentsLoading[post.id] ? (
                      <Box display="flex" justifyContent="center" py={2}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : !postComments[post.id] || postComments[post.id].length === 0 ? (
                      <Typography color="textSecondary" align="center" py={2} variant="body2">
                        No comments yet. Be the first to comment!
                      </Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
                        {postComments[post.id].map(comment => {
                          const profileLink = comment.school_id ? `/school-page/${comment.school_id}` : '#';
                          const commenterName = comment.guest_name || comment.user_name || 'User';
                          
                          return (
                          <Box key={comment.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                            <a href={profileLink} style={{ textDecoration: 'none' }}>
                              <Avatar
                                src={comment.user_profile_image || undefined}
                                alt={commenterName}
                                sx={{ 
                                  width: 32, 
                                  height: 32,
                                  cursor: 'pointer',
                                  '&:hover': { opacity: 0.8 }
                                }}
                              />
                            </a>
                            <Box sx={{ flex: 1, bgcolor: 'action.hover', p: 1.5, borderRadius: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                <a href={profileLink} style={{ textDecoration: 'none' }}>
                                  <Typography 
                                    variant="subtitle2" 
                                    sx={{ 
                                      fontWeight: 600,
                                      color: 'primary.main',
                                      cursor: 'pointer',
                                      '&:hover': { textDecoration: 'underline' }
                                    }}
                                  >
                                    {commenterName}
                                  </Typography>
                                </a>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(comment.created_at).toLocaleDateString()}
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{ color: 'text.primary' }}>
                                {comment.comment}
                              </Typography>
                            </Box>
                            {isAdmin && (
                              <IconButton size="small" onClick={() => handleDeletePost(comment.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                </Box>
              )}
            </Paper>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </Box>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, value) => setPage(value)}
          />
        </Box>
      )}

      {/* Post Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => handleDeletePost(selectedPostId)}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}
