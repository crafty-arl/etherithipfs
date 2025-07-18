# Memory Weaver Discord Bot - Architecture Plan

## Overview
Memory Weaver is a Discord bot for the Ethereum server that allows users to instantly create and store memories using the `/remember` command. The architecture is modular with streamlined Discord interactions and Cloudflare serverless functions for file processing.

## 🏗️ Project Structure

```
etherithbot/
├── src/
│   ├── commands/              # Discord slash commands
│   │   ├── remember.js        # Main /remember command
│   │   └── index.js           # Command registry
│   ├── popupforms/            # Discord modal forms (optional)
│   │   ├── memoryForm.js      # Memory input modal (DEPRECATED)
│   │   ├── uploadForm.js      # File upload selection modal
│   │   └── confirmationForm.js # Upload confirmation modal
│   ├── handlers/              # Event and interaction handlers
│   │   ├── interactionHandler.js
│   │   └── modalHandler.js
│   ├── utils/                 # Utility functions
│   │   ├── apiClient.js       # Cloudflare API communication
│   │   ├── validation.js      # Input validation
│   │   └── logger.js          # Logging utilities
│   └── bot.js                 # Main bot entry point
├── cloudflare/                # Cloudflare Workers
│   ├── functions/
│   │   ├── upload-handler.js  # File upload processing
│   │   ├── memory-storage.js  # Memory data storage
│   │   └── file-validator.js  # File validation and security
│   ├── wrangler.toml          # Cloudflare configuration
│   └── package.json           # Cloudflare dependencies
├── config/
│   ├── discord.js             # Discord bot configuration
│   ├── cloudflare.js          # Cloudflare settings
│   └── database.js            # Database configuration
├── package.json               # Main project dependencies
├── .env.example               # Environment variables template
└── README.md                  # Project documentation
```

## 🔄 Workflow: /remember Command Process

### Phase 1: Command Initiation & Memory Creation
1. **User triggers `/remember`** with required parameters:
   - **title**: Memory title (required, 3-100 characters)
   - **details**: Memory description (required, 10-1000 characters)  
   - **privacy**: Privacy setting (required, "Members Only" or "Private")
2. **Discord validates** slash command permissions and parameters
3. **Bot validates** input content and creates memory
4. **Memory created immediately** with user-provided values

### Phase 2: Upload Preparation (Optional)
1. **Memory created successfully** with unique ID
2. **User receives confirmation** with memory details
3. **Ready for file uploads** using any supported method

### Phase 3: File Upload & Processing (When files are uploaded)
1. **User uploads files** to the memory
2. **Cloudflare Worker processes** each file:
   - Validates file type and size
   - Scans for malware/security threats
   - Generates thumbnails for media
   - Extracts metadata
3. **Files stored** in permanent storage
4. **Memory updated** with file information

## 📋 Component Details

### Commands (`/src/commands/`)

#### remember.js
```javascript
// Slash command with required parameters for memory creation
- Command registration with Discord API and parameters:
  * title (string, required, 3-100 chars)
  * details (string, required, 10-1000 chars)  
  * privacy (choice, required, members_only/private)
- Permission checks (server member, channel permissions)
- Input validation and content filtering
- Creates memory immediately with user-provided data
- Handles command cooldowns
- Returns memory ID and confirmation
```

### Popup Forms (`/src/popupforms/`) - Optional Components

#### memoryForm.js - REMOVED
```javascript
// No longer used - memories are created instantly
```

#### uploadForm.js
```javascript
// File upload configuration modal
- SelectMenu: File types (Images, Documents, Audio, Video, Mixed)
- NumberInput: Max files (1-10)
- SelectMenu: Storage duration (24h, 7d, 30d, 1y, Permanent)
- TextInput: Tags (comma-separated, optional)
```

#### confirmationForm.js
```javascript
// Final confirmation and preview
- Static text: Memory summary
- Static text: Upload status per file
- SelectMenu: Final privacy setting
- Button: Confirm & Create Memory
- Button: Cancel & Delete Uploads
```

### Cloudflare Functions (`/cloudflare/functions/`)

#### upload-handler.js
```javascript
// Main upload orchestration
- Generate signed upload URLs
- Create temporary storage buckets
- Handle upload webhooks
- Coordinate file processing pipeline
```

#### memory-storage.js
```javascript
// Memory data persistence
- Store memory metadata in D1 database
- Index memories for search functionality
- Handle privacy and permission queries
- Generate shareable memory links
```

#### file-validator.js
```javascript
// Security and validation
- File type validation
- Size limit enforcement
- Malware scanning integration
- Content policy compliance checking
```

## 🔧 Technical Specifications

### Discord Integration
- **Discord.js v14+** for modern Discord API features
- **Slash commands** with autocomplete support
- **Modal interactions** for rich form experiences
- **Embed messages** for beautiful responses
- **File attachments** handled via upload URLs

### Cloudflare Infrastructure
- **Cloudflare Workers** for serverless processing
- **Cloudflare R2** for file storage
- **Cloudflare D1** for metadata database
- **Cloudflare Images** for automatic optimization
- **Wrangler CLI** for deployment automation

### Security Features
- **Rate limiting** per user and server
- **File type restrictions** configurable per server
- **Content scanning** for inappropriate material
- **Encrypted storage** for sensitive memories
- **Access controls** based on Discord roles

### Database Schema
```sql
-- Memories table
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  server_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  privacy_level TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  tags TEXT, -- JSON array
  file_count INTEGER DEFAULT 0
);

-- Files table  
CREATE TABLE memory_files (
  id TEXT PRIMARY KEY,
  memory_id TEXT REFERENCES memories(id),
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  storage_url TEXT NOT NULL,
  thumbnail_url TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Deployment Strategy

### Development Environment
1. **Local Discord bot** with ngrok tunneling
2. **Cloudflare dev environment** with wrangler dev
3. **Test Discord server** for safe testing

### Production Deployment
1. **Discord bot hosting** on VPS/cloud service
2. **Cloudflare Workers** deployed to production
3. **Domain setup** for webhook endpoints
4. **Monitoring** with Cloudflare Analytics

### Environment Variables
```env
# Discord Configuration
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_server_id

# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_R2_BUCKET=memory-weaver-files
CLOUDFLARE_IMAGES_ACCOUNT=your_images_account

# Database
DATABASE_URL=your_d1_database_url

# Security
UPLOAD_SECRET_KEY=random_secure_key
FILE_SIZE_LIMIT=50MB
ALLOWED_FILE_TYPES=jpg,png,gif,pdf,mp3,mp4
```

## 📈 Future Enhancements

### Phase 2 Features
- **Memory search** with advanced filters
- **Memory sharing** between servers
- **Backup and export** functionality
- **Admin dashboard** for memory management
- **Custom memory templates** for specific use cases

### Phase 3 Features
- **AI-powered** memory categorization
- **Automatic transcription** for audio files
- **OCR text extraction** from images
- **Memory timeline** visualization
- **Enhanced file upload interfaces**

This streamlined architecture provides a fast, user-friendly foundation for the Memory Weaver bot with instant memory creation and simplified workflows. 