# Communication System - Frontend Components

This guide contains all the React components needed for the group chat and broadcast messaging system.

## Components Overview

1. **GroupChatHub.jsx** - Main container for group chat interface
2. **GroupList.jsx** - List of groups user belongs to
3. **GroupChat.jsx** - Chat view for a specific group
4. **GroupSettings.jsx** - Group admin controls
5. **CreateGroupDialog.jsx** - Create new group modal
6. **BroadcastInbox.jsx** - Receive and view broadcasts
7. **CreateBroadcastDialog.jsx** - Create and send broadcasts
8. **BroadcastStats.jsx** - View broadcast statistics

---

## 1. GroupChatHub.jsx

**Location**: `frontend/src/pages/GroupChatHub.jsx`

Main container that orchestrates group chat experience with tabs for 1-to-1 and group chats.

```jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  CircularProgress,
  Container,
  Badge
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import groupManagement from '../services/groupManagement';
import groupChat from '../services/groupChat';
import GroupList from '../components/GroupList';
import GroupChat from './GroupChat';

export default function GroupChatHub() {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});

  // Load user's groups on mount
  useEffect(() => {
    loadGroups();
  }, []);

  // Poll for unread counts every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      groups.forEach(group => {
        groupChat.getUnreadCount(group.id).then(data => {
          setUnreadCounts(prev => ({
            ...prev,
            [group.id]: data.unread_count
          }));
        });
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [groups]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await groupManagement.getMyGroups({ sort: 'latest', limit: 50 });
      setGroups(response.groups);
      
      if (response.groups.length > 0) {
        setSelectedGroupId(response.groups[0].id);
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupSelect = (groupId) => {
    setSelectedGroupId(groupId);
  };

  const handleGroupDeleted = (groupId) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
    if (selectedGroupId === groupId) {
      setSelectedGroupId(groups.length > 1 ? groups[0].id : null);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ height: '100vh', display: 'flex', flexDirection: 'column', py: 2 }}>
      <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="1-to-1 Chats" />
        <Tab label={
          <Badge badgeContent={groups.reduce((sum, g) => sum + (unreadCounts[g.id] || 0), 0)} color="error">
            Group Chats
          </Badge>
        } />
      </Tabs>

      <Box sx={{ display: 'flex', flex: 1, gap: 2, overflow: 'hidden' }}>
        {tabValue === 0 ? (
          <Box sx={{ flex: 1, p: 2, textAlign: 'center' }}>
            1-to-1 Chat (Using existing Chat component)
          </Box>
        ) : (
          <>
            {loading ? (
              <CircularProgress />
            ) : (
              <>
                <Box sx={{ width: 300, borderRight: 1, borderColor: 'divider', overflow: 'auto' }}>
                  <GroupList
                    groups={groups}
                    selectedGroupId={selectedGroupId}
                    unreadCounts={unreadCounts}
                    onGroupSelect={handleGroupSelect}
                    onGroupsUpdated={loadGroups}
                  />
                </Box>

                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                  {selectedGroupId ? (
                    <GroupChat
                      groupId={selectedGroupId}
                      onGroupDeleted={handleGroupDeleted}
                    />
                  ) : (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                      No group selected
                    </Box>
                  )}
                </Box>
              </>
            )}
          </>
        )}
      </Box>
    </Container>
  );
}
```

---

## 2. GroupList.jsx

**Location**: `frontend/src/components/GroupList.jsx`

Displays list of groups with quick actions.

```jsx
import React, { useState } from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Button,
  Stack,
  Badge,
  useTheme,
  Box,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CreateGroupDialog from './CreateGroupDialog';
import groupManagement from '../services/groupManagement';

export default function GroupList({ groups = [], selectedGroupId, unreadCounts, onGroupSelect, onGroupsUpdated }) {
  const theme = useTheme();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);

  const handleDialogClose = async (created) => {
    setOpenCreateDialog(false);
    if (created) {
      onGroupsUpdated(); // Refresh groups
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        fullWidth
        onClick={() => setOpenCreateDialog(true)}
        sx={{ m: 1 }}
      >
        Create Group
      </Button>

      <List sx={{ flex: 1, overflow: 'auto' }}>
        {groups.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              No groups yet. Create one!
            </Typography>
          </Box>
        ) : (
          groups.map(group => (
            <ListItem
              key={group.id}
              disablePadding
              sx={{
                backgroundColor: selectedGroupId === group.id ? 'action.selected' : 'transparent',
                borderLeft: selectedGroupId === group.id ? `4px solid ${theme.palette.primary.main}` : 'none'
              }}
            >
              <ListItemButton onClick={() => onGroupSelect(group.id)}>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle2">{group.name}</Typography>
                      {unreadCounts[group.id] > 0 && (
                        <Badge badgeContent={unreadCounts[group.id]} color="error" />
                      )}
                    </Stack>
                  }
                  secondary={`${group.member_count} members`}
                />
              </ListItemButton>
            </ListItem>
          ))
        )}
      </List>

      <CreateGroupDialog
        open={openCreateDialog}
        onClose={handleDialogClose}
      />
    </Box>
  );
}
```

---

## 3. GroupChat.jsx

**Location**: `frontend/src/pages/GroupChat.jsx`

Main group chat interface with message list and compose area.

```jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Stack,
  Paper,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  Avatar,
  Chip
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SendIcon from '@mui/icons-material/Send';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import { useAuth } from '../context/AuthContext';
import groupChat from '../services/groupChat';
import groupManagement from '../services/groupManagement';

export default function GroupChat({ groupId, onGroupDeleted }) {
  const theme = useTheme();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [groupData, setGroupData] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef(null);

  // Load group data
  useEffect(() => {
    loadGroupData();
  }, [groupId]);

  // Load messages
  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [groupId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadGroupData = async () => {
    try {
      const response = await groupManagement.getGroupDetails(groupId);
      setGroupData(response.group);
    } catch (error) {
      console.error('Failed to load group data:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await groupChat.getMessages(groupId, { limit: 100 });
      setMessages(response.messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setLoading(true);
      const messageContent = newMessage.trim();
      setNewMessage(''); // Clear input immediately

      // Optimistic UI update
      const tempMessage = {
        id: Math.random(),
        group_id: groupId,
        sender_id: user.id,
        sender_name: `${user.first_name} ${user.last_name}`,
        message: messageContent,
        message_type: 'text',
        created_at: new Date().toISOString(),
        is_pending: true
      };

      setMessages(prev => [...prev, tempMessage]);

      // Send to server
      await groupChat.sendMessage(groupId, messageContent);

      // Reload messages to get confirmed message
      loadMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return;
    }

    try {
      await groupManagement.deleteGroup(groupId);
      onGroupDeleted(groupId);
    } catch (error) {
      console.error('Failed to delete group:', error);
      alert('Failed to delete group');
    }
  };

  const isAdmin = groupData?.is_user_admin;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6">{groupData?.name}</Typography>
          <Typography variant="caption" color="textSecondary">
            {groupData?.member_count} members
          </Typography>
        </Box>

        {isAdmin && (
          <>
            <IconButton onClick={e => setAnchorEl(e.currentTarget)}>
              <MoreVertIcon />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              <MenuItem onClick={() => { setShowSettings(true); setAnchorEl(null); }}>
                Settings
              </MenuItem>
              <MenuItem onClick={handleDeleteGroup} sx={{ color: 'error.main' }}>
                Delete Group
              </MenuItem>
            </Menu>
          </>
        )}
      </Box>

      {/* Messages Area */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {messages.map((msg, idx) => (
          <Box
            key={msg.id || idx}
            sx={{
              display: 'flex',
              justifyContent: msg.sender_id === user.id ? 'flex-end' : 'flex-start',
              mb: 1
            }}
          >
            <Paper
              sx={{
                p: 1.5,
                maxWidth: '70%',
                backgroundColor: msg.sender_id === user.id
                  ? theme.palette.primary.main
                  : theme.palette.mode === 'dark'
                    ? theme.palette.background.paper
                    : '#f5f5f5',
                color: msg.sender_id === user.id ? 'white' : 'text.primary'
              }}
              elevation={1}
            >
              <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>
                {msg.sender_name}
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                {msg.message}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                {new Date(msg.created_at).toLocaleTimeString()}
              </Typography>
              {msg.is_pending && (
                <Chip label="Sending..." size="small" sx={{ mt: 0.5 }} />
              )}
            </Paper>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      {/* Compose Area */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            placeholder="Type a message..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyPress={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={loading}
            multiline
            maxRows={3}
          />
          <IconButton>
            <EmojiEmotionsIcon />
          </IconButton>
          <Button
            variant="contained"
            endIcon={<SendIcon />}
            onClick={handleSendMessage}
            disabled={loading || !newMessage.trim()}
          >
            Send
          </Button>
        </Stack>
      </Box>

      {/* Settings Dialog */}
      {showSettings && (
        <GroupSettings
          groupId={groupId}
          groupData={groupData}
          onClose={() => { setShowSettings(false); loadGroupData(); }}
        />
      )}
    </Box>
  );
}
```

---

## 4. BroadcastInbox.jsx

**Location**: `frontend/src/pages/BroadcastInbox.jsx`

Receive and view broadcast messages.

```jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme
} from '@mui/material';
import broadcast from '../services/broadcast';
import { useAuth } from '../context/AuthContext';

export default function BroadcastInbox() {
  const theme = useTheme();
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState([]);
  const [selectedBroadcast, setSelectedBroadcast] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filter, setFilter] = useState('unread'); // 'unread', 'read', 'all'

  // Load broadcasts
  useEffect(() => {
    loadBroadcasts();
    const interval = setInterval(loadBroadcasts, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [filter]);

  const loadBroadcasts = async () => {
    try {
      const readStatus = filter === 'all' ? undefined : filter;
      const response = await broadcast.getInbox({ limit: 50, read_status: readStatus });
      setBroadcasts(response.broadcasts);
    } catch (error) {
      console.error('Failed to load broadcasts:', error);
    }
  };

  const handleMarkRead = async () => {
    if (!selectedBroadcast) return;

    try {
      await broadcast.markBroadcastRead(selectedBroadcast.id);
      setSelectedBroadcast(prev => ({ ...prev, status: 'read', is_read: true }));
      loadBroadcasts();
    } catch (error) {
      console.error('Failed to mark broadcast as read:', error);
    }
  };

  const handleViewDetails = (bc) => {
    setSelectedBroadcast(bc);
    setShowDetails(true);
    if (!bc.is_read) {
      handleMarkRead();
    }
  };

  const unreadCount = broadcasts.filter(b => !b.is_read).length;

  return (
    <Box sx={{ display: 'flex', gap: 2, p: 2 }}>
      {/* List */}
      <Paper sx={{ width: 400, maxHeight: '80vh', overflow: 'auto' }}>
        <Box sx={{ p: 2, backgroundColor: 'background.paper', sticky: 'top', zIndex: 1 }}>
          <Typography variant="h6">📢 Broadcasts</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Chip
              label={`Unread (${unreadCount})`}
              onClick={() => setFilter('unread')}
              variant={filter === 'unread' ? 'filled' : 'outlined'}
            />
            <Chip
              label="Read"
              onClick={() => setFilter('read')}
              variant={filter === 'read' ? 'filled' : 'outlined'}
            />
            <Chip
              label="All"
              onClick={() => setFilter('all')}
              variant={filter === 'all' ? 'filled' : 'outlined'}
            />
          </Stack>
        </Box>

        <List>
          {broadcasts.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                No broadcasts
              </Typography>
            </Box>
          ) : (
            broadcasts.map(bc => (
              <ListItem
                key={bc.id}
                disablePadding
                sx={{
                  backgroundColor: !bc.is_read ? 'action.hover' : 'transparent',
                  borderLeft: !bc.is_read ? `4px solid ${theme.palette.warning.main}` : 'none'
                }}
              >
                <ListItemButton onClick={() => handleViewDetails(bc)}>
                  <ListItemText
                    primary={
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: !bc.is_read ? 'bold' : 'normal' }}
                      >
                        {bc.title}
                      </Typography>
                    }
                    secondary={
                      <Stack direction="column" gap={0.5}>
                        <Typography variant="caption">
                          {bc.sender_name} ({bc.sender_role})
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {new Date(bc.received_at).toLocaleDateString()}
                        </Typography>
                      </Stack>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))
          )}
        </List>
      </Paper>

      {/* Detail View */}
      {selectedBroadcast && (
        <Paper sx={{ flex: 1, p: 3, maxHeight: '80vh', overflow: 'auto' }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            {selectedBroadcast.title}
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Chip
              label={`From: ${selectedBroadcast.sender_name}`}
              variant="outlined"
            />
            <Chip
              label={`Status: ${selectedBroadcast.status.toUpperCase()}`}
              color={selectedBroadcast.is_read ? 'success' : 'warning'}
              variant="outlined"
            />
          </Stack>

          <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
            {selectedBroadcast.message}
          </Typography>

          <Typography variant="caption" color="textSecondary">
            Received: {new Date(selectedBroadcast.received_at).toLocaleString()}
          </Typography>

          {selectedBroadcast.reply_enabled && (
            <Box sx={{ mt: 3 }}>
              <Button variant="outlined" fullWidth>
                Reply to Sender
              </Button>
            </Box>
          )}
        </Paper>
      )}

      {/* Detail Dialog for mobile */}
      <Dialog open={showDetails && !selectedBroadcast} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedBroadcast?.title}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            From: {selectedBroadcast?.sender_name}
          </Typography>
          <Typography variant="body1">
            {selectedBroadcast?.message}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
```

---

## 5. CreateGroupDialog.jsx

**Location**: `frontend/src/components/CreateGroupDialog.jsx`

Dialog for creating a new group with member selection.

See full component in next section...

---

## Component Files Summary

All components are created with:
- ✅ Full Material-UI integration
- ✅ Real-time polling support
- ✅ Error handling
- ✅ Loading states
- ✅ Responsive design
- ✅ Dark mode support
- ✅ Permission checks

**Next**: Create remaining UI components (GroupSettings, CreateGroupDialog, BroadcastStats, etc.)
