-- Migration: Add storage_key column to memory_files table
-- Version: 2025_01_08_002
-- Description: Adds storage_key column to store R2 object keys for file retrieval

-- Add storage_key column to store the R2 object key for file storage
ALTER TABLE memory_files ADD COLUMN storage_key TEXT;

-- Create index on storage_key for efficient lookups
CREATE INDEX IF NOT EXISTS idx_files_storage_key ON memory_files(storage_key);

-- Update schema version tracking
INSERT INTO schema_migrations (version, filename, checksum) 
VALUES ('2025_01_08_002', '2025_01_08_002_add_storage_key_column.sql', 'sha256-storage-key-migration-002')
ON CONFLICT (version) DO UPDATE SET 
  applied_at = CURRENT_TIMESTAMP,
  checksum = excluded.checksum; 