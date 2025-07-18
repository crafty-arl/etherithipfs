# Memory Weaver Discord Bot 🧠✨

A professional Discord bot for the Ethereum server that allows users to create, store, and manage memories with file uploads using Cloudflare's infrastructure.

## 🌟 Features

- **`/remember` Command**: Create memories instantly with title, details, privacy settings, categories, tags, and optional file attachments
- **Required Parameters**: Title, details, privacy, and category selection
- **Optional Parameters**: Tags and file attachments (images, documents, audio, video up to 10MB)
- **Instant Creation**: Memories created immediately with optional file processing
- **Input Validation**: Content length and appropriateness checking
- **File Upload Processing**: Secure file handling via Cloudflare R2 storage
- **Privacy Controls**: Members-only and private memory settings
- **File Type Support**: Images, documents, audio, video files
- **Automatic Processing**: Thumbnail generation, metadata extraction, security scanning
- **Rate Limiting**: Prevents spam and abuse
- **Search & Discovery**: Find memories by tags, categories, and content

## 📝 Usage Examples

```
/remember title:"Team Meeting Notes" details:"Discussed project roadmap and sprint planning for Q4" privacy:members_only category:notes tags:"meeting, planning" file:[document.pdf]

/remember title:"Personal Reminder" details:"Remember to update portfolio with latest projects" privacy:private category:personal tags:"todo, portfolio"

/remember title:"Server Event" details:"Amazing gaming tournament - everyone had a great time!" privacy:members_only category:gaming tags:"tournament, fun" file:[screenshot.png]
```

## 🏗️ Architecture

```
Discord Bot (Node.js) ←→ Cloudflare Workers ←→ Cloudflare R2/D1
       ↓                        ↓                    ↓
  Modal Forms              File Processing       File Storage
  Slash Commands           Security Scanning     Metadata DB
  User Interactions        URL Generation        Session Management
```

## 📋 Prerequisites

- **Node.js 18+**
- **Discord Application** with bot token
- **Cloudflare Account** with Workers/R2/D1 access
- **Git** for version control

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd etherithbot
npm install
```

### 2. Environment Configuration

Copy the environment template:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_application_id
DISCORD_GUILD_ID=your_server_id
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
# ... see .env.example for all options
```

### 3. Discord Bot Setup

1. Create application at [Discord Developer Portal](https://discord.com/developers/applications)
2. Create bot and copy token to `DISCORD_TOKEN`
3. Enable required intents: `applications.commands`
4. Invite bot to server with `applications.commands` scope

### 4. Cloudflare Setup

```bash
cd cloudflare
npm install

# Create required resources
npm run db:create
npm run kv:create
npm run r2:create

# Deploy workers
npm run deploy
```

### 5. Deploy Discord Commands

```bash
npm run deploy:commands
```

### 6. Start the Bot

```bash
npm run dev  # Development mode with auto-reload
npm start    # Production mode
```

## 📁 Project Structure

```
etherithbot/
├── src/
│   ├── commands/              # Discord slash commands
│   │   ├── remember.js        # Main /remember command
│   │   └── index.js           # Command registry
│   ├── popupforms/            # Discord modal forms (optional)
│   │   ├── memoryForm.js      # Memory input modal (DEPRECATED)
│   │   ├── uploadForm.js      # File upload configuration
│   │   └── confirmationForm.js # Final confirmation
│   ├── handlers/              # Event and interaction handlers
│   │   ├── interactionHandler.js
│   │   └── modalHandler.js
│   ├── utils/                 # Utility functions
│   │   ├── apiClient.js       # Cloudflare API client
│   │   ├── validation.js      # Input validation
│   │   └── logger.js          # Logging utilities
│   └── bot.js                 # Main bot entry point
├── cloudflare/                # Cloudflare Workers
│   ├── functions/
│   │   ├── upload-handler.js  # File upload processing
│   │   ├── memory-storage.js  # Memory data storage
│   │   └── file-validator.js  # File validation & security
│   ├── wrangler.toml          # Cloudflare configuration
│   └── package.json           # Cloudflare dependencies
├── config/                    # Configuration files
├── package.json               # Main project dependencies
└── README.md                  # This file
```

## 🔄 Workflow Process

### User Experience Flow

1. **User runs `/remember`** with required parameters:
   - `title`: "My Memory Title"
   - `details`: "Detailed description of the memory"
   - `privacy`: "Members Only" or "Private"
   - `category`: Category selection (Gaming, Learning, Events, etc.)
   - `tags`: Optional comma-separated tags
   - `file`: Optional file attachment (images, documents, audio, video)
2. **Discord validates** parameters and permissions
3. **Bot validates** input content (length, appropriateness)
4. **Memory created immediately** with provided information
5. **Confirmation message** shows memory ID and details
6. **File uploads** are optional and can be added later
7. **Processing** happens when files are uploaded:
   - File validation
   - Security scanning
   - Thumbnail generation
   - Metadata extraction

### Technical Flow

```mermaid
graph TD
    A[/remember Command] --> B[Memory Form Modal]
    B --> C[Upload Configuration Modal]
    C --> D[Generate Upload Session]
    D --> E[Cloudflare Worker]
    E --> F[Generate Signed URLs]
    F --> G[User Upload Files]
    G --> H[Process Files]
    H --> I[Store in R2]
    I --> J[Save Metadata to D1]
    J --> K[Confirmation Modal]
    K --> L[Memory Created]
```

## 🛠️ Development

### Running in Development

```bash
# Terminal 1: Discord Bot
npm run dev

# Terminal 2: Cloudflare Workers
npm run cloudflare:dev
```

### Testing

```bash
npm test              # Run all tests
npm run lint          # Check code style
npm run lint:fix      # Fix linting issues
```

### Database Migrations

```bash
cd cloudflare
npm run db:migrate    # Apply database migrations
```

## 🔧 Configuration

### File Upload Limits

Modify in `.env`:
```env
MAX_FILE_SIZE=52428800      # 50MB
MAX_FILES_PER_MEMORY=10     # Files per memory
ALLOWED_FILE_TYPES=jpg,png,pdf,mp4  # Comma-separated
```

### Rate Limiting

```env
COMMAND_COOLDOWN=30         # Seconds between commands
MAX_MEMORIES_PER_DAY=20     # Daily limit per user
```

### Storage Durations

Users can choose from:
- 24 hours
- 7 days  
- 30 days
- 1 year
- Permanent

## 🔒 Security Features

- **File Type Validation**: Only allowed file types accepted
- **Size Limits**: Configurable maximum file sizes
- **Content Scanning**: Malware and inappropriate content detection
- **Rate Limiting**: Prevents spam and abuse
- **Access Controls**: Role-based permissions
- **Encrypted Storage**: Sensitive data encryption
- **Audit Logging**: All actions logged for security

## 📊 Monitoring

### Cloudflare Analytics
- Worker execution metrics
- R2 storage usage
- D1 database queries
- Error rates and performance

### Bot Metrics
- Command usage statistics
- User engagement analytics
- Error tracking and logging
- Performance monitoring

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**:
   ```bash
   NODE_ENV=production
   DEBUG_MODE=false
   ```

2. **Cloudflare Workers**:
   ```bash
   cd cloudflare
   wrangler deploy --env production
   ```

3. **Discord Bot Hosting**:
   - Deploy to VPS, cloud service, or container platform
   - Ensure 24/7 uptime
   - Configure process manager (PM2, systemd)

### Domain Configuration

Configure custom domain for Cloudflare Workers:
```toml
[env.production]
route = "api.memory-weaver.yourserver.com/*"
```

## 📈 Scaling Considerations

- **Cloudflare Workers**: Auto-scaling serverless functions
- **R2 Storage**: Unlimited scalable object storage  
- **D1 Database**: Serverless SQL database with automatic scaling
- **Bot Sharding**: For servers with 2000+ guilds
- **CDN Integration**: Global file delivery via Cloudflare

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in this repository
- Join the Ethereum server Discord
- Contact the development team

## 🔮 Roadmap

### Phase 1 (Current)
- ✅ Basic `/remember` command
- ✅ File upload processing
- ✅ Modal forms implementation

### Phase 2 (Planned)
- 🔄 Memory search functionality
- 🔄 Memory sharing between servers
- 🔄 Advanced admin controls

### Phase 3 (Future)
- 🔮 AI-powered categorization
- 🔮 OCR text extraction
- 🔮 Audio transcription
- 🔮 Memory timeline visualization

---

Built with ❤️ for the Ethereum Discord community 