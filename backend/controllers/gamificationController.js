import db from '../config/database.js';

// ── Level config ─────────────────────────────────────────────────────────────
const LEVEL_CONFIG = [
  { level: 1,  title: 'Novice',    minXp: 0     },
  { level: 2,  title: 'Beginner',  minXp: 100   },
  { level: 3,  title: 'Learner',   minXp: 250   },
  { level: 4,  title: 'Explorer',  minXp: 500   },
  { level: 5,  title: 'Thinker',   minXp: 800   },
  { level: 6,  title: 'Scholar',   minXp: 1200  },
  { level: 7,  title: 'Expert',    minXp: 1800  },
  { level: 8,  title: 'Elite',     minXp: 2600  },
  { level: 9,  title: 'Master',    minXp: 3600  },
  { level: 10, title: 'Legend',    minXp: 5000  },
];

const calculateLevel = (totalXp) => {
  let current = LEVEL_CONFIG[0];
  for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_CONFIG[i].minXp) { current = LEVEL_CONFIG[i]; break; }
  }
  const next = LEVEL_CONFIG.find(l => l.level === current.level + 1);
  return {
    level: current.level,
    title: current.title,
    currentLevelXp: current.minXp,
    nextLevelXp:    next?.minXp ?? null,
    xpInLevel:      totalXp - current.minXp,
    xpNeeded:       next ? next.minXp - current.minXp : null,
  };
};

// ── Ensure today's daily challenges exist ────────────────────────────────────
const ensureDailyChallenges = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const [[{ c }]] = await db.query(
    'SELECT COUNT(*) as c FROM fun_daily_challenges WHERE challenge_date = ?', [today]
  );
  if (c >= 3) return;

  const [games] = await db.query('SELECT * FROM fun_games WHERE is_active = TRUE');
  for (const category of ['math', 'logic', 'coding']) {
    const game = games.find(g => g.category === category);
    if (!game) continue;
    await db.query(
      `INSERT IGNORE INTO fun_daily_challenges (challenge_date, game_id, level_name, category, bonus_xp)
       VALUES (?, ?, 'basic', ?, 20)`,
      [today, game.id, category]
    );
  }
};

// ── Achievement checker ──────────────────────────────────────────────────────
const checkAndAwardAchievements = async (studentId) => {
  const [allAchievements]  = await db.query('SELECT * FROM fun_achievements');
  const [[xpRow]]          = await db.query('SELECT * FROM fun_student_xp WHERE student_id = ?', [studentId]);
  const [[{ gamesCompleted }]] = await db.query(
    'SELECT COUNT(*) as gamesCompleted FROM fun_student_progress WHERE student_id = ? AND completed = TRUE',
    [studentId]
  );
  const [earned] = await db.query(
    'SELECT achievement_id FROM fun_student_achievements WHERE student_id = ?', [studentId]
  );
  const earnedSet = new Set(earned.map(e => e.achievement_id));

  const newOnes = [];
  for (const ach of allAchievements) {
    if (earnedSet.has(ach.id)) continue;
    let unlocked = false;

    switch (ach.trigger_type) {
      case 'first_game':
        unlocked = gamesCompleted >= 1; break;
      case 'games_completed':
        unlocked = gamesCompleted >= ach.trigger_value; break;
      case 'xp_milestone':
        unlocked = (xpRow?.total_xp || 0) >= ach.trigger_value; break;
      case 'streak':
        unlocked = (xpRow?.current_streak || 0) >= ach.trigger_value; break;
      case 'category_mastery': {
        const [[{ cnt }]] = await db.query(
          `SELECT COUNT(*) as cnt FROM fun_student_progress sp
           JOIN fun_games g ON sp.game_id = g.id
           WHERE sp.student_id = ? AND sp.completed = TRUE
             AND sp.level_name = 'advanced' AND g.category = ?`,
          [studentId, ach.trigger_category]
        );
        unlocked = cnt >= ach.trigger_value; break;
      }
    }

    if (unlocked) {
      await db.query(
        'INSERT IGNORE INTO fun_student_achievements (student_id, achievement_id) VALUES (?, ?)',
        [studentId, ach.id]
      );
      newOnes.push(ach);
    }
  }
  return newOnes;
};

// ── Controllers ──────────────────────────────────────────────────────────────

export const getStudentStats = async (req, res) => {
  try {
    const studentId = req.user.id;
    const [[xpData]] = await db.query(
      'SELECT * FROM fun_student_xp WHERE student_id = ?', [studentId]
    );
    const totalXp = xpData?.total_xp || 0;

    const [recentAchievements] = await db.query(
      `SELECT a.*, sa.earned_at
       FROM fun_student_achievements sa
       JOIN fun_achievements a ON sa.achievement_id = a.id
       WHERE sa.student_id = ?
       ORDER BY sa.earned_at DESC LIMIT 4`,
      [studentId]
    );

    const [progress] = await db.query(
      `SELECT sp.*, g.slug, g.category, g.name as game_name
       FROM fun_student_progress sp
       JOIN fun_games g ON sp.game_id = g.id
       WHERE sp.student_id = ?`,
      [studentId]
    );

    res.json({
      success: true,
      stats: {
        totalXp,
        weeklyXp:      xpData?.weekly_xp      || 0,
        monthlyXp:     xpData?.monthly_xp     || 0,
        currentStreak: xpData?.current_streak || 0,
        longestStreak: xpData?.longest_streak || 0,
        ...calculateLevel(totalXp),
      },
      recentAchievements,
      progress,
    });
  } catch (err) {
    console.error('getStudentStats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getGames = async (req, res) => {
  try {
    const studentId = req.user.id;
    const [games] = await db.query('SELECT * FROM fun_games WHERE is_active = TRUE ORDER BY id');
    const [progress] = await db.query(
      'SELECT * FROM fun_student_progress WHERE student_id = ?', [studentId]
    );

    const progressMap = {};
    for (const p of progress) {
      if (!progressMap[p.game_id]) progressMap[p.game_id] = {};
      progressMap[p.game_id][p.level_name] = p;
    }

    const gamesWithProgress = games.map(g => ({
      ...g,
      progress: progressMap[g.id] || {},
    }));

    res.json({ success: true, games: gamesWithProgress });
  } catch (err) {
    console.error('getGames error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const submitScore = async (req, res) => {
  try {
    const { gameId, level, score, timeSpent } = req.body;
    const studentId = req.user.id;

    // Input validation
    if (!['basic', 'intermediate', 'advanced'].includes(level))
      return res.status(400).json({ success: false, message: 'Invalid level' });
    if (typeof score !== 'number' || score < 0 || score > 100)
      return res.status(400).json({ success: false, message: 'Invalid score' });
    if (!timeSpent || timeSpent < 3)
      return res.status(400).json({ success: false, message: 'Invalid time spent' });

    const [[game]] = await db.query('SELECT * FROM fun_games WHERE id = ?', [gameId]);
    if (!game) return res.status(404).json({ success: false, message: 'Game not found' });

    // Level unlock validation
    if (level !== 'basic') {
      const prevLevel = level === 'intermediate' ? 'basic' : 'intermediate';
      const [[prev]] = await db.query(
        'SELECT completed FROM fun_student_progress WHERE student_id = ? AND game_id = ? AND level_name = ?',
        [studentId, gameId, prevLevel]
      );
      if (!prev?.completed)
        return res.status(403).json({ success: false, message: `Complete ${prevLevel} level first` });
    }

    // XP calculation
    const baseXpMap = {
      basic:        game.base_xp_basic,
      intermediate: game.base_xp_intermediate,
      advanced:     game.base_xp_advanced,
    };
    const baseXp = baseXpMap[level] || 10;
    const mult   = score >= 90 ? 1.0 : score >= 70 ? 0.75 : score >= 50 ? 0.5 : 0.25;
    const xpEarned = Math.max(1, Math.round(baseXp * mult));
    const completed = score >= 50;

    // Upsert progress
    await db.query(
      `INSERT INTO fun_student_progress
         (student_id, game_id, level_name, best_score, attempts, completed, xp_earned, time_spent_seconds, completed_at)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, IF(?, NOW(), NULL))
       ON DUPLICATE KEY UPDATE
         best_score         = GREATEST(best_score, VALUES(best_score)),
         attempts           = attempts + 1,
         completed          = completed OR VALUES(completed),
         xp_earned          = GREATEST(xp_earned, VALUES(xp_earned)),
         time_spent_seconds = time_spent_seconds + VALUES(time_spent_seconds),
         completed_at       = IF(completed = FALSE AND VALUES(completed) = TRUE, NOW(), completed_at)`,
      [studentId, gameId, level, score, completed, xpEarned, timeSpent, completed]
    );

    // Ensure student XP row
    await db.query(
      `INSERT INTO fun_student_xp (student_id) VALUES (?)
       ON DUPLICATE KEY UPDATE student_id = student_id`,
      [studentId]
    );

    // Award XP
    await db.query(
      `UPDATE fun_student_xp
       SET total_xp = total_xp + ?, weekly_xp = weekly_xp + ?, monthly_xp = monthly_xp + ?
       WHERE student_id = ?`,
      [xpEarned, xpEarned, xpEarned, studentId]
    );

    // Streak management
    const today     = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const [[xpRow]] = await db.query('SELECT * FROM fun_student_xp WHERE student_id = ?', [studentId]);

    let streakBonus = 0;
    if (xpRow.last_activity_date !== today) {
      const newStreak = xpRow.last_activity_date === yesterday
        ? (xpRow.current_streak || 0) + 1
        : 1;

      if (newStreak > 0 && newStreak % 7 === 0) {
        streakBonus = 50;
        await db.query(
          `INSERT INTO fun_xp_transactions (student_id, xp_earned, source, note)
           VALUES (?, ?, 'streak_bonus', ?)`,
          [studentId, streakBonus, `${newStreak}-day streak bonus!`]
        );
        await db.query(
          'UPDATE fun_student_xp SET total_xp = total_xp + ? WHERE student_id = ?',
          [streakBonus, studentId]
        );
      }

      await db.query(
        `UPDATE fun_student_xp
         SET current_streak = ?, longest_streak = GREATEST(longest_streak, ?), last_activity_date = ?
         WHERE student_id = ?`,
        [newStreak, newStreak, today, studentId]
      );
    }

    // Log transaction
    await db.query(
      `INSERT INTO fun_xp_transactions (student_id, xp_earned, source, reference_id, note)
       VALUES (?, ?, 'game_completion', ?, ?)`,
      [studentId, xpEarned, gameId, `${game.name} - ${level} (score: ${score})`]
    );

    // Check achievements
    const newAchievements = await checkAndAwardAchievements(studentId);

    // Return updated totals
    const [[updated]] = await db.query('SELECT * FROM fun_student_xp WHERE student_id = ?', [studentId]);
    const levelInfo = calculateLevel(updated.total_xp);

    res.json({
      success: true,
      xpEarned,
      streakBonus,
      totalXp: updated.total_xp,
      currentStreak: updated.current_streak,
      levelInfo,
      newAchievements,
      completed,
    });
  } catch (err) {
    console.error('submitScore error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    const { period = 'total' } = req.query;
    const schoolId = req.user.school_id;
    const xpField  = period === 'weekly' ? 'weekly_xp' : period === 'monthly' ? 'monthly_xp' : 'total_xp';

    const [rows] = await db.query(
      `SELECT u.id, u.first_name, u.last_name,
              x.total_xp, x.weekly_xp, x.monthly_xp, x.current_streak
       FROM fun_student_xp x
       JOIN users u ON x.student_id = u.id
       WHERE u.school_id = ? AND u.role = 'student' AND u.is_active = TRUE
       ORDER BY x.${xpField} DESC
       LIMIT 20`,
      [schoolId]
    );

    const leaderboard = rows.map((r, i) => ({
      ...r,
      rank:      i + 1,
      levelInfo: calculateLevel(r.total_xp),
      displayXp: r[xpField],
    }));

    const myRank = leaderboard.findIndex(r => r.id === req.user.id) + 1;

    res.json({ success: true, leaderboard, myRank });
  } catch (err) {
    console.error('getLeaderboard error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getDailyChallenges = async (req, res) => {
  try {
    await ensureDailyChallenges();
    const studentId = req.user.id;
    const today     = new Date().toISOString().slice(0, 10);

    const [challenges] = await db.query(
      `SELECT dc.*, g.name as game_name, g.slug as game_slug, g.icon as game_icon,
              IF(comp.id IS NOT NULL, TRUE, FALSE) as completed
       FROM fun_daily_challenges dc
       JOIN fun_games g ON dc.game_id = g.id
       LEFT JOIN fun_daily_completions comp
         ON comp.challenge_id = dc.id AND comp.student_id = ?
       WHERE dc.challenge_date = ?
       ORDER BY dc.category`,
      [studentId, today]
    );

    res.json({ success: true, challenges, date: today });
  } catch (err) {
    console.error('getDailyChallenges error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const completeDailyChallenge = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { score = 100 } = req.body;
    const studentId = req.user.id;
    const today     = new Date().toISOString().slice(0, 10);

    const [[challenge]] = await db.query(
      'SELECT * FROM fun_daily_challenges WHERE id = ? AND challenge_date = ?',
      [challengeId, today]
    );
    if (!challenge) return res.status(404).json({ success: false, message: 'Challenge not found or expired' });

    const [[existing]] = await db.query(
      'SELECT id FROM fun_daily_completions WHERE student_id = ? AND challenge_id = ?',
      [studentId, challengeId]
    );
    if (existing) return res.json({ success: true, alreadyCompleted: true, bonusXp: 0 });

    await db.query(
      'INSERT INTO fun_daily_completions (student_id, challenge_id, score) VALUES (?, ?, ?)',
      [studentId, challengeId, score]
    );

    const bonusXp = challenge.bonus_xp;
    await db.query(
      `INSERT INTO fun_student_xp (student_id, total_xp, weekly_xp, monthly_xp)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         total_xp = total_xp + ?, weekly_xp = weekly_xp + ?, monthly_xp = monthly_xp + ?`,
      [studentId, bonusXp, bonusXp, bonusXp, bonusXp, bonusXp, bonusXp]
    );

    await db.query(
      `INSERT INTO fun_xp_transactions (student_id, xp_earned, source, reference_id, note)
       VALUES (?, ?, 'daily_challenge', ?, 'Daily challenge bonus XP')`,
      [studentId, bonusXp, challengeId]
    );

    const newAchievements = await checkAndAwardAchievements(studentId);

    res.json({ success: true, bonusXp, newAchievements });
  } catch (err) {
    console.error('completeDailyChallenge error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getAchievements = async (req, res) => {
  try {
    const studentId = req.user.id;
    const [all]     = await db.query('SELECT * FROM fun_achievements ORDER BY category, slug');
    const [earned]  = await db.query(
      'SELECT achievement_id, earned_at FROM fun_student_achievements WHERE student_id = ?',
      [studentId]
    );
    const earnedMap = {};
    earned.forEach(e => { earnedMap[e.achievement_id] = e.earned_at; });

    const achievements = all.map(a => ({
      ...a,
      earned:    !!earnedMap[a.id],
      earned_at: earnedMap[a.id] || null,
    }));

    res.json({ success: true, achievements });
  } catch (err) {
    console.error('getAchievements error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
