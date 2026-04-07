import db from '../config/database.js';

let ensurePromise = null;

const tableExists = async (tableName) => {
  const [rows] = await db.query('SHOW TABLES LIKE ?', [tableName]);
  return rows.length > 0;
};

const indexExists = async (tableName, indexName) => {
  const [rows] = await db.query(
    `SELECT 1
     FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?
     LIMIT 1`,
    [tableName, indexName]
  );

  return rows.length > 0;
};

const ensureIndex = async (tableName, indexName, definition) => {
  if (!(await indexExists(tableName, indexName))) {
    await db.query(`CREATE INDEX ${indexName} ON ${tableName}(${definition})`);
  }
};

const columnExists = async (tableName, columnName) => {
  const [rows] = await db.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?
     LIMIT 1`,
    [tableName, columnName]
  );

  return rows.length > 0;
};

const ensureUserProfileInterestColumn = async () => {
  if (!(await columnExists('users', 'profile_interests'))) {
    await db.query('ALTER TABLE users ADD COLUMN profile_interests TEXT NULL AFTER last_name');
  }
};

const ensureForumQuestionsTable = async () => {
  if (!(await tableExists('forum_questions'))) {
    await db.query(`
      CREATE TABLE forum_questions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        author_user_id INT NOT NULL,
        school_id INT NULL,
        title VARCHAR(255) NOT NULL,
        question_text TEXT NOT NULL,
        interest_tags TEXT NOT NULL,
        replies_count INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  await ensureIndex('forum_questions', 'idx_forum_questions_author', 'author_user_id, created_at');
  await ensureIndex('forum_questions', 'idx_forum_questions_school', 'school_id, created_at');
  await ensureIndex('forum_questions', 'idx_forum_questions_active', 'is_active, created_at');
};

const ensureForumRepliesTable = async () => {
  if (!(await tableExists('forum_replies'))) {
    await db.query(`
      CREATE TABLE forum_replies (
        id INT PRIMARY KEY AUTO_INCREMENT,
        question_id INT NOT NULL,
        author_user_id INT NOT NULL,
        parent_reply_id INT NULL,
        reply_text TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (question_id) REFERENCES forum_questions(id) ON DELETE CASCADE,
        FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_reply_id) REFERENCES forum_replies(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  await ensureIndex('forum_replies', 'idx_forum_replies_question', 'question_id, created_at');
  await ensureIndex('forum_replies', 'idx_forum_replies_parent', 'parent_reply_id, created_at');
};

const ensureForumHelpfulTable = async () => {
  if (!(await tableExists('forum_helpful'))) {
    await db.query(`
      CREATE TABLE forum_helpful (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        target_type ENUM('question', 'reply') NOT NULL,
        target_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_helpful (user_id, target_type, target_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  await ensureIndex('forum_helpful', 'idx_forum_helpful_target', 'target_type, target_id');
};

const ensureHelpfulCountColumns = async () => {
  if (!(await columnExists('forum_questions', 'helpful_count'))) {
    await db.query('ALTER TABLE forum_questions ADD COLUMN helpful_count INT DEFAULT 0 AFTER replies_count');
  }
  if (!(await columnExists('forum_replies', 'helpful_count'))) {
    await db.query('ALTER TABLE forum_replies ADD COLUMN helpful_count INT DEFAULT 0 AFTER reply_text');
  }
};

export const ensureForumSchema = async () => {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await ensureUserProfileInterestColumn();
      await ensureForumQuestionsTable();
      await ensureForumRepliesTable();
      await ensureHelpfulCountColumns();
      await ensureForumHelpfulTable();
      console.log('Initialized forum schema');
    })().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
};
