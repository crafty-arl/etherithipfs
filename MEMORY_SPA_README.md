# Memory Weaver SPA - Demo Version

## Overview

The demo version has been transformed into a beautiful Single Page Application (SPA) for displaying memories after authentication. Users can now view their personal memories and community memories in an aesthetically pleasing interface that pulls data from R2 storage and IPFS networks.

## Features

### 🎨 Beautiful UI/UX
- **Modern Design**: Clean, minimalist interface with subtle Afrofuturism-inspired backgrounds
- **Responsive Layout**: Works perfectly on desktop, tablet, and mobile devices
- **Smooth Animations**: Hover effects, transitions, and loading states
- **Accessibility**: Proper ARIA labels and keyboard navigation

### 📱 Memory Display
- **My Memories**: View personal memories created by the authenticated user
- **Our Memories**: View community memories shared within the Discord server
- **Memory Cards**: Beautiful card-based layout with file previews
- **Detail Modal**: Full-screen modal for viewing complete memory information

### 🔍 Advanced Features
- **Search & Filtering**: Filter by category, search by title/description
- **File Preview**: Image previews with fallback icons for other file types
- **IPFS Integration**: Display IPFS CID and gateway links
- **Statistics**: Real-time memory counts and activity stats

### 🛡️ Security & Privacy
- **Authentication Required**: All memory access requires Discord authentication
- **Privacy Controls**: Respects memory privacy settings (Public, Members Only, Private)
- **Owner Permissions**: Only memory owners can delete their memories

## Architecture

### Frontend Components
```
app/
├── components/
│   ├── MemoryCard.tsx          # Individual memory card component
│   ├── MemoryGrid.tsx          # Grid layout for memory display
│   ├── MemoryDetailModal.tsx   # Full memory detail view
│   └── MemoryDisplay.tsx       # Main SPA interface
├── types/
│   └── memory.ts               # TypeScript interfaces
├── utils/
│   └── memoryApi.ts            # API client for memory operations
└── api/
    └── memories/
        └── route.ts            # API proxy to Cloudflare Workers
```

### Data Flow
1. **Authentication**: User authenticates via Discord OAuth
2. **API Requests**: Frontend makes requests to `/api/memories` proxy
3. **Cloudflare Workers**: Proxy forwards requests to memory storage workers
4. **R2 + IPFS**: Workers fetch data from R2 storage and IPFS network
5. **Response**: Data flows back through the same path to the UI

## Setup Instructions

### 1. Environment Configuration
Copy `.env.local.example` to `.env.local` and configure:

```bash
# Memory Weaver API Configuration
MEMORY_API_URL=https://your-memory-weaver-worker.your-subdomain.workers.dev

# Discord Configuration (already configured)
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/discord/callback
```

### 2. Cloudflare Workers Deployment
Ensure your Memory Weaver Cloudflare Workers are deployed and accessible:
- Main worker: `https://your-memory-weaver-worker.your-subdomain.workers.dev`
- R2 storage bucket configured
- D1 database with memory tables
- IPFS integration working

### 3. Start Development Server
```bash
npm run dev
```

### 4. Access the Demo
1. Navigate to `http://localhost:3000`
2. Click "Connect with Discord"
3. Authenticate with Discord
4. You'll be redirected to the demo page with the new SPA interface

## Usage Guide

### Viewing Memories
1. **My Memories Tab**: Shows memories you've created
2. **Our Memories Tab**: Shows community memories (requires guild ID)
3. **Memory Cards**: Click any card to view full details
4. **File Preview**: Images show thumbnails, other files show icons

### Filtering & Search
1. **Category Filter**: Select from predefined categories
2. **Search**: Type to search memory titles and descriptions
3. **Clear Filters**: Click "Clear Filters" to reset

### Memory Details
1. **File Information**: View file name, size, and type
2. **Storage Details**: See R2 and IPFS storage information
3. **IPFS Links**: Click to view files on IPFS gateway
4. **Delete**: Memory owners can delete their memories

### Navigation
- **Header**: Shows user info and logout button
- **Tabs**: Switch between personal and community memories
- **Stats**: Real-time memory counts
- **Responsive**: Works on all screen sizes

## Technical Details

### API Endpoints
The SPA communicates with Cloudflare Workers through these endpoints:
- `GET /api/memory/search` - Search personal memories
- `POST /api/memory/server` - Get community memories
- `GET /api/memory/{id}` - Get specific memory
- `DELETE /api/memory/{id}` - Delete memory
- `GET /api/memory/stats` - Get memory statistics
- `GET /api/health` - Health check

### Data Models
```typescript
interface Memory {
  id: string;
  userId: string;
  guildId: string;
  title: string;
  description: string;
  category: string;
  privacy: 'public' | 'members_only' | 'private';
  tags: string[];
  fileCount: number;
  createdAt: string;
  updatedAt: string;
  storageKey?: string;
  ipfsCid?: string;
  ipfsUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  contentType?: string;
}
```

### Styling
- **Tailwind CSS**: Utility-first styling
- **Custom Utilities**: Line-clamp for text truncation
- **Responsive Design**: Mobile-first approach
- **Dark Mode Ready**: CSS variables for theming

## Troubleshooting

### Common Issues

1. **No Memories Displayed**
   - Check Cloudflare Worker deployment
   - Verify API URL in environment variables
   - Check browser console for errors

2. **Authentication Issues**
   - Ensure Discord OAuth is properly configured
   - Check session cookies and redirect URIs

3. **File Preview Not Working**
   - Verify R2 storage bucket permissions
   - Check file URLs in memory data
   - Ensure CORS is configured

4. **IPFS Links Not Working**
   - Verify IPFS gateway is accessible
   - Check IPFS CID format
   - Ensure IPFS integration is working

### Debug Mode
Enable debug logging by checking browser console for:
- API request/response logs
- Error messages
- Network request details

## Future Enhancements

### Planned Features
- **Real-time Updates**: WebSocket integration for live memory updates
- **Advanced Search**: Full-text search with filters
- **Memory Collections**: Group memories into albums
- **Sharing**: Direct sharing of memories via links
- **Analytics**: Memory usage statistics and insights

### Performance Optimizations
- **Image Optimization**: Automatic image resizing and compression
- **Lazy Loading**: Load memories as needed
- **Caching**: Implement memory caching strategies
- **CDN**: Use CDN for static assets

## Support

For technical support or questions about the Memory Weaver SPA:
1. Check the browser console for error messages
2. Verify all environment variables are set correctly
3. Ensure Cloudflare Workers are deployed and accessible
4. Test Discord authentication flow

The SPA provides a modern, user-friendly interface for accessing and managing digital memories stored securely on R2 and IPFS networks. 