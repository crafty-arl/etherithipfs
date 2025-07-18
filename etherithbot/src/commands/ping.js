import { SlashCommandBuilder } from '@discordjs/builders';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Test bot response time and basic functionality');

export async function execute(interaction) {
  const startTime = Date.now();
  
  try {
    // IMMEDIATELY defer - no processing before this
    await interaction.deferReply({ ephemeral: true });
    const deferTime = Date.now() - startTime;
    
    logger.info(`✅ Ping command - defer time: ${deferTime}ms`);
    
    // Now do any processing
    const responseTime = Date.now() - startTime;
    
    await interaction.editReply({
      content: `🏓 **Pong!**\n\n**Response Times:**\n• Defer: ${deferTime}ms\n• Total: ${responseTime}ms\n\n**Status:** ✅ Bot working properly`
    });
    
    logger.info(`✅ Ping command completed in ${responseTime}ms`);
    
  } catch (error) {
    logger.error('❌ Ping command failed:', error);
    
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Ping failed - interaction error',
          ephemeral: true
        });
      } else if (interaction.deferred) {
        await interaction.editReply({
          content: '❌ Ping failed - processing error'
        });
      }
    } catch (responseError) {
      logger.error('❌ Failed to send ping error response:', responseError);
    }
  }
}

export const commandInfo = {
  name: 'ping',
  description: 'Test bot response time',
  category: 'Debug',
  cooldown: 5,
  guildOnly: false,
  permissions: ['SendMessages']
}; 