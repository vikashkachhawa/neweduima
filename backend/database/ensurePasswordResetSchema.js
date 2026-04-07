import db from '../config/database.js';

let ensurePromise = null;

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

const ensureColumn = async (tableName, columnName, definition) => {
  if (!(await columnExists(tableName, columnName))) {
    await db.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
};

export const ensurePasswordResetSchema = async () => {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await ensureColumn('users', 'is_temporary_password', 'BOOLEAN DEFAULT FALSE AFTER must_change_password');
      await ensureColumn('users', 'password_reset_at', 'TIMESTAMP NULL AFTER is_temporary_password');
      await ensureColumn('users', 'password_reset_expires_at', 'TIMESTAMP NULL AFTER password_reset_at');
      await ensureColumn('users', 'temporary_password', 'VARCHAR(255) NULL AFTER temp_password');

      console.log('Ensured password reset schema');
    })().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
};
