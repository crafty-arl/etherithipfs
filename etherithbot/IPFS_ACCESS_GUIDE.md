# 🌐 IPFS Access Guide

## For New Files (Current Upload)
When you upload a file using `/remember`, the bot will now show IPFS information directly in the response:

```
📎 File + IPFS
**filename.jpg**
Size: 1.2 MB
Type: image/jpeg

🌐 IPFS Access:
• CID: `QmSampleCIDHere123456789`
• Gateway: [View on IPFS](https://gateway.ipfs.io/ipfs/QmSampleCIDHere123456789)
• Direct: http://31.220.107.113:5001/ipfs/QmSampleCIDHere123456789
```

## For Existing Files

### Method 1: API Call
Use your browser or curl to get memory details:

```bash
# Replace MEMORY_ID with your actual memory ID
curl "https://memory-weaver-workers-production.carl-6e7.workers.dev/api/memory/MEMORY_ID"
```

### Method 2: List All Recent Memories
```bash
curl "https://memory-weaver-workers-production.carl-6e7.workers.dev/api/memories"
```

## API Response Format
```json
{
  "success": true,
  "memory": {
    "id": "memory_123...",
    "title": "Your Memory Title",
    "files": [
      {
        "filename": "document.pdf",
        "ipfs_cid": "QmYourCIDHere",
        "ipfs_url": "http://31.220.107.113:5001/ipfs/QmYourCIDHere",
        "ipfs": {
          "cid": "QmYourCIDHere",
          "url": "http://31.220.107.113:5001/ipfs/QmYourCIDHere",
          "gateway": "https://gateway.ipfs.io/ipfs/QmYourCIDHere"
        }
      }
    ]
  }
}
```

## IPFS Access Methods

### 1. **Direct Node Access**
```
http://31.220.107.113:5001/ipfs/YOUR_CID_HERE
```

### 2. **Public Gateway Access**
```
https://gateway.ipfs.io/ipfs/YOUR_CID_HERE
https://ipfs.io/ipfs/YOUR_CID_HERE
https://cloudflare-ipfs.com/ipfs/YOUR_CID_HERE
```

### 3. **Local IPFS Node** (if you have one)
```
http://localhost:8080/ipfs/YOUR_CID_HERE
```

## Quick Test
Try this URL to test our IPFS node:
```
http://31.220.107.113:5001/api/v0/version
```

## Next Steps
1. **Upload a new file** using `/remember` - you'll see IPFS info immediately!
2. **Use the API** to retrieve existing memory IPFS data
3. **Access files** using any of the gateway methods above 