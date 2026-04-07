import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schoolPagesMigrationPath = path.join(__dirname, 'migrations', '2025-12-27-add-school-pages.sql');

let ensurePromise = null;

const parseStatements = (sql) => sql
  .split(';')
  .map((statement) => statement.trim())
  .filter(Boolean);

const tableExists = async (tableName) => {
  const [rows] = await db.query('SHOW TABLES LIKE ?', [tableName]);
  return rows.length > 0;
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

export const ensureSchoolPageSchema = async () => {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const hasSchoolPagesTable = await tableExists('school_pages');

      if (!hasSchoolPagesTable) {
        const migrationSql = await fs.readFile(schoolPagesMigrationPath, 'utf8');
        const statements = parseStatements(migrationSql);

        for (const statement of statements) {
          await db.query(statement);
        }

        console.log('Initialized school page schema');
      }

      if (!(await columnExists('school_posts', 'media_url'))) {
        await db.query('ALTER TABLE school_posts ADD COLUMN media_url VARCHAR(500) AFTER post_type');
        console.log('Ensured school_posts.media_url column');
      }
    })().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
};
