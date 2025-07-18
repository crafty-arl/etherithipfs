import { Client, GatewayIntentBits, Events, ActivityType, REST, Routes } from 'discord.js';
import { handleInteraction } from './handlers/interactionHandler.js';
import { commands } from './commands/index.js';
import { logger, timeFunction } from './utils/logger.js';
import { healthCheck } from './utils/apiClient.js';
import { cleanupExpiredData } from './utils/validation.js';
import { testIPFSConnection } from './utils/ipfsClient.js';
import { cleanupExpiredInteractions } from './utils/interactionWrapper.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the project root
const envPath = path.resolve(__dirname, '..', '.env');
const envResult = dotenv.config({ path: envPath });

// Log environment loading status
if (envResult.error) {
  console.warn(`⚠️ Could not load .env file from ${envPath}:`, envResult.error.message);
  console.log('🔍 Attempting to load from current working directory...');
  
  // Fallback to default behavior
  const fallbackResult = dotenv.config();
  if (fallbackResult.error) {
    console.warn('⚠️ Could not load .env file from current directory either');
    console.log('ℹ️ Environment variables must be set manually or via system environment');
  } else {
    console.log('✅ Environment variables loaded from current working directory');
  }
} else {
  console.log(`✅ Environment variables loaded from ${envPath}`);
}

/**
 * Memory Weaver Discord Bot
 * Main entry point and bot initialization
 */

// Validate required environment variables
const requiredEnvVars = [
  'DISCORD_TOKEN',
  'DISCORD_CLIENT_ID',
  'CLOUDFLARE_WORKER_URL'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.fatal(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Create Discord client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent // Required for reading message content if needed
  ],
  presence: {
    activities: [
      {
        name: 'memories being created',
        type: ActivityType.Watching
      }
    ],
    status: 'online'
  }
});

/**
 * Bot event handlers
 */

// Bot ready event
client.once(Events.ClientReady, async (readyClient) => {
  logger.info(`🤖 Memory Weaver bot is ready!`);
  logger.info(`📊 Logged in as: ${readyClient.user.tag}`);
  logger.info(`🔗 Bot ID: ${readyClient.user.id}`);
  logger.info(`🌐 Serving ${readyClient.guilds.cache.size} guilds`);

  // Register slash commands with Discord
  try {
    logger.info('🔄 Registering slash commands...');
    
    // Get all command data for registration
    const commandData = [];
    for (const [name, command] of commands) {
      commandData.push(command.data.toJSON());
    }
    
    // Register commands globally
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    await rest.put(
      Routes.applicationCommands(readyClient.user.id),
      { body: commandData }
    );
    
    logger.info(`✅ Successfully registered ${commandData.length} slash commands globally`);
    logger.info(`📝 Commands: ${commandData.map(cmd => cmd.name).join(', ')}`);
    
  } catch (error) {
    logger.error('❌ Failed to register slash commands:', error);
  }

  // Perform startup health checks
  await performStartupChecks();

  // Set up periodic tasks
  setupPeriodicTasks();

  // Update bot status with guild count
  updateBotStatus();
});

// Interaction handler
client.on(Events.InteractionCreate, async (interaction) => {
  await timeFunction('Interaction Processing', async () => {
    await handleInteraction(interaction);
  });
});

// Guild join event
client.on(Events.GuildCreate, (guild) => {
  logger.info(`📈 Joined new guild: ${guild.name} (${guild.id})`);
  logger.info(`👥 Guild has ${guild.memberCount} members`);
  updateBotStatus();
});

// Guild leave event
client.on(Events.GuildDelete, (guild) => {
  logger.info(`📉 Left guild: ${guild.name} (${guild.id})`);
  updateBotStatus();
});

// Error handling
client.on(Events.Error, (error) => {
  logger.error('Discord client error:', error);
});

client.on(Events.Warn, (warning) => {
  logger.warn('Discord client warning:', warning);
});

// Rate limit handling
client.on(Events.RateLimited, (rateLimitData) => {
  logger.warn('Rate limited:', {
    timeout: rateLimitData.timeout,
    limit: rateLimitData.limit,
    method: rateLimitData.method,
    path: rateLimitData.path,
    route: rateLimitData.route
  });
});

// Shard events (for future scaling)
client.on(Events.ShardError, (error, shardId) => {
  logger.error(`Shard ${shardId} error:`, error);
});

client.on(Events.ShardReady, (shardId) => {
  logger.info(`📡 Shard ${shardId} ready`);
});

client.on(Events.ShardDisconnect, (event, shardId) => {
  logger.warn(`📡 Shard ${shardId} disconnected:`, event);
});

/**
 * Startup and health check functions
 */

async function performStartupChecks() {
  logger.info('🔍 Performing startup health checks...');

  // Check Cloudflare API connectivity
  const healthResult = await healthCheck();
  if (healthResult.success) {
    logger.info('✅ Cloudflare API connectivity verified');
  } else {
    logger.error('❌ Cloudflare API health check failed:', healthResult.error);
    logger.warn('⚠️ Bot will continue but file operations may fail');
  }

  // Check IPFS connectivity (server-side)
  const ipfsResult = await testIPFSConnection();
  if (ipfsResult.success) {
    logger.info(`✅ IPFS connectivity verified - Test CID: ${ipfsResult.testCid}`);
    logger.info(`🌐 Gateway: https://ipfs.io/ipfs/${ipfsResult.testCid}`);
  } else {
    logger.error('❌ IPFS health check failed:', ipfsResult.error);
    logger.warn('⚠️ Bot will continue but IPFS backup storage may fail');
    logger.info(`🔧 Attempted to connect to: http://31.220.107.113:5001`);
  }

  // Check environment configuration
  const configCheck = checkConfiguration();
  if (configCheck.valid) {
    logger.info('✅ Configuration validation passed');
  } else {
    logger.warn('⚠️ Configuration issues found:', configCheck.issues);
  }

  // Memory check
  const memoryUsage = process.memoryUsage();
  logger.info('📊 Initial memory usage:', {
    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
  });

  logger.info('✅ Startup checks completed');
}

function checkConfiguration() {
  const issues = [];
  const warnings = [];

  // Check optional but recommended environment variables
  const recommendedEnvVars = [
    'DISCORD_GUILD_ID',
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_API_TOKEN',
    'LOG_LEVEL',
    'NODE_ENV',
    'IPFS_NODE_URL'
  ];

  for (const envVar of recommendedEnvVars) {
    if (!process.env[envVar]) {
      warnings.push(`Recommended environment variable missing: ${envVar}`);
    }
  }

  // Check file size limits
  const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 52428800;
  if (maxFileSize > 100 * 1024 * 1024) { // 100MB
    warnings.push('MAX_FILE_SIZE is very large, consider reducing for better performance');
  }

  // Check cooldown settings
  const commandCooldown = parseInt(process.env.COMMAND_COOLDOWN) || 30;
  if (commandCooldown < 5) {
    warnings.push('COMMAND_COOLDOWN is very low, may lead to rate limiting');
  }

  if (warnings.length > 0) {
    logger.warn('Configuration warnings:', warnings);
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings
  };
}

/**
 * Periodic tasks and maintenance
 */

function setupPeriodicTasks() {
  logger.info('⏰ Setting up periodic tasks...');

  // Update bot status every 10 minutes
  setInterval(updateBotStatus, 10 * 60 * 1000);

  // Cleanup expired data every hour
  setInterval(() => {
    logger.info('🧹 Running periodic cleanup...');
    cleanupExpiredData();
    cleanupExpiredInteractions();
  }, 60 * 60 * 1000);

  // Log memory usage every 30 minutes
  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    logger.info('📊 Memory usage check:', {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
    });
  }, 30 * 60 * 1000);

  // Health check every 5 minutes
  setInterval(async () => {
    const healthResult = await healthCheck();
    if (!healthResult.success) {
      logger.error('⚠️ Periodic health check failed:', healthResult.error);
    }
  }, 5 * 60 * 1000);

  // IPFS health check every 10 minutes
  setInterval(async () => {
    const ipfsResult = await checkIPFSHealth();
    if (!ipfsResult.healthy) {
      logger.error('⚠️ Periodic IPFS health check failed:', ipfsResult.error);
    } else {
      logger.debug(`✅ IPFS connectivity verified - Version: ${ipfsResult.version}`);
    }
  }, 10 * 60 * 1000);

  logger.info('✅ Periodic tasks configured');
}

function updateBotStatus() {
  if (!client.user) return;

  const guildCount = client.guilds.cache.size;
  const userCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

  client.user.setActivity(`${guildCount} servers | ${userCount} users`, {
    type: ActivityType.Watching
  });

  logger.info(`📊 Status updated: ${guildCount} guilds, ${userCount} users`);
}

/**
 * Graceful shutdown handling
 */

async function gracefulShutdown(signal) {
  logger.info(`🛑 Received ${signal}, starting graceful shutdown...`);

  try {
    // Set bot status to away
    if (client.user) {
      await client.user.setStatus('dnd');
      await client.user.setActivity('Shutting down...', { type: ActivityType.Playing });
    }

    // Close Discord connection
    await client.destroy();
    logger.info('✅ Discord client disconnected');

    // Cleanup any pending operations
    await cleanupExpiredData();
    logger.info('✅ Cleanup completed');

    logger.info('✅ Graceful shutdown completed');
    process.exit(0);

  } catch (error) {
    logger.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

/**
 * Error handling for uncaught exceptions
 */

process.on('uncaughtException', (error) => {
  logger.fatal('💥 Uncaught Exception:', error);
  
  // Try to notify about the error before exiting
  if (client.user) {
    client.user.setStatus('dnd').catch(() => {});
  }
  
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Don't exit on unhandled rejections, just log them
  // In production, you might want to exit depending on severity
});

/**
 * Development helpers
 */

if (process.env.NODE_ENV === 'development') {
  // Enable more verbose logging in development
  logger.info('🛠️ Development mode enabled');

  // Log all events in development (commented out to avoid spam)
  // client.on('debug', (info) => {
  //   logger.debug('Discord debug:', info);
  // });
}

/**
 * Start the bot
 */

async function startBot() {
  try {
    logger.info('🚀 Starting Memory Weaver bot...');
    
    // Validate token format
    const token = process.env.DISCORD_TOKEN;
    if (!token.startsWith('Bot ') && !token.includes('.')) {
      logger.warn('⚠️ Discord token format may be incorrect');
    }

    // Login to Discord
    await client.login(token);
    
  } catch (error) {
    logger.fatal('💥 Failed to start bot:', error);
    
    if (error.code === 'TokenInvalid') {
      logger.fatal('❌ Invalid Discord bot token');
    } else if (error.code === 'DisallowedIntents') {
      logger.fatal('❌ Bot is missing required intents');
    } else {
      logger.fatal('❌ Unexpected startup error');
    }
    
    process.exit(1);
  }
}

// Start the bot
startBot();

// Export client for potential external access
export { client };

// Export startup health check function for testing
export { performStartupChecks };

// Log the startup
logger.info('📝 Memory Weaver bot initialization complete');
logger.info(`🌟 Bot designed for Ethereum server community`);
logger.info(`💾 Storing memories with Cloudflare infrastructure`);
logger.info(`🔗 Ready to create memories with /remember command`); 