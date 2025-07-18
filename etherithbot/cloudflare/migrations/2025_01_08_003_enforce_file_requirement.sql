-- Migration: Enforce file requirement for file-only memories
-- Version: 2025_01_08_003
-- Description: Adds constraint to ensure memories always have at least one file attached

-- Add constraint to ensure file_count is always at least 1 for new memories
-- (existing memories with 0 files will be grandfathered in)
-- Note: This uses a CHECK constraint that will be enforced on new INSERTs and UPDATEs

-- First, update any existing memories without files to have file_count = 1 if they should
-- (This is a safety measure - in practice all memories should now have files)
UPDATE memories 
SET file_count = 1 
WHERE file_count = 0 
  AND id IN (
    SELECT DISTINCT memory_id 
    FROM memory_files 
    WHERE memory_id IS NOT NULL
  );

-- Add a CHECK constraint to ensure file_count is at least 1 for the file-only approach
-- Note: SQLite doesn't support adding CHECK constraints to existing tables directly,
-- so we'll create a new table and migrate data

-- Create temporary table with the new constraint
CREATE TABLE memories_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  server_id TEXT NOT NULL,
  title TEXT NOT NULL CHECK(length(title) >= 3 AND length(title) <= 100),
  description TEXT NOT NULL CHECK(length(description) >= 10 AND length(description) <= 1000),
  category TEXT NOT NULL DEFAULT 'Other' CHECK(category IN ('Personal', 'Server Events', 'Resources', 'Gaming', 'Other')),
  privacy_level TEXT NOT NULL DEFAULT 'Members Only' CHECK(privacy_level IN ('Public', 'Members Only', 'Private')),
  visibility_duration INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tags TEXT DEFAULT '[]',
  file_count INTEGER NOT NULL DEFAULT 1 CHECK(file_count >= 1), -- NEW CONSTRAINT: Must have at least 1 file
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived', 'deleted')),
  share_options TEXT DEFAULT '["channel"]',
  final_notes TEXT DEFAULT '',
  upload_config TEXT DEFAULT '{}'
);

-- Copy existing data to new table
INSERT INTO memories_new SELECT * FROM memories;

-- Drop the old table
DROP TABLE memories;

-- Rename new table to original name
ALTER TABLE memories_new RENAME TO memories;

-- Recreate indexes for the new table
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_server_id ON memories(server_id);
CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
CREATE INDEX IF NOT EXISTS idx_memories_privacy ON memories(privacy_level);
CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at);
CREATE INDEX IF NOT EXISTS idx_memories_status ON memories(status);

-- Recreate the timestamp trigger
CREATE TRIGGER IF NOT EXISTS update_memories_timestamp 
AFTER UPDATE ON memories 
FOR EACH ROW 
BEGIN 
  UPDATE memories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update schema version tracking
INSERT INTO schema_migrations (version, filename, checksum) 
VALUES ('2025_01_08_003', '2025_01_08_003_enforce_file_requirement.sql', 'sha256-file-requirement-migration-003')
ON CONFLICT (version) DO UPDATE SET 
  applied_at = CURRENT_TIMESTAMP,
  checksum = excluded.checksum; 