import { SlashCommandBuilder } from '@discordjs/builders';
import { AttachmentBuilder, PermissionFlagsBits } from 'discord.js';
import { createMemory } from '../utils/apiClient.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('remember')
  .setDescription('Create a new memory with file storage - file attachment is required')
  .addAttachmentOption(option =>
    option.setName('file')
      .setDescription('File to attach to this memory')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('title')
      .setDescription('Title of your memory')
      .setRequired(true)
      .setMaxLength(100))
  .addStringOption(option =>
    option.setName('details')
      .setDescription('Description or details about your memory')
      .setRequired(true)
      .setMaxLength(2000))
  .addStringOption(option =>
    option.setName('privacy')
      .setDescription('Who can see this memory')
      .setRequired(true)
      .addChoices(
        { name: 'Members Only (visible to all members)', value: 'members_only' },
        { name: 'Private (only you can see)', value: 'private' }
      ))
  .addStringOption(option =>
    option.setName('category')
      .setDescription('Category for organizing memories')
      .setRequired(true)
      .addChoices(
        { name: '🎮 Gaming', value: 'gaming' },
        { name: '🎨 Creative', value: 'creative' },
        { name: '📚 Learning', value: 'learning' },
        { name: '💼 Work', value: 'work' },
        { name: '🎉 Social', value: 'social' },
        { name: '📝 Notes', value: 'notes' },
        { name: '🔧 Projects', value: 'projects' },
        { name: '🏆 Achievements', value: 'achievements' },
        { name: '❤️ Personal', value: 'personal' },
        { name: '📊 Other', value: 'other' }
      ))
  .addStringOption(option =>
    option.setName('tags')
      .setDescription('Tags for searching (comma-separated, optional)')
      .setRequired(false)
      .setMaxLength(200))
  .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
  .setDMPermission(false);

export async function execute(interaction) {
  const startTime = Date.now();
  
  try {
    // ⚡ IMMEDIATE DEFER - NO PROCESSING BEFORE THIS!
    await interaction.deferReply({ ephemeral: true });
    const deferTime = Date.now() - startTime;
    logger.info(`✅ Remember command deferred in ${deferTime}ms`);
    
    // Now we can safely do all the processing...
    const userId = interaction.user.id;
    const guildId = interaction.guild?.id;
    
    if (!guildId) {
      return await interaction.editReply({
        content: '❌ This command can only be used in a Discord server, not in DMs.'
      });
    }
    
    // Get options
    const title = interaction.options.getString('title');
    const details = interaction.options.getString('details');
    const privacy = interaction.options.getString('privacy');
    const category = interaction.options.getString('category');
    const tagsInput = interaction.options.getString('tags');
    const fileAttachment = interaction.options.getAttachment('file');
    
    // Basic validation
    if (!fileAttachment) {
      return await interaction.editReply({
        content: '❌ File attachment is required. Please attach a file to create a memory.'
      });
    }
    
    // File size check (50MB limit)
    if (fileAttachment.size > 50 * 1024 * 1024) {
      return await interaction.editReply({
        content: '❌ File too large. Maximum file size is 50MB.'
      });
    }
    
    // Process tags
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    
    logger.info(`📝 Processing memory: "${title}" by ${interaction.user.tag}`);
    
    // Send progress update
    await interaction.editReply({
      content: `🔄 **Processing your memory...**\n\nUploading **${fileAttachment.name}** (${Math.round(fileAttachment.size/1024)}KB) and creating memory.\n\n⏳ Please wait...`
    });
    
    // Process file attachment
    const fileBuffer = await fetch(fileAttachment.url).then(r => r.arrayBuffer());
    const sessionId = `memory_${userId}_${Date.now()}`;
    
    const uploadData = {
      fileName: fileAttachment.name,
      fileSize: fileAttachment.size,
      contentType: fileAttachment.contentType,
      storageKey: `memories/${sessionId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileAttachment.name.split('.').pop()}`,
      fileBuffer: Array.from(new Uint8Array(fileBuffer))
    };
    
    // Create memory
    const memoryResult = await createMemory({
      memoryData: { title, description: details, category, privacy, tags },
      discordUserId: userId,
      guildId: guildId,
      sessionId: sessionId,
      hasFile: true,
      uploadData: uploadData
    });
    
    if (!memoryResult.success) {
      return await interaction.editReply({
        content: `❌ **Failed to create memory**\n\n${memoryResult.userMessage || memoryResult.error}\n\nPlease try again.`
      });
    }
    
    // Try server-side IPFS upload
    let ipfsData = null;
    try {
      const { uploadToIPFS } = await import('../utils/ipfsClient.js');
      const { updateMemoryWithIPFS } = await import('../utils/apiClient.js');
      const ipfsBuffer = Buffer.from(fileBuffer);
      const ipfsResult = await uploadToIPFS(ipfsBuffer, fileAttachment.name);
      
      if (ipfsResult.success) {
        ipfsData = ipfsResult;
        logger.info(`✅ Server-side IPFS upload successful: ${ipfsResult.cid}`);
        
        // Update D1 database with IPFS data
        try {
          const updateResult = await updateMemoryWithIPFS(memoryResult.memoryId, ipfsResult);
          if (updateResult.success) {
            logger.info(`✅ D1 database updated with IPFS data: ${ipfsResult.cid}`);
          } else {
            logger.warn(`⚠️ Failed to update D1 with IPFS data:`, updateResult.error);
          }
        } catch (updateError) {
          logger.warn(`⚠️ D1 IPFS update failed:`, updateError.message);
        }
      }
    } catch (ipfsError) {
      logger.warn(`⚠️ Server-side IPFS upload failed:`, ipfsError.message);
    }
    
    // Build success response
    const embed = {
      title: '✅ Memory Created Successfully',
      description: `**${title}**\n\n${details}`,
      fields: [
        {
          name: '📊 Details',
          value: `**Category:** ${getCategoryDisplayName(category)}\n**Privacy:** ${privacy === 'private' ? 'Private' : 'Members Only'}${tags.length > 0 ? `\n**Tags:** ${tags.map(tag => `\`${tag}\``).join(', ')}` : ''}`,
          inline: true
        },
        {
          name: '🔗 Memory Info',
          value: `**ID:** \`${memoryResult.memoryId}\`\n**Storage:** R2${ipfsData ? '+IPFS' : ''}`,
          inline: true
        },
        {
          name: '📎 File Storage',
          value: `**${fileAttachment.name}**\nSize: ${Math.round(fileAttachment.size/1024)}KB\nType: ${fileAttachment.contentType}`,
          inline: false
        }
      ],
      color: ipfsData ? 0x00BFA5 : 0x4CAF50,
      footer: { 
        text: ipfsData ? 'Memory Weaver • File stored in R2 + IPFS' : 'Memory Weaver • File stored in R2',
        iconURL: interaction.user.displayAvatarURL()
      },
      timestamp: new Date().toISOString()
    };
    
    if (ipfsData) {
      embed.fields.push({
        name: '🌐 IPFS Backup',
        value: `**CID:** \`${ipfsData.cid}\`\n**Gateway:** [View on IPFS](${ipfsData.ipfsUrl})`,
        inline: false
      });
    }
    
    const totalTime = Date.now() - startTime;
    logger.info(`✅ Remember command completed in ${totalTime}ms`);
    
    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    logger.error('❌ Remember command failed:', error);
    
    try {
      const errorMessage = '❌ An error occurred while creating your memory. Please try again.';
      
      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch (responseError) {
      logger.error('❌ Failed to send error response:', responseError);
    }
  }
}

function getCategoryDisplayName(categoryValue) {
  const categories = {
    gaming: '🎮 Gaming',
    creative: '🎨 Creative', 
    learning: '📚 Learning',
    work: '💼 Work',
    social: '🎉 Social',
    notes: '📝 Notes',
    projects: '🔧 Projects',
    achievements: '🏆 Achievements',
    personal: '❤️ Personal',
    other: '📊 Other'
  };
  return categories[categoryValue] || '📊 Other';
}

export const commandInfo = {
  name: 'remember',
  description: 'Create a new memory with file storage',
  category: 'Memory Management',
  cooldown: 30,
  guildOnly: true,
  permissions: ['SendMessages']
}; 