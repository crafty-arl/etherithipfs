/**
 * Memory Weaver Upload Handler - Cloudflare Worker
 * Handles file upload orchestration, URL generation, and processing coordination
 */

import { generateUploadUrls, processUploadedFile, validateFileType } from './file-validator.js';
import { storeMemoryMetadata, updateFileStatus } from './memory-storage.js';

// Main worker event handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for browser requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route requests based on path
      switch (path) {
        case '/api/upload/initialize':
          return await handleInitializeUpload(request, env, corsHeaders);
        
        case '/api/upload/complete':
          return await handleUploadComplete(request, env, corsHeaders);
        
        case '/api/upload/webhook':
          return await handleUploadWebhook(request, env, corsHeaders);
        
        case '/api/upload/status':
          return await handleUploadStatus(request, env, corsHeaders);
        
        case '/api/upload/cleanup':
          return await handleUploadCleanup(request, env, corsHeaders);
        
        default:
          return new Response('Not Found', { status: 404, headers: corsHeaders });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * Initialize upload session and generate signed URLs
 */
async function handleInitializeUpload(request, env, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { sessionId, memoryData, uploadConfig, discordUserId, guildId } = body;

    // Validate required fields
    if (!sessionId || !memoryData || !uploadConfig || !discordUserId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: sessionId, memoryData, uploadConfig, discordUserId'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate upload session data
    const uploadSession = {
      sessionId,
      discordUserId,
      guildId,
      memoryData,
      uploadConfig,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      status: 'initialized',
      files: []
    };

    // Store session in KV storage
    await env.UPLOAD_SESSIONS.put(sessionId, JSON.stringify(uploadSession), {
      expirationTtl: 24 * 60 * 60 // 24 hours
    });

    // Generate signed upload URLs
    const uploadUrls = await generateUploadUrls(uploadConfig, sessionId, env);

    const response = {
      success: true,
      sessionId,
      uploadUrls,
      maxFileSize: getMaxFileSize(uploadConfig.fileTypes),
      allowedExtensions: uploadConfig.fileExtensions,
      expiresAt: uploadSession.expiresAt,
      webhookUrl: `${new URL(request.url).origin}/api/upload/webhook`,
      statusUrl: `${new URL(request.url).origin}/api/upload/status?session=${sessionId}`
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Initialize upload error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to initialize upload session',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle upload completion notification
 */
async function handleUploadComplete(request, env, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { sessionId, fileKey, fileName, fileSize, contentType } = body;

    // Retrieve session data
    const sessionData = await env.UPLOAD_SESSIONS.get(sessionId);
    if (!sessionData) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Upload session not found or expired'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const session = JSON.parse(sessionData);

    // Validate file against session configuration
    const validation = await validateFileType(fileName, contentType, fileSize, session.uploadConfig);
    if (!validation.valid) {
      return new Response(JSON.stringify({
        success: false,
        error: 'File validation failed',
        details: validation.errors
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Add file to session
    const fileData = {
      fileKey,
      fileName,
      fileSize,
      contentType,
      uploadedAt: new Date().toISOString(),
      status: 'uploaded',
      processingStatus: 'pending'
    };

    session.files.push(fileData);
    session.lastUpdated = new Date().toISOString();

    // Update session in KV
    await env.UPLOAD_SESSIONS.put(sessionId, JSON.stringify(session));

    // Trigger file processing (background task)
    ctx.waitUntil(processUploadedFile(fileKey, fileData, session, env));

    const response = {
      success: true,
      fileKey,
      fileName,
      status: 'uploaded',
      message: 'File uploaded successfully, processing started'
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Upload complete error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to process upload completion',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle webhook notifications from external services
 */
async function handleUploadWebhook(request, env, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { sessionId, fileKey, event, data } = body;

    console.log(`Webhook received: ${event} for file ${fileKey} in session ${sessionId}`);

    // Retrieve session data
    const sessionData = await env.UPLOAD_SESSIONS.get(sessionId);
    if (!sessionData) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Session not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const session = JSON.parse(sessionData);

    // Find the file in the session
    const fileIndex = session.files.findIndex(f => f.fileKey === fileKey);
    if (fileIndex === -1) {
      return new Response(JSON.stringify({
        success: false,
        error: 'File not found in session'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update file status based on webhook event
    switch (event) {
      case 'processing_complete':
        session.files[fileIndex].processingStatus = 'completed';
        session.files[fileIndex].processedAt = new Date().toISOString();
        if (data.thumbnailUrl) session.files[fileIndex].thumbnailUrl = data.thumbnailUrl;
        if (data.metadata) session.files[fileIndex].metadata = data.metadata;
        break;
      
      case 'processing_failed':
        session.files[fileIndex].processingStatus = 'failed';
        session.files[fileIndex].error = data.error;
        break;
      
      case 'virus_detected':
        session.files[fileIndex].status = 'rejected';
        session.files[fileIndex].processingStatus = 'failed';
        session.files[fileIndex].error = 'Security threat detected';
        break;
      
      default:
        console.log(`Unknown webhook event: ${event}`);
    }

    // Update session
    session.lastUpdated = new Date().toISOString();
    await env.UPLOAD_SESSIONS.put(sessionId, JSON.stringify(session));

    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook processed successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to process webhook',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get upload session status
 */
async function handleUploadStatus(request, env, corsHeaders) {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session');

    if (!sessionId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Session ID required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Retrieve session data
    const sessionData = await env.UPLOAD_SESSIONS.get(sessionId);
    if (!sessionData) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Session not found or expired'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const session = JSON.parse(sessionData);

    // Calculate status summary
    const totalFiles = session.files.length;
    const completedFiles = session.files.filter(f => f.processingStatus === 'completed').length;
    const failedFiles = session.files.filter(f => f.processingStatus === 'failed').length;
    const pendingFiles = session.files.filter(f => f.processingStatus === 'pending').length;

    const response = {
      success: true,
      sessionId,
      status: session.status,
      totalFiles,
      completedFiles,
      failedFiles,
      pendingFiles,
      files: session.files,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      lastUpdated: session.lastUpdated
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Status check error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to get session status',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Clean up expired sessions and temporary files
 */
async function handleUploadCleanup(request, env, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // This would be called by a cron job
    const cleanupResults = {
      sessionsCleanedUp: 0,
      filesDeleted: 0,
      errors: []
    };

    // Implementation would scan KV for expired sessions
    // and clean up associated R2 objects
    // This is a placeholder for the full implementation

    return new Response(JSON.stringify({
      success: true,
      results: cleanupResults
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Cleanup failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get maximum file size based on file types
 */
function getMaxFileSize(fileTypes) {
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