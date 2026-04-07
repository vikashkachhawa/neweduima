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

const ensureRoomsTable = async () => {
  if (!(await tableExists('codearena_rooms'))) {
    await db.query(`
      CREATE TABLE codearena_rooms (
        id INT PRIMARY KEY AUTO_INCREMENT,
        school_id INT NOT NULL,
        creator_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        duration_minutes INT NOT NULL DEFAULT 60,
        mode ENUM('practice','exam') NOT NULL DEFAULT 'practice',
        invite_code VARCHAR(12) NOT NULL,
        status ENUM('draft','active','ended') NOT NULL DEFAULT 'draft',
        max_attempts INT NOT NULL DEFAULT 3,
        starts_at TIMESTAMP NULL,
        ends_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_invite_code (invite_code),
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  await ensureIndex('codearena_rooms', 'idx_ca_rooms_school', 'school_id, status');
  await ensureIndex('codearena_rooms', 'idx_ca_rooms_creator', 'creator_id, created_at');
};

const ensureParticipantsTable = async () => {
  if (!(await tableExists('codearena_participants'))) {
    await db.query(`
      CREATE TABLE codearena_participants (
        id INT PRIMARY KEY AUTO_INCREMENT,
        room_id INT NOT NULL,
        user_id INT NOT NULL,
        role ENUM('student','faculty') NOT NULL DEFAULT 'student',
        join_time TIMESTAMP NULL,
        status ENUM('invited','joined','active','coding','submitted','left') NOT NULL DEFAULT 'invited',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_room_user (room_id, user_id),
        FOREIGN KEY (room_id) REFERENCES codearena_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  await ensureIndex('codearena_participants', 'idx_ca_participants_room', 'room_id, status');
  await ensureIndex('codearena_participants', 'idx_ca_participants_user', 'user_id, created_at');
};

const ensureProblemsTable = async () => {
  if (!(await tableExists('codearena_problems'))) {
    await db.query(`
      CREATE TABLE codearena_problems (
        id INT PRIMARY KEY AUTO_INCREMENT,
        room_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        constraints TEXT NULL,
        sample_input TEXT NULL,
        sample_output TEXT NULL,
        difficulty ENUM('basic','intermediate','advanced') NOT NULL DEFAULT 'basic',
        order_index INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES codearena_rooms(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  await ensureIndex('codearena_problems', 'idx_ca_problems_room', 'room_id, order_index');
};

const ensureTestCasesTable = async () => {
  if (!(await tableExists('codearena_test_cases'))) {
    await db.query(`
      CREATE TABLE codearena_test_cases (
        id INT PRIMARY KEY AUTO_INCREMENT,
        problem_id INT NOT NULL,
        input_data TEXT NOT NULL,
        expected_output TEXT NOT NULL,
        is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
        time_limit_ms INT NOT NULL DEFAULT 2000,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (problem_id) REFERENCES codearena_problems(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  await ensureIndex('codearena_test_cases', 'idx_ca_testcases_problem', 'problem_id, is_hidden');
};

const ensureSubmissionsTable = async () => {
  if (!(await tableExists('codearena_submissions'))) {
    await db.query(`
      CREATE TABLE codearena_submissions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        room_id INT NOT NULL,
        problem_id INT NOT NULL,
        user_id INT NOT NULL,
        language ENUM('python','javascript','java','c','cpp') NOT NULL,
        code MEDIUMTEXT NOT NULL,
        result ENUM('pending','accepted','wrong_answer','runtime_error','timeout','compilation_error') NOT NULL DEFAULT 'pending',
        execution_time_ms INT NULL,
        attempts INT NOT NULL DEFAULT 1,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES codearena_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (problem_id) REFERENCES codearena_problems(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  await ensureIndex('codearena_submissions', 'idx_ca_submissions_room_user', 'room_id, user_id');
  await ensureIndex('codearena_submissions', 'idx_ca_submissions_problem_user', 'problem_id, user_id, submitted_at');
};

const ensureExecutionResultsTable = async () => {
  if (!(await tableExists('codearena_execution_results'))) {
    await db.query(`
      CREATE TABLE codearena_execution_results (
        id INT PRIMARY KEY AUTO_INCREMENT,
        submission_id INT NOT NULL,
        test_case_id INT NOT NULL,
        actual_output TEXT NULL,
        is_passed BOOLEAN NOT NULL DEFAULT FALSE,
        execution_time_ms INT NULL,
        error_log TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (submission_id) REFERENCES codearena_submissions(id) ON DELETE CASCADE,
        FOREIGN KEY (test_case_id) REFERENCES codearena_test_cases(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  await ensureIndex('codearena_execution_results', 'idx_ca_exec_results_submission', 'submission_id');
};

export const ensureCodeArenaSchema = async () => {
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    try {
      await ensureRoomsTable();
      await ensureParticipantsTable();
      await ensureProblemsTable();
      await ensureTestCasesTable();
      await ensureSubmissionsTable();
      await ensureExecutionResultsTable();
      console.log('✅ CodeArena schema ready');
    } catch (error) {
      console.error('❌ CodeArena schema failed:', error.message);
      ensurePromise = null;
      throw error;
    }
  })();

  return ensurePromise;
};
