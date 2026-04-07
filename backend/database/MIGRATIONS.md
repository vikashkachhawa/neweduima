# Database Migrations

If suspend/delete and module toggles are failing with errors like "Unknown column 'status'" or "Unknown column 'modules'", your existing database schema is missing required columns.

## Apply Migration (phpMyAdmin)
- Open phpMyAdmin at http://localhost/phpmyadmin
- Select your database (default: `eduima_db`)
- Go to Import and upload: `backend/database/migrations/2025-12-27-add-status-modules.sql`

## Apply Migration (MySQL CLI)
```
mysql -u root -p eduima_db < backend/database/migrations/2025-12-27-add-status-modules.sql
```

If your MySQL/MariaDB version does not support `IF NOT EXISTS` for `ADD COLUMN`, manually add columns:

```
ALTER TABLE schools ADD COLUMN status ENUM('active','suspended','deleted') DEFAULT 'active';
ALTER TABLE schools ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
-- For MariaDB < 10.4 use LONGTEXT instead of JSON
ALTER TABLE schools ADD COLUMN modules JSON NULL;
ALTER TABLE schools ADD COLUMN timezone VARCHAR(100) DEFAULT 'Asia/Kolkata';
ALTER TABLE schools ADD COLUMN academic_year_start DATE NULL;
ALTER TABLE schools ADD COLUMN academic_year_end DATE NULL;
ALTER TABLE schools ADD COLUMN grading_scheme VARCHAR(100) DEFAULT 'default';
ALTER TABLE schools ADD COLUMN cloned_from INT NULL;
ALTER TABLE schools ADD COLUMN status_reason TEXT NULL;
ALTER TABLE schools ADD COLUMN deleted_at TIMESTAMP NULL;
CREATE INDEX idx_status ON schools (status);
CREATE INDEX idx_is_active ON schools (is_active);
CREATE INDEX idx_cloned_from ON schools (cloned_from);
```

After applying, restart the backend server.

```
cd backend
npm start
```

## Recreate Fresh Schema
If desired, you can recreate the database using `backend/database/schema.sql` (drops tables and creates them fresh). Be aware this will delete existing data.

```
mysql -u root -p eduima_db < backend/database/schema.sql
```
