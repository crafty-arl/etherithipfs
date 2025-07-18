/**
 * Simple Memory Handler - Cloudflare Worker
 * Streamlined for R2 + D1 storage only (IPFS handled server-side)
 */

// Import search functions from memory-storage.js
import { searchMemories, getServerMemories } from './memory-storage.js';

export default {
  async fetch(request, env, ctx) {
    // Handle CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Health check endpoint
      if (path === '/api/health') {
        return new Response(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: 'Memory Weaver Storage',
          database: env.MEMORY_DB ? 'D1 Connected' : 'D1 Not Available',
          kv: env.UPLOAD_SESSIONS ? 'KV Connected' : 'KV Not Available',
          ipfs: 'Handled Server-Side'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Memory search endpoint
      if (path === '/api/memory/search' && request.method === 'POST') {
        const searchData = await request.json();
        console.log('🔍 Processing memory search:', {
          type: searchData.type,
          userId: searchData.userId,
          filters: searchData.filters
        });
        console.log('🚨 UPDATED WORKER CODE IS RUNNING - WITH IPFS JOIN LOGIC!');

        if (!env.MEMORY_DB) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Database not available'
          }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        try {
          let result;

          if (searchData.type === 'personal') {
            // Search user's personal memories
            if (!searchData.userId) {
              return new Response(JSON.stringify({
                success: false,
                error: 'User ID is required for personal memory search'
              }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
            result = await searchMemories(searchData.userId, searchData.filters || {}, env);
          } else if (searchData.type === 'members_only') {
            // Search memories with members_only privacy level - Our Memories tab
            // Now using the same JOIN logic as other functions to include IPFS data
            try {
              // TEST: Simple query first to see if data exists
              const testQuery = await env.MEMORY_DB.prepare(`
                SELECT COUNT(*) as total_files, 
                       COUNT(CASE WHEN ipfs_cid IS NOT NULL THEN 1 END) as files_with_ipfs
                FROM memory_files
              `).first();
              console.log('🧪 TEST memory_files table (members_only):', testQuery);

              let query = `
                SELECT m.*, 
                       mf.ipfs_cid, 
                       mf.ipfs_url, 
                       mf.storage_key, 
                       mf.filename, 
                       mf.file_type, 
                       mf.file_size, 
                       mf.storage_url
                FROM memories m
                LEFT JOIN (
                  SELECT memory_id, ipfs_cid, ipfs_url, storage_key, filename, file_type, file_size, storage_url,
                         ROW_NUMBER() OVER (PARTITION BY memory_id ORDER BY uploaded_at ASC) as rn
                  FROM memory_files
                ) mf ON m.id = mf.memory_id AND mf.rn = 1
                WHERE m.privacy_level = ?`;
              let bindings = ['members_only'];

              // Add additional filters if provided
              const filters = searchData.filters || {};
              
              if (filters.category) {
                query += ' AND m.category = ?';
                bindings.push(filters.category);
              }

              if (filters.searchTerm) {
                query += ' AND (m.title LIKE ? OR m.description LIKE ? OR m.tags LIKE ?)';
                const searchPattern = `%${filters.searchTerm}%`;
                bindings.push(searchPattern, searchPattern, searchPattern);
              }

              if (filters.dateFrom) {
                query += ' AND m.created_at >= ?';
                bindings.push(filters.dateFrom);
              }

              if (filters.dateTo) {
                query += ' AND m.created_at <= ?';
                bindings.push(filters.dateTo);
              }

              // Add ordering and pagination
              query += ' ORDER BY m.created_at DESC';
              
              if (filters.limit) {
                query += ' LIMIT ?';
                bindings.push(filters.limit);
              }

              if (filters.offset) {
                query += ' OFFSET ?';
                bindings.push(filters.offset);
              }

              console.log('🔍 Our Memories Query with JOIN:', { query, bindings });
              const dbResult = await env.MEMORY_DB.prepare(query).bind(...bindings).all();

              // DEBUG: Log the raw database result
              console.log('🔍 DEBUG members_only - Raw DB result:', {
                resultCount: dbResult.results.length,
                sampleResult: dbResult.results[0] ? {
                  id: dbResult.results[0].id,
                  title: dbResult.results[0].title,
                  ipfs_cid: dbResult.results[0].ipfs_cid,
                  ipfs_url: dbResult.results[0].ipfs_url,
                  storage_url: dbResult.results[0].storage_url,
                  filename: dbResult.results[0].filename,
                  allKeys: Object.keys(dbResult.results[0])
                } : 'No results'
              });

              // Parse JSON fields for each memory and include file data
              const memories = dbResult.results.map(memory => {
                const transformed = {
                  ...memory,
                  tags: JSON.parse(memory.tags || '[]'),
                  shareOptions: JSON.parse(memory.share_options || '[]'),
                  uploadConfig: JSON.parse(memory.upload_config || '{}'),
                  // Include file data from the JOIN
                  file_url: memory.storage_url,
                  file_name: memory.filename,
                  file_size: memory.file_size,
                  content_type: memory.file_type
                };
                
                // DEBUG: Log first transformed memory
                if (memory.id === dbResult.results[0]?.id) {
                  console.log('🔄 DEBUG members_only - Transformed memory:', {
                    id: transformed.id,
                    title: transformed.title,
                    ipfs_cid: transformed.ipfs_cid,
                    ipfs_url: transformed.ipfs_url,
                    file_url: transformed.file_url,
                    storage_key: transformed.storage_key
                  });
                }
                
                return transformed;
              });

              result = {
                success: true,
                memories,
                count: memories.length
              };

            } catch (error) {
              console.error('Error searching members_only memories:', error);
              result = {
                success: false,
                error: 'Failed to search our memories',
                details: error.message
              };
            }
          } else {
            return new Response(JSON.stringify({
              success: false,
              error: 'Invalid search type. Must be "personal" or "members_only"'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        } catch (error) {
          console.error('❌ Memory search failed:', error);
          return new Response(JSON.stringify({
            success: false,
            error: 'Memory search failed',
            details: error.message,
            timestamp: new Date().toISOString()
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Store memory with file endpoint (streamlined for R2+D1 only)
      if (path === '/api/memory/with-file' && request.method === 'POST') {
        const memoryData = await request.json();
        console.log('📦 Processing memory storage with file upload:', {
          userId: memoryData.userId,
          guildId: memoryData.guildId,
          title: memoryData.title,
          hasUploadData: !!memoryData.uploadData,
          fileName: memoryData.uploadData?.fileName
        });
        
        // Validate required fields
        if (!memoryData.title || !memoryData.description) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Missing required fields: title and description are required'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Validate file upload data
        if (!memoryData.uploadData || !memoryData.uploadData.fileName || !memoryData.uploadData.fileBuffer) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Missing file upload data: fileName and fileBuffer are required for this endpoint'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const memoryId = `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        
        // File-only approach: we know we have a file since validation passed
        const hasFile = true;
        const fileCount = 1; // Always 1 for file-only approach
        
        // Enhanced memory data processing for file-only memories
        const processedMemoryData = {
          id: memoryId,
          userId: memoryData.userId || 'unknown',
          guildId: memoryData.guildId || 'unknown',
          title: (memoryData.title || '').trim(),
          description: (memoryData.description || '').trim(),
          category: memoryData.category || 'other',
          privacy: memoryData.privacy || 'members_only',
          tags: Array.isArray(memoryData.tags) ? memoryData.tags : [],
          status: 'active',
          fileCount: fileCount, // Always 1 for file-only memories
          createdAt: now,
          updatedAt: now
        };
        
        let fileStorageUrl = null;
        let fileStorageKey = null;
        let storageResults = {
          r2: { success: false, error: null },
          d1: { success: false, error: null }
        };
        
        // Step 1: Store file in R2 (primary file storage)
        if (hasFile && env.MEMORY_FILES) {
          try {
            console.log('☁️ Storing file in R2...');
            const uploadData = memoryData.uploadData;
            fileStorageKey = uploadData.storageKey;
            
            // Convert file buffer back to ArrayBuffer
            const fileBuffer = new Uint8Array(uploadData.fileBuffer).buffer;
            
            // Store file in R2 with comprehensive metadata
            await env.MEMORY_FILES.put(fileStorageKey, fileBuffer, {
              httpMetadata: {
                contentType: uploadData.contentType,
                contentLength: uploadData.fileSize.toString(),
                cacheControl: 'public, max-age=31536000' // 1 year cache
              },
              customMetadata: {
                originalName: uploadData.fileName,
                uploadedAt: now,
                memoryId: memoryId,
                userId: processedMemoryData.userId,
                contentType: uploadData.contentType,
                version: '1.0'
              }
            });
            
            fileStorageUrl = `https://memory-weaver-files.r2.cloudflarestorage.com/${fileStorageKey}`;
            storageResults.r2.success = true;
            console.log('✅ File stored in R2 successfully:', {
              key: fileStorageKey,
              size: uploadData.fileSize,
              url: fileStorageUrl
            });
            
          } catch (r2Error) {
            console.error('❌ R2 storage failed:', r2Error);
            storageResults.r2.error = r2Error.message;
            
            // R2 failure is critical for file-only memories
            return new Response(JSON.stringify({
              success: false,
              error: 'File storage failed - memory cannot be created without file storage',
              userMessage: 'Unable to store your file. Please try again with a smaller file or contact support if the issue persists.',
              technicalDetails: r2Error.message,
              timestamp: now,
              storageResults: storageResults,
              troubleshooting: {
                suggestions: [
                  'Try uploading a smaller file (under 50MB)',
                  'Check that your file type is supported',
                  'Wait a few moments and try again',
                  'Contact support if the issue continues'
                ],
                supportedFileTypes: ['Images (jpg, png, gif, webp)', 'Documents (pdf, doc)', 'Audio (mp3, wav)', 'Video (mp4, mov)'],
                maxFileSize: '50MB'
              }
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }
        
        // Step 2: Store memory and file metadata in D1 (critical)
        if (env.MEMORY_DB) {
          try {
            console.log('💾 Storing memory and file metadata in D1...');
            
            // Store memory record
            const memoryResult = await env.MEMORY_DB.prepare(`
              INSERT INTO memories (
                id, user_id, server_id, title, description, category, 
                privacy_level, created_at, updated_at, tags, status, file_count
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              processedMemoryData.id,
              processedMemoryData.userId,
              processedMemoryData.guildId,
              processedMemoryData.title,
              processedMemoryData.description,
              processedMemoryData.category,
              processedMemoryData.privacy,
              processedMemoryData.createdAt,
              processedMemoryData.updatedAt,
              JSON.stringify(processedMemoryData.tags),
              processedMemoryData.status,
              processedMemoryData.fileCount
            ).run();

            console.log('✅ Memory stored in D1:', {
              memoryId: memoryResult.meta?.last_row_id,
              changes: memoryResult.meta?.changes,
              success: memoryResult.success
            });

            // Store file metadata (IPFS fields will be updated server-side if needed)
            let fileResult = null;
            if (hasFile && fileStorageKey) {
              const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              const uploadData = memoryData.uploadData;
              
              fileResult = await env.MEMORY_DB.prepare(`
                INSERT INTO memory_files (
                  id, memory_id, filename, file_type, file_size, storage_url, storage_key, ipfs_cid, ipfs_url, uploaded_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(
                fileId,
                memoryId,
                uploadData.fileName,
                uploadData.contentType,
                uploadData.fileSize,
                fileStorageUrl,
                fileStorageKey,
                null, // IPFS CID will be added server-side
                null, // IPFS URL will be added server-side
                now
              ).run();

              console.log('✅ File metadata stored in D1:', {
                fileId: fileResult.meta?.last_row_id,
                changes: fileResult.meta?.changes,
                success: fileResult.success
              });
            }
            
            storageResults.d1.success = true;

            // Generate streamlined success response (IPFS status handled server-side)
            return new Response(JSON.stringify({
              success: true,
              memoryId: memoryId,
              message: 'Memory created successfully with secure storage (R2)',
              userMessage: '✅ Your memory and file have been stored securely',
              timestamp: now,
              storage: {
                primary: 'R2+D1',
                status: 'success',
                details: storageResults
              },
              file: {
                stored: hasFile,
                url: fileStorageUrl,
                key: fileStorageKey,
                size: memoryData.uploadData?.fileSize
              },
              fileCount: fileCount
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
            
          } catch (d1Error) {
            console.error('❌ D1 storage failed:', d1Error);
            storageResults.d1.error = d1Error.message;
            
            return new Response(JSON.stringify({
              success: false,
              error: 'Database storage failed - unable to save memory metadata',
              userMessage: 'Unable to save your memory. Please try again or contact support if the issue persists.',
              technicalDetails: d1Error.message,
              timestamp: now,
              storageResults: storageResults
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        } else {
          return new Response(JSON.stringify({
            success: false,
            error: 'Database not available',
            userMessage: 'Memory storage is temporarily unavailable. Please try again later.',
            timestamp: now
          }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Update memory with IPFS data endpoint
      if (path === '/api/memory/update-ipfs' && request.method === 'POST') {
        const updateData = await request.json();
        console.log('🌐 Updating memory with IPFS data:', {
          memoryId: updateData.memoryId,
          cid: updateData.ipfsCid
        });
        
        // Validate required fields
        if (!updateData.memoryId || !updateData.ipfsCid || !updateData.ipfsUrl) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Missing required fields: memoryId, ipfsCid, and ipfsUrl are required'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        if (env.MEMORY_DB) {
          try {
            // Update the memory_files table with IPFS data
            const updateResult = await env.MEMORY_DB.prepare(`
              UPDATE memory_files 
              SET ipfs_cid = ?, ipfs_url = ? 
              WHERE memory_id = ?
            `).bind(
              updateData.ipfsCid,
              updateData.ipfsUrl,
              updateData.memoryId
            ).run();

            console.log('✅ IPFS data updated in D1:', {
              memoryId: updateData.memoryId,
              changes: updateResult.meta?.changes,
              success: updateResult.success
            });

            if (updateResult.meta?.changes > 0) {
              return new Response(JSON.stringify({
                success: true,
                message: 'IPFS data updated successfully',
                memoryId: updateData.memoryId,
                ipfsCid: updateData.ipfsCid,
                changes: updateResult.meta.changes,
                timestamp: new Date().toISOString()
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            } else {
              return new Response(JSON.stringify({
                success: false,
                error: 'Memory not found or no changes made',
                memoryId: updateData.memoryId
              }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
            
          } catch (d1Error) {
            console.error('❌ D1 update failed:', d1Error);
            
            return new Response(JSON.stringify({
              success: false,
              error: 'Database update failed',
              technicalDetails: d1Error.message,
              timestamp: new Date().toISOString()
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        } else {
          return new Response(JSON.stringify({
            success: false,
            error: 'Database not available'
          }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // If no route matched, return 404
      return new Response(JSON.stringify({
        error: 'Not Found',
        message: `Endpoint ${path} not found`
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('❌ Worker error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error',
        userMessage: 'Something went wrong. Please try again later.',
        technicalDetails: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
}; 