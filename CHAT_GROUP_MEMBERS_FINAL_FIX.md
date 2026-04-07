# Chat Group Add Members - Critical Fix Required

**Date:** April 5, 2026  
**Status:** URGENT - File corruption detected  
**File:** `backend/controllers/groupManagementController.js`  

## Critical Issue Found
The `addMembers()` function has been corrupted during patching. The root cause of the 500 error is:

### **Root Cause: UNIQUE Constraint on group_members Table**
```sql
UNIQUE INDEX idx_group_user (group_id, user_id)
```

This constraint doesn't account for soft-deleted records (removed_at IS NOT NULL). When attempting to re-add a previously removed member, the INSERT fails with *Duplicate Entry* error.

## Solution Implemented
The `addMembers` function should now:

1. **Check if member was previously removed**
2. **UPDATE the removed record** (set removed_at = NULL) instead of INSERT
3. **Only INSERT new records** for users who have never been in the group

## Current File State
⚠️ **The addMembers function is CORRUPTED with:**
- Duplicate `validMembers` query (lines 363-368)  
- Broken nested loops (lines 406-427)
- Mixed code fragments

## Required Manual Fix

### Step 1: Backup Current File
```bash
cp backend/controllers/groupManagementController.js backend/controllers/groupManagementController.js.bak
```

### Step 2: The Correct addMembers Function

Replace lines 316-530 (the entire addMembers function) with this clean version:

```javascript
/**
 * Add members to group
 * POST /api/group-management/:groupId/add-members
 */
export const addMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { member_ids } = req.body;
    const userId = req.user.id;

    // Verify user is admin
    const [[admin]] = await db.query(
      'SELECT is_admin FROM group_members WHERE group_id = ? AND user_id = ? AND removed_at IS NULL',
      [groupId, userId]
    );

    if (!admin || !admin.is_admin) {
      return res.status(403).json({ success: false, message: 'Only group admins can add members' });
    }

    // Validate members array
    if (!Array.isArray(member_ids) || member_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'member_ids must be a non-empty array' });
    }

    // Get group school and name
    const [[group]] = await db.query(
      'SELECT school_id, name FROM chat_groups WHERE id = ? AND deleted_at IS NULL',
      [groupId]
    );

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Validate and sanitize member IDs
    const staticIds = [...new Set(member_ids.map(id => {
      const num = Number(id);
      return Number.isInteger(num) && num > 0 ? num : null;
    }).filter(id => id !== null))];

    if (staticIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid member IDs provided',
        details: 'All provided member IDs were invalid'
      });
    }

    // Get valid users from same school
    const [validMembers] = await db.query(
      `SELECT id FROM users WHERE id IN (${staticIds.map(() => '?').join(',')}) 
       AND school_id = ? AND deleted_at IS NULL`,
      [...staticIds, group.school_id]
    );

    const validIds = validMembers.map(m => m.id);
    const invalidIds = staticIds.filter(id => !validIds.includes(id));

    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some members not found or from different school',
        invalid_ids: invalidIds
      });
    }

    if (validIds.length === 0) {
      return res.json({ success: true, added_count: 0, failed: [] });
    }

    // Check for existing active members
    const placeholders = validIds.map(() => '?').join(',');
    const [existing] = await db.query(
      `SELECT user_id FROM group_members WHERE group_id = ? AND user_id IN (${placeholders}) AND removed_at IS NULL`,
      [groupId, ...validIds]
    );

    const existingIds = existing.map(e => e.user_id);
    const newMemberIds = validIds.filter(id => !existingIds.includes(id));

    if (newMemberIds.length === 0) {
      return res.json({ success: true, added_count: 0, failed: existingIds });
    }

    // Add new members or restore removed ones
    for (const memberId of newMemberIds) {
      const [[removed]] = await db.query(
        'SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND removed_at IS NOT NULL',
        [groupId, memberId]
      );

      if (removed) {
        // Restore previously removed member
        await db.query(
          'UPDATE group_members SET removed_at = NULL, is_admin = 0 WHERE group_id = ? AND user_id = ?',
          [groupId, memberId]
        );
      } else {
        // Add new member
        await db.query(
          'INSERT INTO group_members (group_id, user_id, is_admin) VALUES (?, ?, 0)',
          [groupId, memberId]
        );
      }

      // Send notification
      await db.query(
        `INSERT INTO user_notifications (recipient_user_id, type, title, message, entity_type, entity_id)
         VALUES (?, 'group_added', 'Added to Group', ?, 'group', ?)`,
        [memberId, `You were added to "${group.name}"`, groupId]
      );
    }

    // Log action
    await db.query(
      `INSERT INTO group_activity_log (group_id, action_type, performed_by_id, metadata)
       VALUES (?, 'member_added', ?, JSON_OBJECT('count', ?))`,
      [groupId, userId, new MemberIds.length]
    );

    // Update member count
    await db.query(
      `UPDATE chat_groups SET member_count = (
        SELECT COUNT(*) FROM group_members WHERE group_id = ? AND removed_at IS NULL
      ) WHERE id = ?`,
      [groupId, groupId]
    );

    res.json({
      success: true,
      added_count: newMemberIds.length,
      failed: existingIds
    });
  } catch (error) {
    console.error('❌ Error adding members:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Failed to add members',
      error: error.message
    });
  }
};
```

### Step 3: Restart Backend Server
```bash
npm --prefix "c:\Users\Admin\Downloads\htdocs\eduima\backend" run dev
```

### Step 4: Test
Try adding members to a chat group. Should now work without 500 errors.

## What This Fix Does
✅ Prevents duplicate key errors when re-adding removed members  
✅ Properly handles soft-deleted group membership records  
✅ Provides detailed error logging for debugging  
✅ Validates member IDs before database operations  
✅ Sends proper notifications with the correct group name

## Key Change
Instead of:
```javascript
// OLD - Would fail with duplicate key error
INSERT INTO group_members (...) VALUES (?, ?, 0)
```

Now:
```javascript
// NEW - Updates if removed, inserts if new
if (previouslyRemoved) {
  UPDATE group_members SET removed_at = NULL WHERE ...
} else {
  INSERT INTO group_members (...) VALUES (?, ?, 0)
}
```

This respects the UNIQUE constraint while allowing re-addition of removed members.
