-- Add school_id to announcements for school-level announcements

ALTER TABLE announcements ADD COLUMN school_id INT AFTER id;

-- Create indices for performance
CREATE INDEX idx_school_announcements ON announcements(school_id, created_at DESC);
CREATE INDEX idx_active_school ON announcements(is_active, school_id);
