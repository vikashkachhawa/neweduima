# Group Chat - Quick Integration Guide

## ✅ Components Created

I've created 3 React components for you:

1. **CreateGroupDialog.jsx** - Modal dialog to create groups
2. **GroupList.jsx** - Sidebar showing your groups
3. **GroupChatView.jsx** - Group chat interface

**Location**: `frontend/src/components/`

---

## 🚀 How to Add "Create Group" to Your Chat

### Option 1: Add Tab in Existing Chat (Simplest)

Add this to your existing **Chat.jsx** component:

```jsx
import { Tabs, Tab } from '@mui/material';
import GroupList from '../components/GroupList';
import GroupChatView from '../components/GroupChatView';
import CreateGroupDialog from '../components/CreateGroupDialog';

// In your Chat component, add these state variables:
const [tabValue, setTabValue] = useState(0); // 0 = 1-to-1, 1 = Groups
const [selectedGroupId, setSelectedGroupId] = useState(null);
const [openCreateGroupDialog, setOpenCreateGroupDialog] = useState(false);
const [groupView, setGroupView] = useState('list'); // 'list' or 'chat'

// In your render, add tabs above the connections list:
<Tabs value={tabValue} onChange={(e, val) => setTabValue(val)}>
  <Tab label="Direct Messages" />
  <Tab label="💬 Group Chats" />
</Tabs>

// Then use conditional rendering:
{tabValue === 0 ? (
  // Existing 1-to-1 chat UI
  <Box>
    {/* Your existing chat list and messages UI */}
  </Box>
) : (
  // Group chat UI
  groupView === 'list' ? (
    <GroupList
      onGroupSelect={(id) => {
        setSelectedGroupId(id);
        setGroupView('chat');
      }}
      selectedGroupId={selectedGroupId}
      onOpenCreateDialog={() => setOpenCreateGroupDialog(true)}
    />
  ) : (
    <GroupChatView
      groupId={selectedGroupId}
      onBack={() => setGroupView('list')}
      onGroupDeleted={(id) => {
        setGroupView('list');
        setSelectedGroupId(null);
      }}
    />
  )
)}

// Add the create dialog:
<CreateGroupDialog
  open={openCreateGroupDialog}
  onClose={() => setOpenCreateGroupDialog(false)}
  onSuccess={() => {
    // Dialog will close automatically on success
  }}
/>
```

---

### Option 2: Separate Page (Better for Mobile)

Create a new file: **frontend/src/pages/GroupChat.jsx**

```jsx
import React, { useState } from 'react';
import { Box } from '@mui/material';
import Layout from '../components/Layout';
import GroupList from '../components/GroupList';
import GroupChatView from '../components/GroupChatView';
import CreateGroupDialog from '../components/CreateGroupDialog';

export default function GroupChat() {
  const [view, setView] = useState('list'); // 'list' or 'chat'
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);

  return (
    <Layout>
      <Box sx={{ display: 'flex', height: '100vh' }}>
        {/* Sidebar - Always visible on desktop, hidden on mobile chat view */}
        <Box
          sx={{
            width: { xs: view === 'chat' ? 0 : '100%', sm: 300 },
            borderRight: 1,
            borderColor: 'divider',
            overflow: 'hidden',
            transition: 'width 0.3s'
          }}
        >
          <GroupList
            onGroupSelect={(id) => {
              setSelectedGroupId(id);
              setView('chat');
            }}
            selectedGroupId={selectedGroupId}
            onOpenCreateDialog={() => setOpenCreateDialog(true)}
            onGroupDeleted={(id) => {
              setView('list');
              setSelectedGroupId(null);
            }}
          />
        </Box>

        {/* Chat Area */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {view === 'chat' && selectedGroupId ? (
            <GroupChatView
              groupId={selectedGroupId}
              onBack={() => setView('list')}
              onGroupDeleted={() => setView('list')}
            />
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              Select a group to start chatting
            </Box>
          )}
        </Box>
      </Box>

      <CreateGroupDialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        onSuccess={() => {
          // Groups will auto-reload
        }}
      />
    </Layout>
  );
}
```

Then add route in **App.jsx**:

```jsx
import GroupChat from './pages/GroupChat';

// In your routes:
<Route path="/student/group-chat" element={<ProtectedRoute><GroupChat /></ProtectedRoute>} />
```

And update **Sidebar.jsx**:

```jsx
<NavLink 
  to="/student/group-chat" 
  label="👥 Group Chats" 
  icon={<GroupsIcon />} 
/>
```

---

## 🎬 How to Use

### Creating a Group:

1. Click **"New Group"** button
2. Enter group name (required)
3. Optionally add description and members
4. For members, enter user IDs separated by commas (e.g., `2,3,4,5`)
   - Find user IDs in your school's user management
5. Click **"Create Group"**

### Sending Messages:

1. Click a group from the list
2. Type message in the text field
3. Press **Enter** or click **Send**
4. Messages appear in real-time (polls every 3 seconds)

### Managing Group:

1. Click the **⋮** menu in group header
2. Click **Settings** (admin only)
3. Add/remove members or promote to admin
4. Delete group if needed

---

## 📱 Member Selection

Currently, the member selector works with **user IDs**. To improve this:

**Replace the `MemberSelector` component in CreateGroupDialog.jsx with:**

```jsx
import { Autocomplete } from '@mui/material';

function MemberSelector({ selectedMemberIds, onChange, disabled, schoolId }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadSchoolUsers();
  }, [schoolId]);

  const loadSchoolUsers = async () => {
    try {
      // Call your user service to get users:
      // const response = await userService.getSchoolUsers(schoolId);
      // setUsers(response.users);
      
      // For now, you'll need to implement this in your user service
      console.log('Loading users for school:', schoolId);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  return (
    <Autocomplete
      multiple
      options={users}
      getOptionLabel={(option) => `${option.first_name} ${option.last_name}`}
      value={users.filter(u => selectedMemberIds.includes(u.id))}
      onChange={(e, selected) => onChange(e, selected)}
      disabled={disabled}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Select Members"
          placeholder="Search and select members..."
        />
      )}
    />
  );
}
```

---

## 🔧 Testing the API (Without UI)

If you want to test the backend before UI is ready:

```bash
# 1. Create Group
curl -X POST http://localhost:5000/api/group-management/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Group",
    "description": "My test group",
    "member_ids": [2, 3, 4]
  }'

# 2. Get Your Groups
curl -X GET http://localhost:5000/api/group-management/my-groups \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Send Message
curl -X POST http://localhost:5000/api/group-chat/1/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello group!"
  }'

# 4. Get Messages
curl -X GET http://localhost:5000/api/group-chat/1/messages \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📋 Files Modified/Created

**Created**:
- ✅ `frontend/src/components/CreateGroupDialog.jsx`
- ✅ `frontend/src/components/GroupList.jsx`
- ✅ `frontend/src/components/GroupChatView.jsx`

**Modify** (for Option 2):
- `frontend/src/App.jsx` - Add route
- `frontend/src/components/Sidebar.jsx` - Add navigation link
- Or modify `frontend/src/pages/Chat.jsx` - Add tabs (Option 1)

---

## ✨ Features Included

✅ **Create Groups** - With name, description, and members  
✅ **Send Messages** - Real-time polling (3 seconds)  
✅ **Read Messages** - Timestamps and sender info  
✅ **Manage Members** - Add, remove, promote to admin  
✅ **Delete Groups** - Soft delete with confirmation  
✅ **Member Count** - Display in list  
✅ **Unread Count** - Badge on group names  
✅ **Admin Controls** - Settings for group admins  
✅ **Dark Mode** - Full support  
✅ **Mobile Responsive** - Works on all devices  

---

## 🐛 Troubleshooting

### "Not a member of this group"
- Make sure the user ID in JWT is correct
- User must be added to the group first

### "Group not found"
- Group might be deleted
- Refresh the page to reload groups

### Messages not updating
- Check browser console for errors
- Make sure backend routes are registered in server.js
- Verify authentication token is valid

### Member selection not working
- User IDs must be valid and from the same school
- Separate multiple IDs with commas

---

## 🚀 Next Steps

1. **Choose Integration Option** (Option 1 or 2)
2. **Copy Components** to your frontend
3. **Update Routes/Navigation** (if Option 2)
4. **Test Creating Group**
5. **Test Sending Message**
6. **Test Member Management**

---

**Ready?** Start with **Option 1 (Tabs in existing Chat)** for quick integration, or **Option 2 (Separate Page)** for better organization.
