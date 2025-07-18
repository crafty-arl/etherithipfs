import { NextRequest, NextResponse } from 'next/server';

interface DiscordLookupResponse {
  id: string;
  tag: string;
  username?: string;
  global_name?: string;
  avatar?: {
    id: string;
    link: string;
    is_animated: boolean;
  };
  banner?: {
    id: string;
    link: string;
    is_animated: boolean;
    color: string;
  };
  badges?: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Get user IDs from request body
    const { userIds } = await request.json();
    
    console.log('👥 Discord Lookup API called with:', { userIds, count: userIds?.length });
    
    if (!userIds || !Array.isArray(userIds)) {
      console.warn('❌ Invalid userIds provided:', userIds);
      return NextResponse.json(
        { success: false, error: 'User IDs array is required' },
        { status: 400 }
      );
    }

    // Fetch user data using Discord Lookup API service
    const users: Record<string, string> = {};
    const batchSize = 10; // Can handle more requests since this is a dedicated service
    
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async (userId: string) => {
          try {
            console.log(`🔍 Looking up Discord user: ${userId}`);
            
            // Use Discord Lookup API service
            const lookupResponse = await fetch(`https://discordlookup.mesalytic.moe/v1/user/${userId}`, {
              headers: {
                'User-Agent': 'Memory-Weaver/1.0',
                'Accept': 'application/json'
              }
            });

            console.log(`🔍 Lookup API response for ${userId}:`, lookupResponse.status);

            if (lookupResponse.ok) {
              const userData: DiscordLookupResponse = await lookupResponse.json();
              
              // Extract username from tag (mesa#0101 -> mesa) or use global_name if available
              let displayName = userData.global_name || userData.username;
              
              if (!displayName && userData.tag) {
                // Extract username from tag format "username#discriminator"
                displayName = userData.tag.split('#')[0];
              }
              
              if (displayName) {
                users[userId] = displayName;
                console.log(`✅ Found username for ${userId}: ${displayName}`);
              } else {
                users[userId] = 'Unknown User';
                console.warn(`⚠️ No username found in response for ${userId}`);
              }
            } else if (lookupResponse.status === 404) {
              console.warn(`⚠️ User ${userId} not found (deleted account or invalid ID)`);
              users[userId] = 'Deleted User';
            } else if (lookupResponse.status === 429) {
              console.warn(`⚠️ Rate limited for user ${userId}`);
              users[userId] = 'Unknown User';
            } else {
              const errorText = await lookupResponse.text();
              console.warn(`❌ Lookup failed for user ${userId}:`, lookupResponse.status, errorText);
              users[userId] = 'Unknown User';
            }
          } catch (error) {
            console.error(`❌ Error looking up user ${userId}:`, error);
            users[userId] = 'Unknown User';
          }
        })
      );
      
      // Small delay between batches to be respectful to the service
      if (i + batchSize < userIds.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log('👥 Final lookup results:', users);

    return NextResponse.json({
      success: true,
      users
    });

  } catch (error) {
    console.error('❌ Discord Lookup API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to lookup users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 