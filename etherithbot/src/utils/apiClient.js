import axios from 'axios';
import dotenv from 'dotenv';
import { logger } from './logger.js';

/**
 * API Client for Cloudflare Workers communication
 * Handles all external API calls for memory and file operations
 */

// Load environment variables first
dotenv.config();

// Base configuration
const API_BASE_URL = process.env.CLOUDFLARE_WORKER_URL || 'https://memory-weaver.your-domain.workers.dev';
const API_TIMEOUT = 150000; // 2.5 minutes for file operations (IPFS can be slow)

// Debug logging for configuration
console.log('🔧 API Client Configuration:');
console.log('   CLOUDFLARE_WORKER_URL env var:', process.env.CLOUDFLARE_WORKER_URL);
console.log('   Using API_BASE_URL:', API_BASE_URL);
console.log('🔍 [DEBUG] Environment check:');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   All CLOUDFLARE env vars:', Object.keys(process.env).filter(key => key.includes('CLOUDFLARE')));

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
    'User-Agent': 'Memory-Weaver-Bot/1.0'
  }
});

// Helper function to create request config with custom timeout
function createRequestConfig(customTimeout = null) {
  return {
    timeout: customTimeout || API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      'User-Agent': 'Memory-Weaver-Bot/1.0'
    }
  };
}

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    logger.info(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    logger.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    logger.info(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    const status = error.response?.status || 'No response';
    const url = error.config?.url || 'Unknown URL';
    logger.error(`API Error: ${status} ${url}`, error.message);
    return Promise.reject(error);
  }
);

/**
 * Initialize upload session with Cloudflare
 * @param {Object} params - Upload initialization parameters
 * @returns {Object} Upload session result
 */
export async function initializeUpload(params) {
  try {
    const response = await apiClient.post('/api/upload/initialize', {
      sessionId: params.sessionId,
      memoryData: params.memoryData,
      uploadConfig: params.uploadConfig,
      discordUserId: params.discordUserId,
      guildId: params.guildId
    });

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    logger.error('Upload initialization failed:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to initialize upload',
      details: error.message
    };
  }
}

/**
 * Get upload session status
 * @param {string} sessionId - Upload session ID
 * @returns {Object} Upload status
 */
export async function getUploadStatus(sessionId) {
  try {
    const response = await apiClient.get(`/api/upload/status?session=${sessionId}`);

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    logger.error('Upload status check failed:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to get upload status',
      details: error.message
    };
  }
}

/**
 * Create memory with all collected data
 * @param {Object} params - Memory creation parameters
 * @returns {Object} Memory creation result
 */
export async function createMemory(params) {
  try {
    logger.info(`🔍 [DEBUG] createMemory - Starting API call`);
    logger.info(`🔍 [DEBUG] createMemory - Params received:`, {
      hasFile: params.hasFile,
      userId: params.discordUserId,
      guildId: params.guildId,
      sessionId: params.sessionId,
      memoryData: params.memoryData
    });
    
    // File-only approach: all memories require files
    if (!params.hasFile || !params.uploadData) {
      logger.error(`🔍 [DEBUG] createMemory - File is required for memory creation`);
      return {
        success: false,
        error: 'File attachment is required for all memories',
        code: 'FILE_REQUIRED',
        suggestion: 'Please attach a file to your memory before submitting'
      };
    }
    
    // Always use the with-file endpoint for file-only memories
    const endpoint = '/api/memory/with-file';
    logger.info(`🔍 [DEBUG] createMemory - Using file-only endpoint: ${endpoint}`);
    
    // Format data for our simple worker
    const payload = {
      title: params.memoryData.title,
      description: params.memoryData.description,
      category: params.memoryData.category,
      privacy: params.memoryData.privacy,
      tags: params.memoryData.tags || [],
      userId: params.discordUserId,
      guildId: params.guildId,
      sessionId: params.sessionId,
      uploadData: params.uploadData || null,
      confirmationData: params.confirmationData || null
    };

    logger.info(`🔍 [DEBUG] createMemory - Payload:`, {
      ...payload,
      uploadData: payload.uploadData ? {
        fileName: payload.uploadData.fileName,
        fileSize: payload.uploadData.fileSize,
        contentType: payload.uploadData.contentType,
        storageKey: payload.uploadData.storageKey,
        fileBufferLength: payload.uploadData.fileBuffer?.length
      } : null
    });

    logger.info(`🔍 [DEBUG] createMemory - Making API request to: ${API_BASE_URL}${endpoint}`);
    
    // Use extended timeout for file operations (3 minutes for IPFS processing)
    const fileOperationTimeout = 180000; // 3 minutes
    const response = await apiClient.post(endpoint, payload, createRequestConfig(fileOperationTimeout));
    
    logger.info(`🔍 [DEBUG] createMemory - API response status: ${response.status}`);
    logger.info(`🔍 [DEBUG] createMemory - API response data:`, response.data);

    return {
      success: true,
      memoryId: response.data.memoryId,
      fileCount: response.data.fileCount || 0,
      fileUrl: response.data.fileUrl || null,
      data: response.data
    };

  } catch (error) {
    logger.error(`🔍 [DEBUG] createMemory - Error occurred:`, error);
    logger.error(`🔍 [DEBUG] createMemory - Error response:`, error.response?.data);
    logger.error(`🔍 [DEBUG] createMemory - Error status:`, error.response?.status);
    logger.error(`🔍 [DEBUG] createMemory - Error message:`, error.message);
    
    // Provide specific error messages for different types of failures
    let errorMessage = 'Failed to create memory';
    let userFriendlyMessage = error.message;
    
    if (error.message.includes('timeout')) {
      errorMessage = 'Memory creation timed out';
      userFriendlyMessage = 'File processing is taking longer than expected. This can happen with large files or when IPFS is slow. Your memory may still be created - please check back in a few minutes.';
    } else if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
      errorMessage = 'Network connection failed';
      userFriendlyMessage = 'Unable to connect to storage service. Please check your internet connection and try again.';
    } else if (error.response?.status === 413) {
      errorMessage = 'File too large';
      userFriendlyMessage = 'Your file is too large. Please try with a smaller file (under 50MB).';
    } else if (error.response?.status >= 500) {
      errorMessage = 'Storage service temporarily unavailable';
      userFriendlyMessage = 'The storage service is experiencing issues. Please try again in a few minutes.';
    }
    
    return {
      success: false,
      error: error.response?.data?.error || errorMessage,
      details: error.message,
      userMessage: userFriendlyMessage,
      code: error.code,
      status: error.response?.status
    };
  }
}

/**
 * Get memory by ID
 * @param {string} memoryId - Memory identifier
 * @param {string} userId - Requesting user ID (for permission check)
 * @returns {Object} Memory data
 */
export async function getMemory(memoryId, userId) {
  try {
    const response = await apiClient.get(`/api/memory/${memoryId}`, {
      params: { requesterId: userId }
    });

    return {
      success: true,
      memory: response.data.memory
    };

  } catch (error) {
    logger.error('Memory retrieval failed:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to retrieve memory',
      details: error.message
    };
  }
}

/**
 * Search memories for a user
 * @param {string} userId - User ID
 * @param {Object} filters - Search filters
 * @returns {Object} Search results
 */
export async function searchMemories(userId, filters = {}) {
  try {
    const response = await apiClient.post('/api/memory/search', {
      userId,
      filters
    });

    return {
      success: true,
      memories: response.data.memories,
      count: response.data.count
    };

  } catch (error) {
    logger.error('Memory search failed:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to search memories',
      details: error.message
    };
  }
}

/**
 * Get server memories
 * @param {string} guildId - Guild ID
 * @param {string} requesterId - Requesting user ID
 * @param {Object} filters - Search filters
 * @returns {Object} Server memories
 */
export async function getServerMemories(guildId, requesterId, filters = {}) {
  try {
    const response = await apiClient.post('/api/memory/server', {
      guildId,
      requesterId,
      filters
    });

    return {
      success: true,
      memories: response.data.memories,
      count: response.data.count
    };

  } catch (error) {
    logger.error('Server memories retrieval failed:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to get server memories',
      details: error.message
    };
  }
}

/**
 * Delete memory
 * @param {string} memoryId - Memory ID
 * @param {string} userId - User ID (for permission check)
 * @returns {Object} Deletion result
 */
export async function deleteMemory(memoryId, userId) {
  try {
    const response = await apiClient.delete(`/api/memory/${memoryId}`, {
      data: { userId }
    });

    return {
      success: true,
      message: response.data.message
    };

  } catch (error) {
    logger.error('Memory deletion failed:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to delete memory',
      details: error.message
    };
  }
}

/**
 * Get memory statistics
 * @param {string} userId - User ID (optional)
 * @param {string} guildId - Guild ID (optional)
 * @returns {Object} Statistics
 */
export async function getMemoryStats(userId, guildId) {
  try {
    const response = await apiClient.get('/api/memory/stats', {
      params: { userId, guildId }
    });

    return {
      success: true,
      stats: response.data.stats
    };

  } catch (error) {
    logger.error('Memory stats retrieval failed:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to get statistics',
      details: error.message
    };
  }
}

/**
 * Cleanup upload session and temporary files
 * @param {string} sessionId - Session ID to cleanup
 * @returns {Object} Cleanup result
 */
export async function cleanupSession(sessionId) {
  try {
    const response = await apiClient.post('/api/upload/cleanup', {
      sessionId
    });

    return {
      success: true,
      message: response.data.message || 'Session cleaned up successfully'
    };

  } catch (error) {
    logger.error('Session cleanup failed:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to cleanup session',
      details: error.message
    };
  }
}

/**
 * Upload file complete notification
 * @param {Object} params - Upload completion parameters
 * @returns {Object} Completion result
 */
export async function notifyUploadComplete(params) {
  try {
    const response = await apiClient.post('/api/upload/complete', {
      sessionId: params.sessionId,
      fileKey: params.fileKey,
      fileName: params.fileName,
      fileSize: params.fileSize,
      contentType: params.contentType
    });

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    logger.error('Upload completion notification failed:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to notify upload completion',
      details: error.message
    };
  }
}

/**
 * Test API connectivity
 * @returns {Object} Connection test result
 */
export async function testConnection() {
  try {
    const response = await apiClient.get('/api/health');

    return {
      success: true,
      status: response.data.status,
      timestamp: response.data.timestamp
    };

  } catch (error) {
    logger.error('API connection test failed:', error);
    return {
      success: false,
      error: 'API connection failed',
      details: error.message
    };
  }
}

/**
 * Batch operations for multiple files
 */

/**
 * Process multiple file uploads
 * @param {Array} files - Array of file data
 * @param {string} sessionId - Session ID
 * @returns {Object} Batch processing result
 */
export async function processBatchUpload(files, sessionId) {
  try {
    const results = await Promise.allSettled(
      files.map(file => notifyUploadComplete({
        sessionId,
        fileKey: file.key,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type
      }))
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'rejected' || !r.value.success);

    return {
      success: true,
      processed: results.length,
      successful: successful.length,
      failed: failed.length,
      results
    };

  } catch (error) {
    logger.error('Batch upload processing failed:', error);
    return {
      success: false,
      error: 'Batch upload processing failed',
      details: error.message
    };
  }
}

/**
 * Error handling and retry logic
 */

/**
 * Retry failed API calls with exponential backoff
 * @param {Function} apiCall - API function to retry
 * @param {Array} args - Arguments for the API call
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Object} API call result
 */
export async function withRetry(apiCall, args = [], maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiCall(...args);
      if (result.success) {
        return result;
      }
      lastError = result;
    } catch (error) {
      lastError = {
        success: false,
        error: 'API call failed',
        details: error.message,
        attempt
      };
    }

    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      logger.warn(`API call failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  logger.error(`API call failed after ${maxRetries} attempts:`, lastError);
  return lastError;
}

/**
 * Update memory with IPFS data after server-side upload
 * @param {string} memoryId - Memory ID
 * @param {Object} ipfsData - IPFS upload result with cid and ipfsUrl
 */
export async function updateMemoryWithIPFS(memoryId, ipfsData) {
  logger.info(`🔍 [DEBUG] updateMemoryWithIPFS - Starting update for ${memoryId}`);
  
  try {
    const payload = {
      memoryId: memoryId,
      ipfsCid: ipfsData.cid,
      ipfsUrl: ipfsData.ipfsUrl
    };
    
    logger.info(`🔍 [DEBUG] updateMemoryWithIPFS - Payload:`, payload);
    logger.info(`🔍 [DEBUG] updateMemoryWithIPFS - Making API request to: ${API_BASE_URL}/api/memory/update-ipfs`);
    
    const response = await fetch(`${API_BASE_URL}/api/memory/update-ipfs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      timeout: 30000 // 30 seconds should be enough for a simple database update
    });
    
    logger.info(`🔍 [DEBUG] updateMemoryWithIPFS - API response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`❌ IPFS update API error: ${response.status} - ${errorText}`);
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    logger.info(`🔍 [DEBUG] updateMemoryWithIPFS - API response data:`, data);
    
    return {
      success: true,
      data: data,
      memoryId: memoryId,
      ipfsCid: ipfsData.cid
    };
    
  } catch (error) {
    logger.error(`❌ updateMemoryWithIPFS failed for ${memoryId}:`, error);
    
    return {
      success: false,
      error: error.message,
      memoryId: memoryId
    };
  }
}

/**
 * Health check and monitoring
 */

/**
 * Perform comprehensive health check
 * @returns {Object} Health check result
 */
export async function healthCheck() {
  try {
    const checks = await Promise.allSettled([
      testConnection(),
      // Add more health checks as needed
    ]);

    const results = checks.map((check, index) => ({
      name: ['API Connection'][index],
      success: check.status === 'fulfilled' && check.value.success,
      details: check.status === 'fulfilled' ? check.value : check.reason
    }));

    const allHealthy = results.every(r => r.success);

    return {
      success: allHealthy,
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks: results,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Health check failed:', error);
    return {
      success: false,
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
} 