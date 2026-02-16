-- Add is_shared flag to lessons table for parent visibility control

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT true;

-- Add index for faster filtering in ShareView
CREATE INDEX IF NOT EXISTS idx_lessons_is_shared ON lessons(is_shared);

-- Add comment for documentation
COMMENT ON COLUMN lessons.is_shared IS 'Whether this lesson is visible to parents via share link';
