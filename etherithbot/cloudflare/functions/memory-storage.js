/**
 * Memory Storage Worker - Cloudflare D1 Database Operations
 * Handles memory metadata storage, file tracking, and data persistence
 */

// import { v4 as uuidv4 } from 'uuid'; // Removed - not compatible with Cloudflare Workers

/**
 * Simple UUID v4 generator for Cloudflare Workers
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Store memory metadata in D1 database
 * @param {Object} memoryData - Memory information from Discord form
 * @param {Object} uploadData - Upload configuration data
 * @param {Object} confirmationData - Final confirmation data
 * @param {string} discordUserId - Discord user ID
 * @param {string} guildId - Discord guild ID
 * @param {Object} env - Cloudflare environment bindings
 * @returns {Object} Storage result with memory ID
 */
export async function storeMemoryMetadata(memoryData, uploadData, confirmationData, discordUserId, guildId, env) {
  try {
    const memoryId = generateUUID();
    const now = new Date().toISOString();

    // Prepare memory record
    const memoryRecord = {
      id: memoryId,
      user_id: discordUserId,
      server_id: guildId,
      title: memoryData.title,
      description: memoryData.description,
      category: memoryData.category,
      privacy_level: confirmationData?.finalPrivacy || memoryData.privacy,
      visibility_duration: confirmationData?.visibilityDuration || 0,
      created_at: now,
      updated_at: now,
      tags: JSON.stringify([...(memoryData.tags || []), ...(uploadData.uploadTags || [])]),
      file_count: 0, // Will be updated when files are processed
      status: 'active',
      share_options: JSON.stringify(confirmationData?.shareOptions || ['channel']),
      final_notes: confirmationData?.finalNotes || '',
      upload_config: JSON.stringify({
        maxFiles: uploadData.maxFiles,
        fileTypes: uploadData.fileTypes,
        storageDuration: uploadData.storageDuration,
        allowedExtensions: uploadData.fileExtensions
      })
    };

    // Insert memory record
    const insertResult = await env.MEMORY_DB.prepare(`
      INSERT INTO memories (
        id, user_id, server_id, title, description, category, privacy_level,
        visibility_duration, created_at, updated_at, tags, file_count, status,
        share_options, final_notes, upload_config
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      memoryRecord.id,
      memoryRecord.user_id,
      memoryRecord.server_id,
      memoryRecord.title,
      memoryRecord.description,
      memoryRecord.category,
      memoryRecord.privacy_level,
      memoryRecord.visibility_duration,
      memoryRecord.created_at,
      memoryRecord.updated_at,
      memoryRecord.tags,
      memoryRecord.file_count,
      memoryRecord.status,
      memoryRecord.share_options,
      memoryRecord.final_notes,
      memoryRecord.upload_config
    ).run();

    console.log(`Memory stored with ID: ${memoryId}`);

    return {
      success: true,
      memoryId,
      insertResult,
      message: 'Memory metadata stored successfully'
    };

  } catch (error) {
    console.error('Error storing memory metadata:', error);
    return {
      success: false,
      error: 'Failed to store memory metadata',
      details: error.message
    };
  }
}

/**
 * Store file metadata associated with a memory
 * @param {string} memoryId - Memory ID
 * @param {Object} fileData - File information
 * @param {Object} env - Cloudflare environment bindings
 * @returns {Object} Storage result
 */
export async function storeFileMetadata(memoryId, fileData, env) {
  try {
    const fileId = generateUUID();
    const now = new Date().toISOString();

    // Prepare file record
    const fileRecord = {
      id: fileId,
      memory_id: memoryId,
      filename: fileData.fileName,
      original_filename: fileData.originalName || fileData.fileName,
      file_type: fileData.contentType,
      file_size: fileData.fileSize,
      storage_url: fileData.storageUrl,
      storage_key: fileData.fileKey,
      thumbnail_url: fileData.thumbnailUrl || null,
      metadata: JSON.stringify(fileData.metadata || {}),
      processing_status: fileData.processingStatus || 'completed',
      uploaded_at: fileData.uploadedAt || now,
      processed_at: fileData.processedAt || now,
      storage_duration: fileData.storageDuration || 0,
      expires_at: fileData.storageDuration > 0 ? 
        new Date(Date.now() + fileData.storageDuration * 24 * 60 * 60 * 1000).toISOString() : 
        null
    };

    // Insert file record
    const insertResult = await env.MEMORY_DB.prepare(`
      INSERT INTO memory_files (
        id, memory_id, filename, original_filename, file_type, file_size,
        storage_url, storage_key, thumbnail_url, metadata, processing_status,
        uploaded_at, processed_at, storage_duration, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      fileRecord.id,
      fileRecord.memory_id,
      fileRecord.filename,
      fileRecord.original_filename,
      fileRecord.file_type,
      fileRecord.file_size,
      fileRecord.storage_url,
      fileRecord.storage_key,
      fileRecord.thumbnail_url,
      fileRecord.metadata,
      fileRecord.processing_status,
      fileRecord.uploaded_at,
      fileRecord.processed_at,
      fileRecord.storage_duration,
      fileRecord.expires_at
    ).run();

    // Update memory file count
    await env.MEMORY_DB.prepare(`
      UPDATE memories 
      SET file_count = file_count + 1, updated_at = ?
      WHERE id = ?
    `).bind(now, memoryId).run();

    console.log(`File metadata stored with ID: ${fileId} for memory: ${memoryId}`);

    return {
      success: true,
      fileId,
      insertResult,
      message: 'File metadata stored successfully'
    };

  } catch (error) {
    console.error('Error storing file metadata:', error);
    return {
      success: false,
      error: 'Failed to store file metadata',
      details: error.message
    };
  }
}

/**
 * Update file processing status
 * @param {string} fileId - File ID
 * @param {string} status - New processing status
 * @param {Object} additionalData - Additional data to update
 * @param {Object} env - Cloudflare environment bindings
 * @returns {Object} Update result
 */
export async function updateFileStatus(fileId, status, additionalData = {}, env) {
  try {
    const now = new Date().toISOString();
    
    let updateQuery = 'UPDATE memory_files SET processing_status = ?, updated_at = ?';
    let bindings = [status, now];

    // Add optional fields to update
    if (additionalData.thumbnailUrl) {
      updateQuery += ', thumbnail_url = ?';
      bindings.push(additionalData.thumbnailUrl);
    }

    if (additionalData.metadata) {
      updateQuery += ', metadata = ?';
      bindings.push(JSON.stringify(additionalData.metadata));
    }

    if (additionalData.error) {
      updateQuery += ', error_message = ?';
      bindings.push(additionalData.error);
    }

    if (status === 'completed') {
      updateQuery += ', processed_at = ?';
      bindings.push(now);
    }

    updateQuery += ' WHERE id = ?';
    bindings.push(fileId);

    const updateResult = await env.MEMORY_DB.prepare(updateQuery).bind(...bindings).run();

    return {
      success: true,
      updateResult,
      message: 'File status updated successfully'
    };

  } catch (error) {
    console.error('Error updating file status:', error);
    return {
      success: false,
      error: 'Failed to update file status',
      details: error.message
    };
  }
}

/**
 * Get memory by ID
 * @param {string} memoryId - Memory ID
 * @param {Object} env - Cloudflare environment bindings
 * @returns {Object} Memory data with files
 */
export async function getMemoryById(memoryId, env) {
  try {
    // Get memory record
    const memoryResult = await env.MEMORY_DB.prepare(`
      SELECT * FROM memories WHERE id = ?
    `).bind(memoryId).first();

    if (!memoryResult) {
      return {
        success: false,
        error: 'Memory not found'
      };
    }

    // Get associated files
    const filesResult = await env.MEMORY_DB.prepare(`
      SELECT * FROM memory_files WHERE memory_id = ? ORDER BY uploaded_at ASC
    `).bind(memoryId).all();

    // Parse JSON fields
    const memory = {
      ...memoryResult,
      tags: JSON.parse(memoryResult.tags || '[]'),
      shareOptions: JSON.parse(memoryResult.share_options || '[]'),
      uploadConfig: JSON.parse(memoryResult.upload_config || '{}'),
      files: filesResult.results.map(file => ({
        ...file,
        metadata: JSON.parse(file.metadata || '{}')
      }))
    };

    return {
      success: true,
      memory
    };

  } catch (error) {
    console.error('Error getting memory:', error);
    return {
      success: false,
      error: 'Failed to retrieve memory',
      details: error.message
    };
  }
}

/**
 * Search memories by user with filters
 * @param {string} userId - Discord user ID
 * @param {Object} filters - Search filters
 * @param {Object} env - Cloudflare environment bindings
 * @returns {Object} Search results
 */
export async function searchMemories(userId, filters = {}, env) {
  try {
    let query = 'SELECT * FROM memories WHERE user_id = ?';
    let bindings = [userId];

    // Add filters
    if (filters.category) {
      query += ' AND category = ?';
      bindings.push(filters.category);
    }

    if (filters.privacy) {
      query += ' AND privacy_level = ?';
      bindings.push(filters.privacy);
    }

    if (filters.searchTerm) {
      query += ' AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)';
      const searchPattern = `%${filters.searchTerm}%`;
      bindings.push(searchPattern, searchPattern, searchPattern);
    }

    if (filters.dateFrom) {
      query += ' AND created_at >= ?';
      bindings.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      query += ' AND created_at <= ?';
      bindings.push(filters.dateTo);
    }

    // Add ordering and pagination
    query += ' ORDER BY created_at DESC';
    
    if (filters.limit) {
      query += ' LIMIT ?';
      bindings.push(filters.limit);
    }

    if (filters.offset) {
      query += ' OFFSET ?';
      bindings.push(filters.offset);
    }

    const result = await env.MEMORY_DB.prepare(query).bind(...bindings).all();

    // Parse JSON fields for each memory
    const memories = result.results.map(memory => ({
      ...memory,
      tags: JSON.parse(memory.tags || '[]'),
      shareOptions: JSON.parse(memory.share_options || '[]'),
      uploadConfig: JSON.parse(memory.upload_config || '{}')
    }));

    return {
      success: true,
      memories,
      count: memories.length
    };

  } catch (error) {
    console.error('Error searching memories:', error);
    return {
      success: false,
      error: 'Failed to search memories',
      details: error.message
    };
  }
}

/**
 * Get server memories with privacy filtering
 * @param {string} guildId - Discord guild ID
 * @param {string} requesterId - User requesting the memories
 * @param {Object} filters - Search filters
 * @param {Object} env - Cloudflare environment bindings
 * @returns {Object} Server memories
 */
export async function getServerMemories(guildId, requesterId, filters = {}, env) {
  try {
    let query = `
      SELECT * FROM memories 
      WHERE server_id = ? 
      AND (
        privacy_level = 'Public' 
        OR (privacy_level = 'Members Only' AND ? IS NOT NULL)
        OR (privacy_level = 'Private' AND user_id = ?)
      )
    `;
    let bindings = [guildId, requesterId, requesterId];

    // Add additional filters (similar to searchMemories)
    if (filters.category) {
      query += ' AND category = ?';
      bindings.push(filters.category);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      bindings.push(filters.limit);
    }

    const result = await env.MEMORY_DB.prepare(query).bind(...bindings).all();

    const memories = result.results.map(memory => ({
      ...memory,
      tags: JSON.parse(memory.tags || '[]'),
      shareOptions: JSON.parse(memory.share_options || '[]'),
      uploadConfig: JSON.parse(memory.upload_config || '{}')
    }));

    return {
      success: true,
      memories,
      count: memories.length
    };

  } catch (error) {
    console.error('Error getting server memories:', error);
    return {
      success: false,
      error: 'Failed to get server memories',
      details: error.message
    };
  }
}

/**
 * Delete memory and associated files
 * @param {string} memoryId - Memory ID
 * @param {string} userId - User ID (for permission check)
 * @param {Object} env - Cloudflare environment bindings
 * @returns {Object} Deletion result
 */
export async function deleteMemory(memoryId, userId, env) {
  try {
    // Check if user owns the memory
    const memoryResult = await env.MEMORY_DB.prepare(`
      SELECT user_id FROM memories WHERE id = ?
    `).bind(memoryId).first();

    if (!memoryResult) {
      return {
        success: false,
        error: 'Memory not found'
      };
    }

    if (memoryResult.user_id !== userId) {
      return {
        success: false,
        error: 'Permission denied'
      };
    }

    // Get file keys for R2 deletion
    const filesResult = await env.MEMORY_DB.prepare(`
      SELECT storage_key FROM memory_files WHERE memory_id = ?
    `).bind(memoryId).all();

    // Delete files from database
    await env.MEMORY_DB.prepare(`
      DELETE FROM memory_files WHERE memory_id = ?
    `).bind(memoryId).run();

    // Delete memory from database
    await env.MEMORY_DB.prepare(`
      DELETE FROM memories WHERE id = ?
    `).bind(memoryId).run();

    // Return file keys for R2 cleanup (handled by calling function)
    const fileKeys = filesResult.results.map(f => f.storage_key);

    return {
      success: true,
      message: 'Memory deleted successfully',
      fileKeysToDelete: fileKeys
    };

  } catch (error) {
    console.error('Error deleting memory:', error);
    return {
      success: false,
      error: 'Failed to delete memory',
      details: error.message
    };
  }
}

/**
 * Get memory statistics for a user or server
 * @param {string} userId - User ID (optional)
 * @param {string} guildId - Guild ID (optional)
 * @param {Object} env - Cloudflare environment bindings
 * @returns {Object} Statistics
 */
export async function getMemoryStats(userId, guildId, env) {
  try {
    const stats = {};

    if (userId) {
      // User statistics
      const userStats = await env.MEMORY_DB.prepare(`
        SELECT 
          COUNT(*) as total_memories,
          SUM(file_count) as total_files,
          AVG(file_count) as avg_files_per_memory,
          COUNT(CASE WHEN privacy_level = 'Public' THEN 1 END) as public_memories,
          COUNT(CASE WHEN privacy_level = 'Private' THEN 1 END) as private_memories
        FROM memories 
        WHERE user_id = ?
      `).bind(userId).first();

      stats.user = userStats;
    }

    if (guildId) {
      // Server statistics
      const serverStats = await env.MEMORY_DB.prepare(`
        SELECT 
          COUNT(*) as total_memories,
          COUNT(DISTINCT user_id) as active_users,
          SUM(file_count) as total_files,
          COUNT(CASE WHEN privacy_level = 'Public' THEN 1 END) as public_memories
        FROM memories 
        WHERE server_id = ?
      `).bind(guildId).first();

      stats.server = serverStats;
    }

    return {
      success: true,
      stats
    };

  } catch (error) {
    console.error('Error getting memory stats:', error);
    return {
      success: false,
      error: 'Failed to get statistics',
      details: error.message
    };
  }
} 