import { NextRequest, NextResponse } from 'next/server';

// Cloudflare Worker API base URL
const MEMORY_API_URL = process.env.MEMORY_API_URL || 'https://memory-weaver-workers-production.carl-6e7.workers.dev';

// Helper function to properly construct URLs without double slashes
function buildTargetUrl(baseUrl: string, path: string): string {
  const cleanBase = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  const cleanPath = path.replace(/^\//, ''); // Remove leading slash
  return `${cleanBase}/${cleanPath}`;
}

// Transform snake_case API response to camelCase for frontend
function transformMemoryData(rawMemory: any) {
  console.log('🔄 Transforming raw memory:', {
    id: rawMemory.id,
    created_at: rawMemory.created_at,
    created_at_type: typeof rawMemory.created_at,
    raw_keys: Object.keys(rawMemory),
    // DEBUG: File-related fields
    ipfs_cid: rawMemory.ipfs_cid,
    ipfs_url: rawMemory.ipfs_url,
    storage_key: rawMemory.storage_key,
    file_url: rawMemory.file_url,
    filename: rawMemory.filename,
    storage_url: rawMemory.storage_url
  });

  const transformed = {
    id: rawMemory.id,
    userId: rawMemory.user_id,
    guildId: rawMemory.server_id,
    title: rawMemory.title,
    description: rawMemory.description,
    category: rawMemory.category,
    privacy: rawMemory.privacy_level,
    tags: rawMemory.tags || [],
    status: rawMemory.status,
    fileCount: rawMemory.file_count,
    createdAt: rawMemory.created_at,
    updatedAt: rawMemory.updated_at,
    storageKey: rawMemory.storage_key,
    ipfsCid: rawMemory.ipfs_cid,
    ipfsUrl: rawMemory.ipfs_url,
    fileUrl: rawMemory.file_url,
    fileName: rawMemory.file_name,
    fileSize: rawMemory.file_size,
    contentType: rawMemory.content_type
  };

  console.log('✅ Transformed result:', {
    id: transformed.id,
    createdAt: transformed.createdAt,
    createdAt_type: typeof transformed.createdAt,
    transformed_keys: Object.keys(transformed),
    // DEBUG: File-related transformed fields
    ipfsCid: transformed.ipfsCid,
    ipfsUrl: transformed.ipfsUrl,
    fileUrl: transformed.fileUrl,
    storageKey: transformed.storageKey
  });

  return transformed;
}

// Transform stats data from snake_case to camelCase
function transformStatsData(rawStats: any) {
  return {
    totalMemories: rawStats.total_memories || rawStats.totalMemories || 0,
    myMemories: rawStats.my_memories || rawStats.myMemories || 0,
    ourMemories: rawStats.our_memories || rawStats.ourMemories || 0,
    categories: rawStats.categories || {},
    recentActivity: rawStats.recent_activity || rawStats.recentActivity || 0
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    
    // Add query parameters for stats endpoint
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const guildId = url.searchParams.get('guildId');
    
    let targetUrl = buildTargetUrl(MEMORY_API_URL, path);
    
    // Add query parameters if they exist
    if (userId || guildId) {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      if (guildId) params.append('guildId', guildId);
      targetUrl += `?${params.toString()}`;
    }
    
    console.log('Forwarding GET request to:', targetUrl);
    
    // Forward the request to Cloudflare Workers
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('Response from Cloudflare Worker:', { status: response.status, data });

    // Debug logging to see what data structure is being returned
    if (data.success && data.memories) {
      console.log('🔍 Raw memory data structure:', {
        count: data.memories.length,
        sampleMemory: data.memories[0] ? {
          id: data.memories[0].id,
          title: data.memories[0].title,
          created_at: data.memories[0].created_at,
          created_at_type: typeof data.memories[0].created_at,
          fullObject: data.memories[0]
        } : 'No memories'
      });

      // Transform the memories data from snake_case to camelCase
      const transformedMemories = data.memories.map(transformMemoryData);
      
      console.log('🔄 Transformed memory data:', {
        count: transformedMemories.length,
        sampleMemory: transformedMemories[0] ? {
          id: transformedMemories[0].id,
          title: transformedMemories[0].title,
          createdAt: transformedMemories[0].createdAt,
          createdAtType: typeof transformedMemories[0].createdAt,
          fullObject: transformedMemories[0]
        } : 'No memories'
      });

      // Return transformed data
      return NextResponse.json({
        ...data,
        memories: transformedMemories
      }, { status: response.status });
    }

    // Handle stats transformation
    if (data.success && data.stats) {
      console.log('📊 Raw stats data:', data.stats);
      const transformedStats = transformStatsData(data.stats);
      console.log('📊 Transformed stats data:', transformedStats);
      
      return NextResponse.json({
        ...data,
        stats: transformedStats
      }, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error('Memory API proxy error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch memories',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    
    const targetUrl = buildTargetUrl(MEMORY_API_URL, path);
    console.log('Forwarding POST request to:', targetUrl, 'with body:', body);
    
    // Forward the request to Cloudflare Workers
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log('POST Response from Cloudflare Worker:', { status: response.status, data });

    // Transform memory data if it exists in the response (single memory)
    if (data.success && data.memory) {
      const transformedMemory = transformMemoryData(data.memory);
      return NextResponse.json({
        ...data,
        memory: transformedMemory
      }, { status: response.status });
    }

    // Transform memories data if it exists in the response (array of memories, like search results)
    if (data.success && data.memories) {
      console.log('🔍 POST Raw memory search results:', {
        count: data.memories.length,
        sampleMemory: data.memories[0] ? {
          id: data.memories[0].id,
          created_at: data.memories[0].created_at,
          created_at_type: typeof data.memories[0].created_at,
          fullObject: data.memories[0]
        } : 'No memories'
      });

      const transformedMemories = data.memories.map(transformMemoryData);
      
      console.log('🔄 POST Transformed memory search results:', {
        count: transformedMemories.length,
        sampleMemory: transformedMemories[0] ? {
          id: transformedMemories[0].id,
          createdAt: transformedMemories[0].createdAt,
          createdAtType: typeof transformedMemories[0].createdAt,
          fullObject: transformedMemories[0]
        } : 'No memories'
      });

      return NextResponse.json({
        ...data,
        memories: transformedMemories
      }, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error('Memory API POST proxy error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    
    const targetUrl = buildTargetUrl(MEMORY_API_URL, path);
    console.log('Forwarding PUT request to:', targetUrl);
    
    // Forward the request to Cloudflare Workers
    const response = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log('PUT Response from Cloudflare Worker:', { status: response.status, data });

    // Transform memory data if it exists in the response
    if (data.success && data.memory) {
      const transformedMemory = transformMemoryData(data.memory);
      return NextResponse.json({
        ...data,
        memory: transformedMemory
      }, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error('Memory API PUT proxy error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update memory',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    
    const targetUrl = buildTargetUrl(MEMORY_API_URL, path);
    console.log('Forwarding DELETE request to:', targetUrl);
    
    // Forward the request to Cloudflare Workers
    const response = await fetch(targetUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('DELETE Response from Cloudflare Worker:', { status: response.status, data });

    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error('Memory API DELETE proxy error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete memory',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 