# One-to-One Chat System - Implementation Analysis

## Summary
The EduIMA platform has a fully implemented one-to-one chat system that allows connected users to exchange messages. The system uses **polling-based updates** (every 3 seconds) rather than WebSockets for real-time functionality.

---

## 1. DATABASE TABLES

### Chat Messages Table: `chat_messages`
```sql
CREATE TABLE chat_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_one_id INT NOT NULL,           -- Smaller user ID (normalized pair)
  user_two_id INT NOT NULL,           -- Larger user ID (normalized pair)
  sender_id INT NOT NULL,             -- Who sent the message
  recipient_id INT NOT NULL,          -- Who receives the message
  message_text TEXT NOT NULL,         -- Message content (max 4000 chars)
  is_read BOOLEAN DEFAULT FALSE,      -- Read status
  read_at DATETIME NULL,              -- Timestamp when marked as read
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT chk_chat_user_order CHECK (user_one_id < user_two_id),
  FOREIGN KEY (user_one_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user_two_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

### Key Indexes
- `idx_chat_pair_time`: (user_one_id, user_two_id, created_at)
- `idx_chat_recipient_unread`: (recipient_id, is_read, created_at)
- `idx_chat_sender_time`: (sender_id, created_at)

### Related Table: `social_connections`
Chat requires users to have an **accepted social connection**. Only connected users can message each other.
- Status must be `'accepted'` to enable chat

### Notification Table: `user_notifications` (Optional)
```sql
CREATE TABLE user_notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  recipient_user_id INT NOT NULL,
  actor_user_id INT NULL,
  type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  entity_type VARCHAR(64) NULL,
  entity_id INT NULL,
  metadata TEXT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
)
```
*(Chat notifications are not currently integrated with this system)*

---

## 2. API ENDPOINTS

All endpoints require authentication (JWT token via `Authorization` header).

### Base URL: `/chat`

| Method | Endpoint | Purpose | Requires Auth |
|--------|----------|---------|---------------|
| GET | `/connections` | Get all connected users with last message preview | Yes |
| GET | `/active` | Get only users with recent message activity (sorted by latest) | Yes |
| GET | `/unread-count` | Get total count of unread messages for current user | Yes |
| GET | `/messages/:userId?limit=120` | Get message history with a specific user | Yes |
| POST | `/messages/:userId` | Send a message to a user | Yes |
| POST | `/messages/:userId/read` | Mark all messages from a user as read | Yes |

### Request/Response Examples

#### GET /chat/connections
**Response:**
```json
{
  "success": true,
  "connections": [
    {
      "user_id": 5,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "role": "student",
      "school_name": "Central High",
      "profile_image_url": "/uploads/profiles/john.jpg",
      "last_message": "Hello! How are you?",
      "last_message_at": "2025-04-05T14:30:00Z",
      "last_message_sender_id": 5,
      "last_message_recipient_id": 1,
      "last_message_is_read": true,
      "unread_count": 0
    }
  ]
}
```

#### GET /chat/messages/:userId?limit=120
**Parameters:**
- `:userId` - ID of the other user in the conversation
- `limit` (query param) - Number of messages to retrieve (default: 120, max: 250)

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": 1,
      "sender_id": 5,
      "recipient_id": 1,
      "message_text": "Hi there!",
      "is_read": true,
      "read_at": "2025-04-05T14:32:00Z",
      "created_at": "2025-04-05T14:30:00Z",
      "first_name": "John",
      "last_name": "Doe",
      "sender_name": "John Doe"
    }
  ]
}
```

#### POST /chat/messages/:userId
**Request Body:**
```json
{
  "message": "Hello, how are you doing?"
}
```

**Validation:**
- Message cannot be empty
- Message cannot exceed 4000 characters
- Both users must be connected (social connection status = 'accepted')
- Cannot message yourself
- Users with role `super_admin` cannot use chat

**Response on Success:**
```json
{
  "success": true,
  "message_id": 42,
  "message_text": "Hello, how are you doing?",
  "created_at": "2025-04-05T14:35:00Z"
}
```

#### POST /chat/messages/:userId/read
**Purpose:** Mark all unread messages from the specified user as read

**Response:**
```json
{
  "success": true,
  "messagesMarked": 5
}
```

### Error Responses
```json
{
  "success": false,
  "message": "You can chat only with connected users"
}
```

Common errors:
- 400: Invalid user ID or empty message
- 403: Users not connected, super_admin cannot chat, authentication required
- 500: Server error

---

## 3. REAL-TIME IMPLEMENTATION

### Method: **Polling (NOT WebSockets/Socket.io)**

**Polling Interval:** Every **3 seconds** (3000ms)

**Files:**
- [frontend/src/pages/Chat.jsx](frontend/src/pages/Chat.jsx#L152-L162)

**Implementation:**
```javascript
useEffect(() => {
  const intervalId = window.setInterval(() => {
    loadSidebarData({ silent: true });      // Refresh connections list
    if (selectedUserId) {
      loadMessages(selectedUserId, { silent: true, markAsRead: false });
    }
  }, 3000);  // Poll every 3 seconds

  return () => window.clearInterval(intervalId);
}, [loadSidebarData, loadMessages, selectedUserId]);
```

### Advantages
- Simple to implement, no server infrastructure needed
- Works across all browsers and networks
- No WebSocket fallbacks required

### Disadvantages
- Higher server load and network traffic
- ~3 second delay in message delivery
- Not suitable for real-time gaming or streaming

---

## 4. FRONTEND COMPONENT STRUCTURE

### Main Chat Page: [Chat.jsx](frontend/src/pages/Chat.jsx)
**Location:** `frontend/src/pages/Chat.jsx`

**Features:**
- Split-panel layout (list + conversation)
- Mobile responsive (switches to single-column view)
- Emoji picker and sticker panel
- Search/filter connections
- Message history with scroll-to-bottom auto-scroll
- Read receipts (single checkmark = sent, double checkmark = read)
- Last message preview in connection list
- Unread message count indicator
- 14 emoji shortcuts + 8 sticker templates

**Key State:**
- `connections`: List of all connected users
- `messages`: Current conversation messages
- `selectedUserId`: Active conversation
- `messageInput`: Current message being typed
- `loadingList`, `loadingMessages`, `sending`: Loading states
- `mobileView`: 'list' or 'chat' for mobile UX

**UI Components:**
- MUI Avatar, Badge, TextField, Button, Popover
- Icons: Send, Search, Emoji, Image, Done/DoneAll (read receipts), ArrowBack

### User Profile Component: [ChatUserProfile.jsx](frontend/src/pages/ChatUserProfile.jsx)
**Location:** `frontend/src/pages/ChatUserProfile.jsx`

**Purpose:** Display profile details of a chat contact
- Shows user info, school, role
- Profile image
- Connection status
- Back to chat button

### Chat Service: [chat.js](frontend/src/services/chat.js)
**Location:** `frontend/src/services/chat.js`

**Methods:**
```javascript
chatService.getConnections()          // GET /chat/connections
chatService.getActiveChats()          // GET /chat/active
chatService.getUnreadCount()          // GET /chat/unread-count
chatService.getMessages(userId, limit) // GET /chat/messages/:userId
chatService.sendMessage(userId, msg)  // POST /chat/messages/:userId
chatService.markRead(userId)          // POST /chat/messages/:userId/read
```

---

## 5. BACKEND CONTROLLER & ROUTES

### Chat Controller: [chatController.js](backend/controllers/chatController.js)

**Exported Functions:**

#### `getChatConnections(req, res)`
- Retrieves all users with accepted connections
- Includes last message preview and unread count
- Uses complex LEFT JOIN to combine connection + message + unread data
- Returns max 300 connections, sorted by first/last name

#### `getActiveChats(req, res)`
- Filters connections that have at least one message
- Sorted by most recent message first
- Returns max 100 active chats

#### `getUnreadChatCount(req, res)`
- Simple COUNT query for unread messages
- WHERE recipient_id = current_user AND is_read = FALSE

#### `getConversationMessages(req, res)`
- Fetches message history between two users
- Supports limit parameter (default 120, max 250)
- Returns messages in chronological order
- Includes sender details (first_name, last_name)

#### `sendMessage(req, res)`
- **Validation:**
  - Target user must exist and not be self
  - Users must have accepted social connection
  - Message text cannot be empty or exceed 4000 chars
  - User role cannot be super_admin
- **Behavior:**
  - Normalizes user IDs (stores smaller ID in user_one_id)
  - Inserts message into chat_messages table
  - Returns new message ID

#### `markConversationAsRead(req, res)`
- Updates all unread messages from specified user to read status
- Sets `is_read = TRUE` and `read_at = NOW()`
- Only for messages where current user is recipient

### Chat Routes: [chat.js](backend/routes/chat.js)

```javascript
router.use(auth);  // All routes require authentication

router.get('/connections', getChatConnections);
router.get('/active', getActiveChats);
router.get('/unread-count', getUnreadChatCount);
router.get('/messages/:userId', getConversationMessages);
router.post('/messages/:userId', sendMessage);
router.post('/messages/:userId/read', markConversationAsRead);
```

---

## 6. NOTIFICATION SYSTEM

### Notification Service: [notificationService.js](backend/services/notificationService.js)

**Functions Available:**
- `notifyUser()` - Notify a single user
- `notifyUsers()` - Notify multiple users
- `createConnectionRequestNotification()` - For social connection requests
- `createFacultyFollowRequestNotification()` - For faculty followers
- `createPostLikeNotification()` - For post likes

**⚠️ Note:** Chat messages do NOT currently trigger notifications. New messages are only detected via polling every 3 seconds.

### Notification Model: [Notification.js](backend/models/Notification.js)
Handles CRUD operations for `user_notifications` table.

### Potential Integration Points
If you want to add chat message notifications:
1. Call `notificationService.notifyUser()` in `sendMessage()` controller
2. Pass type: `'chat_message'`, with context about sender
3. Frontend would display toast/badge for incoming messages

---

## 7. SECURITY & VALIDATION

### User Eligibility Checks
- User must be authenticated (JWT token)
- User role cannot be `super_admin`
- Users must have accepted social connection to message each other

### Data Normalization
- User ID pairs are normalized: `smaller_id < larger_id`
- Prevents duplicate conversations (same two users can only have one conversation thread)

### Message Validation
- Max length: 4000 characters
- No null/empty messages allowed
- Sender and recipient are tracked separately from normalized pair

### SQL Injection Protection
- All queries use parameterized prepared statements
- No string concatenation in SQL

---

## 8. FILE STRUCTURE

```
backend/
├── controllers/
│   └── chatController.js          # Chat message handlers
├── database/
│   └── ensureChatSchema.js        # Chat table creation/migration
├── models/
│   └── (no chat-specific model)
├── routes/
│   └── chat.js                    # Chat API routes
└── services/
    └── notificationService.js     # Notification creation (could integrate)

frontend/
└── src/
    ├── pages/
    │   ├── Chat.jsx               # Main chat interface
    │   └── ChatUserProfile.jsx    # User profile in chat
    └── services/
        └── chat.js                # API client for chat endpoints
```

---

## 9. KEY TECHNICAL DETAILS

### Connection Requirements
- Both users must exist in `users` table
- Social connection must exist with status = `'accepted'` in `social_connections`
- Super admin users cannot participate in chat

### Message Flow
1. User A types message and clicks Send
2. Frontend calls `POST /chat/messages/{userB}`
3. Backend validates connection and stores message
4. Frontend polls every 3 seconds with `GET /chat/messages/{userB}`
5. New messages appear in conversation view
6. When user views conversation, `POST /chat/messages/{userB}/read` marks them as read

### Performance Considerations
- Indexes on (user_one_id, user_two_id, created_at) enable fast message retrieval
- LEFT JOIN in getChatConnections is complex but efficient for sidebar display
- Polling every 3 seconds may impact server under high user load
- Consider WebSocket migration for scalability

### Data Consistency
- Foreign keys prevent orphaned messages
- User ID pair normalization ensures single conversation thread
- `updated_at` timestamp tracks changes for debugging

---

## 10. CURRENT LIMITATIONS & RECOMMENDATIONS

### Current Limitations
1. **No real-time notifications** - Messages detected only via 3-second polling
2. **No WebSocket support** - Cannot scale to thousands of concurrent users
3. **No message editing/deletion** - Messages are immutable once sent
4. **No file/media attachments** - Only text messages supported
5. **No typing indicators** - No "user is typing" feedback
6. **No message reactions/emojis** - Only emoji picker as shortcuts (no persistent reactions)
7. **No group chat** - Only one-to-one conversations
8. **No message search** - Cannot search within conversations

### Recommended Enhancements
1. Implement Socket.io or WebSocket for real-time messaging
2. Add chat message notifications to notification system
3. Implement message editing with edit history
4. Add file/image upload capability
5. Add typing indicators
6. Add message reactions (emoji reactions on messages)
7. Add group chat functionality
8. Add message search within conversations
9. Add user online status indicator
10. Add message pinning/starring

---

## 11. TESTING CHECKLIST

- [ ] Create social connection between two users
- [ ] User A sends message to User B
- [ ] User B receives message within 3 seconds
- [ ] Message appears with correct sender name and timestamp
- [ ] Unread count is accurate
- [ ] Marking conversation as read updates is_read flag
- [ ] Super admin cannot access chat (403 error)
- [ ] Message cannot exceed 4000 characters
- [ ] Empty message is rejected
- [ ] Cannot message disconnected user (403 error)
- [ ] Cannot message oneself (400 error)
- [ ] Message history loads correctly (up to 250 messages)
- [ ] Read receipts display correctly (✓ = sent, ✓✓ = read)
- [ ] Mobile view switches correctly on resize
- [ ] Emoji picker and stickers work
- [ ] Search/filter connections works

---

**Last Updated:** April 5, 2026
**Status:** Analysis Complete
