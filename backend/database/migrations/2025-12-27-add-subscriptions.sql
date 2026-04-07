-- Subscription Management Schema

-- Subscription Plans (defined by Super Admin)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  max_users INT,
  max_classes INT NOT NULL DEFAULT 999,
  features JSON,
  price_monthly DECIMAL(10, 2),
  price_annual DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- School Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL UNIQUE,
  plan_id INT NOT NULL,
  status ENUM('active', 'suspended', 'expired', 'cancelled') DEFAULT 'active',
  billing_cycle ENUM('monthly', 'annual') DEFAULT 'monthly',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  auto_renew BOOLEAN DEFAULT TRUE,
  last_payment_date DATETIME,
  next_payment_date DATE,
  payment_method VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
  INDEX idx_school_id (school_id),
  INDEX idx_status (status),
  INDEX idx_end_date (end_date)
);

-- Usage Tracking (enforce plan limits)
CREATE TABLE IF NOT EXISTS usage_tracking (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  metric_name VARCHAR(100),
  current_value INT DEFAULT 0,
  plan_limit INT,
  last_reset DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_school_metric (school_id, metric_name),
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  INDEX idx_school_id (school_id)
);

-- Subscription Invoices
CREATE TABLE IF NOT EXISTS subscription_invoices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  subscription_id INT NOT NULL,
  school_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'paid', 'failed', 'cancelled') DEFAULT 'pending',
  due_date DATE NOT NULL,
  paid_date DATETIME,
  invoice_number VARCHAR(50) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  INDEX idx_school_id (school_id),
  INDEX idx_status (status),
  INDEX idx_due_date (due_date)
);

-- Insert Default Plans
INSERT INTO subscription_plans (name, description, max_users, features, price_monthly, price_annual, is_active) VALUES
  ('Free', 'Starter plan for small schools', 50, JSON_OBJECT(
    'users', TRUE,
    'classes', TRUE,
    'grades', TRUE,
    'announcements', TRUE,
    'ai_exams', FALSE,
    'analytics', FALSE,
    'api_access', FALSE
  ), 0.00, 0.00, TRUE),
  
  ('Pro', 'Professional plan for growing schools', 500, JSON_OBJECT(
    'users', TRUE,
    'classes', TRUE,
    'grades', TRUE,
    'announcements', TRUE,
    'ai_exams', TRUE,
    'analytics', TRUE,
    'api_access', FALSE,
    'custom_branding', TRUE
  ), 99.99, 999.99, TRUE),
  
  ('Enterprise', 'Enterprise plan with all features', 9999, JSON_OBJECT(
    'users', TRUE,
    'classes', TRUE,
    'grades', TRUE,
    'announcements', TRUE,
    'ai_exams', TRUE,
    'analytics', TRUE,
    'api_access', TRUE,
    'custom_branding', TRUE,
    'sso', TRUE,
    'dedicated_support', TRUE
  ), 299.99, 2999.99, TRUE)
ON DUPLICATE KEY UPDATE is_active = is_active;

-- Create Indexes for performance
CREATE INDEX idx_subscription_plan ON subscriptions(plan_id);
CREATE INDEX idx_invoice_subscription ON subscription_invoices(subscription_id);
