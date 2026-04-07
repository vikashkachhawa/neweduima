import db from '../config/database.js';

const tableExists = async (tableName) => {
  const [rows] = await db.query('SHOW TABLES LIKE ?', [tableName]);
  return rows.length > 0;
};

export const ensureGamificationSchema = async () => {
  try {
    // ── fun_games ────────────────────────────────────────────────────────────
    if (!(await tableExists('fun_games'))) {
      await db.query(`
        CREATE TABLE fun_games (
          id             INT AUTO_INCREMENT PRIMARY KEY,
          name           VARCHAR(100) NOT NULL,
          slug           VARCHAR(100) UNIQUE NOT NULL,
          category       ENUM('logic','coding','math','memory') NOT NULL,
          description    TEXT,
          icon           VARCHAR(10),
          base_xp_basic         INT NOT NULL DEFAULT 10,
          base_xp_intermediate  INT NOT NULL DEFAULT 25,
          base_xp_advanced      INT NOT NULL DEFAULT 50,
          is_active      BOOLEAN DEFAULT TRUE,
          created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // Seed games once
    const [[{ c: gamesCount }]] = await db.query('SELECT COUNT(*) as c FROM fun_games');
    if (gamesCount === 0) {
      await db.query(`
        INSERT INTO fun_games (name, slug, category, description, icon) VALUES
        ('Math Blitz',     'math-blitz',     'math',   'Race against the clock solving arithmetic problems. Speed + accuracy = max XP.', '🧮'),
        ('Card Memory',    'card-memory',    'memory', 'Flip cards to find matching emoji pairs. Train your visual memory.', '🃏'),
        ('Pattern Logic',  'pattern-logic',  'logic',  'Spot the pattern in a number sequence and choose the missing value.', '🧩'),
        ('Code Quest',     'code-quest',     'coding', 'Read simple code snippets and predict their output. Learn computational thinking.', '💻')
      `);
    }

    // ── fun_student_xp ───────────────────────────────────────────────────────
    if (!(await tableExists('fun_student_xp'))) {
      await db.query(`
        CREATE TABLE fun_student_xp (
          student_id          INT PRIMARY KEY,
          total_xp            INT NOT NULL DEFAULT 0,
          weekly_xp           INT NOT NULL DEFAULT 0,
          monthly_xp          INT NOT NULL DEFAULT 0,
          current_streak      INT NOT NULL DEFAULT 0,
          longest_streak      INT NOT NULL DEFAULT 0,
          last_activity_date  DATE NULL,
          FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
    }

    // ── fun_student_progress ─────────────────────────────────────────────────
    if (!(await tableExists('fun_student_progress'))) {
      await db.query(`
        CREATE TABLE fun_student_progress (
          id                  INT AUTO_INCREMENT PRIMARY KEY,
          student_id          INT NOT NULL,
          game_id             INT NOT NULL,
          level_name          ENUM('basic','intermediate','advanced') NOT NULL,
          best_score          INT NOT NULL DEFAULT 0,
          attempts            INT NOT NULL DEFAULT 0,
          completed           BOOLEAN NOT NULL DEFAULT FALSE,
          xp_earned           INT NOT NULL DEFAULT 0,
          time_spent_seconds  INT NOT NULL DEFAULT 0,
          completed_at        TIMESTAMP NULL,
          UNIQUE KEY uq_progress (student_id, game_id, level_name),
          FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (game_id)    REFERENCES fun_games(id) ON DELETE CASCADE
        )
      `);
    }

    // ── fun_xp_transactions ──────────────────────────────────────────────────
    if (!(await tableExists('fun_xp_transactions'))) {
      await db.query(`
        CREATE TABLE fun_xp_transactions (
          id           INT AUTO_INCREMENT PRIMARY KEY,
          student_id   INT NOT NULL,
          xp_earned    INT NOT NULL,
          source       ENUM('game_completion','daily_challenge','streak_bonus','achievement') NOT NULL,
          reference_id INT NULL,
          note         VARCHAR(255) NULL,
          created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
    }

    // ── fun_achievements ─────────────────────────────────────────────────────
    if (!(await tableExists('fun_achievements'))) {
      await db.query(`
        CREATE TABLE fun_achievements (
          id               INT AUTO_INCREMENT PRIMARY KEY,
          slug             VARCHAR(100) UNIQUE NOT NULL,
          name             VARCHAR(100) NOT NULL,
          description      TEXT NOT NULL,
          category         ENUM('bronze','silver','gold') NOT NULL,
          icon             VARCHAR(10) NOT NULL,
          trigger_type     ENUM('first_game','games_completed','xp_milestone','streak','category_mastery') NOT NULL,
          trigger_value    INT NOT NULL DEFAULT 1,
          trigger_category VARCHAR(50) NULL
        )
      `);

      await db.query(`
        INSERT INTO fun_achievements (slug, name, description, category, icon, trigger_type, trigger_value, trigger_category) VALUES
        ('first-game',    'First Step',        'Complete your very first game',        'bronze', '🌟', 'first_game',        1,    NULL),
        ('games-5',       'Game Explorer',     'Complete 5 games',                     'bronze', '🎮', 'games_completed',   5,    NULL),
        ('games-20',      'Game Enthusiast',   'Complete 20 games',                    'silver', '🏅', 'games_completed',   20,   NULL),
        ('games-50',      'Game Master',       'Complete 50 games',                    'gold',   '🏆', 'games_completed',   50,   NULL),
        ('xp-100',        'Century Club',      'Earn your first 100 XP',               'bronze', '💯', 'xp_milestone',      100,  NULL),
        ('xp-500',        'XP Hunter',         'Accumulate 500 XP',                    'silver', '⭐', 'xp_milestone',      500,  NULL),
        ('xp-1000',       'XP Legend',         'Reach 1000 total XP',                  'gold',   '🌠', 'xp_milestone',      1000, NULL),
        ('streak-3',      'On Fire',           'Maintain a 3-day learning streak',     'bronze', '🔥', 'streak',            3,    NULL),
        ('streak-7',      'Week Warrior',      'Maintain a 7-day learning streak',     'silver', '⚡', 'streak',            7,    NULL),
        ('streak-30',     'Unstoppable',       'Maintain a 30-day learning streak',    'gold',   '💥', 'streak',            30,   NULL),
        ('math-master',   'Math Master',       'Complete all Math Blitz levels',       'gold',   '🧮', 'category_mastery',  1,    'math'),
        ('memory-champ',  'Memory Champion',   'Complete all Card Memory levels',      'gold',   '🃏', 'category_mastery',  1,    'memory'),
        ('logic-king',    'Logic King',        'Complete all Pattern Logic levels',    'gold',   '🧩', 'category_mastery',  1,    'logic'),
        ('code-wizard',   'Code Wizard',       'Complete all Code Quest levels',       'gold',   '💻', 'category_mastery',  1,    'coding')
      `);
    }

    // ── fun_student_achievements ─────────────────────────────────────────────
    if (!(await tableExists('fun_student_achievements'))) {
      await db.query(`
        CREATE TABLE fun_student_achievements (
          id             INT AUTO_INCREMENT PRIMARY KEY,
          student_id     INT NOT NULL,
          achievement_id INT NOT NULL,
          earned_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_student_achievement (student_id, achievement_id),
          FOREIGN KEY (student_id)     REFERENCES users(id)            ON DELETE CASCADE,
          FOREIGN KEY (achievement_id) REFERENCES fun_achievements(id) ON DELETE CASCADE
        )
      `);
    }

    // ── fun_daily_challenges ─────────────────────────────────────────────────
    if (!(await tableExists('fun_daily_challenges'))) {
      await db.query(`
        CREATE TABLE fun_daily_challenges (
          id             INT AUTO_INCREMENT PRIMARY KEY,
          challenge_date DATE NOT NULL,
          game_id        INT NOT NULL,
          level_name     ENUM('basic','intermediate','advanced') NOT NULL DEFAULT 'basic',
          category       ENUM('logic','coding','math','memory') NOT NULL,
          bonus_xp       INT NOT NULL DEFAULT 20,
          UNIQUE KEY uq_daily (challenge_date, category),
          FOREIGN KEY (game_id) REFERENCES fun_games(id)
        )
      `);
    }

    // ── fun_daily_completions ────────────────────────────────────────────────
    if (!(await tableExists('fun_daily_completions'))) {
      await db.query(`
        CREATE TABLE fun_daily_completions (
          id           INT AUTO_INCREMENT PRIMARY KEY,
          student_id   INT NOT NULL,
          challenge_id INT NOT NULL,
          score        INT NOT NULL DEFAULT 0,
          completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_completion (student_id, challenge_id),
          FOREIGN KEY (student_id)   REFERENCES users(id)               ON DELETE CASCADE,
          FOREIGN KEY (challenge_id) REFERENCES fun_daily_challenges(id)
        )
      `);
    }

    console.log('✓ Gamification schema ready');
  } catch (err) {
    console.error('Error ensuring gamification schema:', err.message);
  }
};
