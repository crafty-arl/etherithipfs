import { REST, Routes } from 'discord.js';
import { getCommandData } from './commands/index.js';
import { logger } from './utils/logger.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the project root (same as bot.js)
const envPath = path.resolve(__dirname, '..', '.env');
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  console.warn(`⚠️ Could not load .env file from ${envPath}:`, envResult.error.message);
  // Fallback to default behavior
  dotenv.config();
} else {
  console.log(`✅ Environment variables loaded from ${envPath}`);
}

/**
 * Deploy Discord slash commands
 * This script registers all bot commands with Discord's API
 */

// Validate required environment variables
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID; // Optional for guild-specific deployment

if (!token) {
  logger.fatal('Missing DISCORD_TOKEN environment variable');
  process.exit(1);
}

if (!clientId) {
  logger.fatal('Missing DISCORD_CLIENT_ID environment variable');
  process.exit(1);
}

// Create REST instance
const rest = new REST({ version: '10' }).setToken(token);

/**
 * Deploy commands to Discord
 */
async function deployCommands() {
  try {
    logger.info('🚀 Starting deployment of application commands...');

    // Get all command data
    const commands = getCommandData();
    logger.info(`📋 Found ${commands.length} commands to deploy:`, 
      commands.map(cmd => cmd.name)
    );

    // Determine deployment route
    let route;
    let deploymentType;

    if (guildId) {
      // Deploy to specific guild (faster for development)
      route = Routes.applicationGuildCommands(clientId, guildId);
      deploymentType = `guild ${guildId}`;
    } else {
      // Deploy globally (takes up to 1 hour to propagate)
      route = Routes.applicationCommands(clientId);
      deploymentType = 'globally';
    }

    logger.info(`📡 Deploying commands ${deploymentType}...`);

    // Deploy commands
    const data = await rest.put(route, { body: commands });

    logger.info(`✅ Successfully deployed ${data.length} commands ${deploymentType}`);
    
    // Log details of deployed commands
    data.forEach(command => {
      logger.info(`  ✓ ${command.name}: ${command.description}`);
    });

    logger.info('🎉 Command deployment completed successfully!');

    if (!guildId) {
      logger.info('ℹ️ Global commands may take up to 1 hour to appear in all servers');
    }

  } catch (error) {
    logger.error('❌ Failed to deploy commands:', error);
    
    if (error.status === 401) {
      logger.error('🔑 Invalid bot token - check DISCORD_TOKEN');
    } else if (error.status === 403) {
      logger.error('🚫 Bot lacks permissions or invalid client ID');
    } else if (error.status === 404) {
      logger.error('🔍 Invalid guild ID or bot not in guild');
    } else {
      logger.error('💥 Unexpected error during deployment');
    }
    
    process.exit(1);
  }
}

/**
 * Delete all commands (cleanup utility)
 */
async function deleteAllCommands() {
  try {
    logger.info('🗑️ Deleting all application commands...');

    let route;
    let deploymentType;

    if (guildId) {
      route = Routes.applicationGuildCommands(clientId, guildId);
      deploymentType = `guild ${guildId}`;
    } else {
      route = Routes.applicationCommands(clientId);
      deploymentType = 'globally';
    }

    // Delete all commands by setting empty array
    const data = await rest.put(route, { body: [] });

    logger.info(`✅ Successfully deleted all commands ${deploymentType}`);
    logger.info('🎉 Command cleanup completed!');

  } catch (error) {
    logger.error('❌ Failed to delete commands:', error);
    process.exit(1);
  }
}

/**
 * List existing commands
 */
async function listCommands() {
  try {
    logger.info('📋 Fetching existing commands...');

    let route;
    let deploymentType;

    if (guildId) {
      route = Routes.applicationGuildCommands(clientId, guildId);
      deploymentType = `guild ${guildId}`;
    } else {
      route = Routes.applicationCommands(clientId);
      deploymentType = 'global';
    }

    const commands = await rest.get(route);

    logger.info(`📊 Found ${commands.length} existing ${deploymentType} commands:`);
    
    if (commands.length === 0) {
      logger.info('  (No commands currently deployed)');
    } else {
      commands.forEach(command => {
        logger.info(`  • ${command.name}: ${command.description}`);
        logger.info(`    ID: ${command.id}, Version: ${command.version}`);
      });
    }

  } catch (error) {
    logger.error('❌ Failed to list commands:', error);
    process.exit(1);
  }
}

/**
 * Main execution logic
 */

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'deploy':
    deployCommands();
    break;
    
  case 'delete':
    deleteAllCommands();
    break;
    
  case 'list':
    listCommands();
    break;
    
  case 'help':
    console.log(`
Memory Weaver Command Deployment Script

Usage: node deploy-commands.js [command]

Commands:
  deploy    Deploy all commands to Discord (default)
  delete    Delete all existing commands
  list      List all existing commands
  help      Show this help message

Environment Variables:
  DISCORD_TOKEN        Bot token (required)
  DISCORD_CLIENT_ID    Application client ID (required)
  DISCORD_GUILD_ID     Guild ID for guild-specific deployment (optional)

Examples:
  npm run deploy:commands          # Deploy commands
  node deploy-commands.js deploy   # Same as above
  node deploy-commands.js delete   # Delete all commands
  node deploy-commands.js list     # List existing commands
`);
    break;
    
  default:
    // Default action is deploy
    deployCommands();
}

// Handle script errors
process.on('unhandledRejection', (error) => {
  logger.error('💥 Unhandled promise rejection in deploy script:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught exception in deploy script:', error);
  process.exit(1);
}); 