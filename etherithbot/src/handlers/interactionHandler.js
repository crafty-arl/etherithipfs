import { InteractionType } from 'discord.js';
import { handleCommand } from '../commands/index.js';
import { logger } from '../utils/logger.js';

/**
 * Main interaction handler for all Discord interactions
 * Routes interactions to appropriate handlers based on type
 * Simplified for direct file+metadata submission workflow
 * @param {Object} interaction - Discord interaction object
 */
export async function handleInteraction(interaction) {
  const startTime = Date.now();
  const interactionAge = Date.now() - interaction.createdTimestamp;
  
  try {
    logger.info(`🔄 Interaction received: ${interaction.type} from ${interaction.user.tag}`);
    logger.debug(`📊 Interaction details:`, {
      id: interaction.id,
      type: interaction.type,
      commandName: interaction.commandName,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      age: `${interactionAge}ms`,
      deferred: interaction.deferred,
      replied: interaction.replied
    });

    switch (interaction.type) {
      case InteractionType.ApplicationCommand:
        await handleCommand(interaction);
        break;

      case InteractionType.MessageComponent:
        // Handle any remaining simple component interactions
        await handleComponentInteraction(interaction);
        break;

      // Handle other interaction types here if needed
      default:
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '❌ This interaction type is not supported.',
            ephemeral: true
          });
        }
        break;
    }

  } catch (error) {
    logger.error('Critical interaction handling error:', error);
    
    // Last resort error handling
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An unexpected error occurred. Please try again.',
          ephemeral: true
        });
      }
    } catch (finalError) {
      logger.error('Failed to send final error response:', finalError);
    }
    
  } finally {
    const totalTime = Date.now() - startTime;
    logger.debug(`⏱️ Interaction ${interaction.id} processing completed in ${totalTime}ms`);
  }
}

/**
 * Handle button and select menu interactions (simplified for direct submission workflow)
 * @param {Object} interaction - Discord component interaction
 */
async function handleComponentInteraction(interaction) {
  const customId = interaction.customId;
  logger.info(`Component interaction received: ${customId}`);

  try {
    // For the file-only approach, we have minimal component interactions
    // Most interactions are now handled directly through slash commands
    
    logger.warn(`Component interaction not needed in file-only workflow: ${customId}`);
    await interaction.reply({
      content: '❌ This action is no longer available. Please use `/remember` with a file attachment to create memories.',
      ephemeral: true
    });

  } catch (error) {
    logger.error(`Error handling component interaction ${customId}:`, error);
    
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Failed to process your request. Please use `/remember` to create a memory.',
          ephemeral: true
        });
      }
    } catch (replyError) {
      logger.error('Failed to send error response:', replyError);
    }
  }
} 