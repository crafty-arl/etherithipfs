# Etherith IPFS API

This Next.js app connects to your local IPFS daemon to provide real file pinning and retrieval.

## Prerequisites

1. **IPFS Kubo installed** (you already have v0.35.0)
2. **IPFS daemon running** on localhost:5001

## Quick Start

1. **Start your IPFS daemon:**
   ```bash
   ipfs daemon
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Visit the app:**
   ```
   http://localhost:3000
   ```

## API Endpoints

### Check IPFS Status
```
GET /api/status
```
Returns IPFS daemon status and version info.

### Upload File
```
POST /api/upload
Content-Type: multipart/form-data

Body: file (File object)
```
Uploads and pins file to IPFS, returns CID and metadata.

### List Files
```
GET /api/files
```
Returns list of all uploaded files with metadata.

## File Storage

- **IPFS**: Files are pinned to your local IPFS node
- **Metadata**: Stored in `data/files.json` (simple JSON for MVP)
- **Gateway**: Files accessible via `http://127.0.0.1:8080/ipfs/{CID}`

## IPFS Node Configuration

Your IPFS daemon should be running with:
- **API**: `127.0.0.1:5001`
- **Gateway**: `127.0.0.1:8080`
- **PeerID**: `12D3KooWDXXQPAfRme8tZt4JrKTeGisFVtfa5fffQ8RdS88V4zK3`

## Production Deployment

For production, update the configuration in the API routes:
- Replace `127.0.0.1:5001` with your production IPFS API endpoint
- Replace `127.0.0.1:8080` with `gateway.etherith.io`
- Replace JSON file storage with a proper database (PostgreSQL, MongoDB)

## Troubleshooting

### "IPFS daemon is not running"
1. Make sure IPFS daemon is started: `ipfs daemon`
2. Check if port 5001 is accessible
3. Verify IPFS installation: `ipfs version`

### Files not loading
1. Check the `data/files.json` file exists
2. Verify file permissions in the `data/` directory
3. Check browser console for API errors

### Gateway not accessible
1. Ensure IPFS gateway is running on port 8080
2. Try accessing a known CID: `http://127.0.0.1:8080/ipfs/{CID}`
3. Check IPFS daemon logs for gateway errors

## Current Features

✅ Real IPFS pinning via local daemon  
✅ File upload with drag & drop  
✅ File listing with metadata  
✅ CID copying and sharing  
✅ Local gateway download links  
✅ Error handling and status messages  
✅ Etherith branding and UX  

## Next Steps

🔄 Replace JSON storage with database  
🔄 Add user authentication  
🔄 Deploy to production infrastructure  
🔄 Add file deletion/unpinning  
🔄 Implement file search and filtering  
🔄 Add usage analytics 