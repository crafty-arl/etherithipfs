-- Migration: Add IPFS columns to memory_files table
-- Version: 2025_01_08_001
-- Description: Adds ipfs_cid and ipfs_url columns to support IPFS storage alongside R2

-- Add IPFS CID column to store the Content Identifier from IPFS
ALTER TABLE memory_files ADD COLUMN ipfs_cid TEXT;

-- Add IPFS URL column to store the full IPFS gateway URL for easy access
ALTER TABLE memory_files ADD COLUMN ipfs_url TEXT;

-- Create index on ipfs_cid for efficient lookups
CREATE INDEX IF NOT EXISTS idx_files_ipfs_cid ON memory_files(ipfs_cid); 