import db from '../config/database.js';

/**
 * Ensure all Broadcast tables exist
 * Called during application bootstrap
 */
export const ensureBroadcastSchema = async () => {
  try {
    console.log('🔧 Ensuring Broadcast Schema...');

    // 1. Table: broadcasts
    await db.query(`
      CREATE TABLE IF NOT EXISTS broadcasts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        sender_id INT NOT NULL,
        school_id INT COMMENT 'NULL if multi-school broadcast (super-admin)',
        broadcast_type ENUM('school_wide', 'class', 'group', 'custom') NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        status ENUM('draft', 'scheduled', 'sent', 'expired') DEFAULT 'draft',
        reply_enabled BOOLEAN DEFAULT FALSE,
        scheduled_at DATETIME NULL,
        sent_at DATETIME NULL,
        expires_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        INDEX idx_sender (sender_id),
        INDEX idx_school (school_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at DESC),
        INDEX idx_sent_at (sent_at DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Broadcast messages'
    `);
    console.log('✅ Table: broadcasts');

    // 2. Table: broadcast_recipients
    await db.query(`
      CREATE TABLE IF NOT EXISTS broadcast_recipients (
        id INT PRIMARY KEY AUTO_INCREMENT,
        broadcast_id INT NOT NULL,
        recipient_user_id INT NOT NULL,
        recipient_type ENUM('individual', 'class', 'group', 'group_member') DEFAULT 'individual',
        status ENUM('pending', 'delivered', 'read') DEFAULT 'pending',
        delivered_at DATETIME NULL,
        read_at DATETIME NULL,

        FOREIGN KEY (broadcast_id) REFERENCES broadcasts(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE INDEX idx_broadcast_recipient (broadcast_id, recipient_user_id),
        INDEX idx_recipient_user (recipient_user_id),
        INDEX idx_recipient_status (recipient_user_id, status),
        INDEX idx_broadcast_status (broadcast_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Broadcast delivery tracking'
    `);
    console.log('✅ Table: broadcast_recipients');

    // 3. Table: broadcast_attachments (Future)
    await db.query(`
      CREATE TABLE IF NOT EXISTS broadcast_attachments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        broadcast_id INT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_type VARCHAR(50),
        file_size INT,
        uploaded_by_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (broadcast_id) REFERENCES broadcasts(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_broadcast_id (broadcast_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Broadcast attachments'
    `);
    console.log('✅ Table: broadcast_attachments');

    // 4. Table: broadcast_scope (for storing targeted users)
    await db.query(`
      CREATE TABLE IF NOT EXISTS broadcast_scope (
        id INT PRIMARY KEY AUTO_INCREMENT,
        broadcast_id INT NOT NULL,
        scope_type ENUM('class_id', 'group_id', 'custom_filter') NOT NULL,
        scope_value VARCHAR(255) NOT NULL COMMENT 'class ID or group ID or filter criteria',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (broadcast_id) REFERENCES broadcasts(id) ON DELETE CASCADE,
        INDEX idx_broadcast_id (broadcast_id),
        INDEX idx_scope_type (scope_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Broadcast targeting scope'
    `);
    console.log('✅ Table: broadcast_scope');

    console.log('✅ Broadcast Schema Ready!');
  } catch (error) {
    console.error('❌ Error ensuring Broadcast schema:', error);
    throw error;
  }
};

export default ensureBroadcastSchema;
