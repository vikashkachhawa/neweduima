# School Page Module - Quick Start Guide

## Overview
The School Page module allows schools to create public-facing digital presence with social features (posts, followers, engagement).

## For School Admins

### Access School Page
1. Login to EduIMA with school_admin role
2. Click "School Page" in the sidebar navigation
3. View your school's profile, posts, and followers

### Update School Profile
1. Click the "Edit Profile" button on your school page
2. Update:
   - Banner image URL
   - Logo image URL
   - School description
   - Vision & mission statement
3. Click "Save Changes"

### Create a Post
1. Click "Create New Post" button
2. Fill in post details:
   - Title (required)
   - Content (required)
   - Post Type: Text, Image, Video, or Announcement
   - Media URL (optional image/video link)
   - Status: Draft or Published
   - Allow comments (toggle)
3. Click "Create Post"

### Manage Comments
1. Click "Comment" icon on any post
2. View all comments on that post
3. As admin, you can:
   - Hide inappropriate comments
   - Pin important comments
   - Delete comments

### Monitor Followers
1. View "Followers" count on your profile
2. See list of schools that follow you
3. Manage follower status if needed

---

## For Other Users

### View School Page
1. Navigate to any school's page (access from school links)
2. See school profile: banner, logo, description, vision
3. View all published posts from that school
4. Check follower count and engagement metrics

### Follow a School
1. Click "Follow" button on school page
2. As guest: Enter your email and name
3. As logged-in user: Automatically follow
4. You'll receive notifications for new posts

### Engage with Posts
1. **Like**: Click heart icon on any post
2. **Comment**: Click comment icon to add comment
3. **Share**: Click share icon to share post

### Report Content
- Report inappropriate posts or comments
- Admin will review and take action

---

## API Endpoints Summary

### Public Endpoints
```
GET    /api/school-page/school/:schoolId/profile
GET    /api/school-page/school/:schoolId/posts
GET    /api/school-page/school/:schoolId/followers
GET    /api/school-page/posts/:postId/comments
POST   /api/school-page/school/:schoolId/follow (guest)
```

### Protected Endpoints (Authenticated Users)
```
POST   /api/school-page/school/follow/:schoolId
DELETE /api/school-page/school/follow/:schoolId
POST   /api/school-page/posts/:postId/like
DELETE /api/school-page/posts/:postId/like
POST   /api/school-page/posts/:postId/comments
```

### Admin Endpoints (school_admin role required)
```
PUT    /api/school-page/profile
POST   /api/school-page/posts
PUT    /api/school-page/posts/:postId
POST   /api/school-page/posts/:postId/publish
DELETE /api/school-page/posts/:postId
PUT    /api/school-page/comments/:commentId/moderate
```

---

## Example Usage Scenarios

### Scenario 1: Announcing School Events
1. School admin creates post with type "Announcement"
2. Title: "Annual Sports Day - March 15, 2024"
3. Content: "Join us for a day of sports, fun, and celebration!"
4. Publish immediately
5. All followers are notified and can see post

### Scenario 2: Sharing Success Stories
1. Admin creates post with type "Image"
2. Add image URL showing student achievement
3. Title: "Student Wins National Science Olympiad"
4. Content: "Congratulations to Rahul for winning the National Science Olympiad..."
5. Publish - followers can like and comment

### Scenario 3: Managing Community Feedback
1. Parent follows school page and comments on post
2. Admin reviews comment
3. If inappropriate, admin hides it
4. If important, admin pins it for visibility

---

## Common Tasks

### How to Schedule a Post for Later
Currently posts are published immediately, but you can save as Draft and manually publish later:
1. Create post with Status = "Draft"
2. Post is saved but not visible to public
3. Edit post to update content if needed
4. Click "Publish" when ready

### How to Edit a Post
1. As admin, find your post in the feed
2. Click the three-dot menu (⋮)
3. Select "Edit"
4. Update title or content
5. Save changes

### How to Delete a Post
1. Click the three-dot menu (⋮) on your post
2. Select "Delete"
3. Confirm deletion
4. Post is removed and post_count decrements

### How to Handle Spam Comments
1. Click comment icon on the post with spam
2. Find the spam comment
3. Click delete icon on that comment
4. Comment is removed

---

## Best Practices

### For Content
- Keep posts relevant and school-focused
- Use clear, descriptive titles
- Include images for visual interest
- Proofread before publishing

### For Engagement
- Respond to comments to build community
- Pin important announcements
- Hide spam/inappropriate content promptly
- Encourage followers by featuring their content

### For Growth
- Publish regularly (at least weekly)
- Share diverse content (events, achievements, news)
- Engage with followers' comments
- Link school page from main website

---

## Troubleshooting

### Post Not Appearing
- Check post status is "Published"
- Verify published_at is not in future
- Clear browser cache

### Can't See Followers
- Make sure follower status is "approved"
- Check if require_follow_approval is enabled

### Comments Disappearing
- Comments hidden by admin won't show
- Rejected comments are invisible
- Deleted comments are permanently removed

### Like Count Not Updating
- Refresh the page
- Try unliking and liking again
- Check browser console for errors

---

## Support

For issues or questions:
1. Check SCHOOL_PAGE_IMPLEMENTATION.md for detailed documentation
2. Review API endpoint definitions
3. Contact platform support

