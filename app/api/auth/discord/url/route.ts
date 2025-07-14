import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log('Discord OAuth URL generation requested');
    
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = process.env.DISCORD_REDIRECT_URI;

    console.log('Environment check:', {
      hasClientId: !!clientId,
      hasRedirectUri: !!redirectUri,
      redirectUri: redirectUri
    });

    if (!clientId || !redirectUri) {
      console.error('Missing Discord OAuth configuration:', {
        hasClientId: !!clientId,
        hasRedirectUri: !!redirectUri
      });
      return NextResponse.json({
        success: false,
        error: 'Discord OAuth not configured - missing CLIENT_ID or REDIRECT_URI'
      }, { status: 500 });
    }

    // Discord OAuth scopes
    const scopes = ['identify', 'email', 'guilds.join'];
    
    // Generate state parameter for security
    const state = Math.random().toString(36).substring(2, 15);
    
    // Build Discord OAuth URL
    const authUrl = `https://discord.com/api/oauth2/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${scopes.join('%20')}&` +
      `state=${state}`;

    console.log('Generated Discord OAuth URL successfully:', {
      urlLength: authUrl.length,
      state: state,
      scopes: scopes.join(', ')
    });

    // Store state in session/cookie for verification
    const response = NextResponse.json({
      success: true,
      authUrl,
      state
    });

    // Set state cookie for verification
    response.cookies.set('discord_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600 // 10 minutes
    });

    return response;

  } catch (error) {
    console.error('Discord OAuth URL generation error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to generate authentication URL: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
} 