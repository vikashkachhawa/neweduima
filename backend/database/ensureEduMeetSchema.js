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
  if (!(await tableExists('edumeet_rooms'))) {
    await db.query(`
      CREATE TABLE edumeet_rooms (
        id INT PRIMARY KEY AUTO_INCREMENT,
        school_id INT NOT NULL,
        creator_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        conference_type ENUM('one_to_one','one_to_many','many_to_many') NOT NULL DEFAULT 'many_to_many',
        room_code VARCHAR(16) NOT NULL,
        room_password_hash VARCHAR(128) NULL,
        scheduled_at TIMESTAMP NULL,
        duration_minutes INT NOT NULL DEFAULT 60,
        status ENUM('scheduled','live','ended') NOT NULL DEFAULT 'scheduled',
        primary_language ENUM('english','hindi','bilingual') NOT NULL DEFAULT 'english',
        low_bandwidth_mode BOOLEAN NOT NULL DEFAULT FALSE,
        high_quality_video BOOLEAN NOT NULL DEFAULT TRUE,
        allow_private_chat BOOLEAN NOT NULL DEFAULT TRUE,
        allow_screen_share BOOLEAN NOT NULL DEFAULT TRUE,
        allow_file_sharing BOOLEAN NOT NULL DEFAULT TRUE,
        attendance_tracking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        recording_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        breakout_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        max_participants INT NOT NULL DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_edumeet_room_code (room_code),
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  await ensureIndex('edumeet_rooms', 'idx_edumeet_rooms_school_status', 'school_id, status');
  await ensureIndex('edumeet_rooms', 'idx_edumeet_rooms_creator', 'creator_id, created_at');
};

const ensureParticipantsTable = async () => {
  if (!(await tableExists('edumeet_participants'))) {
    await db.query(`
      CREATE TABLE edumeet_participants (
        id INT PRIMARY KEY AUTO_INCREMENT,
        room_id INT NOT NULL,
        user_id INT NOT NULL,
        role ENUM('admin','teacher','student') NOT NULL DEFAULT 'student',
        status ENUM('invited','joined','in_room','left','removed') NOT NULL DEFAULT 'invited',
        hand_raised BOOLEAN NOT NULL DEFAULT FALSE,
        mic_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        camera_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        spotlighted BOOLEAN NOT NULL DEFAULT FALSE,
        attendance_marked BOOLEAN NOT NULL DEFAULT FALSE,
        low_bandwidth_mode BOOLEAN NOT NULL DEFAULT FALSE,
        audio_device_label VARCHAR(255) NULL,
        video_quality ENUM('low','high') NOT NULL DEFAULT 'high',
        joined_at TIMESTAMP NULL,
        left_at TIMESTAMP NULL,
        last_seen_at TIMESTAMP NULL,
        removed_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_edumeet_room_user (room_id, user_id),
        FOREIGN KEY (room_id) REFERENCES edumeet_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (removed_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  await ensureIndex('edumeet_participants', 'idx_edumeet_participants_room', 'room_id, status');
  await ensureIndex('edumeet_participants', 'idx_edumeet_participants_user', 'user_id, created_at');
};

const ensureMessagesTable = async () => {
  if (!(await tableExists('edumeet_messages'))) {
    await db.query(`
      CREATE TABLE edumeet_messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        room_id INT NOT NULL,
        sender_id INT NOT NULL,
        recipient_id INT NULL,
        message_type ENUM('text','system','reaction','file') NOT NULL DEFAULT 'text',
        content TEXT NOT NULL,
        metadata_json MEDIUMTEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES edumeet_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  await ensureIndex('edumeet_messages', 'idx_edumeet_messages_room_created', 'room_id, created_at');
};

const ensureWhiteboardTable = async () => {
  if (!(await tableExists('edumeet_whiteboard_events'))) {
    await db.query(`
      CREATE TABLE edumeet_whiteboard_events (
        id INT PRIMARY KEY AUTO_INCREMENT,
        room_id INT NOT NULL,
        user_id INT NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        payload_json MEDIUMTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES edumeet_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  await ensureIndex('edumeet_whiteboard_events', 'idx_edumeet_whiteboard_room', 'room_id, created_at');
};

const ensurePollsTable = async () => {
  if (!(await tableExists('edumeet_polls'))) {
    await db.query(`
      CREATE TABLE edumeet_polls (
        id INT PRIMARY KEY AUTO_INCREMENT,
        room_id INT NOT NULL,
        creator_id INT NOT NULL,
        question VARCHAR(500) NOT NULL,
        options_json MEDIUMTEXT NOT NULL,
        correct_option VARCHAR(255),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP NULL,
        FOREIGN KEY (room_id) REFERENCES edumeet_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } else {
    const [columns] = await db.query('SHOW COLUMNS FROM edumeet_polls WHERE Field = ?', ['correct_option']);
    if (columns.length === 0) {
      await db.query('ALTER TABLE edumeet_polls ADD COLUMN correct_option VARCHAR(255) AFTER options_json');
    }
  }
  await ensureIndex('edumeet_polls', 'idx_edumeet_polls_room', 'room_id, created_at');
};

const ensurePollResponsesTable = async () => {
  if (!(await tableExists('edumeet_poll_responses'))) {
    await db.query(`
      CREATE TABLE edumeet_poll_responses (
        id INT PRIMARY KEY AUTO_INCREMENT,
        poll_id INT NOT NULL,
        user_id INT NOT NULL,
        selected_option VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_edumeet_poll_user (poll_id, user_id),
        FOREIGN KEY (poll_id) REFERENCES edumeet_polls(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  await ensureIndex('edumeet_poll_responses', 'idx_edumeet_poll_responses_poll', 'poll_id, selected_option');
};

const ensureFilesTable = async () => {
  if (!(await tableExists('edumeet_files'))) {
    await db.query(`
      CREATE TABLE edumeet_files (
        id INT PRIMARY KEY AUTO_INCREMENT,
        room_id INT NOT NULL,
        uploader_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        file_type ENUM('pdf','image','notes','link') NOT NULL DEFAULT 'link',
        file_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES edumeet_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  await ensureIndex('edumeet_files', 'idx_edumeet_files_room', 'room_id, created_at');
};

const ensureRecordingsTable = async () => {
  if (!(await tableExists('edumeet_recordings'))) {
    await db.query(`
      CREATE TABLE edumeet_recordings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        room_id INT NOT NULL,
        uploader_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size_bytes BIGINT NOT NULL DEFAULT 0,
        duration_seconds INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        FOREIGN KEY (room_id) REFERENCES edumeet_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  await ensureIndex('edumeet_recordings', 'idx_edumeet_recordings_room', 'room_id, created_at');
  await ensureIndex('edumeet_recordings', 'idx_edumeet_recordings_expiry', 'expires_at');
};

const ensureWaitingRoomTable = async () => {
  if (!(await tableExists('edumeet_waiting_room'))) {
    await db.query(`
      CREATE TABLE edumeet_waiting_room (
        id INT PRIMARY KEY AUTO_INCREMENT,
        room_id INT NOT NULL,
        user_id INT NOT NULL,
        display_name VARCHAR(255) NULL,
        status ENUM('waiting','admitted','rejected','expired') NOT NULL DEFAULT 'waiting',
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        decided_at TIMESTAMP NULL,
        decided_by INT NULL,
        UNIQUE KEY uq_edumeet_waiting_room_user (room_id, user_id),
        FOREIGN KEY (room_id) REFERENCES edumeet_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  await ensureIndex('edumeet_waiting_room', 'idx_edumeet_waiting_room_status', 'room_id, status');
};

const ensureBreakoutRoomsTable = async () => {
  if (!(await tableExists('edumeet_breakout_rooms'))) {
    await db.query(`
      CREATE TABLE edumeet_breakout_rooms (
        id INT PRIMARY KEY AUTO_INCREMENT,
        parent_room_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        status ENUM('open','closed') NOT NULL DEFAULT 'open',
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP NULL,
        FOREIGN KEY (parent_room_id) REFERENCES edumeet_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  await ensureIndex('edumeet_breakout_rooms', 'idx_edumeet_breakout_parent', 'parent_room_id, status');
};

const ensureBreakoutParticipantsTable = async () => {
  if (!(await tableExists('edumeet_breakout_participants'))) {
    await db.query(`
      CREATE TABLE edumeet_breakout_participants (
        id INT PRIMARY KEY AUTO_INCREMENT,
        breakout_room_id INT NOT NULL,
        user_id INT NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        left_at TIMESTAMP NULL,
        UNIQUE KEY uq_edumeet_breakout_user (breakout_room_id, user_id),
        FOREIGN KEY (breakout_room_id) REFERENCES edumeet_breakout_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
};

const ensureNotesTable = async () => {
  if (!(await tableExists('edumeet_notes'))) {
    await db.query(`
      CREATE TABLE edumeet_notes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        room_id INT NOT NULL,
        user_id INT NOT NULL,
        source_message_id INT NULL,
        note_text TEXT NOT NULL,
        pinned BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES edumeet_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (source_message_id) REFERENCES edumeet_messages(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  await ensureIndex('edumeet_notes', 'idx_edumeet_notes_room', 'room_id, created_at');
};

const ensureHandQueueTable = async () => {
  if (!(await tableExists('edumeet_hand_queue'))) {
    await db.query(`
      CREATE TABLE edumeet_hand_queue (
        id INT PRIMARY KEY AUTO_INCREMENT,
        room_id INT NOT NULL,
        user_id INT NOT NULL,
        status ENUM('queued','accepted','dismissed') NOT NULL DEFAULT 'queued',
        queue_order INT NOT NULL DEFAULT 0,
        raised_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_edumeet_hand_queue_room_user (room_id, user_id),
        FOREIGN KEY (room_id) REFERENCES edumeet_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  await ensureIndex('edumeet_hand_queue', 'idx_edumeet_hand_queue_room_status', 'room_id, status, queue_order');
};

export const ensureEduMeetSchema = async () => {
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    try {
      await ensureRoomsTable();
      await ensureParticipantsTable();
      await ensureMessagesTable();
      await ensureWhiteboardTable();
      await ensurePollsTable();
      await ensurePollResponsesTable();
      await ensureFilesTable();
      await ensureRecordingsTable();
      await ensureWaitingRoomTable();
      await ensureBreakoutRoomsTable();
      await ensureBreakoutParticipantsTable();
      await ensureNotesTable();
      await ensureHandQueueTable();
      console.log('✅ EduMeet schema ready');
    } catch (error) {
      console.error('❌ EduMeet schema failed:', error.message);
      ensurePromise = null;
      throw error;
    }
  })();

  return ensurePromise;
};
