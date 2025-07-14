import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Configuration for your Tailscale IPFS node
const IPFS_API_URL = 'http://100.75.134.128:5001/api/v0';
const ETHERITH_GATEWAY = 'http://100.75.134.128:8080'; // Your Tailscale gateway

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

// Save files to JSON storage
function saveFiles(files: FileRecord[]) {
  ensureDataDirectory();
  try {
    fs.writeFileSync(FILES_DB_PATH, JSON.stringify(files, null, 2));
  } catch (error) {
    console.error('Error saving files:', error);
  }
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function POST(req: NextRequest) {
  try {
    // Get the raw form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to IPFS using the /add endpoint
    const formDataForIPFS = new FormData();
    const blob = new Blob([buffer], { type: file.type });
    formDataForIPFS.append('file', blob, file.name);

    const ipfsResponse = await axios.post(`${IPFS_API_URL}/add`, formDataForIPFS, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      params: {
        pin: 'true', // Pin the file automatically
        'cid-version': '1', // Use CIDv1
      },
    });

    const ipfsResult = ipfsResponse.data;
    const cid = ipfsResult.Hash;

    // Create file record
    const fileRecord: FileRecord = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      filename: file.name,
      cid: cid,
      uploadedAt: new Date().toISOString(),
      size: file.size,
      sizeFormatted: formatFileSize(file.size),
    };

    // Save to storage
    const files = loadFiles();
    files.unshift(fileRecord); // Add to beginning of array
    saveFiles(files);

    // Return success response
    return NextResponse.json({
      success: true,
      cid: cid,
      filename: file.name,
      size: fileRecord.size.toString(),
      sizeFormatted: fileRecord.sizeFormatted,
      gatewayUrl: `${ETHERITH_GATEWAY}/ipfs/${cid}`,
      publicGatewayUrl: `https://gateway.etherith.io/ipfs/${cid}`, // For display purposes
      uploadedAt: fileRecord.uploadedAt,
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Handle specific IPFS errors
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        return NextResponse.json(
          { error: 'IPFS node is not running. Please start your IPFS daemon.' },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: `IPFS error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to upload file. Please try again.' },
      { status: 500 }
    );
  }
} 