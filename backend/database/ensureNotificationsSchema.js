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

const ensureNotificationsTable = async () => {
  if (!(await tableExists('user_notifications'))) {
    await db.query(`
      CREATE TABLE user_notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        recipient_user_id INT NOT NULL,
        actor_user_id INT NULL,
        type VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        entity_type VARCHAR(64) NULL,
        entity_id INT NULL,
        metadata TEXT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        read_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
  }

  await ensureIndex('user_notifications', 'idx_user_notifications_recipient', 'recipient_user_id, created_at');
  await ensureIndex('user_notifications', 'idx_user_notifications_unread', 'recipient_user_id, is_read, created_at');
  await ensureIndex('user_notifications', 'idx_user_notifications_type', 'type, entity_type, entity_id');
};

export const ensureNotificationsSchema = async () => {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await ensureNotificationsTable();
      console.log('Initialized notifications schema');
    })().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
};