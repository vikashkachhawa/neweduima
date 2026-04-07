import db from '../config/database.js';
import Notification from '../models/Notification.js';

const getUserIdentity = async (userId) => {
  if (!userId) {
    return null;
  }

  const [[user]] = await db.query(
    `SELECT id, first_name, last_name, role, school_id
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );

  return user || null;
};

const getUserDisplayName = (user) => {
  if (!user) {
    return 'Someone';
  }

  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return name || user.role || 'Someone';
};

const notifyUser = async ({ recipientUserId, actorUserId = null, type, title, message, entityType = null, entityId = null, metadata = null }) => {
  if (!recipientUserId) {
    return;
  }

  if (actorUserId && Number(recipientUserId) === Number(actorUserId)) {
    return;
  }

  await Notification.create({ recipientUserId, actorUserId, type, title, message, entityType, entityId, metadata });
};

const notifyUsers = async ({ recipientUserIds, actorUserId = null, type, title, message, entityType = null, entityId = null, metadata = null }) => {
  const uniqueRecipientIds = [...new Set((recipientUserIds || []).filter(Boolean).map(Number))];

  for (const recipientUserId of uniqueRecipientIds) {
    await notifyUser({ recipientUserId, actorUserId, type, title, message, entityType, entityId, metadata });
  }
};

const getSchoolAdminIds = async (schoolId) => {
  if (!schoolId) {
    return [];
  }

  const [rows] = await db.query(
    `SELECT id
     FROM users
     WHERE school_id = ? AND role = 'school_admin' AND is_active = TRUE`,
    [schoolId]
  );

  return rows.map((row) => row.id);
};

export const createConnectionRequestNotification = async (recipientUserId, requesterUserId) => {
  const requester = await getUserIdentity(requesterUserId);
  const requesterName = getUserDisplayName(requester);

  await notifyUser({
    recipientUserId,
    actorUserId: requesterUserId,
    type: 'connection_request',
    title: 'New connection request',
    message: `${requesterName} sent you a connection request.`,
    entityType: 'social_connection',
    entityId: requesterUserId,
    metadata: { path: '/social-hub' }
  });
};

export const createFacultyFollowRequestNotification = async (facultyUserId, requesterUserId) => {
  const requester = await getUserIdentity(requesterUserId);
  const requesterName = getUserDisplayName(requester);

  await notifyUser({
    recipientUserId: facultyUserId,
    actorUserId: requesterUserId,
    type: 'incoming_request',
    title: 'New profile follow request',
    message: `${requesterName} requested to follow your profile.`,
    entityType: 'faculty_profile',
    entityId: facultyUserId,
    metadata: { path: `/faculty/profile/${facultyUserId}` }
  });
};

export const createPostLikeNotification = async ({ recipientUserId, actorUserId, entityType, entityId, path }) => {
  const actor = await getUserIdentity(actorUserId);
  const actorName = getUserDisplayName(actor);

  await notifyUser({
    recipientUserId,
    actorUserId,
    type: 'post_like',
    title: 'New post like',
    message: `${actorName} liked your post.`,
    entityType,
    entityId,
    metadata: path ? { path } : null
  });
};

export const createPostCommentNotification = async ({ recipientUserId, actorUserId = null, actorName = null, entityType, entityId, path }) => {
  const actor = actorUserId ? await getUserIdentity(actorUserId) : null;
  const displayName = actorName || getUserDisplayName(actor);

  await notifyUser({
    recipientUserId,
    actorUserId,
    type: 'post_comment',
    title: 'New post comment',
    message: `${displayName} commented on your post.`,
    entityType,
    entityId,
    metadata: path ? { path } : null
  });
};

export const createFacultyProfileVisitNotification = async (facultyUserId, visitorUserId) => {
  const visitor = await getUserIdentity(visitorUserId);
  const visitorName = getUserDisplayName(visitor);

  const duplicateExists = await Notification.existsRecentDuplicate({
    recipientUserId: facultyUserId,
    actorUserId: visitorUserId,
    type: 'profile_visit',
    entityType: 'faculty_profile',
    entityId: facultyUserId,
    hours: 12
  });

  if (duplicateExists) {
    return;
  }

  await notifyUser({
    recipientUserId: facultyUserId,
    actorUserId: visitorUserId,
    type: 'profile_visit',
    title: 'Profile visited',
    message: `${visitorName} visited your profile.`,
    entityType: 'faculty_profile',
    entityId: facultyUserId,
    metadata: { path: `/faculty/profile/${facultyUserId}` }
  });
};

export const createSchoolProfileVisitNotification = async (schoolId, visitorUserId) => {
  const recipientUserIds = await getSchoolAdminIds(schoolId);
  if (!recipientUserIds.length) {
    return;
  }

  const visitor = await getUserIdentity(visitorUserId);
  const visitorName = getUserDisplayName(visitor);

  const filteredRecipients = [];
  for (const recipientUserId of recipientUserIds) {
    const duplicateExists = await Notification.existsRecentDuplicate({
      recipientUserId,
      actorUserId: visitorUserId,
      type: 'profile_visit',
      entityType: 'school_profile',
      entityId: schoolId,
      hours: 12
    });

    if (!duplicateExists) {
      filteredRecipients.push(recipientUserId);
    }
  }

  await notifyUsers({
    recipientUserIds: filteredRecipients,
    actorUserId: visitorUserId,
    type: 'profile_visit',
    title: 'School page visited',
    message: `${visitorName} visited your school page.`,
    entityType: 'school_profile',
    entityId: schoolId,
    metadata: { path: `/school-page/${schoolId}` }
  });
};

export default {
  createConnectionRequestNotification,
  createFacultyFollowRequestNotification,
  createPostLikeNotification,
  createPostCommentNotification,
  createFacultyProfileVisitNotification,
  createSchoolProfileVisitNotification
};