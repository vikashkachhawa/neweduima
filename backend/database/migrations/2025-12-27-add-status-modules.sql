-- Migration to ensure schools table has required columns for status and modules
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS status ENUM('active','suspended','deleted') DEFAULT 'active';

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- JSON type is supported in MySQL 5.7+; for MariaDB use LONGTEXT as fallback
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS modules JSON NULL;

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'Asia/Kolkata';

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS academic_year_start DATE NULL,
  ADD COLUMN IF NOT EXISTS academic_year_end DATE NULL,
  ADD COLUMN IF NOT EXISTS grading_scheme VARCHAR(100) DEFAULT 'default';

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS cloned_from INT NULL;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_status ON schools (status);
CREATE INDEX IF NOT EXISTS idx_is_active ON schools (is_active);
CREATE INDEX IF NOT EXISTS idx_cloned_from ON schools (cloned_from);

-- Capture status change reasons and deletion timestamp
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS status_reason TEXT NULL;

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
