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

    // Check for OAuth errors
    if (error) {
      const fullError = errorDescription ? `${error}: ${errorDescription}` : error;
      console.error('Discord OAuth error:', fullError);
      return new Response(`
        <html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'DISCORD_AUTH_ERROR',
                error: '${fullError.replace(/'/g, "\\'")}',
                details: 'OAuth authorization was denied or failed'
              }, window.location.origin);
              window.close();
            </script>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    if (!code || !state) {
      console.error('Missing OAuth parameters:', { code: !!code, state: !!state });
      return new Response(`
        <html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'DISCORD_AUTH_ERROR',
                error: 'Missing authorization code or state parameter from Discord',
                details: 'OAuth flow was incomplete'
              }, window.location.origin);
              window.close();
            </script>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
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
      return new Response(`
        <html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'DISCORD_AUTH_ERROR',
                error: 'Server configuration error - missing Discord credentials',
                details: 'Please check environment variables'
              }, window.location.origin);
              window.close();
            </script>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Verify state parameter
    const storedState = req.cookies.get('discord_oauth_state')?.value;
    if (state !== storedState) {
      return new Response(`
        <html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'DISCORD_AUTH_ERROR',
                error: 'Invalid state parameter'
              }, window.location.origin);
              window.close();
            </script>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
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

    // Set session cookie and redirect
    const response = new Response(`
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'DISCORD_AUTH_SUCCESS',
              user: {
                id: '${userData.id}',
                username: '${userData.username}',
                discriminator: '${userData.discriminator}',
                avatar: '${userData.avatar}',
                email: '${userData.email || ''}'
              }
            }, window.location.origin);
            window.close();
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });

    // Set session cookie
    response.headers.append('Set-Cookie', `discord_session=${sessionToken}; HttpOnly; Secure=${process.env.NODE_ENV === 'production'}; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`);
    
    // Clear state cookie
    response.headers.append('Set-Cookie', `discord_oauth_state=; HttpOnly; Secure=${process.env.NODE_ENV === 'production'}; SameSite=Lax; Path=/; Max-Age=0`);

    return response;

  } catch (error) {
    console.error('Discord OAuth callback error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown authentication error';
    const sanitizedError = errorMessage.replace(/'/g, "\\'");
    
    return new Response(`
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'DISCORD_AUTH_ERROR',
              error: '${sanitizedError}',
              details: 'Check server logs for more details'
            }, window.location.origin);
            window.close();
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
} 