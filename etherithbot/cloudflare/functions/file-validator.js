/**
 * File Validator Worker - Security and Validation Functions
 * Handles file validation, security scanning, and URL generation
 */

// import mime from 'mime'; // Removed - not compatible with Cloudflare Workers
import { storeFileMetadata } from './memory-storage.js';

/**
 * Simple MIME type detection based on file extension
 */
function getMimeType(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'txt': 'text/plain'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Generate signed upload URLs for R2 storage
 * @param {Object} uploadConfig - Upload configuration
 * @param {string} sessionId - Session identifier
 * @param {Object} env - Cloudflare environment bindings
 * @returns {Array} Array of signed upload URLs
 */
export async function generateUploadUrls(uploadConfig, sessionId, env) {
  try {
    const uploadUrls = [];
    const baseKey = `uploads/${sessionId}`;

    // Generate URLs for each allowed file type
    for (let i = 0; i < uploadConfig.maxFiles; i++) {
      const fileKey = `${baseKey}/file_${i + 1}`;
      
      // Generate a presigned URL for PUT requests
      const signedUrl = await env.MEMORY_FILES.signedUrl('PUT', fileKey, {
        expiresIn: 24 * 60 * 60, // 24 hours
        conditions: {
          'content-length-range': [1, getMaxFileSizeForTypes(uploadConfig.fileTypes)]
        }
      });

      uploadUrls.push({
        uploadUrl: signedUrl,
        fileKey,
        maxSize: getMaxFileSizeForTypes(uploadConfig.fileTypes),
        allowedTypes: uploadConfig.fileExtensions
      });
    }

    return uploadUrls;

  } catch (error) {
    console.error('Error generating upload URLs:', error);
    throw new Error('Failed to generate upload URLs');
  }
}

/**
 * Validate file type, size, and content
 * @param {string} fileName - Original file name
 * @param {string} contentType - MIME content type
 * @param {number} fileSize - File size in bytes
 * @param {Object} uploadConfig - Upload configuration
 * @returns {Object} Validation result
 */
export async function validateFileType(fileName, contentType, fileSize, uploadConfig) {
  const errors = [];
  const warnings = [];

  try {
    // Extract file extension
    const fileExtension = fileName.split('.').pop().toLowerCase();
    
    // Check if extension is allowed
    if (!uploadConfig.fileExtensions.includes(fileExtension)) {
      errors.push(`File extension '.${fileExtension}' is not allowed`);
    }

    // Validate MIME type
    const expectedMime = getMimeType(fileName);
    if (expectedMime && contentType !== expectedMime) {
      warnings.push(`MIME type mismatch: expected ${expectedMime}, got ${contentType}`);
    }

    // Check file size
    const maxSize = getMaxFileSizeForTypes(uploadConfig.fileTypes);
    if (fileSize > maxSize) {
      errors.push(`File size ${formatFileSize(fileSize)} exceeds maximum ${formatFileSize(maxSize)}`);
    }

    // Check minimum file size (prevent empty files)
    if (fileSize < 1) {
      errors.push('File cannot be empty');
    }

    // Validate file name
    if (fileName.length > 255) {
      errors.push('File name too long (max 255 characters)');
    }

    // Check for suspicious file extensions
    const suspiciousExtensions = ['exe', 'bat', 'cmd', 'scr', 'pif', 'com', 'vbs', 'js', 'jar'];
    if (suspiciousExtensions.includes(fileExtension)) {
      errors.push('Executable file types are not allowed for security reasons');
    }

    // Additional content type validation
    const allowedMimeTypes = getAllowedMimeTypes(uploadConfig.fileTypes);
    if (!allowedMimeTypes.includes(contentType)) {
      errors.push(`Content type '${contentType}' is not allowed`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      fileExtension,
      sanitizedFileName: sanitizeFileName(fileName)
    };

  } catch (error) {
    console.error('File validation error:', error);
    return {
      valid: false,
      errors: ['File validation failed'],
      warnings: [],
      details: error.message
    };
  }
}

/**
 * Process uploaded file (scan, validate, generate thumbnails)
 * @param {string} fileKey - R2 file key
 * @param {Object} fileData - File metadata
 * @param {Object} session - Upload session data
 * @param {Object} env - Cloudflare environment bindings
 */
export async function processUploadedFile(fileKey, fileData, session, env) {
  try {
    console.log(`Processing file: ${fileKey}`);

    // Get file from R2
    const fileObject = await env.MEMORY_FILES.get(fileKey);
    if (!fileObject) {
      throw new Error('File not found in storage');
    }

    // Perform security scan
    const securityScan = await performSecurityScan(fileObject, fileData);
    if (!securityScan.safe) {
      console.error(`Security threat detected in file: ${fileKey}`);
      // Move file to quarantine or delete
      await env.MEMORY_FILES.delete(fileKey);
      throw new Error('Security threat detected');
    }

    // Extract metadata
    const metadata = await extractFileMetadata(fileObject, fileData);

    // Generate thumbnail if applicable
    let thumbnailUrl = null;
    if (isImageFile(fileData.contentType)) {
      thumbnailUrl = await generateThumbnail(fileObject, fileKey, env);
    }

    // Move file to permanent storage with new key
    const permanentKey = `memories/${session.memoryData.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}/${fileData.fileName}`;
    await env.MEMORY_FILES.put(permanentKey, fileObject.body);

    // Delete temporary file
    await env.MEMORY_FILES.delete(fileKey);

    // Prepare final file data
    const finalFileData = {
      ...fileData,
      fileKey: permanentKey,
      storageUrl: `https://files.memory-weaver.com/${permanentKey}`,
      thumbnailUrl,
      metadata,
      processingStatus: 'completed',
      processedAt: new Date().toISOString(),
      storageDuration: session.uploadConfig.storageDuration
    };

    // Store file metadata in database
    const storageResult = await storeFileMetadata(session.memoryId, finalFileData, env);
    if (!storageResult.success) {
      console.error('Failed to store file metadata:', storageResult.error);
    }

    console.log(`File processing completed: ${permanentKey}`);

    return {
      success: true,
      finalFileData,
      message: 'File processed successfully'
    };

  } catch (error) {
    console.error(`File processing failed for ${fileKey}:`, error);
    
    // Clean up failed file
    try {
      await env.MEMORY_FILES.delete(fileKey);
    } catch (cleanupError) {
      console.error('Failed to clean up file:', cleanupError);
    }

    return {
      success: false,
      error: 'File processing failed',
      details: error.message
    };
  }
}

/**
 * Perform security scan on file content
 * @param {Object} fileObject - R2 file object
 * @param {Object} fileData - File metadata
 * @returns {Object} Security scan result
 */
async function performSecurityScan(fileObject, fileData) {
  try {
    // Basic content scanning
    const arrayBuffer = await fileObject.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Check for executable signatures
    const executableSignatures = [
      [0x4D, 0x5A], // PE executable (Windows .exe)
      [0x7F, 0x45, 0x4C, 0x46], // ELF executable (Linux)
      [0xFE, 0xED, 0xFA, 0xCE], // Mach-O executable (macOS)
      [0xCF, 0xFA, 0xED, 0xFE], // Mach-O executable (macOS)
    ];

    for (const signature of executableSignatures) {
      if (uint8Array.length >= signature.length) {
        const matches = signature.every((byte, index) => uint8Array[index] === byte);
        if (matches) {
          return {
            safe: false,
            reason: 'Executable file detected',
            threat: 'EXECUTABLE'
          };
        }
      }
    }

    // Check for suspicious strings (basic heuristic)
    const textContent = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array.slice(0, 1024));
    const suspiciousPatterns = [
      /eval\s*\(/gi,
      /document\.write/gi,
      /window\.location/gi,
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /javascript:/gi
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(textContent)) {
        return {
          safe: false,
          reason: 'Suspicious content detected',
          threat: 'SUSPICIOUS_CONTENT'
        };
      }
    }

    // File size-based checks
    if (fileData.fileSize > 500 * 1024 * 1024) { // 500MB
      return {
        safe: false,
        reason: 'File too large for processing',
        threat: 'SIZE_LIMIT'
      };
    }

    return {
      safe: true,
      scannedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Security scan error:', error);
    return {
      safe: false,
      reason: 'Security scan failed',
      error: error.message
    };
  }
}

/**
 * Extract file metadata
 * @param {Object} fileObject - R2 file object
 * @param {Object} fileData - File metadata
 * @returns {Object} Extracted metadata
 */
async function extractFileMetadata(fileObject, fileData) {
  try {
    const metadata = {
      size: fileData.fileSize,
      type: fileData.contentType,
      uploadedAt: fileData.uploadedAt,
      lastModified: fileObject.uploaded?.toISOString() || new Date().toISOString()
    };

    // Extract image metadata if it's an image
    if (isImageFile(fileData.contentType)) {
      // Basic image metadata (would use actual image processing library)
      metadata.imageData = {
        format: fileData.contentType.split('/')[1],
        estimated: true // Flag to indicate this is estimated
      };
    }

    // Extract document metadata for PDFs
    if (fileData.contentType === 'application/pdf') {
      metadata.documentData = {
        type: 'pdf',
        estimated: true
      };
    }

    return metadata;

  } catch (error) {
    console.error('Metadata extraction error:', error);
    return {
      error: 'Failed to extract metadata',
      extractedAt: new Date().toISOString()
    };
  }
}

/**
 * Generate thumbnail for image files
 * @param {Object} fileObject - R2 file object
 * @param {string} fileKey - Original file key
 * @param {Object} env - Cloudflare environment bindings
 * @returns {string|null} Thumbnail URL or null
 */
async function generateThumbnail(fileObject, fileKey, env) {
  try {
    // This would integrate with Cloudflare Images or similar service
    // For now, return a placeholder implementation
    
    const thumbnailKey = `thumbnails/${fileKey}_thumb.jpg`;
    
    // In a real implementation, you would:
    // 1. Process the image to create a thumbnail
    // 2. Store the thumbnail in R2 or Cloudflare Images
    // 3. Return the thumbnail URL
    
    return `https://images.memory-weaver.com/${thumbnailKey}`;

  } catch (error) {
    console.error('Thumbnail generation error:', error);
    return null;
  }
}

/**
 * Utility functions
 */

function getMaxFileSizeForTypes(fileTypes) {
  const sizeLimits = {
    'Images': 50 * 1024 * 1024,    // 50MB
    'Documents': 50 * 1024 * 1024, // 50MB
    'Audio': 100 * 1024 * 1024,    // 100MB
    'Video': 200 * 1024 * 1024,    // 200MB
    'Mixed': 50 * 1024 * 1024      // 50MB default
  };

  let maxSize = 50 * 1024 * 1024; // Default 50MB
  
  fileTypes.forEach(type => {
    if (sizeLimits[type] && sizeLimits[type] > maxSize) {
      maxSize = sizeLimits[type];
    }
  });

  return maxSize;
}

function getAllowedMimeTypes(fileTypes) {
  const mimeTypes = {
    'Images': [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 
      'image/bmp', 'image/svg+xml'
    ],
    'Documents': [
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'application/rtf'
    ],
    'Audio': [
      'audio/mpeg', 'audio/wav', 'audio/flac', 'audio/mp4', 
      'audio/ogg', 'audio/x-ms-wma'
    ],
    'Video': [
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 
      'video/x-matroska', 'video/webm'
    ]
  };

  let allowedTypes = [];
  fileTypes.forEach(type => {
    if (mimeTypes[type]) {
      allowedTypes = [...allowedTypes, ...mimeTypes[type]];
    }
  });

  // Remove duplicates
  return [...new Set(allowedTypes)];
}

function isImageFile(contentType) {
  return contentType.startsWith('image/');
}

function sanitizeFileName(fileName) {
  // Remove or replace potentially dangerous characters
  return fileName
    .replace(/[<>:"/\\|?*]/g, '_') // Replace dangerous chars with underscore
    .replace(/\s+/g, '_') // Replace spaces with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .slice(0, 255); // Limit length
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * File type detection based on magic numbers
 * @param {Uint8Array} buffer - File buffer
 * @returns {string|null} Detected file type
 */
function detectFileType(buffer) {
  // Check magic numbers for common file types
  const signatures = {
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
    'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
    'video/mp4': [[0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]],
    'audio/mpeg': [[0xFF, 0xFB], [0xFF, 0xF3], [0xFF, 0xF2]],
  };

  for (const [mimeType, sigs] of Object.entries(signatures)) {
    for (const sig of sigs) {
      if (buffer.length >= sig.length) {
        const matches = sig.every((byte, index) => buffer[index] === byte);
        if (matches) return mimeType;
      }
    }
  }

  return null;
} 