-- Expand banner_url and profile_image_url fields to support base64 image data

ALTER TABLE faculty_profiles 
MODIFY COLUMN banner_url LONGTEXT,
MODIFY COLUMN profile_image_url LONGTEXT;

ALTER TABLE faculty_posts 
MODIFY COLUMN media_url LONGTEXT;
