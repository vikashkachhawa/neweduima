import db from '../config/database.js';

let ensurePromise = null;

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

const ensureAnnouncementsTable = async () => {
  if (!(await tableExists('announcements'))) {
    await db.query(`CREATE TABLE announcements (
      id INT PRIMARY KEY AUTO_INCREMENT,
      school_id INT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'notice',
      priority VARCHAR(50) DEFAULT 'medium',
      target_roles JSON NULL,
      target_schools JSON NULL,
      is_active BOOLEAN DEFAULT TRUE,
      published_at DATETIME NULL,
      expires_at DATETIME NULL,
      created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`);
  }

  const columnDefinitions = [
    ['school_id', 'INT NULL AFTER id'],
    ['type', "VARCHAR(50) DEFAULT 'notice' AFTER content"],
    ['priority', "VARCHAR(50) DEFAULT 'medium' AFTER type"],
    ['target_roles', 'JSON NULL AFTER priority'],
    ['target_schools', 'JSON NULL AFTER target_roles'],
    ['is_active', 'BOOLEAN DEFAULT TRUE AFTER target_schools'],
    ['published_at', 'DATETIME NULL AFTER is_active'],
    ['expires_at', 'DATETIME NULL AFTER published_at'],
    ['updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at']
  ];

  for (const [columnName, definition] of columnDefinitions) {
    if (!(await columnExists('announcements', columnName))) {
      await db.query(`ALTER TABLE announcements ADD COLUMN ${columnName} ${definition}`);
    }
  }

  await ensureIndex('announcements', 'idx_school_announcements', 'school_id, created_at');
  await ensureIndex('announcements', 'idx_active_school', 'is_active, school_id');
  await ensureIndex('announcements', 'idx_announcement_published', 'published_at, is_active');
};

const ensureAcademicTemplatesTable = async () => {
  if (!(await tableExists('global_academic_templates'))) {
    await db.query(`CREATE TABLE global_academic_templates (
      id INT PRIMARY KEY AUTO_INCREMENT,
      type VARCHAR(50) DEFAULT 'holiday',
      name VARCHAR(100) NOT NULL,
      description TEXT,
      start_date DATE NOT NULL,
      end_date DATE,
      applies_to_all_schools BOOLEAN DEFAULT TRUE,
      applicable_schools JSON NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`);
  }

  const columnDefinitions = [
    ['type', "VARCHAR(50) DEFAULT 'holiday' AFTER id"],
    ['applicable_schools', 'JSON NULL AFTER applies_to_all_schools'],
    ['is_active', 'BOOLEAN DEFAULT TRUE AFTER applicable_schools'],
    ['updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at']
  ];

  for (const [columnName, definition] of columnDefinitions) {
    if (!(await columnExists('global_academic_templates', columnName))) {
      await db.query(`ALTER TABLE global_academic_templates ADD COLUMN ${columnName} ${definition}`);
    }
  }

  await ensureIndex('global_academic_templates', 'idx_template_dates', 'start_date, end_date');
};

const ensureSuperAdminTemplatesTables = async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS stream_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    stream_key VARCHAR(50),
    subjects JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_stream_name (name)
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS exam_pattern_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    pattern JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_exam_pattern_name (name)
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS holiday_presets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    region VARCHAR(100),
    holidays JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_holiday_name (name)
  )`);
};

export const ensurePlatformContentSchema = async () => {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await ensureAnnouncementsTable();
      await ensureAcademicTemplatesTable();
      await ensureSuperAdminTemplatesTables();
      console.log('Initialized platform content schema');
    })().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
};
