/**
 * Main Memory Weaver Worker - Unified Entry Point
 * Routes requests to memory storage and file upload handlers
 */

import memoryHandler from './simple-memory-handler.js';
import uploadHandler from './upload-handler.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for all responses
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
      // Route upload-related requests to upload handler
      if (path.startsWith('/api/upload')) {
        console.log(`Routing upload request: ${path}`);
        return await uploadHandler.fetch(request, env, ctx);
      }

      // Route memory-related requests to memory handler
      if (path.startsWith('/api/memory') || path === '/api/health' || path === '/api/memories') {
        console.log(`Routing memory request: ${path}`);
        return await memoryHandler.fetch(request, env, ctx);
      }

      // Default 404 for unknown routes
      return new Response(JSON.stringify({
        error: 'Endpoint not found',
        path: path,
        availableEndpoints: [
          '/api/health - Health check',
          '/api/memory - Create/retrieve memories',
          '/api/memories - List memories',
          '/api/upload/initialize - Initialize file upload',
          '/api/upload/complete - Complete file upload',
          '/api/upload/status - Check upload status'
        ]
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Main worker error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
}; 