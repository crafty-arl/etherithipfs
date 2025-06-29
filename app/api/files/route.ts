import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Simple file-based storage for MVP (replace with database later)
const FILES_DB_PATH = path.join(process.cwd(), 'data', 'files.json');

interface FileRecord {
  id: string;
  filename: string;
  cid: string;
  uploadedAt: string;
  size: number;
  sizeFormatted: string;
}

// Ensure data directory exists
function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Load files from JSON storage
function loadFiles(): FileRecord[] {
  ensureDataDirectory();
  try {
    if (fs.existsSync(FILES_DB_PATH)) {
      const data = fs.readFileSync(FILES_DB_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading files:', error);
  }
  return [];
}

export async function GET(req: NextRequest) {
  try {
    const files = loadFiles();
    
    // Convert the stored files to the format expected by the frontend
    const formattedFiles = files.map(file => ({
      id: file.id,
      filename: file.filename,
      cid: file.cid,
      uploadedAt: file.uploadedAt,
      size: file.size.toString(),
      sizeFormatted: file.sizeFormatted,
    }));

    return NextResponse.json({
      success: true,
      files: formattedFiles,
    });

  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
} 