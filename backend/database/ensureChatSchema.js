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

const ensureChatMessagesTable = async () => {
  if (!(await tableExists('chat_messages'))) {
    await db.query(`
      CREATE TABLE chat_messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_one_id INT NOT NULL,
        user_two_id INT NOT NULL,
        sender_id INT NOT NULL,
        recipient_id INT NOT NULL,
        message_text TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        read_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT chk_chat_user_order CHECK (user_one_id < user_two_id),
        FOREIGN KEY (user_one_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user_two_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  await ensureIndex('chat_messages', 'idx_chat_pair_time', 'user_one_id, user_two_id, created_at');
  await ensureIndex('chat_messages', 'idx_chat_recipient_unread', 'recipient_id, is_read, created_at');
  await ensureIndex('chat_messages', 'idx_chat_sender_time', 'sender_id, created_at');
};

export const ensureChatSchema = async () => {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await ensureChatMessagesTable();
      console.log('Initialized chat schema');
    })().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
};
