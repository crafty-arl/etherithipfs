import { Collection } from 'discord.js';
import * as rememberCommand from './remember.js';
import * as pingCommand from './ping.js';
import { logger } from '../utils/logger.js';

// Create commands collection
export const commands = new Collection();

// Register all commands
const commandModules = [
  rememberCommand,
  pingCommand
];

// Initialize commands collection
commandModules.forEach(command => {
  if ('data' in command && 'execute' in command) {
    commands.set(command.data.name, command);
    logger.info(`✅ Registered command: ${command.data.name}`);
  } else {
    logger.warn(`❌ Command missing required "data" or "execute" property:`, command);
  }
});

/**
 * Get all command data for Discord API registration
 * @returns {Array} Array of command data objects
 */
export function getCommandData() {
  return commands.map(command => command.data.toJSON());
}

/**
 * Get command by name
 * @param {string} commandName - Name of the command
 * @returns {Object|null} Command object or null if not found
 */
export function getCommand(commandName) {
  return commands.get(commandName) || null;
}

/**
 * Handle command execution
 * @param {Object} interaction - Discord interaction object
 */
export async function handleCommand(interaction) {
  const command = commands.get(interaction.commandName);

  if (!command) {
    logger.warn(`Unknown command: ${interaction.commandName}`);
    await interaction.reply({
      content: '❌ Unknown command. Please check the available commands.',
      flags: 64
    });
    return;
  }

  try {
    await command.execute(interaction);
    logger.info(`Command executed: ${interaction.commandName} by ${interaction.user.tag}`);
  } catch (error) {
    logger.error(`Error executing command ${interaction.commandName}:`, error);
    
    // Only respond if the command itself didn't handle the error
    // Most commands should handle their own errors internally
    try {
      const errorMessage = '❌ An error occurred while executing this command. Please try again later.';
      
      if (interaction.deferred && !interaction.replied) {
        await interaction.editReply({ content: errorMessage });
      } else if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: errorMessage, flags: 64 });
      }
      // If already replied, let the command's error handler deal with it
    } catch (responseError) {
      logger.error(`Failed to send command error response:`, responseError);
      // Don't attempt additional responses
    }
  }
}

/**
 * Get command statistics
 * @returns {Object} Command statistics
 */
export function getCommandStats() {
  const stats = {
    totalCommands: commands.size,
    commands: []
  };

  commands.forEach((command, name) => {
    stats.commands.push({
      name,
      description: command.data.description,
      category: command.commandInfo?.category || 'General',
      cooldown: command.commandInfo?.cooldown || 0,
      guildOnly: command.commandInfo?.guildOnly || false
    });
  });

  return stats;
}

/**
 * Validate all commands
 * @returns {Object} Validation results
 */
export function validateCommands() {
  const results = {
    valid: 0,
    invalid: 0,
    errors: []
  };

  commands.forEach((command, name) => {
    try {
      // Check required properties
      if (!command.data || !command.execute) {
        throw new Error(`Missing required properties (data/execute)`);
      }

      // Check command data structure
      if (!command.data.name || !command.data.description) {
        throw new Error(`Invalid command data structure`);
      }

      // Check execute function
      if (typeof command.execute !== 'function') {
        throw new Error(`Execute property must be a function`);
      }

      results.valid++;
    } catch (error) {
      results.invalid++;
      results.errors.push({
        command: name,
        error: error.message
      });
    }
  });

  return results;
}

/**
 * Test IPFS connectivity from the bot
 */
export async function testipfs(interaction) {
  try {
    const { testIPFSConnection } = await import('../utils/ipfsClient.js');
    
    await interaction.deferReply({ ephemeral: true });
    
    const testResult = await testIPFSConnection();
    
    if (testResult.success) {
      await interaction.editReply({
        content: `✅ **IPFS Connection Test Successful**\n\n**Test CID:** \`${testResult.testCid}\`\n**Gateway:** https://ipfs.io/ipfs/${testResult.testCid}\n\n${testResult.message}`
      });
    } else {
      await interaction.editReply({
        content: `❌ **IPFS Connection Test Failed**\n\n**Error:** ${testResult.error}\n\n${testResult.message}`
      });
    }
    
  } catch (error) {
    await interaction.editReply({
      content: `❌ **IPFS Test Error**\n\nFailed to test IPFS connection: ${error.message}`
    });
  }
}

// Log command registration summary
logger.info(`📋 Command Registry Initialized:`);
logger.info(`   • Total Commands: ${commands.size}`);
logger.info(`   • Available Commands: ${Array.from(commands.keys()).join(', ')}`);

// Validate commands on startup
const validation = validateCommands();
if (validation.invalid > 0) {
  logger.error(`❌ ${validation.invalid} invalid commands found:`, validation.errors);
} else {
  logger.info(`✅ All ${validation.valid} commands validated successfully`);
}