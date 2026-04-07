import db from '../config/database.js';

const getUserDisplayName = async (userId) => {
  const [[user]] = await db.query(
    'SELECT first_name, last_name FROM users WHERE id = ?',
    [userId]
  );

  if (!user) {
    return 'Someone';
  }

  return `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Someone';
};

const createSystemGroupMessage = async (groupId, actorId, messageText) => {
  await db.query(
    `INSERT INTO group_messages (group_id, sender_id, message_text, message_type)
     VALUES (?, ?, ?, 'system')`,
    [groupId, actorId, messageText]
  );
};

/**
 * Group Management Controller
 * Handles group creation, member management, admin controls
 */

/**
 * Create new group
 * POST /api/group-management/create
 */
export const createGroup = async (req, res) => {
  try {
    const { name, description, member_ids } = req.body;
    const creatorId = req.user.id;
    const schoolId = req.user.school_id;

    console.log('🔍 CreateGroup Request:', { creatorId, schoolId, name, description, member_ids });

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Group name is required' });
    }

    if (name.trim().length > 255) {
      return res.status(400).json({ success: false, message: 'Group name exceeds 255 characters' });
    }

    if (description && description.length > 1000) {
      return res.status(400).json({ success: false, message: 'Description exceeds 1000 characters' });
    }

    // Check unique group name in school
    console.log('📋 Checking unique group name...');
    try {
      const [[existing]] = await db.query(
        'SELECT id FROM chat_groups WHERE school_id = ? AND name = ? AND deleted_at IS NULL',
        [schoolId, name.trim()]
      );

      if (existing) {
        console.log('⚠️  Group name already exists');
        return res.status(400).json({ success: false, message: 'Group name already exists in your school' });
      }
      console.log('✅ Group name is unique');
    } catch (err) {
      console.error('❌ Error checking unique name:', err.message);
      console.error('   Query: SELECT id FROM chat_groups WHERE school_id = ? AND name = ? AND deleted_at IS NULL');
      console.error('   Params:', [schoolId, name.trim()]);
      throw err;
    }

    // Validate member IDs
    console.log('👥 Validating member IDs...');
    let members = [creatorId]; // Always include creator
    if (member_ids && Array.isArray(member_ids)) {
      const uniqueIds = [...new Set(member_ids.map(Number).filter(id => id !== creatorId))];
      console.log('   Unique member IDs (excluding creator):', uniqueIds);

      if (uniqueIds.length > 0) {
        // Verify all members exist in same school and are not deleted
        console.log('   Checking if members exist in same school...');
        try {
          const placeholders = uniqueIds.map(() => '?').join(',');
          const query = `SELECT id FROM users WHERE id IN (${placeholders}) AND school_id = ? AND is_active = TRUE`;
          console.log('   Query:', query);
          console.log('   Params:', [...uniqueIds, schoolId]);
          
          const [validMembers] = await db.query(query, [...uniqueIds, schoolId]);
          console.log('   Valid members found:', validMembers.length);

          const validIds = validMembers.map(m => m.id);

          // Find invalid members
          const invalidIds = uniqueIds.filter(id => !validIds.includes(id));
          if (invalidIds.length > 0) {
            console.log('⚠️  Invalid member IDs:', invalidIds);
            return res.status(400).json({
              success: false,
              message: `Invalid members: ${invalidIds.join(', ')}. Ensure all members are from your school.`,
              invalid_ids: invalidIds
            });
          }

          members = [creatorId, ...validIds];
          console.log('✅ All members validated, total members:', members.length);
        } catch (err) {
          console.error('❌ Error validating members:', err.message);
          console.error('   Stack:', err.stack);
          throw err;
        }
      }
    }

    // Create group
    console.log('🆕 Creating group in database...');
    console.log('   Data:', { schoolId, name: name.trim(), description: description || null, creatorId, member_count: members.length });
    try {
      const [groupResult] = await db.query(
        `INSERT INTO chat_groups (school_id, name, description, created_by_id, member_count)
         VALUES (?, ?, ?, ?, ?)`,
        [schoolId, name.trim(), description || null, creatorId, members.length]
      );

      const groupId = groupResult.insertId;
      console.log('✅ Group created with ID:', groupId);

      // Add all members (creator as admin, others as regular members)
      console.log('👥 Adding members to group...');
      for (const memberId of members) {
        const isAdmin = memberId === creatorId ? 1 : 0;
        try {
          await db.query(
            'INSERT INTO group_members (group_id, user_id, is_admin) VALUES (?, ?, ?)',
            [groupId, memberId, isAdmin]
          );
          console.log(`   ✅ Added member ${memberId} (admin: ${isAdmin})`);
        } catch (err) {
          console.error(`   ❌ Error adding member ${memberId}:`, err.message);
          throw err;
        }
      }

      // Log group creation
      console.log('📝 Logging group creation activity...');
      try {
        await db.query(
          `INSERT INTO group_activity_log (group_id, action_type, performed_by_id, metadata)
           VALUES (?, 'group_created', ?, JSON_OBJECT('member_count', ?))`,
          [groupId, creatorId, members.length]
        );
        console.log('✅ Activity logged');
      } catch (err) {
        console.error('⚠️  Error logging activity (non-critical):', err.message);
        // Non-critical, don't fail the group creation
      }

      // Send notifications to added members (except creator)
      console.log('🔔 Sending notifications...');
      for (const memberId of members) {
        if (memberId !== creatorId) {
          try {
            await db.query(
              `INSERT INTO user_notifications (recipient_user_id, type, title, message, entity_type, entity_id)
               VALUES (?, 'group_added', 'Added to Group', ?, 'group', ?)`,
              [memberId, `You were added to "${name.trim()}"`, groupId]
            );
            console.log(`   ✅ Notification sent to user ${memberId}`);
          } catch (err) {
            console.error(`   ⚠️  Error sending notification to ${memberId}:`, err.message);
            // Non-critical, continue
          }
        }
      }

      console.log('✅ Group creation successful!');
      res.status(201).json({
        success: true,
        group: {
          id: groupId,
          name: name.trim(),
          description: description || null,
          created_by_id: creatorId,
          member_count: members.length,
          created_at: new Date().toISOString()
        }
      });
    } catch (err) {
      console.error('❌ Error creating group:', err.message);
      console.error('   Stack:', err.stack);
      throw err;
    }
  } catch (error) {
    console.error('❌ Critical error in createGroup:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    console.error('   SQL:', error.sql);
    console.error('   Stack:', error.stack);
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create group',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Get all groups for current user
 * GET /api/group-management/my-groups?sort=latest&limit=20
 */
export const getMyGroups = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const sort = req.query.sort === 'name' ? 'cg.name ASC' : 'cg.updated_at DESC';

    const [groups] = await db.query(
      `SELECT 
        cg.id,
        cg.name,
        cg.description,
        cg.member_count,
        cg.created_at,
        cg.updated_at,
        gm.is_admin,
        COUNT(DISTINCT gm2.user_id) as member_count_actual,
        (SELECT COUNT(*) FROM group_messages WHERE group_id = cg.id AND deleted_at IS NULL) as message_count,
        (SELECT message_text FROM group_messages WHERE group_id = cg.id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM group_messages WHERE group_id = cg.id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1) as last_message_at,
        (SELECT COUNT(*) FROM group_messages gm 
          LEFT JOIN group_message_reads gmr ON gmr.message_id = gm.id AND gmr.user_id = ?
          WHERE gm.group_id = cg.id AND gm.deleted_at IS NULL AND gmr.id IS NULL) as unread_count
      FROM chat_groups cg
      INNER JOIN group_members gm ON gm.group_id = cg.id AND gm.user_id = ? AND gm.removed_at IS NULL
      LEFT JOIN group_members gm2 ON gm2.group_id = cg.id AND gm2.removed_at IS NULL
      WHERE cg.deleted_at IS NULL
      GROUP BY cg.id
      ORDER BY ${sort}
      LIMIT ?`,
      [userId, userId, limit]
    );

    res.json({
      success: true,
      groups: groups.map(g => ({
        id: g.id,
        name: g.name,
        member_count: g.member_count_actual,
        is_admin: Boolean(g.is_admin),
        unread_count: g.unread_count,
        message_count: g.message_count,
        last_message: g.last_message,
        last_message_at: g.last_message_at,
        created_at: g.created_at,
        updated_at: g.updated_at
      }))
    });
  } catch (error) {
    console.error('Error fetching user groups:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch groups' });
  }
};

/**
 * Get group details with members
 * GET /api/group-management/:groupId
 */
export const getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Verify user is member
    const [[membership]] = await db.query(
      'SELECT is_admin FROM group_members WHERE group_id = ? AND user_id = ? AND removed_at IS NULL',
      [groupId, userId]
    );

    if (!membership) {
      return res.status(403).json({ success: false, message: 'Not a member of this group' });
    }

    // Get group details
    const [[group]] = await db.query(
      `SELECT 
        id, name, description, created_by_id, 
        member_count, created_at, updated_at
       FROM chat_groups WHERE id = ? AND deleted_at IS NULL`,
      [groupId]
    );

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Get all members
    const [members] = await db.query(
      `SELECT 
        u.id, u.first_name, u.last_name, u.email, u.role,
        gm.is_admin, gm.joined_at
       FROM group_members gm
       INNER JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = ? AND gm.removed_at IS NULL
       ORDER BY gm.joined_at ASC`,
      [groupId]
    );

    res.json({
      success: true,
      group: {
        ...group,
        is_user_admin: Boolean(membership.is_admin),
        members: members.map(m => ({
          id: m.id,
          first_name: m.first_name,
          last_name: m.last_name,
          email: m.email,
          role: m.role,
          is_admin: Boolean(m.is_admin),
          joined_at: m.joined_at
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching group details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch group details' });
  }
};

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

    // Validate all member IDs
    const staticIds = [...new Set(member_ids.map(id => {
      const num = Number(id);
      return Number.isInteger(num) && num > 0 ? num : null;
    }).filter(id => id !== null))];

    // Prevent empty IN clause (SQL error)
    if (staticIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid member IDs provided',
        details: 'All provided member IDs were invalid'
      });
    }

    const [validMembers] = await db.query(
      `SELECT id FROM users WHERE id IN (${staticIds.map(() => '?').join(',')}) 
       AND school_id = ? AND is_active = TRUE`,
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

    // Check existing members (only active members, not removed ones)
    if (validIds.length === 0) {
      return res.json({ success: true, added_count: 0, failed: [] });
    }
    
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

    const actorName = await getUserDisplayName(userId);

    // Add new members (or restore previously removed members)
    for (const memberId of newMemberIds) {
      const memberName = await getUserDisplayName(memberId);
      const [[removed]] = await db.query(
        'SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND removed_at IS NOT NULL',
        [groupId, memberId]
      );

      if (removed) {
        await db.query(
          'UPDATE group_members SET removed_at = NULL, is_admin = 0 WHERE group_id = ? AND user_id = ?',
          [groupId, memberId]
        );
      } else {
        await db.query(
          'INSERT INTO group_members (group_id, user_id, is_admin) VALUES (?, ?, 0)',
          [groupId, memberId]
        );
      }

      await db.query(
        `INSERT INTO user_notifications (recipient_user_id, type, title, message, entity_type, entity_id)
         VALUES (?, 'group_added', 'Added to Group', ?, 'group', ?)`,
        [memberId, `You were added to "${group.name}"`, groupId]
      );

      await createSystemGroupMessage(
        groupId,
        userId,
        `${actorName} added ${memberName} to the group`
      );
    }

    // Log action
    await db.query(
      `INSERT INTO group_activity_log (group_id, action_type, performed_by_id, metadata)
       VALUES (?, 'member_added', ?, JSON_OBJECT('count', ?))`,
      [groupId, userId, newMemberIds.length]
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
    console.error('Error adding members:', error);
    res.status(500).json({ success: false, message: 'Failed to add members' });
  }
};

/**
 * Remove member from group
 * POST /api/group-management/:groupId/remove-member/:memberId
 */
export const removeMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user.id;

    // Verify requester is admin
    const [[admin]] = await db.query(
      'SELECT is_admin FROM group_members WHERE group_id = ? AND user_id = ? AND removed_at IS NULL',
      [groupId, userId]
    );

    if (!admin || !admin.is_admin) {
      return res.status(403).json({ success: false, message: 'Only group admins can remove members' });
    }

    // Verify member exists
    const [[member]] = await db.query(
      'SELECT is_admin FROM group_members WHERE group_id = ? AND user_id = ? AND removed_at IS NULL',
      [groupId, memberId]
    );

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found in group' });
    }

    const memberName = await getUserDisplayName(memberId);

    // Mark as removed
    await db.query(
      'UPDATE group_members SET removed_at = NOW() WHERE group_id = ? AND user_id = ?',
      [groupId, memberId]
    );

    // Check if there are any admins left
    const [[adminCount]] = await db.query(
      'SELECT COUNT(*) as count FROM group_members WHERE group_id = ? AND is_admin = 1 AND removed_at IS NULL',
      [groupId]
    );

    // Auto-promote oldest member if no admins remain
    if (adminCount.count === 0) {
      const [[newAdmin]] = await db.query(
        `SELECT gm.id FROM group_members gm
         WHERE gm.group_id = ? AND gm.removed_at IS NULL
         ORDER BY gm.joined_at ASC LIMIT 1`,
        [groupId]
      );

      if (newAdmin) {
        await db.query(
          'UPDATE group_members SET is_admin = 1 WHERE id = ?',
          [newAdmin.id]
        );

        await db.query(
          `INSERT INTO group_activity_log (group_id, action_type, performed_by_id, target_user_id, metadata)
           VALUES (?, 'admin_auto_promoted', ?, (SELECT user_id FROM group_members WHERE id = ?), JSON_OBJECT('reason', 'auto-promote_no_admin'))`,
          [groupId, userId, newAdmin.id]
        );
      }
    }

    await db.query(
      `INSERT INTO user_notifications (recipient_user_id, type, title, message, entity_type, entity_id)
       VALUES (?, 'group_removed', 'Removed from Group', 'You have been removed from a group', 'group', ?)`,
      [memberId, groupId]
    );

    await db.query(
      `INSERT INTO group_activity_log (group_id, action_type, performed_by_id, target_user_id)
       VALUES (?, 'member_removed', ?, ?)`,
      [groupId, userId, memberId]
    );

    await createSystemGroupMessage(
      groupId,
      userId,
      `${memberName} was removed from the group`
    );

    await db.query(
      `UPDATE chat_groups SET member_count = (
        SELECT COUNT(*) FROM group_members WHERE group_id = ? AND removed_at IS NULL
      ) WHERE id = ?`,
      [groupId, groupId]
    );

    res.json({ success: true, message: 'Member removed from group' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ success: false, message: 'Failed to remove member' });
  }
};

/**
 * Promote member to admin
 * POST /api/group-management/:groupId/make-admin/:memberId
 */
export const makeAdmin = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user.id;

    // Verify requester is admin
    const [[admin]] = await db.query(
      'SELECT is_admin FROM group_members WHERE group_id = ? AND user_id = ? AND removed_at IS NULL',
      [groupId, userId]
    );

    if (!admin || !admin.is_admin) {
      return res.status(403).json({ success: false, message: 'Only group admins can manage roles' });
    }

    // Verify member exists and is not already admin
    const [[member]] = await db.query(
      'SELECT is_admin FROM group_members WHERE group_id = ? AND user_id = ? AND removed_at IS NULL',
      [groupId, memberId]
    );

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    if (member.is_admin) {
      return res.status(400).json({ success: false, message: 'Member is already an admin' });
    }

    const memberName = await getUserDisplayName(memberId);

    // Promote to admin
    await db.query(
      'UPDATE group_members SET is_admin = 1 WHERE group_id = ? AND user_id = ?',
      [groupId, memberId]
    );

    // Log action
    await db.query(
      `INSERT INTO group_activity_log (group_id, action_type, performed_by_id, target_user_id)
       VALUES (?, 'admin_promoted', ?, ?)`,
      [groupId, userId, memberId]
    );

    // Notification
    await db.query(
      `INSERT INTO user_notifications (recipient_user_id, type, title, message, entity_type, entity_id)
       VALUES (?, 'admin_promoted', 'Promoted to Admin', 'You are now an admin of a group', 'group', ?)`,
      [memberId, groupId]
    );

    await createSystemGroupMessage(
      groupId,
      userId,
      `${memberName} is now an admin`
    );

    res.json({ success: true, message: 'Member promoted to admin' });
  } catch (error) {
    console.error('Error making admin:', error);
    res.status(500).json({ success: false, message: 'Failed to promote member' });
  }
};

/**
 * Demote admin to member
 * POST /api/group-management/:groupId/remove-admin/:memberId
 */
export const removeAdmin = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user.id;

    // Verify requester is admin
    const [[admin]] = await db.query(
      'SELECT is_admin FROM group_members WHERE group_id = ? AND user_id = ? AND removed_at IS NULL',
      [groupId, userId]
    );

    if (!admin || !admin.is_admin) {
      return res.status(403).json({ success: false, message: 'Only group admins can manage roles' });
    }

    // Verify member exists and is admin
    const [[member]] = await db.query(
      'SELECT is_admin FROM group_members WHERE group_id = ? AND user_id = ? AND removed_at IS NULL',
      [groupId, memberId]
    );

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    if (!member.is_admin) {
      return res.status(400).json({ success: false, message: 'Member is not an admin' });
    }

    // Check if this is the last admin
    const [[adminCount]] = await db.query(
      'SELECT COUNT(*) as count FROM group_members WHERE group_id = ? AND is_admin = 1 AND removed_at IS NULL',
      [groupId]
    );

    if (adminCount.count === 1) {
      return res.status(400).json({ success: false, message: 'Cannot remove the last admin from the group' });
    }

    const memberName = await getUserDisplayName(memberId);

    // Demote to member
    await db.query(
      'UPDATE group_members SET is_admin = 0 WHERE group_id = ? AND user_id = ?',
      [groupId, memberId]
    );

    // Log action
    await db.query(
      `INSERT INTO group_activity_log (group_id, action_type, performed_by_id, target_user_id)
       VALUES (?, 'admin_demoted', ?, ?)`,
      [groupId, userId, memberId]
    );

    // Notification
    await db.query(
      `INSERT INTO user_notifications (recipient_user_id, type, title, message, entity_type, entity_id)
       VALUES (?, 'admin_removed', 'Admin Role Removed', 'You are no longer an admin of a group', 'group', ?)`,
      [memberId, groupId]
    );

    await createSystemGroupMessage(
      groupId,
      userId,
      `Admin role removed from ${memberName}`
    );

    res.json({ success: true, message: 'Admin role removed' });
  } catch (error) {
    console.error('Error removing admin:', error);
    res.status(500).json({ success: false, message: 'Failed to remove admin role' });
  }
};

/**
 * Rename group
 * PUT /api/group-management/:groupId/rename
 */
export const renameGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name } = req.body;
    const userId = req.user.id;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Group name is required' });
    }

    if (name.trim().length > 255) {
      return res.status(400).json({ success: false, message: 'Group name exceeds 255 characters' });
    }

    // Verify admin
    const [[admin]] = await db.query(
      'SELECT is_admin FROM group_members WHERE group_id = ? AND user_id = ? AND removed_at IS NULL',
      [groupId, userId]
    );

    if (!admin || !admin.is_admin) {
      return res.status(403).json({ success: false, message: 'Only group admins can rename group' });
    }

    // Get group and school
    const [[group]] = await db.query(
      'SELECT id, name as old_name, school_id FROM chat_groups WHERE id = ? AND deleted_at IS NULL',
      [groupId]
    );

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check unique name in school
    const [[existing]] = await db.query(
      'SELECT id FROM chat_groups WHERE school_id = ? AND name = ? AND id != ? AND deleted_at IS NULL',
      [group.school_id, name.trim(), groupId]
    );

    if (existing) {
      return res.status(400).json({ success: false, message: 'Group name already exists in your school' });
    }

    // Update group name
    await db.query(
      'UPDATE chat_groups SET name = ? WHERE id = ?',
      [name.trim(), groupId]
    );

    // Log action
    await db.query(
      `INSERT INTO group_activity_log (group_id, action_type, performed_by_id, metadata)
       VALUES (?, 'group_renamed', ?, JSON_OBJECT('old_name', ?, 'new_name', ?))`,
      [groupId, userId, group.old_name, name.trim()]
    );

    res.json({
      success: true,
      group: {
        id: groupId,
        name: name.trim()
      }
    });
  } catch (error) {
    console.error('Error renaming group:', error);
    res.status(500).json({ success: false, message: 'Failed to rename group' });
  }
};

/**
 * Delete group (soft delete)
 * DELETE /api/group-management/:groupId
 */
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Verify admin
    const [[admin]] = await db.query(
      'SELECT is_admin FROM group_members WHERE group_id = ? AND user_id = ? AND removed_at IS NULL',
      [groupId, userId]
    );

    if (!admin || !admin.is_admin) {
      return res.status(403).json({ success: false, message: 'Only group admins can delete group' });
    }

    // Verify group exists
    const [[group]] = await db.query(
      'SELECT id, name FROM chat_groups WHERE id = ? AND deleted_at IS NULL',
      [groupId]
    );

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Soft delete
    await db.query(
      'UPDATE chat_groups SET deleted_at = NOW() WHERE id = ?',
      [groupId]
    );

    // Log action
    await db.query(
      `INSERT INTO group_activity_log (group_id, action_type, performed_by_id)
       VALUES (?, 'group_deleted', ?)`,
      [groupId, userId]
    );

    // Notify all members
    const [members] = await db.query(
      'SELECT user_id FROM group_members WHERE group_id = ? AND removed_at IS NULL',
      [groupId]
    );

    for (const member of members) {
      await db.query(
        `INSERT INTO user_notifications (recipient_user_id, type, title, message, entity_type, entity_id)
         VALUES (?, 'group_deleted', 'Group Deleted', ?, 'group', ?)`,
        [member.user_id, `The group "${group.name}" has been deleted`, groupId]
      );
    }

    res.json({ success: true, message: 'Group deleted' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ success: false, message: 'Failed to delete group' });
  }
};

export default {
  createGroup,
  getMyGroups,
  getGroupDetails,
  addMembers,
  removeMember,
  makeAdmin,
  removeAdmin,
  renameGroup,
  deleteGroup
};
