import db from '../config/database.js';

/**
 * Ensure all Group Chat tables exist
 * Called during application bootstrap
 */
export const ensureGroupChatSchema = async () => {
  try {
    console.log('🔧 Ensuring Group Chat Schema...');

    // 1. Table: chat_groups
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_groups (
        id INT PRIMARY KEY AUTO_INCREMENT,
        school_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_by_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL COMMENT 'Soft delete timestamp',
        is_archived BOOLEAN DEFAULT FALSE,
        member_count INT DEFAULT 1,

        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_school_id (school_id),
        INDEX idx_created_by (created_by_id),
        INDEX idx_deleted_at (deleted_at),
        UNIQUE INDEX idx_group_name_school (name, school_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Group chat metadata'
    `);
    console.log('✅ Table: chat_groups');

    // Ensure deleted_at column exists (for existing tables from older schema)
    try {
      const [cols] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_NAME = 'chat_groups' AND COLUMN_NAME = 'deleted_at'`
      );
      if (cols.length === 0) {
        await db.query(
          `ALTER TABLE chat_groups ADD COLUMN deleted_at DATETIME NULL COMMENT 'Soft delete timestamp'`
        );
      }
    } catch (err) {
      // Column might already exist
    }

    // Ensure is_archived column exists
    try {
      const [cols] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_NAME = 'chat_groups' AND COLUMN_NAME = 'is_archived'`
      );
      if (cols.length === 0) {
        await db.query(
          `ALTER TABLE chat_groups ADD COLUMN is_archived BOOLEAN DEFAULT FALSE`
        );
      }
    } catch (err) {
      // Column might already exist
    }

    // Ensure member_count column exists
    try {
      const [cols] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_NAME = 'chat_groups' AND COLUMN_NAME = 'member_count'`
      );
      if (cols.length === 0) {
        await db.query(
          `ALTER TABLE chat_groups ADD COLUMN member_count INT DEFAULT 1`
        );
      }
    } catch (err) {
      // Column might already exist
    }

    // 2. Table: group_members
    await db.query(`
      CREATE TABLE IF NOT EXISTS group_members (
        id INT PRIMARY KEY AUTO_INCREMENT,
        group_id INT NOT NULL,
        user_id INT NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        removed_at DATETIME NULL COMMENT 'Track when member was removed',

        FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE INDEX idx_group_user (group_id, user_id),
        INDEX idx_user_groups (user_id),
        INDEX idx_group_admin (group_id, is_admin)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Group membership'
    `);
    console.log('✅ Table: group_members');

    // 3. Table: group_messages
    await db.query(`
      CREATE TABLE IF NOT EXISTS group_messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        group_id INT NOT NULL,
        sender_id INT NOT NULL,
        message_text TEXT NOT NULL,
        message_type ENUM('text', 'emoji', 'image', 'attachment', 'system') DEFAULT 'text',
        is_edited BOOLEAN DEFAULT FALSE,
        edited_at DATETIME NULL,
        deleted_at DATETIME NULL COMMENT 'Soft delete (hide message)',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_group_time (group_id, created_at DESC),
        INDEX idx_sender (sender_id),
        INDEX idx_deleted_at (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Group chat messages'
    `);
    console.log('✅ Table: group_messages');

    // Ensure system message type exists for existing tables
    try {
      const [[messageTypeCol]] = await db.query(
        `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'group_messages'
           AND COLUMN_NAME = 'message_type'`
      );
      if (messageTypeCol && !messageTypeCol.COLUMN_TYPE.includes("'system'")) {
        await db.query(
          `ALTER TABLE group_messages
           MODIFY COLUMN message_type ENUM('text', 'emoji', 'image', 'attachment', 'system') DEFAULT 'text'`
        );
      }
    } catch (err) {
      console.warn('⚠️ Could not verify group_messages.message_type enum:', err.message);
    }

    // 4. Table: group_message_reads (Optional - read receipts)
    await db.query(`
      CREATE TABLE IF NOT EXISTS group_message_reads (
        id INT PRIMARY KEY AUTO_INCREMENT,
        message_id INT NOT NULL,
        user_id INT NOT NULL,
        read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (message_id) REFERENCES group_messages(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE INDEX idx_message_user (message_id, user_id),
        INDEX idx_message (message_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Message read receipts'
    `);
    console.log('✅ Table: group_message_reads');

    // 5. Table: group_activity_log
    await db.query(`
      CREATE TABLE IF NOT EXISTS group_activity_log (
        id INT PRIMARY KEY AUTO_INCREMENT,
        group_id INT NOT NULL,
        action_type ENUM(
          'member_added',
          'member_removed',
          'admin_promoted',
          'admin_demoted',
          'admin_auto_promoted',
          'group_renamed',
          'group_created',
          'group_deleted'
        ) NOT NULL,
        performed_by_id INT NOT NULL,
        target_user_id INT COMMENT 'User being acted upon',
        metadata JSON COMMENT 'Additional context (e.g., old name, new name)',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
        FOREIGN KEY (performed_by_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_group_time (group_id, created_at DESC),
        INDEX idx_action_type (action_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Group activity audit log'
    `);
    console.log('✅ Table: group_activity_log');

    console.log('✅ Group Chat Schema Ready!');
  } catch (error) {
    console.error('❌ Error ensuring Group Chat schema:', error);
    throw error;
  }
};

export default ensureGroupChatSchema;
