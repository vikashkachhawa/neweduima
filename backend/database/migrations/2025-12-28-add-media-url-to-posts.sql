-- Add media_url column to school_posts if it doesn't exist
ALTER TABLE school_posts ADD COLUMN media_url VARCHAR(500) AFTER post_type;
