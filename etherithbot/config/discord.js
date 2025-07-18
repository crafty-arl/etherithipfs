/**
 * Discord Configuration for Memory Weaver Bot
 * Centralizes all Discord-related settings and validation
 */

import { GatewayIntentBits, ActivityType, PresenceUpdateStatus } from 'discord.js';

// Bot configuration
export const botConfig = {
  // Required Discord credentials
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  
  // Optional guild-specific settings
  guildId: process.env.DISCORD_GUILD_ID,
  testGuildId: process.env.TEST_GUILD_ID,
  
  // Bot intents - defines what events the bot can receive
  intents: [
    GatewayIntentBits.Guilds,                // Guild create/update/delete events
    GatewayIntentBits.GuildMessages,         // Message events in guilds
    GatewayIntentBits.MessageContent,        // Access to message content
    // GatewayIntentBits.GuildMembers,       // Uncomment if you need member events
    // GatewayIntentBits.GuildPresences,     // Uncomment if you need presence events
  ],

  // Bot presence settings
  presence: {
    activities: [
      {
        name: 'memories being created',
        type: ActivityType.Watching,
        url: null // Only used for streaming activities
      }
    ],
    status: PresenceUpdateStatus.Online,
    afk: false
  },

  // Command settings
  commands: {
    // Whether to deploy commands globally or guild-specific
    globalCommands: process.env.DEPLOY_GLOBAL_COMMANDS === 'true',
    
    // Command cooldowns (in seconds)
    defaultCooldown: parseInt(process.env.COMMAND_COOLDOWN) || 30,
    
    // Rate limiting
    rateLimits: {
      commands: {
        perUser: 20,        // Commands per user per hour
        perGuild: 1000,     // Commands per guild per hour
        window: 3600        // Time window in seconds
      }
    }
  },

  // Permission settings
  permissions: {
    // Required bot permissions
    botPermissions: [
      'SendMessages',
      'UseApplicationCommands',
      'EmbedLinks',
      'AttachFiles',
      'ReadMessageHistory'
    ],
    
    // Required user permissions for /remember command
    userPermissions: [
      'SendMessages',
      'UseApplicationCommands'
    ],
    
    // Admin permissions for management commands
    adminPermissions: [
      'ManageGuild',
      'Administrator'
    ]
  },

  // Channel settings
  channels: {
    // Specific channel IDs for different purposes
    announcements: process.env.ANNOUNCEMENTS_CHANNEL_ID,
    logs: process.env.LOGS_CHANNEL_ID,
    errors: process.env.ERROR_CHANNEL_ID,
    
    // Channel types where bot can be used
    allowedChannelTypes: [
      0,  // GUILD_TEXT
      5,  // GUILD_ANNOUNCEMENT
      11, // GUILD_PUBLIC_THREAD
      12  // GUILD_PRIVATE_THREAD
    ]
  },

  // Embed settings
  embeds: {
    colors: {
      default: 0x3498db,     // Blue
      success: 0x2ecc71,     // Green
      warning: 0xf39c12,     // Orange
      error: 0xe74c3c,       // Red
      info: 0x9b59b6,        // Purple
      memory: 0x3498db,      // Blue for memories
      upload: 0xe67e22,      // Orange for uploads
      confirmation: 0x27ae60 // Green for confirmations
    },
    
    // Default embed settings
    footer: {
      text: 'Memory Weaver',
      iconURL: process.env.BOT_AVATAR_URL
    },
    
    // Thumbnail and image settings
    thumbnail: {
      defaultUrl: process.env.DEFAULT_THUMBNAIL_URL
    }
  },

  // Message limits
  limits: {
    embedDescription: 4096,
    embedField: 1024,
    embedTitle: 256,
    embedFooter: 2048,
    embedAuthor: 256,
    
    // Modal input limits
    modalTitle: 45,
    textInputShort: 4000,
    textInputParagraph: 4000
  }
};

// Validation functions
export function validateDiscordConfig() {
  const errors = [];
  const warnings = [];

  // Check required environment variables
  if (!botConfig.token) {
    errors.push('DISCORD_TOKEN is required');
  } else if (!isValidToken(botConfig.token)) {
    errors.push('DISCORD_TOKEN format is invalid');
  }

  if (!botConfig.clientId) {
    errors.push('DISCORD_CLIENT_ID is required');
  } else if (!isValidSnowflake(botConfig.clientId)) {
    errors.push('DISCORD_CLIENT_ID must be a valid Discord snowflake');
  }

  // Check optional but recommended variables
  if (!botConfig.guildId) {
    warnings.push('DISCORD_GUILD_ID not set - using global command deployment');
  } else if (!isValidSnowflake(botConfig.guildId)) {
    warnings.push('DISCORD_GUILD_ID format is invalid');
  }

  // Validate presence settings
  if (botConfig.presence.activities.length === 0) {
    warnings.push('No bot activities configured');
  }

  // Validate cooldown settings
  if (botConfig.commands.defaultCooldown < 1) {
    warnings.push('Command cooldown is very low, may cause rate limiting');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Helper functions
function isValidToken(token) {
  // Basic Discord token format validation
  return typeof token === 'string' && 
         (token.includes('.') || token.startsWith('Bot ')) &&
         token.length > 50;
}

function isValidSnowflake(id) {
  return typeof id === 'string' && /^\d{17,19}$/.test(id);
}

// Environment-specific configurations
export const environmentConfigs = {
  development: {
    presence: {
      activities: [
        {
          name: 'Development Mode',
          type: ActivityType.Playing
        }
      ],
      status: PresenceUpdateStatus.DoNotDisturb
    },
    commands: {
      globalCommands: false, // Use guild commands in development
      defaultCooldown: 5     // Shorter cooldowns for testing
    }
  },

  production: {
    presence: {
      activities: [
        {
          name: 'memories being created',
          type: ActivityType.Watching
        }
      ],
      status: PresenceUpdateStatus.Online
    },
    commands: {
      globalCommands: true,  // Use global commands in production
      defaultCooldown: 30    // Standard cooldowns
    }
  },

  testing: {
    presence: {
      activities: [
        {
          name: 'Running Tests',
          type: ActivityType.Playing
        }
      ],
      status: PresenceUpdateStatus.Idle
    },
    commands: {
      globalCommands: false,
      defaultCooldown: 1     // Minimal cooldowns for testing
    }
  }
};

// Get environment-specific config
export function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';
  const envConfig = environmentConfigs[env] || environmentConfigs.development;
  
  // Merge with base config
  return {
    ...botConfig,
    ...envConfig,
    // Deep merge nested objects
    presence: { ...botConfig.presence, ...envConfig.presence },
    commands: { ...botConfig.commands, ...envConfig.commands }
  };
}

// Export default configuration
export default getEnvironmentConfig(); 