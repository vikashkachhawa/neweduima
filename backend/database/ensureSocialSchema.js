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

const ensureUserConnectionsTable = async () => {
  if (!(await tableExists('social_connections'))) {
    await db.query(`
      CREATE TABLE social_connections (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_one_id INT NOT NULL,
        user_two_id INT NOT NULL,
        requester_id INT NOT NULL,
        status ENUM('pending', 'accepted', 'rejected', 'cancelled') DEFAULT 'pending',
        request_message VARCHAR(255) NULL,
        responded_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT chk_user_order CHECK (user_one_id < user_two_id),
        UNIQUE KEY uniq_user_pair (user_one_id, user_two_id),
        FOREIGN KEY (user_one_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user_two_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  }

  await ensureIndex('social_connections', 'idx_social_connections_status', 'status, requester_id');
  await ensureIndex('social_connections', 'idx_social_connections_user_one', 'user_one_id, status');
  await ensureIndex('social_connections', 'idx_social_connections_user_two', 'user_two_id, status');
};

export const ensureSocialSchema = async () => {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await ensureUserConnectionsTable();
      console.log('Initialized social schema');
    })().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
};
