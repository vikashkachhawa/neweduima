import FacultyProfile from '../models/FacultyProfile.js';
import FacultyPost from '../models/FacultyPost.js';
import FacultyFollower from '../models/FacultyFollower.js';
import FacultyFollowRequest from '../models/FacultyFollowRequest.js';
import FacultyPostLike from '../models/FacultyPostLike.js';
import FacultyPostComment from '../models/FacultyPostComment.js';
import db from '../config/database.js';
import {
    createFacultyFollowRequestNotification,
    createFacultyProfileVisitNotification,
    createPostCommentNotification,
    createPostLikeNotification
} from '../services/notificationService.js';

// Get faculty profile by ID
export const getProfile = async (req, res) => {
    try {
        const { facultyId } = req.params;
        
        if (!facultyId) {
            return res.status(400).json({
                success: false,
                message: 'Faculty ID is required'
            });
        }

        let profile = await FacultyProfile.getPublicProfile(facultyId);
        
        if (!profile) {
            const [[facultyUser]] = await db.query(
                `SELECT id, school_id, role
                 FROM users
                 WHERE id = ?
                 LIMIT 1`,
                [facultyId]
            );

            if (facultyUser?.role === 'faculty' && facultyUser.school_id) {
                await FacultyProfile.create(facultyId, facultyUser.school_id);
            }

            profile = await FacultyProfile.findByFacultyId(facultyId);
            if (!profile) {
                return res.status(404).json({
                    success: false,
                    message: 'Faculty profile not found'
                });
            }
        }

        // Get additional data
        const posts = await FacultyPost.findByFacultyId(facultyId, { limit: 10, offset: 0 });
        const followers = await FacultyFollower.getFollowerCount(facultyId);
        const isFollowing = req.user ? await FacultyFollower.isFollowing(req.user.id, facultyId) : false;

        if (req.user?.id && Number(req.user.id) !== Number(facultyId)) {
            await createFacultyProfileVisitNotification(Number(facultyId), Number(req.user.id));
        }

        res.json({
            success: true,
            profile: {
                ...profile,
                posts: posts || [],
                followers_count: followers || 0,
                is_following: isFollowing
            }
        });
    } catch (error) {
        console.error('Error fetching faculty profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch faculty profile'
        });
    }
};

// Update own profile
export const updateProfile = async (req, res) => {
    try {
        const { id: facultyId, school_id: schoolId } = req.user;
        const { first_name, last_name, email, bio, department, office_location, phone, banner_url, profile_image_url } = req.body;

        // Ensure profile exists
        let profile = await FacultyProfile.findByFacultyId(facultyId);
        if (!profile && schoolId) {
            await FacultyProfile.create(facultyId, schoolId);
        }

        // Only include fields that are actually provided (not undefined)
        const profileData = {};
        if (first_name !== undefined) profileData.first_name = first_name;
        if (last_name !== undefined) profileData.last_name = last_name;
        if (email !== undefined) profileData.email = email;
        if (bio !== undefined) profileData.bio = bio;
        if (department !== undefined) profileData.department = department;
        if (office_location !== undefined) profileData.office_location = office_location;
        if (phone !== undefined) profileData.phone = phone;
        if (banner_url !== undefined) profileData.banner_url = banner_url;
        if (profile_image_url !== undefined) profileData.profile_image_url = profile_image_url;

        const updated = await FacultyProfile.updateProfile(facultyId, profileData);
        
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Faculty profile not found'
            });
        }

        const profile2 = await FacultyProfile.getPublicProfile(facultyId);
        res.json({
            success: true,
            profile: profile2
        });
    } catch (error) {
        console.error('Error updating faculty profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update faculty profile'
        });
    }
};

// Get all faculty profiles for a school
export const getSchoolFacultyProfiles = async (req, res) => {
    try {
        const { schoolId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        if (!schoolId) {
            return res.status(400).json({
                success: false,
                message: 'School ID is required'
            });
        }

        const profiles = await FacultyProfile.findBySchoolId(schoolId, {
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            success: true,
            profiles: profiles || [],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error fetching school faculty profiles:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch faculty profiles'
        });
    }
};

// Get faculty posts
export const getFacultyPosts = async (req, res) => {
    try {
        const { facultyId } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        if (!facultyId) {
            return res.status(400).json({
                success: false,
                message: 'Faculty ID is required'
            });
        }

        const posts = await FacultyPost.findByFacultyId(facultyId, {
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            success: true,
            posts: posts || [],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error fetching faculty posts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch faculty posts'
        });
    }
};

// Create post
export const createPost = async (req, res) => {
    try {
        const { id: facultyId, school_id: schoolId } = req.user;
        const { title, content, post_type = 'text', media_url, media_type, allow_comments = true } = req.body;

        // Ensure faculty profile exists
        let profile = await FacultyProfile.findByFacultyId(facultyId);
        if (!profile && schoolId) {
            await FacultyProfile.create(facultyId, schoolId);
            profile = await FacultyProfile.findByFacultyId(facultyId);
        }

        // Use content as main body, or combine title + content
        const postContent = title ? `${title}\n\n${content}` : content;

        if (!postContent || !postContent.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Post content is required'
            });
        }

        const postData = {
            faculty_id: facultyId,
            school_id: schoolId,
            title: title || 'Untitled',
            content: postContent.trim(),
            post_type,
            media_url,
            media_type,
            allow_comments,
            status: 'published'
        };

        const postId = await FacultyPost.create(postData);
        const post = await FacultyPost.findById(postId);

        res.status(201).json({
            success: true,
            post
        });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create post'
        });
    }
};

// Like post
export const likePost = async (req, res) => {
    try {
        const { id: facultyId } = req.user;
        const { postId } = req.params;

        if (!postId) {
            return res.status(400).json({
                success: false,
                message: 'Post ID is required'
            });
        }

        const post = await FacultyPost.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        const isLiked = await FacultyPostLike.findByPostAndUser(postId, facultyId);

        if (isLiked) {
            await FacultyPostLike.delete(postId, facultyId);
            await FacultyPost.decrementLikes(postId);
        } else {
            await FacultyPostLike.create(postId, facultyId);
            await FacultyPost.incrementLikes(postId);

            await createPostLikeNotification({
                recipientUserId: post.faculty_id,
                actorUserId: facultyId,
                entityType: 'faculty_post',
                entityId: Number(postId),
                path: `/faculty/profile/${post.faculty_id}`
            });
        }

        const updated = await FacultyPost.findById(postId);
        res.json({
            success: true,
            post: updated,
            liked: !isLiked
        });
    } catch (error) {
        console.error('Error liking post:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to like post'
        });
    }
};

// Add comment
export const addComment = async (req, res) => {
    try {
        const { id: facultyId } = req.user;
        const { postId } = req.params;
        const { content } = req.body;

        if (!postId || !content || !content.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Post ID and comment content are required'
            });
        }

        const post = await FacultyPost.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        const commentId = await FacultyPostComment.create(postId, {
            user_id: facultyId,
            content: content.trim(),
            status: 'approved'
        });

        await FacultyPost.incrementComments(postId);
        const comment = await FacultyPostComment.findById(commentId);

        await createPostCommentNotification({
            recipientUserId: post.faculty_id,
            actorUserId: facultyId,
            entityType: 'faculty_post',
            entityId: Number(postId),
            path: `/faculty/profile/${post.faculty_id}`
        });

        res.status(201).json({
            success: true,
            comment
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add comment'
        });
    }
};

// Follow faculty
export const followFaculty = async (req, res) => {
    try {
        const { id: followerId } = req.user;
        const { facultyId } = req.params;

        if (!facultyId) {
            return res.status(400).json({
                success: false,
                message: 'Faculty ID is required'
            });
        }

        if (followerId === parseInt(facultyId)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot follow yourself'
            });
        }

        const isFollowing = await FacultyFollower.isFollowing(followerId, facultyId);

        if (isFollowing) {
            await FacultyFollower.delete(followerId, facultyId);
            await FacultyProfile.decrementFollowerCount(facultyId);
            await FacultyProfile.decrementFollowingCount(followerId);
        } else {
            await FacultyFollower.create({
                follower_id: followerId,
                faculty_id: facultyId,
                status: 'approved'
            });
            await FacultyProfile.incrementFollowerCount(facultyId);
            await FacultyProfile.incrementFollowingCount(followerId);
        }

        const profile = await FacultyProfile.getPublicProfile(facultyId);
        res.json({
            success: true,
            profile,
            is_following: !isFollowing
        });
    } catch (error) {
        console.error('Error following faculty:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to follow faculty'
        });
    }
};

// Send follow request
export const sendFollowRequest = async (req, res) => {
    try {
        const { id: requesterId } = req.user;
        const { facultyId } = req.params;

        if (!facultyId) {
            return res.status(400).json({
                success: false,
                message: 'Faculty ID is required'
            });
        }

        if (requesterId === parseInt(facultyId)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot send request to yourself'
            });
        }

        // Check if already sent
        const existing = await FacultyFollowRequest.findByFacultyAndRequester(facultyId, requesterId);
        
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Follow request already sent'
            });
        }

        const requestId = await FacultyFollowRequest.create({
            requester_id: requesterId,
            faculty_id: facultyId,
            status: 'pending'
        });

        const request = await FacultyFollowRequest.findById(requestId);

        await createFacultyFollowRequestNotification(Number(facultyId), requesterId);

        res.status(201).json({
            success: true,
            request
        });
    } catch (error) {
        console.error('Error sending follow request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send follow request'
        });
    }
};

// Get follow requests
export const getFollowRequests = async (req, res) => {
    try {
        const { id: facultyId } = req.user;
        const { limit = 20, offset = 0 } = req.query;

        const requests = await FacultyFollowRequest.findByFaculty(facultyId, {
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            success: true,
            requests: requests || [],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error fetching follow requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch follow requests'
        });
    }
};

// Approve/Reject follow request
export const respondToFollowRequest = async (req, res) => {
    try {
        const { id: facultyId } = req.user;
        const { requestId } = req.params;
        const { action } = req.body;

        if (!requestId || !action) {
            return res.status(400).json({
                success: false,
                message: 'Request ID and action are required'
            });
        }

        if (!['approve', 'reject', 'block'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid action'
            });
        }

        const request = await FacultyFollowRequest.findById(requestId);
        if (!request || request.faculty_id !== facultyId) {
            return res.status(404).json({
                success: false,
                message: 'Follow request not found'
            });
        }

        const statusMap = {
            'approve': 'approved',
            'reject': 'rejected',
            'block': 'blocked'
        };

        const status = statusMap[action];
        await FacultyFollowRequest.updateStatus(requestId, status);

        if (action === 'approve') {
            const isAlreadyFollowing = await FacultyFollower.isFollowing(request.requester_id, facultyId);
            if (!isAlreadyFollowing) {
                await FacultyFollower.create({
                    follower_id: request.requester_id,
                    faculty_id: facultyId,
                    status: 'approved'
                });
                await FacultyProfile.incrementFollowerCount(facultyId);
                await FacultyProfile.incrementFollowingCount(request.requester_id);
            }
        }

        const updated = await FacultyFollowRequest.findById(requestId);
        res.json({
            success: true,
            request: updated
        });
    } catch (error) {
        console.error('Error responding to follow request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to respond to follow request'
        });
    }
};

// Get followers
export const getFollowers = async (req, res) => {
    try {
        const { facultyId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        if (!facultyId) {
            return res.status(400).json({
                success: false,
                message: 'Faculty ID is required'
            });
        }

        const followers = await FacultyFollower.findFollowersByFaculty(facultyId, {
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            success: true,
            followers: followers || [],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error fetching followers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch followers'
        });
    }
};

// Delete post
export const deletePost = async (req, res) => {
    try {
        const { id: facultyId } = req.user;
        const { postId } = req.params;

        if (!postId) {
            return res.status(400).json({
                success: false,
                message: 'Post ID is required'
            });
        }

        const post = await FacultyPost.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        if (post.faculty_id !== facultyId) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own posts'
            });
        }

        await FacultyPost.delete(postId);

        res.json({
            success: true,
            message: 'Post deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete post'
        });
    }
};

// Unlike post
export const unlikePost = async (req, res) => {
    try {
        const { id: facultyId } = req.user;
        const { postId } = req.params;

        if (!postId) {
            return res.status(400).json({
                success: false,
                message: 'Post ID is required'
            });
        }

        const isLiked = await FacultyPostLike.findByPostAndUser(postId, facultyId);
        if (!isLiked) {
            return res.status(404).json({
                success: false,
                message: 'Post not liked'
            });
        }

        await FacultyPostLike.delete(isLiked.id);
        await FacultyPost.decrementLikes(postId);

        res.json({
            success: true,
            message: 'Post unliked successfully'
        });
    } catch (error) {
        console.error('Error unliking post:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unlike post'
        });
    }
};

// Update post
export const updatePost = async (req, res) => {
    try {
        const { id: facultyId } = req.user;
        const { postId } = req.params;
        const { title, content, media_url, allow_comments } = req.body;

        const post = await FacultyPost.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        if (post.faculty_id !== facultyId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to update this post'
            });
        }

        await FacultyPost.update(postId, {
            title,
            content,
            media_url,
            allow_comments
        });

        const updated = await FacultyPost.findById(postId);
        res.json({
            success: true,
            post: updated
        });
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update post'
        });
    }
};

// Publish post
export const publishPost = async (req, res) => {
    try {
        const { id: facultyId } = req.user;
        const { postId } = req.params;

        const post = await FacultyPost.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        if (post.faculty_id !== facultyId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to publish this post'
            });
        }

        await FacultyPost.publish(postId);
        const updated = await FacultyPost.findById(postId);

        res.json({
            success: true,
            post: updated
        });
    } catch (error) {
        console.error('Error publishing post:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to publish post'
        });
    }
};

// Update comment
export const updateComment = async (req, res) => {
    try {
        const { id: facultyId } = req.user;
        const { commentId } = req.params;
        const { content } = req.body;

        const comment = await FacultyPostComment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        if (comment.faculty_id !== facultyId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to update this comment'
            });
        }

        await FacultyPostComment.update(commentId, { content });
        const updated = await FacultyPostComment.findById(commentId);

        res.json({
            success: true,
            comment: updated
        });
    } catch (error) {
        console.error('Error updating comment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update comment'
        });
    }
};

// Delete comment
export const deleteComment = async (req, res) => {
    try {
        const { id: facultyId } = req.user;
        const { commentId } = req.params;

        const comment = await FacultyPostComment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        // Check if user is comment owner or post owner
        const post = await FacultyPost.findById(comment.post_id);
        if (comment.faculty_id !== facultyId && post.faculty_id !== facultyId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to delete this comment'
            });
        }

        await FacultyPostComment.delete(commentId);
        await FacultyPost.decrementComments(comment.post_id);

        res.json({
            success: true,
            message: 'Comment deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete comment'
        });
    }
};

// Unfollow faculty
export const unfollowFaculty = async (req, res) => {
    try {
        const { id: followerFacultyId } = req.user;
        const { facultyId } = req.params;

        const follow = await FacultyFollower.findByFollowerAndFaculty(followerFacultyId, facultyId);
        if (!follow) {
            return res.status(404).json({
                success: false,
                message: 'Not following this faculty'
            });
        }

        await FacultyFollower.delete(follow.id);
        await FacultyProfile.decrementFollowerCount(facultyId);

        res.json({
            success: true,
            message: 'Faculty unfollowed successfully'
        });
    } catch (error) {
        console.error('Error unfollowing faculty:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unfollow faculty'
        });
    }
};

// Get following
export const getFollowing = async (req, res) => {
    try {
        const { id: facultyId } = req.user;
        const { limit = 20, offset = 0 } = req.query;

        const following = await FacultyFollower.findFollowingByFaculty(facultyId, {
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        const total = await FacultyFollower.getFollowingCount(facultyId);

        res.json({
            success: true,
            following: following || [],
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error getting following:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get following list'
        });
    }
};

// Accept follow request
export const acceptFollowRequest = async (req, res) => {
    try {
        const { id: facultyId } = req.user;
        const { requestId } = req.params;

        const request = await FacultyFollowRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Follow request not found'
            });
        }

        if (request.faculty_id !== facultyId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to accept this request'
            });
        }

        await FacultyFollowRequest.updateStatus(requestId, 'approved');

        // Create follower relationship
        await FacultyFollower.create({
            faculty_id: facultyId,
            follower_faculty_id: request.requester_faculty_id,
            status: 'active'
        });

        await FacultyProfile.incrementFollowerCount(facultyId);

        const updated = await FacultyFollowRequest.findById(requestId);
        res.json({
            success: true,
            request: updated
        });
    } catch (error) {
        console.error('Error accepting follow request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to accept follow request'
        });
    }
};

// Reject follow request
export const rejectFollowRequest = async (req, res) => {
    try {
        const { id: facultyId } = req.user;
        const { requestId } = req.params;

        const request = await FacultyFollowRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Follow request not found'
            });
        }

        if (request.faculty_id !== facultyId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to reject this request'
            });
        }

        await FacultyFollowRequest.updateStatus(requestId, 'rejected');

        const updated = await FacultyFollowRequest.findById(requestId);
        res.json({
            success: true,
            request: updated
        });
    } catch (error) {
        console.error('Error rejecting follow request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject follow request'
        });
    }
};

// Get post comments
export const getPostComments = async (req, res) => {
    try {
        const { postId } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        if (!postId) {
            return res.status(400).json({
                success: false,
                message: 'Post ID is required'
            });
        }

        const comments = await FacultyPostComment.findByPostId(postId, {
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            success: true,
            comments: comments || [],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error fetching post comments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch comments'
        });
    }
};

export default {
    getProfile,
    updateProfile,
    getSchoolFacultyProfiles,
    getFacultyPosts,
    createPost,
    updatePost,
    publishPost,
    deletePost,
    likePost,
    unlikePost,
    addComment,
    updateComment,
    deleteComment,
    followFaculty,
    unfollowFaculty,
    getFollowing,
    sendFollowRequest,
    getFollowRequests,
    respondToFollowRequest,
    acceptFollowRequest,
    rejectFollowRequest,
    getFollowers,
    getPostComments
};
