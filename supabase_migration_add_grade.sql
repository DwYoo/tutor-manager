-- Add grade column to scores table for 등급제 support (수능/내신 등급 1-9)
ALTER TABLE scores ADD COLUMN grade INTEGER;
