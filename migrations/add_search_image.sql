-- Migration: Add search_image field to settings table

-- Check if column exists and add it if not
ALTER TABLE settings ADD COLUMN search_image VARCHAR(255) AFTER home_description;
