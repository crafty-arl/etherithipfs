import { PermissionFlagsBits } from 'discord.js';
import { logger } from './logger.js';

/**
 * Validation utilities for Memory Weaver bot
 * Handles permissions, cooldowns, input validation, and security checks
 */

// In-memory storage for cooldowns (in production, use Redis)
const cooldowns = new Map();
const rateLimits = new Map();

/**
 * Validate user permissions for memory operations
 * @param {Object} interaction - Discord interaction object
 * @returns {Object} Permission validation result
 */
export async function validateUserPermissions(interaction) {
  try {
    const { user, guild, member, channel } = interaction;

    // Check if interaction is in a guild
    if (!guild) {
      return {
        allowed: false,
        reason: 'Memory Weaver can only be used in servers, not in DMs.'
      };
    }

    // Check if user is a member of the guild
    if (!member) {
      return {
        allowed: false,
        reason: 'You must be a member of this server to use Memory Weaver.'
      };
    }

    // Check basic permissions
    const requiredPermissions = [
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.UseApplicationCommands
    ];

    for (const permission of requiredPermissions) {
      if (!member.permissions.has(permission)) {
        return {
          allowed: false,
          reason: 'You do not have the required permissions to use Memory Weaver.'
        };
      }
    }

    // Check channel permissions
    if (channel) {
      const channelPermissions = [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages
      ];

      for (const permission of channelPermissions) {
        if (!channel.permissionsFor(member).has(permission)) {
          return {
            allowed: false,
            reason: 'You do not have permission to use Memory Weaver in this channel.'
          };
        }
      }
    }

    // Check if user is banned from using the bot
    const banCheck = await checkUserBan(user.id, guild.id);
    if (banCheck.banned) {
      return {
        allowed: false,
        reason: `You are banned from using Memory Weaver: ${banCheck.reason}`
      };
    }

    // Check server-specific restrictions
    const serverCheck = await checkServerRestrictions(guild.id, user.id);
    if (!serverCheck.allowed) {
      return {
        allowed: false,
        reason: serverCheck.reason
      };
    }

    return {
      allowed: true,
      reason: 'Permissions validated successfully'
    };

  } catch (error) {
    logger.error('Permission validation error:', error);
    return {
      allowed: false,
      reason: 'Permission validation failed. Please try again.'
    };
  }
}

/**
 * Check and enforce cooldowns
 * @param {string} userId - User ID
 * @param {string} action - Action type (e.g., 'remember_command')
 * @returns {Object} Cooldown check result
 */
export async function checkCooldown(userId, action) {
  try {
    const cooldownKey = `${userId}_${action}`;
    const cooldownConfig = getCooldownConfig(action);
    
    if (!cooldownConfig) {
      return { allowed: true };
    }

    const lastUsed = cooldowns.get(cooldownKey);
    const now = Date.now();

    if (lastUsed) {
      const timePassed = now - lastUsed;
      const cooldownTime = cooldownConfig.duration * 1000; // Convert to milliseconds

      if (timePassed < cooldownTime) {
        const remainingTime = Math.ceil((cooldownTime - timePassed) / 1000);
        return {
          allowed: false,
          remainingTime,
          totalCooldown: cooldownConfig.duration
        };
      }
    }

    return { allowed: true };

  } catch (error) {
    logger.error('Cooldown check error:', error);
    return { allowed: true }; // Fail open to not block users
  }
}

/**
 * Set cooldown for user action
 * @param {string} userId - User ID
 * @param {string} action - Action type
 * @param {number} duration - Cooldown duration in seconds (optional)
 */
export async function setCooldown(userId, action, duration = null) {
  try {
    const cooldownKey = `${userId}_${action}`;
    const cooldownConfig = getCooldownConfig(action);
    
    if (cooldownConfig || duration) {
      cooldowns.set(cooldownKey, Date.now());
      
      // Auto-cleanup after cooldown expires
      const cleanupTime = (duration || cooldownConfig.duration) * 1000;
      setTimeout(() => {
        cooldowns.delete(cooldownKey);
      }, cleanupTime);
    }

  } catch (error) {
    logger.error('Set cooldown error:', error);
  }
}

/**
 * Check rate limiting for actions
 * @param {string} userId - User ID
 * @param {string} action - Action type
 * @returns {Object} Rate limit check result
 */
export async function checkRateLimit(userId, action) {
  try {
    const rateLimitKey = `${userId}_${action}`;
    const rateLimitConfig = getRateLimitConfig(action);
    
    if (!rateLimitConfig) {
      return { allowed: true };
    }

    const now = Date.now();
    const windowStart = now - (rateLimitConfig.window * 1000);
    
    // Get or create rate limit data
    let rateLimitData = rateLimits.get(rateLimitKey) || {
      requests: [],
      windowStart: now
    };

    // Clean old requests outside the window
    rateLimitData.requests = rateLimitData.requests.filter(timestamp => timestamp > windowStart);

    // Check if limit exceeded
    if (rateLimitData.requests.length >= rateLimitConfig.limit) {
      const oldestRequest = Math.min(...rateLimitData.requests);
      const resetTime = Math.ceil((oldestRequest + (rateLimitConfig.window * 1000) - now) / 1000);
      
      return {
        allowed: false,
        limit: rateLimitConfig.limit,
        window: rateLimitConfig.window,
        resetTime
      };
    }

    // Add current request
    rateLimitData.requests.push(now);
    rateLimits.set(rateLimitKey, rateLimitData);

    return { allowed: true };

  } catch (error) {
    logger.error('Rate limit check error:', error);
    return { allowed: true }; // Fail open
  }
}

/**
 * Validate memory data input
 * @param {Object} memoryData - Memory data to validate
 * @returns {Object} Validation result
 */
export function validateMemoryData(memoryData) {
  const errors = [];
  const warnings = [];

  // Title validation
  if (!memoryData.title || typeof memoryData.title !== 'string') {
    errors.push('Title is required and must be a string');
  } else {
    if (memoryData.title.trim().length < 3) {
      errors.push('Title must be at least 3 characters long');
    }
    if (memoryData.title.length > 100) {
      errors.push('Title must be 100 characters or less');
    }
    if (containsProfanity(memoryData.title)) {
      errors.push('Title contains inappropriate content');
    }
  }

  // Description validation
  if (!memoryData.description || typeof memoryData.description !== 'string') {
    errors.push('Description is required and must be a string');
  } else {
    if (memoryData.description.trim().length < 10) {
      errors.push('Description must be at least 10 characters long');
    }
    if (memoryData.description.length > 1000) {
      errors.push('Description must be 1000 characters or less');
    }
    if (containsProfanity(memoryData.description)) {
      warnings.push('Description may contain inappropriate content');
    }
  }

  // Category validation
  const validCategories = ['Personal', 'Server Events', 'Resources', 'Gaming', 'Other'];
  if (memoryData.category && !validCategories.includes(memoryData.category)) {
    warnings.push(`Invalid category, will default to "Other"`);
  }

  // Privacy validation
  const validPrivacy = ['Public', 'Members Only', 'Private'];
  if (memoryData.privacy && !validPrivacy.includes(memoryData.privacy)) {
    warnings.push(`Invalid privacy level, will default to "Members Only"`);
  }

  // Tags validation
  if (memoryData.tags && Array.isArray(memoryData.tags)) {
    if (memoryData.tags.length > 10) {
      warnings.push('Only the first 10 tags will be saved');
    }
    
    memoryData.tags.forEach((tag, index) => {
      if (typeof tag !== 'string') {
        errors.push(`Tag ${index + 1} must be a string`);
      } else if (tag.length > 30) {
        warnings.push(`Tag "${tag}" is too long and will be truncated`);
      } else if (containsProfanity(tag)) {
        errors.push(`Tag "${tag}" contains inappropriate content`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate upload configuration
 * @param {Object} uploadConfig - Upload configuration to validate
 * @returns {Object} Validation result
 */
export function validateUploadConfig(uploadConfig) {
  const errors = [];
  const warnings = [];

  // File types validation
  const validFileTypes = ['Images', 'Documents', 'Audio', 'Video', 'Mixed'];
  if (uploadConfig.fileTypes && Array.isArray(uploadConfig.fileTypes)) {
    const invalidTypes = uploadConfig.fileTypes.filter(type => !validFileTypes.includes(type));
    if (invalidTypes.length > 0) {
      errors.push(`Invalid file types: ${invalidTypes.join(', ')}`);
    }
  }

  // Max files validation
  if (uploadConfig.maxFiles !== undefined) {
    if (typeof uploadConfig.maxFiles !== 'number' || uploadConfig.maxFiles < 1) {
      errors.push('Max files must be a positive number');
    } else if (uploadConfig.maxFiles > 10) {
      warnings.push('Max files limited to 10');
    }
  }

  // Storage duration validation
  if (uploadConfig.storageDuration !== undefined) {
    if (typeof uploadConfig.storageDuration !== 'number' || uploadConfig.storageDuration < 0) {
      errors.push('Storage duration must be a non-negative number');
    } else if (uploadConfig.storageDuration > 365) {
      warnings.push('Storage duration limited to 365 days');
    }
  }

  // File extensions validation
  if (uploadConfig.fileExtensions && Array.isArray(uploadConfig.fileExtensions)) {
    const dangerousExtensions = ['exe', 'bat', 'cmd', 'scr', 'pif', 'com', 'vbs', 'js'];
    const dangerous = uploadConfig.fileExtensions.filter(ext => dangerousExtensions.includes(ext.toLowerCase()));
    if (dangerous.length > 0) {
      errors.push(`Dangerous file extensions not allowed: ${dangerous.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Security validation functions
 */

/**
 * Check if user is banned
 * @param {string} userId - User ID
 * @param {string} guildId - Guild ID
 * @returns {Object} Ban check result
 */
async function checkUserBan(userId, guildId) {
  try {
    // In production, this would check a database
    // For now, return not banned
    return {
      banned: false,
      reason: null
    };

  } catch (error) {
    logger.error('User ban check error:', error);
    return {
      banned: false,
      reason: null
    };
  }
}

/**
 * Check server-specific restrictions
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @returns {Object} Server restriction check result
 */
async function checkServerRestrictions(guildId, userId) {
  try {
    // In production, this would check server settings
    // For now, return allowed
    return {
      allowed: true,
      reason: null
    };

  } catch (error) {
    logger.error('Server restriction check error:', error);
    return {
      allowed: true,
      reason: null
    };
  }
}

/**
 * Basic profanity filter
 * @param {string} text - Text to check
 * @returns {boolean} True if profanity detected
 */
function containsProfanity(text) {
  // Basic profanity filter - in production, use a proper filter library
  const profanityList = ['spam', 'scam']; // Minimal list for example
  const lowerText = text.toLowerCase();
  
  return profanityList.some(word => lowerText.includes(word));
}

/**
 * Configuration functions
 */

/**
 * Get cooldown configuration for action
 * @param {string} action - Action type
 * @returns {Object|null} Cooldown configuration
 */
function getCooldownConfig(action) {
  const cooldownConfigs = {
    'remember_command': { duration: parseInt(process.env.COMMAND_COOLDOWN) || 30 },
    'upload_session': { duration: parseInt(process.env.UPLOAD_COOLDOWN) || 300 },
    'memory_create': { duration: 60 },
    'memory_delete': { duration: 30 }
  };

  return cooldownConfigs[action] || null;
}

/**
 * Get rate limit configuration for action
 * @param {string} action - Action type
 * @returns {Object|null} Rate limit configuration
 */
function getRateLimitConfig(action) {
  const rateLimitConfigs = {
    'remember_command': { limit: 20, window: 3600 }, // 20 per hour
    'memory_create': { limit: parseInt(process.env.MAX_MEMORIES_PER_DAY) || 20, window: 86400 }, // 20 per day
    'file_upload': { limit: 100, window: 3600 }, // 100 files per hour
    'api_requests': { limit: 1000, window: 3600 } // 1000 API requests per hour
  };

  return rateLimitConfigs[action] || null;
}

/**
 * Input sanitization functions
 */

/**
 * Sanitize user input text
 * @param {string} input - Input text to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized text
 */
export function sanitizeInput(input, options = {}) {
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Remove potentially dangerous HTML/script tags
  sanitized = sanitized.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove excessive whitespace
  if (options.trimWhitespace !== false) {
    sanitized = sanitized.trim().replace(/\s+/g, ' ');
  }

  // Limit length
  if (options.maxLength) {
    sanitized = sanitized.slice(0, options.maxLength);
  }

  // Remove or replace special characters if needed
  if (options.alphanumericOnly) {
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s]/g, '');
  }

  return sanitized;
}

/**
 * Validate Discord snowflake ID
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid snowflake
 */
export function isValidSnowflake(id) {
  return typeof id === 'string' && /^\d{17,19}$/.test(id);
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clean up expired cooldowns and rate limits
 */
export function cleanupExpiredData() {
  const now = Date.now();
  
  // Cleanup cooldowns (they auto-cleanup, but this is extra safety)
  for (const [key, timestamp] of cooldowns.entries()) {
    if (now - timestamp > 24 * 60 * 60 * 1000) { // 24 hours
      cooldowns.delete(key);
    }
  }

  // Cleanup rate limits
  for (const [key, data] of rateLimits.entries()) {
    const oldRequests = data.requests.filter(timestamp => timestamp > now - (24 * 60 * 60 * 1000));
    if (oldRequests.length === 0) {
      rateLimits.delete(key);
    } else {
      data.requests = oldRequests;
      rateLimits.set(key, data);
    }
  }

  logger.info(`Cleanup completed: ${cooldowns.size} cooldowns, ${rateLimits.size} rate limits`);
}

// Auto-cleanup every hour
setInterval(cleanupExpiredData, 60 * 60 * 1000); 