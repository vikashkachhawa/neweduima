-- Super Admin template library for schools

CREATE TABLE IF NOT EXISTS stream_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  stream_key VARCHAR(50),
  subjects JSON NOT NULL, -- e.g., ["Physics","Chemistry","Math"]
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_stream_name (name)
);

CREATE TABLE IF NOT EXISTS exam_pattern_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  pattern JSON NOT NULL, -- e.g., {"unit_tests":[...],"term_weights":{"term1":40,"term2":60}}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_exam_pattern_name (name)
);

CREATE TABLE IF NOT EXISTS holiday_presets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  region VARCHAR(100),
  holidays JSON NOT NULL, -- e.g., [{"date":"2025-12-25","label":"Christmas"}]
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_holiday_name (name)
);
