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
        { error: 'User IDs array is required' },
        { status: 400 }
      );
    }

    // Test if Discord Lookup service is accessible
    const testUserId = userIds[0];
    let serviceAvailable = false;
    
    try {
      const testResponse = await fetch(`https://discordlookup.mesalytic.moe/v1/user/${testUserId}`, {
        method: 'HEAD', // Just check if service is responsive
        signal: AbortSignal.timeout(5000) // 5 second timeout for service check
      });
      serviceAvailable = testResponse.status !== 0; // Any response means service is up
      console.log(`🔧 Discord Lookup service test:`, { available: serviceAvailable, status: testResponse.status });
    } catch (error) {
      console.warn('⚠️ Discord Lookup service appears to be down:', error);
      serviceAvailable = false;
    }

    // Fetch user data using Discord Lookup API service
    const users: Record<string, string> = {};
    const batchSize = 10;
    let successCount = 0;
    let errorCount = 0;
    
    // If service is not available, use fallback immediately
    if (!serviceAvailable) {
      console.warn('⚠️ Using fallback usernames due to service unavailability');
      userIds.forEach((userId: string) => {
        users[userId] = `User ${userId.slice(-4)}`; // Show last 4 digits of user ID
      });
      return NextResponse.json(users);
    }
    
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
              },
              // Add timeout to prevent hanging requests
              signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            console.log(`🔍 Lookup API response for ${userId}:`, lookupResponse.status);

            if (lookupResponse.ok) {
              const userData: DiscordLookupResponse = await lookupResponse.json();
              
              console.log(`📊 Raw user data for ${userId}:`, {
                tag: userData.tag,
                username: userData.username,
                global_name: userData.global_name
              });
              
              // Extract username from tag (mesa#0101 -> mesa) or use global_name if available
              let displayName = userData.global_name || userData.username;
              
              if (!displayName && userData.tag) {
                // Extract username from tag format "username#discriminator"
                displayName = userData.tag.split('#')[0];
              }
              
              if (displayName) {
                users[userId] = displayName;
                successCount++;
                console.log(`✅ Found username for ${userId}: ${displayName}`);
              } else {
                users[userId] = `User ${userId.slice(-4)}`; // Fallback to formatted user ID
                errorCount++;
                console.warn(`⚠️ No username found in response for ${userId}`, userData);
              }
            } else if (lookupResponse.status === 404) {
              console.warn(`⚠️ User ${userId} not found (deleted account or invalid ID)`);
              users[userId] = 'Deleted User';
              errorCount++;
            } else if (lookupResponse.status === 429) {
              console.warn(`⚠️ Rate limited for user ${userId}`);
              users[userId] = `User ${userId.slice(-4)}`; // Fallback instead of "Unknown"
              errorCount++;
            } else {
              const errorText = await lookupResponse.text();
              console.warn(`❌ Lookup failed for user ${userId}:`, lookupResponse.status, errorText);
              users[userId] = `User ${userId.slice(-4)}`; // Fallback instead of "Unknown"
              errorCount++;
            }
          } catch (error) {
            console.error(`❌ Error looking up user ${userId}:`, error);
            users[userId] = `User ${userId.slice(-4)}`; // Fallback instead of "Unknown"
            errorCount++;
          }
        })
      );
      
      // Small delay between batches to be respectful to the service
      if (i + batchSize < userIds.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`👥 Final lookup results:`, { 
      users, 
      totalRequested: userIds.length,
      successCount,
      errorCount 
    });

    // If most requests failed, warn about potential service issues
    if (errorCount > successCount && userIds.length > 1) {
      console.warn('⚠️ Many Discord username lookups failed - service may be experiencing issues');
    }

    return NextResponse.json(users);

  } catch (error) {
    console.error('❌ Discord Lookup API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to lookup users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 