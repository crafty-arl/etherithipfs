import { NextRequest, NextResponse } from 'next/server';

// Cloudflare Worker API base URL
const MEMORY_API_URL = process.env.MEMORY_API_URL || 'https://memory-weaver-simple.carl-6e7.workers.dev';

// Helper function to properly construct URLs without double slashes
function buildTargetUrl(baseUrl: string, path: string): string {
  const cleanBase = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  const cleanPath = path.replace(/^\//, ''); // Remove leading slash
  return `${cleanBase}/${cleanPath}`;
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
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    const body = await request.json();

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
    console.log('Response from Cloudflare Worker:', { status: response.status, data });

    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error('Memory API proxy error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process memory request',
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
    const body = await request.json();

    const targetUrl = buildTargetUrl(MEMORY_API_URL, path);
    console.log('Forwarding DELETE request to:', targetUrl, 'with body:', body);

    // Forward the request to Cloudflare Workers
    const response = await fetch(targetUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log('Response from Cloudflare Worker:', { status: response.status, data });

    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error('Memory API proxy error:', error);
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