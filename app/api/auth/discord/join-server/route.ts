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

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('discord_session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    // Verify session
    const sessionData = jwt.verify(sessionCookie, process.env.NEXTAUTH_SECRET!) as SessionData;

    // Get Discord configuration
    const guildId = process.env.DISCORD_GUILD_ID;
    const inviteLink = process.env.DISCORD_INVITE_LINK;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!guildId || !inviteLink) {
      return NextResponse.json({
        success: false,
        error: 'Discord server not configured'
      }, { status: 500 });
    }

    // Optional: Try to add user to guild directly via bot (requires bot token and bot in server)
    if (botToken) {
      try {
        const addMemberResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${sessionData.discordId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bot ${botToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            access_token: sessionData.accessToken
          })
        });

        if (addMemberResponse.ok) {
          return NextResponse.json({
            success: true,
            message: 'Successfully joined server',
            inviteUrl: inviteLink,
            directJoin: true
          });
        } else {
          console.log('Direct join failed, falling back to invite link');
        }
      } catch (error) {
        console.error('Bot add member failed:', error);
      }
    }

    // Fallback: Return invite link for manual join
    return NextResponse.json({
      success: true,
      message: 'Please join using the invite link',
      inviteUrl: inviteLink,
      directJoin: false
    });

  } catch (error) {
    console.error('Join server error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to join server'
    }, { status: 500 });
  }
} 