import SchoolPage from '../models/SchoolPage.js';
import SchoolPost from '../models/SchoolPost.js';
import SchoolFollower from '../models/SchoolFollower.js';
import SchoolPostComment from '../models/SchoolPostComment.js';
import db from '../config/database.js';
import { uploadImage, deleteImage } from '../utils/imageUpload.js';
import {
  createPostCommentNotification,
  createPostLikeNotification,
  createSchoolProfileVisitNotification
} from '../services/notificationService.js';

// Get school page profile
export const getSchoolPageProfile = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const page = await SchoolPage.findBySchoolId(schoolId);

    if (!page) {
      return res.status(404).json({ error: 'School page not found' });
    }

    if (req.user?.id) {
      await createSchoolProfileVisitNotification(Number(schoolId), Number(req.user.id));
    }

    res.json({ success: true, page });
  } catch (error) {
    console.error('Get school page error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update school page profile (admin only)
export const updateSchoolPageProfile = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const data = { ...req.body };

    console.log('📝 Update school page - schoolId:', schoolId);
    console.log('📝 Banner URL type:', typeof data.banner_url, 'Starts with data:image?', data.banner_url?.startsWith('data:image'));
    console.log('📝 Logo URL type:', typeof data.logo_url, 'Starts with data:image?', data.logo_url?.startsWith('data:image'));

    // Handle base64 image uploads for banner
    if (data.banner_url && data.banner_url.startsWith('data:image')) {
      try {
        console.log('🖼️ Uploading banner...');
        data.banner_url = await uploadImage(data.banner_url, `banner-${schoolId}.jpg`);
        console.log('✅ Banner uploaded to:', data.banner_url);
      } catch (error) {
        console.error('❌ Banner upload error:', error);
        return res.status(400).json({ error: 'Failed to upload banner: ' + error.message });
      }
    }

    // Handle base64 image uploads for logo
    if (data.logo_url && data.logo_url.startsWith('data:image')) {
      try {
        console.log('🖼️ Uploading logo...');
        data.logo_url = await uploadImage(data.logo_url, `logo-${schoolId}.png`);
        console.log('✅ Logo uploaded to:', data.logo_url);
      } catch (error) {
        console.error('❌ Logo upload error:', error);
        return res.status(400).json({ error: 'Failed to upload logo: ' + error.message });
      }
    }

    console.log('💾 Saving profile with data:', data);
    const page = await SchoolPage.updateProfile(schoolId, data);
    console.log('✅ Profile saved:', page);

    res.json({ success: true, message: 'School page updated', page });
  } catch (error) {
    console.error('❌ Update school page error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create post
export const createPost = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    let { title, content, post_type, status, allow_comments, scheduled_at, media_url } = req.body;

    console.log('Creating post with data:', { schoolId, title, content, post_type, status, media_url: media_url ? 'present' : 'absent' });

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Derive title if missing: strip HTML and take first 60 chars
    if (!title || !title.trim()) {
      const plain = String(content).replace(/<[^>]*>/g, '').trim();
      title = plain ? plain.substring(0, 60) : 'Post';
    }

    // Handle base64 image/video uploads for media
    if (media_url && media_url.startsWith('data:')) {
      try {
        console.log('Uploading media...');
        const ext = media_url.startsWith('data:video') ? 'mp4' : 'jpg';
        media_url = await uploadImage(media_url, `post-${schoolId}-${Date.now()}.${ext}`);
        console.log('Media uploaded to:', media_url);
      } catch (error) {
        console.error('Media upload error:', error);
        return res.status(400).json({ error: 'Failed to upload media' });
      }
    }

    const post = await SchoolPost.create(schoolId, {
      title,
      content,
      post_type: post_type || 'text',
      status: status || 'draft',
      allow_comments: allow_comments !== false,
      media_url: media_url || null,
      created_by: req.user.id,
      scheduled_at
    });

    console.log('Post created:', post);

    if (status === 'published') {
      await SchoolPage.incrementPostCount(schoolId);
    }

    res.status(201).json({ success: true, message: 'Post created', post });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get posts
export const getPosts = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { status = 'published', limit = 20, offset = 0 } = req.query;

    const posts = await SchoolPost.findBySchoolId(schoolId, {
      status,
      limit: Math.min(parseInt(limit), 50),
      offset: parseInt(offset)
    });

    res.json({ success: true, posts });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update post
export const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, content, allow_comments } = req.body;

    const post = await SchoolPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.school_id !== req.user.school_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await SchoolPost.update(postId, { title, content, allow_comments });

    res.json({ success: true, message: 'Post updated', post: updated });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Publish post
export const publishPost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await SchoolPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.school_id !== req.user.school_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const published = await SchoolPost.publish(postId);
    await SchoolPage.incrementPostCount(post.school_id);

    res.json({ success: true, message: 'Post published', post: published });
  } catch (error) {
    console.error('Publish post error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete post
export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await SchoolPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.school_id !== req.user.school_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await SchoolPost.delete(postId);
    if (post.status === 'published') {
      await SchoolPage.decrementPostCount(post.school_id);
    }

    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Follow school
export const followSchool = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const userId = req.user?.id || null;
    const { follower_email, follower_name } = req.body;

    const existing = await SchoolFollower.findBySchoolAndUser(schoolId, userId);
    if (existing) {
      return res.status(409).json({ error: 'Already following' });
    }

    const follower = await SchoolFollower.create(schoolId, {
      follower_id: userId,
      follower_email: follower_email || (req.user?.email),
      follower_name: follower_name || (req.user ? `${req.user.first_name} ${req.user.last_name}` : 'Guest')
    });

    await SchoolPage.incrementFollowerCount(schoolId);

    res.status(201).json({ success: true, message: 'Following school', follower });
  } catch (error) {
    console.error('Follow school error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Unfollow school
export const unfollowSchool = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const userId = req.user.id;

    const deleted = await SchoolFollower.delete(schoolId, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Not following' });
    }

    await SchoolPage.decrementFollowerCount(schoolId);

    res.json({ success: true, message: 'Unfollowed school' });
  } catch (error) {
    console.error('Unfollow school error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get followers
export const getFollowers = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { status = 'approved', limit = 50, offset = 0 } = req.query;

    const followers = await SchoolFollower.findFollowersBySchool(schoolId, {
      status,
      limit: Math.min(parseInt(limit), 100),
      offset: parseInt(offset)
    });

    res.json({ success: true, followers });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Like post
export const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id || null;

    const post = await SchoolPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const [existing] = await db.query(
      'SELECT id FROM school_post_likes WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Already liked' });
    }

    const [result] = await db.query(
      'INSERT INTO school_post_likes (post_id, user_id) VALUES (?, ?)',
      [postId, userId]
    );

    await SchoolPost.incrementLikes(postId);

    await createPostLikeNotification({
      recipientUserId: post.created_by,
      actorUserId: userId,
      entityType: 'school_post',
      entityId: Number(postId),
      path: `/school-page/${post.school_id}`
    });

    res.status(201).json({ success: true, message: 'Post liked' });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Unlike post
export const unlikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    await db.query(
      'DELETE FROM school_post_likes WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );

    await SchoolPost.decrementLikes(postId);

    res.json({ success: true, message: 'Post unliked' });
  } catch (error) {
    console.error('Unlike post error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Add comment
export const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({ error: 'Comment is required' });
    }

    const post = await SchoolPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (!post.allow_comments) {
      return res.status(403).json({ error: 'Comments disabled' });
    }

    const newComment = await SchoolPostComment.create(postId, {
      user_id: req.user?.id || null,
      guest_name: req.body.guest_name,
      guest_email: req.body.guest_email || (req.user?.email),
      comment
    });

    await SchoolPost.incrementComments(postId);

    const actorName = req.user
      ? undefined
      : req.body.guest_name || req.body.guest_email || 'A visitor';

    await createPostCommentNotification({
      recipientUserId: post.created_by,
      actorUserId: req.user?.id || null,
      actorName,
      entityType: 'school_post',
      entityId: Number(postId),
      path: `/school-page/${post.school_id}`
    });

    res.status(201).json({ success: true, message: 'Comment added', comment: newComment });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get comments
export const getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const comments = await SchoolPostComment.findByPostId(postId, {
      limit: Math.min(parseInt(limit), 50),
      offset: parseInt(offset)
    });

    res.json({ success: true, comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Moderate comment (admin)
export const moderateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { action } = req.body;

    const comment = await SchoolPostComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (action === 'hide') {
      await SchoolPostComment.hide(commentId);
    } else if (action === 'pin') {
      await SchoolPostComment.pin(commentId);
    } else if (action === 'unpin') {
      await SchoolPostComment.unpin(commentId);
    } else if (action === 'delete') {
      await SchoolPostComment.delete(commentId);
      await SchoolPost.decrementComments(comment.post_id);
    }

    res.json({ success: true, message: `Comment ${action}ed` });
  } catch (error) {
    console.error('Moderate comment error:', error);
    res.status(500).json({ error: error.message });
  }
};
