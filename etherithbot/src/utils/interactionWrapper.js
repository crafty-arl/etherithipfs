/**
 * Interaction Response Wrapper for Memory Weaver Bot
 * Prevents multiple responses and manages interaction state properly
 */

import { logger } from './logger.js';

// Track interaction states to prevent multiple responses
const interactionStates = new Map();

// Interaction response timeout (15 minutes)
const INTERACTION_TIMEOUT = 15 * 60 * 1000;

/**
 * Interaction wrapper class to manage state and prevent multiple responses
 */
export class InteractionWrapper {
  constructor(interaction) {
    this.interaction = interaction;
    this.id = interaction.id;
    this.startTime = Date.now();
    this.state = {
      deferred: false,
      replied: false,
      editing: false,
      failed: false,
      attempts: 0
    };
    
    // Store in global state tracker
    interactionStates.set(this.id, this.state);
    
    logger.debug(`🔄 InteractionWrapper created for ${this.id} by ${interaction.user.tag}`, {
      interactionAge: Date.now() - interaction.createdTimestamp,
      type: interaction.type,
      commandName: interaction.commandName
    });
  }

  /**
   * Check if interaction has expired
   */
  isExpired() {
    return (Date.now() - this.startTime) > INTERACTION_TIMEOUT;
  }

  /**
   * Check if we can still respond to this interaction
   */
  canRespond() {
    if (this.isExpired()) {
      logger.warn(`⏰ Interaction ${this.id} has expired`);
      return false;
    }

    if (this.state.failed) {
      logger.warn(`❌ Interaction ${this.id} is in failed state`);
      return false;
    }

    return true;
  }

  /**
   * Safely defer the interaction with retry logic
   */
  async deferReply(options = {}) {
    if (!this.canRespond()) {
      throw new Error('Cannot defer expired or failed interaction');
    }

    if (this.state.deferred || this.state.replied) {
      logger.warn(`⚠️ Interaction ${this.id} already deferred/replied, skipping defer`);
      return true;
    }

    try {
      this.state.attempts++;
      logger.debug(`🔄 Attempting to defer interaction ${this.id} (attempt ${this.state.attempts})`);
      
      await this.interaction.deferReply({ 
        flags: options.ephemeral !== false ? 64 : undefined, // MessageFlags.Ephemeral = 64
        ...options 
      });
      
      this.state.deferred = true;
      logger.debug(`✅ Successfully deferred interaction ${this.id}`);
      return true;

    } catch (error) {
      this.state.failed = true;
      logger.error(`❌ Failed to defer interaction ${this.id}:`, error);
      
      // If defer fails due to already being acknowledged, check Discord's state
      if (error.code === 40060 || error.message.includes('already been acknowledged')) {
        logger.warn(`🔄 Interaction ${this.id} was already acknowledged, updating state`);
        this.state.deferred = this.interaction.deferred;
        this.state.replied = this.interaction.replied;
        return this.state.deferred;
      }
      
      throw error;
    }
  }

  /**
   * Safely reply to the interaction
   */
  async reply(options) {
    if (!this.canRespond()) {
      throw new Error('Cannot reply to expired or failed interaction');
    }

    if (this.state.replied) {
      logger.warn(`⚠️ Interaction ${this.id} already replied, trying followUp instead`);
      return await this.followUp(options);
    }

    if (this.state.deferred) {
      logger.warn(`⚠️ Interaction ${this.id} is deferred, using editReply instead`);
      return await this.editReply(options);
    }

    try {
      this.state.attempts++;
      logger.debug(`🔄 Attempting to reply to interaction ${this.id} (attempt ${this.state.attempts})`);
      
      await this.interaction.reply({
        flags: options.ephemeral !== false ? 64 : undefined, // MessageFlags.Ephemeral = 64
        ...options
      });
      
      this.state.replied = true;
      logger.debug(`✅ Successfully replied to interaction ${this.id}`);
      return true;

    } catch (error) {
      this.state.failed = true;
      logger.error(`❌ Failed to reply to interaction ${this.id}:`, error);
      
      // If reply fails due to already being acknowledged, try editReply
      if (error.code === 40060 || error.message.includes('already been acknowledged')) {
        logger.warn(`🔄 Interaction ${this.id} was already acknowledged, trying editReply`);
        return await this.editReply(options);
      }
      
      throw error;
    }
  }

  /**
   * Safely edit the reply
   */
  async editReply(options) {
    if (!this.canRespond()) {
      throw new Error('Cannot edit reply for expired or failed interaction');
    }

    if (!this.state.deferred && !this.state.replied) {
      logger.warn(`⚠️ Interaction ${this.id} not deferred/replied, trying reply instead`);
      return await this.reply(options);
    }

    try {
      this.state.attempts++;
      this.state.editing = true;
      logger.debug(`🔄 Attempting to edit reply for interaction ${this.id} (attempt ${this.state.attempts})`);
      
      await this.interaction.editReply(options);
      
      this.state.editing = false;
      logger.debug(`✅ Successfully edited reply for interaction ${this.id}`);
      return true;

    } catch (error) {
      this.state.failed = true;
      this.state.editing = false;
      logger.error(`❌ Failed to edit reply for interaction ${this.id}:`, error);
      throw error;
    }
  }

  /**
   * Safely send a follow-up message
   */
  async followUp(options) {
    if (!this.canRespond()) {
      throw new Error('Cannot follow up on expired or failed interaction');
    }

    try {
      this.state.attempts++;
      logger.debug(`🔄 Attempting to follow up on interaction ${this.id} (attempt ${this.state.attempts})`);
      
      await this.interaction.followUp({
        flags: options.ephemeral !== false ? 64 : undefined, // MessageFlags.Ephemeral = 64
        ...options
      });
      
      logger.debug(`✅ Successfully sent follow-up for interaction ${this.id}`);
      return true;

    } catch (error) {
      logger.error(`❌ Failed to follow up on interaction ${this.id}:`, error);
      throw error;
    }
  }

  /**
   * Safely respond with automatic method selection
   */
  async respond(options) {
    if (!this.canRespond()) {
      logger.error(`Cannot respond to interaction ${this.id} - expired or failed`);
      return false;
    }

    try {
      // Choose the appropriate response method based on current state
      if (this.state.deferred && !this.state.editing) {
        return await this.editReply(options);
      } else if (!this.state.replied && !this.state.deferred) {
        return await this.reply(options);
      } else if (this.state.replied) {
        return await this.followUp(options);
      } else {
        // Fallback to editReply
        return await this.editReply(options);
      }
    } catch (error) {
      logger.error(`❌ Failed to respond to interaction ${this.id}:`, error);
      return false;
    }
  }

  /**
   * Clean up interaction state
   */
  cleanup() {
    interactionStates.delete(this.id);
    logger.debug(`🧹 Cleaned up interaction ${this.id}`);
  }

  /**
   * Get interaction statistics
   */
  getStats() {
    return {
      id: this.id,
      age: Date.now() - this.startTime,
      expired: this.isExpired(),
      state: { ...this.state },
      canRespond: this.canRespond()
    };
  }
}

/**
 * Create an interaction wrapper
 */
export function wrapInteraction(interaction) {
  return new InteractionWrapper(interaction);
}

/**
 * Clean up expired interaction states
 */
export function cleanupExpiredInteractions() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [id, state] of interactionStates.entries()) {
    if ((now - state.startTime) > INTERACTION_TIMEOUT) {
      interactionStates.delete(id);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    logger.debug(`🧹 Cleaned up ${cleaned} expired interaction states`);
  }
  
  return cleaned;
}

/**
 * Get interaction statistics
 */
export function getInteractionStats() {
  const states = Array.from(interactionStates.values());
  return {
    total: states.length,
    deferred: states.filter(s => s.deferred).length,
    replied: states.filter(s => s.replied).length,
    failed: states.filter(s => s.failed).length,
    editing: states.filter(s => s.editing).length
  };
} 