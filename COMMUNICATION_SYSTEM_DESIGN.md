# Complete Communication System Design
## Group Chats + Broadcast Messaging Extension

**Version:** 1.0  
**Date:** April 5, 2026  
**Status:** Design Document (Implementation Ready)

---

## 📑 Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Design](#architecture-design)
3. [Group Chat System](#group-chat-system)
4. [Broadcast Messaging System](#broadcast-messaging-system)
5. [Database Schema](#database-schema)
6. [API Design](#api-design)
7. [Data Flow Diagrams](#data-flow-diagrams)
8. [Permission Rules](#permission-rules)
9. [Edge Cases & Handling](#edge-cases--handling)
10. [Real-time Implementation](#real-time-implementation)
11. [UI/UX Flows](#uiux-flows)
12. [Implementation Checklist](#implementation-checklist)

---

## 🎯 System Overview

### Current State
- **One-to-One Chat**: Fully implemented
- **Real-time Method**: Polling (3-second interval)
- **Tech Stack**: Node.js + Express + MySQL + React

### New Features (This Document)
1. **Group Chats** - Multi-user message threads with admin controls
2. **Broadcast Messaging** - One-way announcements with delivery tracking
3. **Unified Communication Hub** - Single interface for all chat types

### Design Principles
- ✅ **Scalable**: Support thousands of groups and millions of messages
- ✅ **Real-time**: Extend polling system (no WebSocket required yet)
- ✅ **Secure**: Role-based access control (RBAC)
- ✅ **Maintainable**: Clean separation of concerns
- ✅ **User-friendly**: Intuitive group management and broadcast creation

---

## 🏗️ Architecture Design

### System Layers

```
┌─────────────────────────────────────────────────────┐
│  Frontend Layer (React Components)                   │
│  - GroupChat.jsx / GroupList.jsx                     │
│  - BroadcastInbox.jsx / CreateBroadcast.jsx         │
│  - GroupSettings.jsx (Admin)                         │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│  Service Layer (API Clients)                         │
│  - groupChat.js / groupManagement.js                 │
│  - broadcast.js                                      │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│  API Layer (Express Routes)                          │
│  - /api/group-chat/* (group messaging)              │
│  - /api/group-management/* (member/admin ctrl)      │
│  - /api/broadcast/* (announcements)                 │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│  Controller Layer (Business Logic)                   │
│  - groupChatController.js                           │
│  - groupManagementController.js                      │
│  - broadcastController.js                           │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│  Data Access Layer (Database)                        │
│  - chat_groups, group_members, group_messages       │
│  - broadcasts, broadcast_recipients, broadcast_reads│
└─────────────────────────────────────────────────────┘
```

---

## 💬 GROUP CHAT SYSTEM

### Feature Set

#### 1. Group Lifecycle

**Creation**
- Creator sets: group name, description (optional), privacy level
- Creator becomes default group admin
- System creates group in DB with status = 'active'

**Member Addition**
- Admins add members (from same school)
- Duplicate member prevention
- Automatic notification to added member
- Member sees group in their list immediately

**Member Removal**
- Admin removes member
- Member loses access immediately
- System cleanup: remove from group_members
- Notification sent to removed user

**Group Deletion** (Admin only)
- Mark group as 'deleted' (soft delete) or hard delete
- Members notified
- Optionally archive messages

**Group Rename** (Admin only)
- Update group name
- Activity log entry

#### 2. Message Handling

**Sending**
- Group member sends text + emojis (up to 5000 chars)
- Message stored with: group_id, sender_id, timestamp, content
- Real-time push to all group members

**Reading**
- Members see all messages (historical + real-time)
- Read receipts optional (track who read what)
- Unread count per group

**Editing & Deletion** (Future)
- "Edited" label shown
- Deletion by sender or admin

#### 3. Admin Controls

**Member Management**
- Add/remove members
- Promote member to admin
- Demote admin to member
- View member list

**Group Settings**
- Rename group
- Edit description
- Change privacy level (public/private)
- Delete group
- View activity log

**Constraints**
- Group must always have ≥1 admin
- If last admin leaves → auto-promote oldest remaining member
- Creator inherits admin by default

---

## 📢 BROADCAST MESSAGING SYSTEM

### Feature Set

#### 1. Who Can Send

| Role | Can Broadcast | Level |
|------|---------------|-------|
| Super Admin | ✅ | All schools, All users |
| School Admin | ✅ | Their school only |
| Faculty | ✅ | Their assigned classes |
| Student | ❌ | N/A |

#### 2. Broadcast Scope

- **School-wide**: All users in a school
- **Class-specific**: All students in a class
- **Group**: Specific group of users (multi-select)
- **Custom**: Filtered by role/criteria

#### 3. Broadcast Content

**Fields**
- Title (required, max 200 chars)
- Message (required, max 5000 chars)
- Sender identity (name, role, school)
- Scheduled send time (optional, future feature)
- Reply-enabled toggle (default: OFF)
- Attachments (future enhancement)

**Metadata**
- created_at, updated_at
- Sent count, delivered count, read count
- Optional: expiration time

#### 4. Delivery & Tracking

**Delivery States**
- SCHEDULED → SENT → DELIVERED → READ (progressive states)

**Tracking Metrics**
- Total recipients
- Delivered count
- Read count
- Read %
- Click-through (if includes links)

**Read Status**
- Auto-track when broadcast first viewed
- Timestamp of read

#### 5. User Experience

**Where Broadcasts Appear**
- Option A: Separate "Broadcasts" inbox tab
- Option B: Mixed in chat list as special messages
- Option C: Both (toggle in settings)

**Notification**
- Push notification "New broadcast from [Sender]"
- Badge on inbox

**Reply Behavior**
- If reply-enabled: show reply button → opens reply modal or 1-to-1 compose
- If reply-disabled: no reply option

---

## 🗄️ DATABASE SCHEMA

### Group Chat Tables

#### 1. Table: `chat_groups`
```sql
CREATE TABLE chat_groups (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,  -- Soft delete
  is_archived BOOLEAN DEFAULT FALSE,
  member_count INT DEFAULT 1,
  
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_school_id (school_id),
  INDEX idx_created_by (created_by_id),
  UNIQUE INDEX idx_group_name_school (name, school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 2. Table: `group_members`
```sql
CREATE TABLE group_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  removed_at DATETIME NULL,  -- Track removal
  
  FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE INDEX idx_group_user (group_id, user_id),
  INDEX idx_user_groups (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 3. Table: `group_messages`
```sql
CREATE TABLE group_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  group_id INT NOT NULL,
  sender_id INT NOT NULL,
  message_text TEXT NOT NULL,
  message_type ENUM('text', 'emoji', 'image', 'attachment') DEFAULT 'text',
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at DATETIME NULL,
  deleted_at DATETIME NULL,  -- Soft delete for message cleanup
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_group_time (group_id, created_at),
  INDEX idx_sender (sender_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 4. Table: `group_message_reads` (Optional - for read receipts)
```sql
CREATE TABLE group_message_reads (
  id INT PRIMARY KEY AUTO_INCREMENT,
  message_id INT NOT NULL,
  user_id INT NOT NULL,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (message_id) REFERENCES group_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE INDEX idx_message_user (message_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 5. Table: `group_activity_log`
```sql
CREATE TABLE group_activity_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  group_id INT NOT NULL,
  action_type ENUM('member_added', 'member_removed', 'admin_promoted', 
                    'admin_demoted', 'group_renamed', 'group_created', 
                    'group_deleted') NOT NULL,
  performed_by_id INT NOT NULL,
  target_user_id INT,  -- User being acted upon
  metadata JSON,  -- Store additional context
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_group_time (group_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Broadcast Tables

#### 6. Table: `broadcasts`
```sql
CREATE TABLE broadcasts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sender_id INT NOT NULL,
  school_id INT,  -- NULL if super-admin broadcast to multiple schools
  broadcast_type ENUM('school_wide', 'class', 'group', 'custom') NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('draft', 'scheduled', 'sent', 'expired') DEFAULT 'draft',
  reply_enabled BOOLEAN DEFAULT FALSE,
  scheduled_at DATETIME NULL,
  sent_at DATETIME NULL,
  expires_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  INDEX idx_sender (sender_id),
  INDEX idx_school (school_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 7. Table: `broadcast_recipients`
```sql
CREATE TABLE broadcast_recipients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  broadcast_id INT NOT NULL,
  recipient_user_id INT NOT NULL,
  recipient_type ENUM('individual', 'class', 'group', 'group_member') DEFAULT 'individual',
  status ENUM('pending', 'delivered', 'read') DEFAULT 'pending',
  delivered_at DATETIME NULL,
  read_at DATETIME NULL,
  
  FOREIGN KEY (broadcast_id) REFERENCES broadcasts(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE INDEX idx_broadcast_recipient (broadcast_id, recipient_user_id),
  INDEX idx_recipient_status (recipient_user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 8. Table: `broadcast_read_log` (Alternative: use broadcast_recipients.read_at)
```sql
CREATE TABLE broadcast_read_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  broadcast_id INT NOT NULL,
  user_id INT NOT NULL,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (broadcast_id) REFERENCES broadcasts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE INDEX idx_broadcast_user_read (broadcast_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 9. Table: `broadcast_attachments` (Future)
```sql
CREATE TABLE broadcast_attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  broadcast_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  file_size INT,
  uploaded_by_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (broadcast_id) REFERENCES broadcasts(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_broadcast_id (broadcast_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Integration with Existing Tables

#### Notification Integration
Use existing `user_notifications` table:
```sql
INSERT INTO user_notifications (recipient_user_id, type, title, message, entity_type, entity_id)
VALUES (?, 'group_added', 'Added to Group', ?, 'group', ?);

INSERT INTO user_notifications (recipient_user_id, type, title, message, entity_type, entity_id)
VALUES (?, 'broadcast_received', 'New Broadcast', ?, 'broadcast', ?);
```

---

## 🔌 API DESIGN

### Base URLs
- Group Chat: `/api/group-chat/`
- Group Management: `/api/group-management/`
- Broadcast: `/api/broadcast/`

### Authentication
All endpoints require JWT token in `Authorization: Bearer {token}` header

---

### GROUP CHAT ENDPOINTS

#### 1. Group Management

**POST /api/group-management/create**
- **Description**: Create new group
- **Auth**: Required (student, faculty, admin)
- **Body**:
```json
{
  "name": "Class 10-A Discussion",
  "description": "Group for Class 10-A students",
  "member_ids": [2, 3, 4, 5]
}
```
- **Response** (201):
```json
{
  "success": true,
  "group": {
    "id": 1,
    "name": "Class 10-A Discussion",
    "created_by_id": 1,
    "member_count": 5,
    "created_at": "2025-04-05T10:30:00Z"
  }
}
```

**GET /api/group-management/my-groups**
- **Description**: List all groups for current user
- **Auth**: Required
- **Query Params**: `?sort=latest&limit=20`
- **Response** (200):
```json
{
  "success": true,
  "groups": [
    {
      "id": 1,
      "name": "Class 10-A",
      "member_count": 25,
      "is_admin": true,
      "unread_count": 3,
      "last_message": "See you tomorrow!",
      "last_message_at": "2025-04-05T14:20:00Z"
    }
  ]
}
```

**GET /api/group-management/:groupId**
- **Description**: Get group details
- **Auth**: Required (must be member)
- **Response** (200):
```json
{
  "success": true,
  "group": {
    "id": 1,
    "name": "Class 10-A",
    "description": "...",
    "created_by_id": 1,
    "member_count": 25,
    "is_user_admin": true,
    "members": [
      {
        "id": 2,
        "first_name": "John",
        "last_name": "Doe",
        "is_admin": false,
        "joined_at": "2025-04-01T10:00:00Z"
      }
    ],
    "created_at": "2025-04-01T10:00:00Z"
  }
}
```

**POST /api/group-management/:groupId/add-members**
- **Description**: Add members to group
- **Auth**: Required (must be admin of group)
- **Body**:
```json
{
  "member_ids": [6, 7, 8]
}
```
- **Response** (200):
```json
{
  "success": true,
  "added_count": 3,
  "failed": []
}
```

**POST /api/group-management/:groupId/remove-member/:userId**
- **Description**: Remove member from group
- **Auth**: Required (must be admin)
- **Response** (200):
```json
{
  "success": true,
  "message": "User removed from group"
}
```

**POST /api/group-management/:groupId/make-admin/:userId**
- **Description**: Promote member to admin
- **Auth**: Required (must be admin)
- **Response** (200):
```json
{
  "success": true,
  "message": "User promoted to admin"
}
```

**POST /api/group-management/:groupId/remove-admin/:userId**
- **Description**: Demote admin to member
- **Auth**: Required (must be admin)
- **Response** (200):
```json
{
  "success": true,
  "message": "Admin role removed"
}
```

**PUT /api/group-management/:groupId/rename**
- **Description**: Rename group
- **Auth**: Required (must be admin)
- **Body**:
```json
{
  "name": "New Group Name"
}
```
- **Response** (200):
```json
{
  "success": true,
  "group": { "id": 1, "name": "New Group Name" }
}
```

**DELETE /api/group-management/:groupId**
- **Description**: Delete group (soft delete)
- **Auth**: Required (must be admin)
- **Response** (200):
```json
{
  "success": true,
  "message": "Group deleted"
}
```

---

#### 2. Group Messaging

**POST /api/group-chat/:groupId/messages**
- **Description**: Send message to group
- **Auth**: Required (must be member)
- **Body**:
```json
{
  "message": "Hello everyone! 👋",
  "message_type": "text"
}
```
- **Response** (201):
```json
{
  "success": true,
  "message": {
    "id": 1,
    "group_id": 1,
    "sender_id": 1,
    "sender_name": "John Doe",
    "message": "Hello everyone! 👋",
    "created_at": "2025-04-05T15:30:00Z"
  }
}
```

**GET /api/group-chat/:groupId/messages**
- **Description**: Get group message history
- **Auth**: Required (must be member)
- **Query Params**: `?limit=50&offset=0&sort=desc`
- **Response** (200):
```json
{
  "success": true,
  "messages": [
    {
      "id": 1,
      "group_id": 1,
      "sender_id": 1,
      "sender_name": "John Doe",
      "message": "Hello everyone!",
      "message_type": "text",
      "is_edited": false,
      "created_at": "2025-04-05T15:30:00Z",
      "read_count": 5
    }
  ],
  "total_count": 150
}
```

**POST /api/group-chat/:groupId/messages/:messageId/mark-read**
- **Description**: Mark message(s) as read
- **Auth**: Required
- **Response** (200):
```json
{
  "success": true
}
```

**GET /api/group-chat/:groupId/unread-count**
- **Description**: Get unread message count for group
- **Auth**: Required
- **Response** (200):
```json
{
  "success": true,
  "unread_count": 5
}
```

---

### BROADCAST ENDPOINTS

#### 1. Broadcast Creation & Management

**POST /api/broadcast/create**
- **Description**: Create broadcast
- **Auth**: Required (school_admin, faculty, super_admin)
- **Body**:
```json
{
  "title": "School Assembly Tomorrow",
  "message": "All students must assemble at 9 AM sharp.",
  "broadcast_type": "school_wide",
  "reply_enabled": false,
  "target_user_ids": null,
  "scheduled_at": null
}
```
- **Response** (201):
```json
{
  "success": true,
  "broadcast": {
    "id": 1,
    "title": "School Assembly Tomorrow",
    "status": "draft",
    "created_at": "2025-04-05T16:00:00Z"
  }
}
```

**POST /api/broadcast/:broadcastId/send**
- **Description**: Send broadcast (move from draft → sent)
- **Auth**: Required (sender or admin)
- **Body**: `{}` (empty)
- **Response** (200):
```json
{
  "success": true,
  "recipients_count": 250,
  "message": "Broadcast sent to 250 recipients"
}
```

**GET /api/broadcast/my-broadcasts**
- **Description**: Get broadcasts sent by current user
- **Auth**: Required
- **Query Params**: `?status=sent&limit=20`
- **Response** (200):
```json
{
  "success": true,
  "broadcasts": [
    {
      "id": 1,
      "title": "School Assembly",
      "status": "sent",
      "recipients_count": 250,
      "read_count": 120,
      "read_percentage": 48,
      "sent_at": "2025-04-05T16:05:00Z"
    }
  ]
}
```

**GET /api/broadcast/:broadcastId/stats**
- **Description**: Get broadcast read statistics
- **Auth**: Required (sender)
- **Response** (200):
```json
{
  "success": true,
  "stats": {
    "id": 1,
    "title": "Assembly Notice",
    "total_recipients": 250,
    "delivered_count": 250,
    "read_count": 120,
    "delivered_percentage": 100,
    "read_percentage": 48,
    "readers": [
      {
        "user_id": 2,
        "first_name": "John",
        "read_at": "2025-04-05T16:10:00Z"
      }
    ]
  }
}
```

**DELETE /api/broadcast/:broadcastId**
- **Description**: Delete broadcast (only if draft)
- **Auth**: Required (sender)
- **Response** (200):
```json
{
  "success": true,
  "message": "Broadcast deleted"
}
```

---

#### 2. Broadcast Inbox (User Side)

**GET /api/broadcast/inbox**
- **Description**: Get all broadcasts received by user
- **Auth**: Required
- **Query Params**: `?sort=latest&limit=20&read_status=unread`
- **Response** (200):
```json
{
  "success": true,
  "broadcasts": [
    {
      "id": 1,
      "sender_name": "Principal Singh",
      "sender_role": "school_admin",
      "title": "Assembly Notice",
      "message": "All students...",
      "status": "read",
      "reply_enabled": false,
      "received_at": "2025-04-05T16:05:00Z",
      "read_at": "2025-04-05T16:15:00Z"
    }
  ]
}
```

**POST /api/broadcast/:broadcastId/mark-read**
- **Description**: Mark broadcast as read
- **Auth**: Required
- **Response** (200):
```json
{
  "success": true
}
```

**POST /api/broadcast/:broadcastId/reply**
- **Description**: Reply to broadcast (if enabled)
- **Auth**: Required
- **Body**:
```json
{
  "message": "Will surely attend!",
  "reply_type": "direct_message"
}
```
- **Response** (201):
```json
{
  "success": true,
  "message": "Reply sent to sender"
}
```

---

## 📊 Data Flow Diagrams

### Flow 1: Create Group & Add Members

```
User clicks "Create Group"
         ↓
[Frontend] GroupCreateModal shows
  - Input: group name, description
  - Multi-select: member picker
         ↓
User clicks "Create" 
         ↓
[Frontend] POST /api/group-management/create
         ↓
[Backend] groupManagementController.createGroup()
  - Validate group name (unique in school)
  - Validate member_ids (same school, not duplicates)
  - Create record in chat_groups
  - Add creator as member (is_admin=1)
  - Add other members (is_admin=0)
  - Create activity log entry
  - Generate notifications for new members
         ↓
[Backend] Insert into user_notifications for each member
         ↓
[Frontend] Refresh group list
         ↓
User sees new group in list
         ↓
[Backend] Push notification to all members:
  "You were added to {group_name}"
```

### Flow 2: Send Group Message

```
User types message in GroupChat component
         ↓
User hits Enter/Send
         ↓
[Frontend] POST /api/group-chat/:groupId/messages
  - Body: { message: "Hello!", message_type: "text" }
         ↓
[Backend] groupChatController.sendMessage()
  - Verify user is group member
  - Validate message length (≤5000)
  - Insert into group_messages
  - Return message object with ID
         ↓
[Frontend] Optimistic UI update:
  - Add message to local state immediately
  - Show "pending" indicator
         ↓
[Backend] Polling query:
  - Other group members query: GET /api/group-chat/:groupId/messages
  - Receive new messages every 3 seconds
         ↓
[Frontend] Update GroupChat component with new messages
  - Display sender name, timestamp
  - Remove "pending" state once confirmed
         ↓
All group members see the message
```

### Flow 3: Remove Member & Auto-Promotion

```
Admin clicks "Remove Member" on GroupSettings
         ↓
[Frontend] POST /api/group-management/:groupId/remove-member/:userId
         ↓
[Backend] groupManagementController.removeMember()
  - Check if user is admin (or is being removed)
  - Delete from group_members where user_id = ?
  - Log action in group_activity_log
         ↓
Check if any admins remain in group:
  - Query: SELECT COUNT(*) as admin_count FROM group_members 
           WHERE group_id = ? AND is_admin = 1
         ↓
If admin_count = 0:
  - Auto-promote oldest member: UPDATE group_members SET is_admin=1
    WHERE group_id = ? ORDER BY joined_at ASC LIMIT 1
  - Create activity log: "Auto-promoted to admin"
         ↓
Send notifications:
  - To removed user: "You were removed from {group_name}"
  - To new admin (if auto-promoted): "You are now admin of {group_name}"
         ↓
[Frontend] Refresh group members list
         ↓
Admin sees member removed; auto-promoted user notified
```

### Flow 4: Send Broadcast

```
School admin clicks "Send Broadcast"
         ↓
[Frontend] OpenDialog: BroadcastCreateModal
  - Input: title, message
  - Selector: broadcast type (school_wide, class, group, custom)
  - Toggle: reply_enabled
         ↓
Admin selects:
  - Type: "school_wide"
  - Reply: OFF
         ↓
User clicks "Send Now"
         ↓
[Frontend] POST /api/broadcast/create
  - Body: { title, message, broadcast_type, reply_enabled }
         ↓
[Backend] broadcastController.createBroadcast()
  - Create broadcast record (status = 'draft')
  - Determine recipient list based on type:
    * school_wide: SELECT id FROM users WHERE school_id = ? AND role != 'super_admin'
    * By class: SELECT student_id FROM student_enrollments WHERE class_id = ?
  - Insert into broadcast_recipients (status='pending') for each user
  - Update broadcasts.status = 'sent'
  - Update broadcasts.sent_at
         ↓
[Backend] Generate notifications
  - INSERT INTO user_notifications for each recipient
  - Type: 'broadcast_received'
         ↓
[Frontend] Show success: "Broadcast sent to 250 recipients"
         ↓
[Backend] Polling from recipient side:
  - GET /api/broadcast/inbox
  - Shows: [Broadcast from School Admin: "Attention all students..."]
         ↓
When user opens broadcast:
  - POST /api/broadcast/:broadcastId/mark-read
  - Update: broadcast_recipients.status = 'read', read_at = NOW()
         ↓
[Backend] Track for sender:
  - GET /api/broadcast/:broadcastId/stats
  - Show: "Read by 120 of 250 (48%)"
```

---

## 🔐 Permission Rules

### Group Chat Permissions

| Action | Student | Faculty | Admin | Super Admin |
|--------|---------|---------|-------|------------|
| Create group | ✅ | ✅ | ✅ | ❌ |
| Send message | ✅ (members) | ✅ (members) | ✅ (members) | ❌ |
| Add member | ⚠️ (admin only) | ⚠️ (admin only) | ⚠️ (admin only) | ❌ |
| Remove member | ❌ | ⚠️ (admin only) | ⚠️ (admin only) | ❌ |
| Manage admins | ❌ | ⚠️ (admin only) | ⚠️ (admin only) | ❌ |
| Delete group | ❌ | ⚠️ (admin only) | ⚠️ (admin only) | ❌ |
| View all members | ✅ | ✅ | ✅ | ❌ |

### Broadcast Permissions

| Action | Student | Faculty | School Admin | Super Admin |
|--------|---------|---------|-------------|------------|
| Send broadcast | ❌ | ✅ (class only) | ✅ (school-wide) | ✅ (all) |
| Send to entire school | ❌ | ❌ | ✅ | ✅ |
| Send to class | ❌ | ✅ | ✅ | ✅ |
| Send to custom group | ❌ | ❌ | ✅ | ✅ |
| Receive reply | ✅ | ✅ | ✅ | ✅ |
| View stats | ✅ (self) | ✅ (sent) | ✅ (sent) | ✅ (all) |

---

## ⚠️ Edge Cases & Handling

### Group Chat Edge Cases

| Case | Scenario | Handling |
|------|----------|----------|
| **Duplicate Member** | Admin tries to add member already in group | Return 400: "User already in group" |
| **Non-Member Access** | Non-member tries to GET group messages | Return 403: "Not a group member" |
| **Last Admin Leaves** | Only admin removes themselves | System auto-promotes oldest member to admin; notify new admin |
| **Member in Same School** | User tries to add member from different school | Return 400: "Can only add members from same school" |
| **Group With No Members** | All members removed somehow | Auto-delete group OR prevent blank state |
| **Message in Deleted Group** | User sends message to deleted group | Return 404: "Group not found or deleted" |
| **Concurrent Admin Removal** | 2 admins try to remove last admin simultaneously | Database constraint: At least 1 admin must exist |
| **Large Group Message** | 1000+ members sends message simultaneously | Queue message processing; real-time polling handles load |

### Broadcast Edge Cases

| Case | Scenario | Handling |
|------|----------|----------|
| **Invalid Recipients** | Broadcast type specifies non-existent class | Return 400: "Class not found" |
| **Faculty Scope Check** | Faculty tries to broadcast to class not assigned | Return 403: "Not assigned to this class" |
| **Double-Send** | User clicks send twice | Implement idempotency key; prevent duplicate broadcasts |
| **Scheduled Send Failure** | Scheduled broadcast time passed but not sent | Retry mechanism OR mark as 'failed' |
| **No Recipients** | Broadcast created but type results in 0 recipients | Return 200: "Broadcast sent to 0 recipients" (allow) |
| **Reply to One-Way Broadcast** | User tries to reply when reply_enabled=false | Return 400: "Replies not enabled for this broadcast" |
| **Read Tracking Race Condition** | Multiple mark-reads for same broadcast | Use UNIQUE constraint on broadcast_read_log; ignore duplicates |
| **Expired Broadcast** | User tries to read expired broadcast | Allow read; return 200 (reading is always allowed) |

---

## ⚡ Real-time Implementation

### Current Approach: Polling Extension

**Existing System**: 3-second polling interval

**Group Chat Polling**
```javascript
// Frontend: src/pages/GroupChat.jsx
useEffect(() => {
  const interval = setInterval(async () => {
    // Poll for new messages every 3 seconds
    const response = await groupChat.getMessages(groupId, { limit: 50 });
    
    // Compare local vs. fetched
    const newMessages = response.data.messages.filter(
      msg => !localMessages.find(m => m.id === msg.id)
    );
    
    if (newMessages.length > 0) {
      setMessages(prev => [...prev, ...newMessages]);
      playNotification();
    }
  }, 3000);
  
  return () => clearInterval(interval);
}, [groupId]);
```

**Broadcast Inbox Polling**
```javascript
// Frontend: src/pages/BroadcastInbox.jsx
useEffect(() => {
  const interval = setInterval(async () => {
    // Poll for new broadcasts
    const response = await broadcast.getInbox({ sort: 'latest' });
    setBroadcasts(response.data.broadcasts);
  }, 3000);
  
  return () => clearInterval(interval);
}, []);
```

### Future: Socket.io Upgrade Path

When ready to upgrade to WebSockets:

```javascript
// Socket events
socket.on('group-message:new', (message) => {
  addMessageToGroup(message);
});

socket.on('broadcast:received', (broadcast) => {
  addBroadcastToInbox(broadcast);
});

socket.emit('message:send', { groupId, message });
```

### Database Optimization for Polling

**Add Indexes for Efficient Queries**:
```sql
-- For polling group messages
CREATE INDEX idx_group_message_time ON group_messages(group_id, created_at DESC);

-- For polling broadcasts
CREATE INDEX idx_broadcast_recipient_status ON broadcast_recipients(recipient_user_id, status);

-- For activity logs
CREATE INDEX idx_group_activity_group_time ON group_activity_log(group_id, created_at DESC);
```

---

## 🎨 UI/UX Flows

### 1. Group Chat Screens

#### Screen A: Group List
```
╔═════════════════════════════════════╗
║  💬 Messages    🔔 (3)              ║
├─────────────────────────────────────┤
║ ┌─ ONE-TO-ONE CHATS (Collapsible)   ║
║ │ • John Doe      [Last msg...]     ║
║ │ • Sarah Smith   [unread: 2]       ║
║ └─                                   ║
║                                      ║
║ ┌─ GROUP CHATS (Collapsible)        ║
║ │ [+ Create Group]                  ║
║ │ • Class 10-A        [unread: 3]   ║
║ │ • Project Team      [unread: 0]   ║
║ │ • Study Group       [no messages] ║
║ └─                                   ║
║                                      ║
║ ┌─ BROADCASTS                       ║
║ │ [📢 Assembly Notice] [unread]     ║
║ │ [📢 Holiday Info]    [read]       ║
║ └─                                   ║
╚═════════════════════════════════════╝
```

#### Screen B: Group Chat View
```
╔═════════════════════════════════════╗
║ Class 10-A               [⋮ Menu]   ║ Header
├─────────────────────────────────────┤
║                                      ║
║ [Today 10:30]                        ║
║                                      ║
║ ┌─ John Doe                          ║
║ │ Hello everyone! 👋                 ║ ✓✓ (read)
║ └─ 10:30 AM                          ║
║                                      ║
║ ┌─ Sarah Smith                       ║
║ │ Hi John! How are you?              ║ ✓ (delivered)
║ └─ 10:31 AM                          ║
║                                      ║
║ ┌─ Me (You)                          ║
║ │ Doing great, thanks!               ║ ✓✓
║ └─ 10:32 AM                          ║
║                                      ║
├─────────────────────────────────────┤ Compose
║ [📎] Type message...  [😊] [Send]   ║
╚═════════════════════════════════════╝
```

#### Screen C: Group Settings (Admin View)
```
╔═════════════════════════════════════╗
║ Class 10-A Settings      [← Back]   ║
├─────────────────────────────────────┤
║                                      ║
║ Group Info                           ║
║ [Name] Class 10-A                    ║
║ [Desc] Mathematics class for 10th... ║
║ [Members] 25 members                 ║
║ [Created] April 1, 2025              ║
║                                      ║
║ ─────────────────────────────────── ║
║                                      ║
║ Members & Admins                     ║
║ [+ Add Members]                      ║
║                                      ║
║ ✓ John Doe (Admin) [👤 Remove]      ║
║ ○ Sarah Smith      [⭐ Make Admin]  ║
║ ○ Mike Johnson     [⭐ Make Admin]  ║
║                                      ║
║ ─────────────────────────────────── ║
║                                      ║
║ Danger Zone                          ║
║ [ 🗑️  Delete Group ]                 ║
║ [ 🚪 Leave Group ]                   ║
║                                      ║
╚═════════════════════════════════════╝
```

### 2. Broadcast Screens

#### Screen A: Create Broadcast Dialog
```
╔═════════════════════════════════════╗
║ Send Broadcast                       ║
├─────────────────────────────────────┤
║                                      ║
║ Title: [Assembly Notice         ]   ║
║                                      ║
║ Message:                             ║
║ ┌───────────────────────────────┐   ║
║ │ All students must assemble at │   ║
║ │ 9 AM sharp for the annual...  │   ║
║ └───────────────────────────────┘   ║
║                                      ║
║ Send To:                             ║
║ ◉ Entire School                      ║
║ ○ Specific Class                     ║
║ ○ Custom Group                       ║
║                                      ║
║ ☐ Allow Replies                      ║
║                                      ║
║ ☐ Schedule Later                     ║
║   [Date] [Time]                      ║
║                                      ║
║ [Cancel] [Send Now] [Save Draft]    ║
╚═════════════════════════════════════╝
```

#### Screen B: Broadcast Inbox
```
╔═════════════════════════════════════╗
║ 📢 Broadcasts              [▼ Filter]║
├─────────────────────────────────────┤
║                                      ║
║ [🔴 UNREAD] (3)                      ║
║                                      ║
║ ◻ Principal Singh                    ║
║  📢 Assembly Notice                  ║
║    All students must assemble at...  ║
║    Today 9:00 AM      [Mark as Read] ║
║                                      ║
║ ◻ Ms. Priya (Math Faculty)          ║
║  📢 Assignment Submission            ║
║    Submit by Friday midnight...      ║
║    Yesterday 2:30 PM   [Mark as Read]║
║                                      ║
║ [✓ READ] (7)                         ║
║                                      ║
║ ◻ Dr. Singh (Principal)             ║
║  📢 Holiday Announcement             ║
║    Diwali break from Oct 15...      ║
║    April 1, 2025                     ║
║                                      ║
║ ◻ Admin (School)                    ║
║  📢 Fee Payment Reminder             ║
║    Please submit fees by...         ║
║    March 30, 2025                    ║
║                                      ║
╚═════════════════════════════════════╝
```

#### Screen C: Broadcast Stats (Sender View)
```
╔═════════════════════════════════════╗
║ Assembly Notice - Stats              ║
├─────────────────────────────────────┤
║                                      ║
║ Sent: April 5, 2025 at 9:00 AM      ║
║ To: Entire School (250 recipients)   ║
║                                      ║
║ Delivery Status                      ║
║ ███████████████████ 100% (250)      ║
║ [✓ Delivered]                        ║
║                                      ║
║ Read Status                          ║
║ ███████░░░░░░░░░░░  48% (120)       ║
║ [○ Read]  [◻ Unread: 130]            ║
║                                      ║
║ ─────────────────────────────────── ║
║                                      ║
║ Who Read:                            ║
║ ✓ John Doe        9:05 AM            ║
║ ✓ Sarah Smith     9:15 AM            ║
║ ✓ Mike Johnson    9:20 AM            ║
║ ... (120 total)                      ║
║                                      ║
║ [Show All]                           ║
║                                      ║
╚═════════════════════════════════════╝
```

---

## ✅ Implementation Checklist

### Phase 1: Database & Backend (This Document)
- [ ] Create 9 database tables (groups, members, messages, broadcasts, recipients, etc.)
- [ ] Create ensureGroupChatSchema.js
- [ ] Create ensureBroadcastSchema.js
- [ ] Create groupChatController.js (6 methods)
- [ ] Create groupManagementController.js (8 methods)
- [ ] Create broadcastController.js (6 methods)
- [ ] Create routes: /api/group-chat/*, /api/group-management/*, /api/broadcast/*
- [ ] Integrate with existing notification system
- [ ] Add proper indexes for polling efficiency
- [ ] Add permission middleware (checkGroupMembership, checkBroadcastPermission)

### Phase 2: Frontend Services
- [ ] Create src/services/groupChat.js
- [ ] Create src/services/groupManagement.js
- [ ] Create src/services/broadcast.js
- [ ] Implement 3-second polling for group messages
- [ ] Implement 3-second polling for broadcast inbox

### Phase 3: Frontend Components
- [ ] Create src/pages/GroupChatHub.jsx (main container)
- [ ] Create src/pages/GroupChat.jsx (message view)
- [ ] Create src/pages/GroupSettings.jsx (admin)
- [ ] Create src/pages/CreateGroup.jsx (modal/dialog)
- [ ] Create src/pages/BroadcastInbox.jsx
- [ ] Create src/pages/CreateBroadcast.jsx (modal/dialog)
- [ ] Create src/pages/BroadcastStats.jsx
- [ ] Create reusable components: MemberSelector, GroupMemberList, etc.

### Phase 4: Integration & Testing
- [ ] Update App.jsx with new routes
- [ ] Update Sidebar.jsx with new menu items
- [ ] Update notification system to handle group/broadcast events
- [ ] End-to-end testing: create group, add members, send messages
- [ ] End-to-end testing: create broadcast, track reads
- [ ] Load testing: 1000+ users, 10000+ messages

### Phase 5: Production Features
- [ ] Add message search
- [ ] Add group search/filter
- [ ] Add broadcast scheduling
- [ ] Add message edit/delete UI
- [ ] Add broadcast attachments (future)
- [ ] Add group image/avatar
- [ ] Add typing indicators (future)

---

## 📚 Next Steps

1. **Database Setup** - Run schema files to create tables
2. **Backend Implementation** - Follow controllers in detailed guide
3. **Frontend Implementation** - Create components and services
4. **Testing** - Unit tests, integration tests, load tests
5. **Deployment** - Deploy to production with monitoring

---

**Document Status**: Complete Design Ready for Implementation
**Last Updated**: April 5, 2026
**Design Confidence**: High ✅
