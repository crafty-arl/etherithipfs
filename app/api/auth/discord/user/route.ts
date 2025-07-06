import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

interface SessionData {
  discordId: string;
  username: string;
  avatar: string | null;
  email?: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('discord_session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    // Verify and decode JWT
    const sessionData = jwt.verify(sessionCookie, process.env.NEXTAUTH_SECRET!) as SessionData;

    // Check if token is expired
    if (sessionData.expiresAt < Date.now()) {
      // Attempt to refresh token
      try {
        const refreshResponse = await fetch('https://discord.com/api/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID!,
            client_secret: process.env.DISCORD_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: sessionData.refreshToken
          })
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          
          // Update session with new tokens
          const newSessionToken = jwt.sign(
            {
              ...sessionData,
              accessToken: refreshData.access_token,
              refreshToken: refreshData.refresh_token,
              expiresAt: Date.now() + (refreshData.expires_in * 1000)
            },
            process.env.NEXTAUTH_SECRET!,
            { expiresIn: '7d' }
          );

          const response = NextResponse.json({
            success: true,
            user: {
              id: sessionData.discordId,
              username: sessionData.username,
              discriminator: '0', // Discord removed discriminators
              avatar: sessionData.avatar,
              email: sessionData.email
            }
          });

          // Update session cookie
          response.cookies.set('discord_session', newSessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 // 7 days
          });

          return response;
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }

      // If refresh failed, clear session
      const response = NextResponse.json({
        success: false,
        error: 'Session expired'
      }, { status: 401 });

      response.cookies.set('discord_session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0
      });

      return response;
    }

    // Return user data
    return NextResponse.json({
      success: true,
      user: {
        id: sessionData.discordId,
        username: sessionData.username,
        discriminator: '0', // Discord removed discriminators
        avatar: sessionData.avatar,
        email: sessionData.email
      }
    });

  } catch (error) {
    console.error('User verification error:', error);
    
    // Clear invalid session cookie
    const response = NextResponse.json({
      success: false,
      error: 'Invalid session'
    }, { status: 401 });

    response.cookies.set('discord_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0
    });

    return response;
  }
} 