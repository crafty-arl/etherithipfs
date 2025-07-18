/**
 * IPFS Client for Discord Bot (Server-Side)
 * Uses the exact same approach as the working curl command
 */

import axios from 'axios';
import FormData from 'form-data';
import { logger } from './logger.js';

const IPFS_NODE_URL = 'http://31.220.107.113:5001';

/**
 * Upload file to IPFS using the exact same method as working curl command
 * curl -X POST -F file=@test.txt http://31.220.107.113:5001/api/v0/add
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original filename
 * @returns {Promise<Object>} Upload result
 */
export async function uploadToIPFS(fileBuffer, fileName) {
  logger.info(`🚀 Uploading ${fileName} to IPFS (server-side)`);
  
  try {
    // Create FormData exactly like curl -F file=@filename
    const formData = new FormData();
    formData.append('file', fileBuffer, fileName);
    
    logger.info(`📤 Making POST request to ${IPFS_NODE_URL}/api/v0/add`);
    
    // Make the exact same request as the working curl command
    const response = await axios.post(`${IPFS_NODE_URL}/api/v0/add`, formData, {
      headers: {
        ...formData.getHeaders(),
        'User-Agent': 'Memory-Weaver-Bot/1.0'
      },
      timeout: 60000 // 1 minute timeout
    });
    
    logger.info(`📥 IPFS response:`, response.data);
    
    const { Name, Hash, Size } = response.data;
    const ipfsUrl = `https://ipfs.io/ipfs/${Hash}`;
    
    logger.info(`✅ File uploaded to IPFS successfully: ${Hash}`);
    
    return {
      success: true,
      cid: Hash,
      ipfsUrl: ipfsUrl,
      size: parseInt(Size),
      fileName: Name,
      method: 'server-side'
    };
    
  } catch (error) {
    logger.error(`❌ IPFS upload failed for ${fileName}:`, error.message);
    
    // Provide specific error details
    if (error.code === 'ECONNREFUSED') {
      logger.error(`🚫 Cannot connect to IPFS node at ${IPFS_NODE_URL}`);
    } else if (error.response) {
      logger.error(`🚫 IPFS node responded with ${error.response.status}: ${error.response.data}`);
    }
    
    return {
      success: false,
      error: error.message,
      code: error.code,
      method: 'server-side'
    };
  }
}

/**
 * Update memory record with IPFS information
 * @param {string} memoryId - Memory ID
 * @param {Object} ipfsData - IPFS upload result
 * @returns {Promise<Object>} Update result
 */
export async function updateMemoryWithIPFS(memoryId, ipfsData) {
  try {
    // This would call your Cloudflare Worker to update the memory record
    // For now, just log the success
    logger.info(`📝 Would update memory ${memoryId} with IPFS data:`, ipfsData);
    
    return {
      success: true,
      memoryId,
      ipfsData
    };
    
  } catch (error) {
    logger.error(`❌ Failed to update memory ${memoryId} with IPFS data:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test IPFS connectivity (same as your curl test)
 * @returns {Promise<Object>} Test result
 */
export async function testIPFSConnection() {
  try {
    logger.info(`🔍 Testing IPFS connection to ${IPFS_NODE_URL}`);
    
    // Test with a simple text file like your curl example
    const testContent = Buffer.from('This is a test file from Memory Weaver bot\n');
    const result = await uploadToIPFS(testContent, 'bot-test.txt');
    
    if (result.success) {
      logger.info(`✅ IPFS connection test successful: ${result.cid}`);
      return {
        success: true,
        testCid: result.cid,
        message: 'IPFS connection working perfectly'
      };
    } else {
      logger.error(`❌ IPFS connection test failed:`, result.error);
      return {
        success: false,
        error: result.error,
        message: 'IPFS connection not available'
      };
    }
    
  } catch (error) {
    logger.error(`❌ IPFS connection test error:`, error);
    return {
      success: false,
      error: error.message,
      message: 'IPFS connection test failed'
    };
  }
} 