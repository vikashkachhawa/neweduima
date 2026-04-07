import db from '../config/database.js';

const MAX_INTERESTS = 15;

const normalizeInterestTags = (tags) => {
  if (!Array.isArray(tags)) {
    return [];
  }

  const normalized = tags
    .map((tag) => String(tag || '').trim().toLowerCase())
    .filter(Boolean)
    .slice(0, MAX_INTERESTS);

  return [...new Set(normalized)];
};

const parseTags = (raw) => {
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return normalizeInterestTags(raw);
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return normalizeInterestTags(parsed);
      }
    } catch (error) {
      return normalizeInterestTags(raw.split(','));
    }
  }

  return [];
};

const getUserInterestSet = async (userId) => {
  const [[interestRow]] = await db.query(
    'SELECT profile_interests FROM users WHERE id = ? LIMIT 1',
    [userId]
  );

  const tags = parseTags(interestRow?.profile_interests);
  return new Set(tags);
};

const withAuthor = (row) => ({
  ...row,
  interest_tags: parseTags(row.interest_tags),
  author_name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'User'
});

export const getMyInterests = async (req, res) => {
  try {
    const [[row]] = await db.query(
      'SELECT profile_interests FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    return res.json({
      success: true,
      interests: parseTags(row?.profile_interests)
    });
  } catch (error) {
    console.error('Get forum interests error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch interests' });
  }
};

export const updateMyInterests = async (req, res) => {
  try {
    const interests = normalizeInterestTags(req.body?.interests);

    if (interests.length === 0) {
      return res.status(400).json({ success: false, message: 'Please add at least one interest' });
    }

    await db.query(
      'UPDATE users SET profile_interests = ? WHERE id = ?',
      [JSON.stringify(interests), req.user.id]
    );

    return res.json({
      success: true,
      message: 'Interests updated successfully',
      interests
    });
  } catch (error) {
    console.error('Update forum interests error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update interests' });
  }
};

export const createQuestion = async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim();
    const questionText = String(req.body?.question || '').trim();
    let tags = normalizeInterestTags(req.body?.interests);

    if (!title || !questionText) {
      return res.status(400).json({ success: false, message: 'Title and question are required' });
    }

    if (title.length > 255) {
      return res.status(400).json({ success: false, message: 'Title cannot exceed 255 characters' });
    }

    if (questionText.length < 10) {
      return res.status(400).json({ success: false, message: 'Question should be at least 10 characters' });
    }

    if (tags.length === 0) {
      const interestSet = await getUserInterestSet(req.user.id);
      tags = [...interestSet].slice(0, MAX_INTERESTS);
    }

    if (tags.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Add at least one interest in profile or while posting question'
      });
    }

    const [result] = await db.query(
      `INSERT INTO forum_questions (author_user_id, school_id, title, question_text, interest_tags)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, req.user.school_id || null, title, questionText, JSON.stringify(tags)]
    );

    return res.status(201).json({
      success: true,
      message: 'Question posted successfully',
      questionId: result.insertId
    });
  } catch (error) {
    console.error('Create forum question error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create question' });
  }
};

export const listQuestions = async (req, res) => {
  try {
    const q = String(req.query?.q || '').trim().toLowerCase();
    const limit = Math.min(Math.max(Number(req.query?.limit || 20), 1), 50);

    const [rows] = await db.query(
      `SELECT
         fq.id,
         fq.author_user_id,
         fq.school_id,
         fq.title,
         fq.question_text,
         fq.interest_tags,
         fq.replies_count,
         COALESCE(fq.helpful_count, 0) AS helpful_count,
         fq.created_at,
         u.first_name,
         u.last_name,
         u.role,
         s.name AS school_name
       FROM forum_questions fq
       INNER JOIN users u ON u.id = fq.author_user_id
       LEFT JOIN schools s ON s.id = fq.school_id
       WHERE fq.is_active = TRUE
       ORDER BY fq.created_at DESC
       LIMIT ?`,
      [limit]
    );

    const filtered = rows
      .map(withAuthor)
      .filter((question) => {
        if (!q) {
          return true;
        }

        const haystack = `${question.title} ${question.question_text} ${question.interest_tags.join(' ')}`.toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, limit);

    return res.json({
      success: true,
      questions: filtered,
      myInterests: []
    });
  } catch (error) {
    console.error('List forum questions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch forum questions' });
  }
};

export const getQuestion = async (req, res) => {
  try {
    const questionId = Number(req.params.questionId);

    const [[question]] = await db.query(
      `SELECT
         fq.id,
         fq.author_user_id,
         fq.school_id,
         fq.title,
         fq.question_text,
         fq.interest_tags,
         fq.replies_count,
         COALESCE(fq.helpful_count, 0) AS helpful_count,
         fq.created_at,
         u.first_name,
         u.last_name,
         u.role,
         s.name AS school_name
       FROM forum_questions fq
       INNER JOIN users u ON u.id = fq.author_user_id
       LEFT JOIN schools s ON s.id = fq.school_id
       WHERE fq.id = ? AND fq.is_active = TRUE
       LIMIT 1`,
      [questionId]
    );

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const [[helpful]] = await db.query(
      `SELECT id FROM forum_helpful WHERE user_id = ? AND target_type = 'question' AND target_id = ? LIMIT 1`,
      [req.user.id, questionId]
    );

    return res.json({
      success: true,
      ...withAuthor(question),
      user_marked_helpful: !!helpful
    });
  } catch (error) {
    console.error('Get forum question error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch question' });
  }
};

export const getQuestionReplies = async (req, res) => {
  try {
    const questionId = Number(req.params.questionId);

    const [[question]] = await db.query(
      'SELECT id FROM forum_questions WHERE id = ? AND is_active = TRUE LIMIT 1',
      [questionId]
    );

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const [rows] = await db.query(
      `SELECT
         fr.id,
         fr.question_id,
         fr.author_user_id,
         fr.parent_reply_id,
         fr.reply_text,
         COALESCE(fr.helpful_count, 0) AS helpful_count,
         fr.created_at,
         u.first_name,
         u.last_name,
         u.role
       FROM forum_replies fr
       INNER JOIN users u ON u.id = fr.author_user_id
       WHERE fr.question_id = ? AND fr.is_active = TRUE
       ORDER BY fr.created_at ASC`,
      [questionId]
    );

    const repliesWithAuthors = rows.map((row) => ({
      ...row,
      author_name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'User'
    }));

    // Attach user_marked_helpful to each reply
    const replyIds = repliesWithAuthors.map((r) => r.id);
    let markedSet = new Set();
    if (replyIds.length > 0) {
      const [markedRows] = await db.query(
        `SELECT target_id FROM forum_helpful WHERE user_id = ? AND target_type = 'reply' AND target_id IN (${replyIds.map(() => '?').join(',')})`,
        [req.user.id, ...replyIds]
      );
      markedSet = new Set(markedRows.map((r) => r.target_id));
    }

    const replies = repliesWithAuthors.map((r) => ({ ...r, user_marked_helpful: markedSet.has(r.id) }));

    return res.json({ success: true, replies });
  } catch (error) {
    console.error('Get forum replies error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch replies' });
  }
};

export const createReply = async (req, res) => {
  try {
    const questionId = Number(req.params.questionId);
    const replyText = String(req.body?.reply || '').trim();
    const parentReplyId = req.body?.parentReplyId ? Number(req.body.parentReplyId) : null;

    if (!replyText) {
      return res.status(400).json({ success: false, message: 'Reply is required' });
    }

    const [[question]] = await db.query(
      'SELECT id FROM forum_questions WHERE id = ? AND is_active = TRUE LIMIT 1',
      [questionId]
    );

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    if (parentReplyId) {
      const [[parentReply]] = await db.query(
        `SELECT id FROM forum_replies
         WHERE id = ? AND question_id = ? AND is_active = TRUE LIMIT 1`,
        [parentReplyId, questionId]
      );

      if (!parentReply) {
        return res.status(400).json({ success: false, message: 'Parent reply not found for this question' });
      }
    }

    await db.query(
      `INSERT INTO forum_replies (question_id, author_user_id, parent_reply_id, reply_text)
       VALUES (?, ?, ?, ?)`,
      [questionId, req.user.id, parentReplyId, replyText]
    );

    await db.query(
      'UPDATE forum_questions SET replies_count = replies_count + 1 WHERE id = ?',
      [questionId]
    );

    return res.status(201).json({ success: true, message: 'Reply posted successfully' });
  } catch (error) {
    console.error('Create forum reply error:', error);
    return res.status(500).json({ success: false, message: 'Failed to post reply' });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const questionId = Number(req.params.questionId);

    const [[question]] = await db.query(
      'SELECT author_user_id FROM forum_questions WHERE id = ? LIMIT 1',
      [questionId]
    );

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    if (question.author_user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the author can delete this question' });
    }

    await db.query(
      'UPDATE forum_questions SET is_active = FALSE WHERE id = ?',
      [questionId]
    );

    return res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete forum question error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete question' });
  }
};

export const deleteReply = async (req, res) => {
  try {
    const replyId = Number(req.params.replyId);

    const [[reply]] = await db.query(
      'SELECT author_user_id, question_id FROM forum_replies WHERE id = ? LIMIT 1',
      [replyId]
    );

    if (!reply) {
      return res.status(404).json({ success: false, message: 'Reply not found' });
    }

    if (reply.author_user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the author can delete this reply' });
    }

    await db.query(
      'UPDATE forum_replies SET is_active = FALSE WHERE id = ?',
      [replyId]
    );

    await db.query(
      'UPDATE forum_questions SET replies_count = GREATEST(replies_count - 1, 0) WHERE id = ?',
      [reply.question_id]
    );

    return res.json({ success: true, message: 'Reply deleted successfully' });
  } catch (error) {
    console.error('Delete forum reply error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete reply' });
  }
};

export const markQuestionHelpful = async (req, res) => {
  try {
    const questionId = Number(req.params.questionId);
    const userId = req.user.id;

    const [[question]] = await db.query(
      'SELECT id FROM forum_questions WHERE id = ? AND is_active = TRUE LIMIT 1',
      [questionId]
    );

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const [[existing]] = await db.query(
      `SELECT id FROM forum_helpful WHERE user_id = ? AND target_type = 'question' AND target_id = ? LIMIT 1`,
      [userId, questionId]
    );

    if (existing) {
      await db.query('DELETE FROM forum_helpful WHERE id = ?', [existing.id]);
      await db.query(
        'UPDATE forum_questions SET helpful_count = GREATEST(COALESCE(helpful_count, 0) - 1, 0) WHERE id = ?',
        [questionId]
      );
    } else {
      await db.query(
        `INSERT INTO forum_helpful (user_id, target_type, target_id) VALUES (?, 'question', ?)`,
        [userId, questionId]
      );
      await db.query(
        'UPDATE forum_questions SET helpful_count = COALESCE(helpful_count, 0) + 1 WHERE id = ?',
        [questionId]
      );
    }

    const [[updated]] = await db.query(
      'SELECT COALESCE(helpful_count, 0) AS helpful_count FROM forum_questions WHERE id = ?',
      [questionId]
    );

    return res.json({ success: true, helpful_count: updated.helpful_count, user_marked: !existing });
  } catch (error) {
    console.error('Mark question helpful error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark as helpful' });
  }
};

export const markReplyHelpful = async (req, res) => {
  try {
    const replyId = Number(req.params.replyId);
    const userId = req.user.id;

    const [[reply]] = await db.query(
      'SELECT id FROM forum_replies WHERE id = ? AND is_active = TRUE LIMIT 1',
      [replyId]
    );

    if (!reply) {
      return res.status(404).json({ success: false, message: 'Reply not found' });
    }

    const [[existing]] = await db.query(
      `SELECT id FROM forum_helpful WHERE user_id = ? AND target_type = 'reply' AND target_id = ? LIMIT 1`,
      [userId, replyId]
    );

    if (existing) {
      await db.query('DELETE FROM forum_helpful WHERE id = ?', [existing.id]);
      await db.query(
        'UPDATE forum_replies SET helpful_count = GREATEST(COALESCE(helpful_count, 0) - 1, 0) WHERE id = ?',
        [replyId]
      );
    } else {
      await db.query(
        `INSERT INTO forum_helpful (user_id, target_type, target_id) VALUES (?, 'reply', ?)`,
        [userId, replyId]
      );
      await db.query(
        'UPDATE forum_replies SET helpful_count = COALESCE(helpful_count, 0) + 1 WHERE id = ?',
        [replyId]
      );
    }

    const [[updated]] = await db.query(
      'SELECT COALESCE(helpful_count, 0) AS helpful_count FROM forum_replies WHERE id = ?',
      [replyId]
    );

    return res.json({ success: true, helpful_count: updated.helpful_count, user_marked: !existing });
  } catch (error) {
    console.error('Mark reply helpful error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark as helpful' });
  }
};