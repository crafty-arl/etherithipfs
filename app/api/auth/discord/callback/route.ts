import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
  verified?: boolean;
}

export async function GET(req: NextRequest) {
  try {
    console.log('Discord OAuth callback received:', req.url);
    
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    console.log('OAuth params:', { code: !!code, state, error, errorDescription });

    // Get the base URL for redirects
    const baseUrl = process.env.NEXTAUTH_URL || 'https://etherith.craftthefuture.xyz';

    // Check for OAuth errors
    if (error) {
      const fullError = errorDescription ? `${error}: ${errorDescription}` : error;
      console.error('Discord OAuth error:', fullError);
      
      // Redirect back to home with error parameter
      const redirectUrl = new URL('/', baseUrl);
      redirectUrl.searchParams.set('auth_error', encodeURIComponent(fullError));
      return NextResponse.redirect(redirectUrl);
    }

    if (!code || !state) {
      console.error('Missing OAuth parameters:', { code: !!code, state: !!state });
      
      // Redirect back to home with error parameter
      const redirectUrl = new URL('/', baseUrl);
      redirectUrl.searchParams.set('auth_error', encodeURIComponent('Missing authorization parameters from Discord'));
      return NextResponse.redirect(redirectUrl);
    }

    // Check environment variables
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.DISCORD_REDIRECT_URI;
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;

    if (!clientId || !clientSecret || !redirectUri || !nextAuthSecret) {
      console.error('Missing environment variables:', {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        hasRedirectUri: !!redirectUri,
        hasNextAuthSecret: !!nextAuthSecret
      });
      
      // Redirect back to home with error parameter
      const redirectUrl = new URL('/', baseUrl);
      redirectUrl.searchParams.set('auth_error', encodeURIComponent('Server configuration error - missing Discord credentials'));
      return NextResponse.redirect(redirectUrl);
    }

    // Verify state parameter
    const storedState = req.cookies.get('discord_oauth_state')?.value;
    if (state !== storedState) {
      console.error('State verification failed:', { received: state, stored: storedState });
      
      // Redirect back to home with error parameter
      const redirectUrl = new URL('/', baseUrl);
      redirectUrl.searchParams.set('auth_error', encodeURIComponent('Invalid state parameter - possible CSRF attempt'));
      return NextResponse.redirect(redirectUrl);
    }

    // Exchange code for access token
    console.log('Exchanging code for token...');
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText
      });
      
      // Parse the error for better user feedback
      let userFriendlyError = `Failed to exchange code for token: ${tokenResponse.status} ${tokenResponse.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error === 'invalid_client') {
          userFriendlyError = 'Discord application credentials are invalid. Please check your DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in environment variables.';
        } else if (errorData.error === 'invalid_grant') {
          userFriendlyError = 'Authorization code is invalid or expired. Please try again.';
        } else if (errorData.error === 'redirect_uri_mismatch') {
          userFriendlyError = 'Redirect URI mismatch. Please check your DISCORD_REDIRECT_URI setting.';
        }
      } catch {
        // Keep the default error message if we can't parse the response
      }
      
      throw new Error(userFriendlyError);
    }

    const tokenData: DiscordTokenResponse = await tokenResponse.json();
    console.log('Token exchange successful, fetching user data...');

    // Get user information
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      const userErrorText = await userResponse.text();
      console.error('User data fetch failed:', {
        status: userResponse.status,
        statusText: userResponse.statusText,
        error: userErrorText
      });
      throw new Error(`Failed to fetch user data: ${userResponse.status} ${userResponse.statusText}`);
    }

    const userData: DiscordUser = await userResponse.json();
    console.log('User data fetched successfully:', { username: userData.username, id: userData.id });

    // Create JWT session token
    console.log('Creating session token...');
    const sessionToken = jwt.sign(
      {
        discordId: userData.id,
        username: userData.username,
        avatar: userData.avatar,
        email: userData.email,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + (tokenData.expires_in * 1000)
      },
      nextAuthSecret,
      { expiresIn: '7d' }
    );

    // Set session cookie and redirect to production home page
    console.log('Redirecting to production domain:', baseUrl);
    const response = NextResponse.redirect(new URL('/', baseUrl));

    // Set session cookie
    response.cookies.set('discord_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });
    
    // Clear state cookie
    response.cookies.set('discord_oauth_state', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0
    });

    return response;

  } catch (error) {
    console.error('Discord OAuth callback error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown authentication error';
    const baseUrl = process.env.NEXTAUTH_URL || 'https://etherith.craftthefuture.xyz';
    
    // Redirect back to home with error parameter
    const redirectUrl = new URL('/', baseUrl);
    redirectUrl.searchParams.set('auth_error', encodeURIComponent(errorMessage));
    return NextResponse.redirect(redirectUrl);
  }
} 