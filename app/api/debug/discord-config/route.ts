import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Check all required environment variables
    const config = {
      hasClientId: !!process.env.DISCORD_CLIENT_ID,
      hasClientSecret: !!process.env.DISCORD_CLIENT_SECRET,
      hasRedirectUri: !!process.env.DISCORD_REDIRECT_URI,
      hasBotToken: !!process.env.DISCORD_BOT_TOKEN,
      hasGuildId: !!process.env.DISCORD_GUILD_ID,
      hasInviteLink: !!process.env.DISCORD_INVITE_LINK,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      nodeEnv: process.env.NODE_ENV,
      
      // Show values (safe ones only)
      redirectUri: process.env.DISCORD_REDIRECT_URI,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      inviteLink: process.env.DISCORD_INVITE_LINK,
      clientId: process.env.DISCORD_CLIENT_ID, // Safe to show
      
      // Validate redirect URI format
      redirectUriValid: process.env.DISCORD_REDIRECT_URI?.includes('/api/auth/discord/callback'),
      
      // Check if all required are present
      allRequiredPresent: !!(
        process.env.DISCORD_CLIENT_ID &&
        process.env.DISCORD_CLIENT_SECRET &&
        process.env.DISCORD_REDIRECT_URI &&
        process.env.NEXTAUTH_SECRET
      )
    };

    // Test Discord OAuth URL generation
    let oauthUrlTest = null;
    try {
      if (config.hasClientId && config.hasRedirectUri) {
        const scopes = ['identify', 'email', 'guilds.join'];
        const state = 'test_state';
        const authUrl = `https://discord.com/api/oauth2/authorize?` +
          `client_id=${process.env.DISCORD_CLIENT_ID}&` +
          `redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI!)}&` +
          `response_type=code&` +
          `scope=${scopes.join('%20')}&` +
          `state=${state}`;
        
        oauthUrlTest = {
          success: true,
          urlLength: authUrl.length,
          hasAllParams: authUrl.includes('client_id') && authUrl.includes('redirect_uri') && authUrl.includes('scope')
        };
      }
    } catch (error) {
      oauthUrlTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test Discord API connectivity
    let discordApiTest = null;
    try {
      const testResponse = await fetch('https://discord.com/api/v10/applications/@me', {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'User-Agent': 'EtherithIPFS-Debug/1.0'
        }
      });

      if (testResponse.ok) {
        const appData = await testResponse.json();
        discordApiTest = {
          success: true,
          appId: appData.id,
          appName: appData.name,
          redirectUrisCount: appData.redirect_uris?.length || 0,
          redirectUris: appData.redirect_uris || []
        };
      } else {
        discordApiTest = {
          success: false,
          status: testResponse.status,
          statusText: testResponse.statusText,
          error: 'Failed to fetch application info'
        };
      }
    } catch (error) {
      discordApiTest = {
        success: false,
        error: error instanceof Error ? error.message : 'API connectivity test failed'
      };
    }

    // Test token exchange endpoint (without actually exchanging)
    let tokenExchangeTest = null;
    try {
      // Test the endpoint with invalid code to see what error we get
      const testTokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID!,
          client_secret: process.env.DISCORD_CLIENT_SECRET!,
          grant_type: 'authorization_code',
          code: 'test_invalid_code',
          redirect_uri: process.env.DISCORD_REDIRECT_URI!
        })
      });

      const responseText = await testTokenResponse.text();
      
      tokenExchangeTest = {
        endpointReachable: true,
        testStatus: testTokenResponse.status,
        testResponse: responseText,
        expectedError: 'invalid_grant', // Expected for invalid code
        actualError: (() => {
          try {
            const parsed = JSON.parse(responseText);
            return parsed.error;
          } catch {
            return 'Could not parse response';
          }
        })()
      };
    } catch (error) {
      tokenExchangeTest = {
        endpointReachable: false,
        error: error instanceof Error ? error.message : 'Token exchange test failed'
      };
    }

    return NextResponse.json({
      status: 'Discord Configuration Check',
      timestamp: new Date().toISOString(),
      config,
      oauthUrlTest,
      discordApiTest,
      tokenExchangeTest,
      recommendations: generateRecommendations(config, discordApiTest, tokenExchangeTest)
    });

  } catch (error) {
    return NextResponse.json({
      status: 'Configuration check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function generateRecommendations(config: any, apiTest: any, tokenTest: any): string[] {
  const recommendations: string[] = [];

  if (!config.allRequiredPresent) {
    recommendations.push('❌ Missing required environment variables. Check your .env.local file.');
  }

  if (!config.hasClientId) {
    recommendations.push('❌ DISCORD_CLIENT_ID missing - Get this from Discord Developer Portal');
  }

  if (!config.hasClientSecret) {
    recommendations.push('❌ DISCORD_CLIENT_SECRET missing - Generate this in Discord Developer Portal');
  }

  if (!config.hasRedirectUri) {
    recommendations.push('❌ DISCORD_REDIRECT_URI missing - Should be http://localhost:3000/api/auth/discord/callback');
  } else if (!config.redirectUriValid) {
    recommendations.push('❌ DISCORD_REDIRECT_URI should end with /api/auth/discord/callback');
  }

  if (!config.hasNextAuthSecret) {
    recommendations.push('❌ NEXTAUTH_SECRET missing - Generate with: openssl rand -base64 32');
  }

  if (!config.hasBotToken) {
    recommendations.push('⚠️ DISCORD_BOT_TOKEN missing - Optional but recommended for server features');
  }

  if (!config.hasGuildId) {
    recommendations.push('⚠️ DISCORD_GUILD_ID missing - Get from your Discord server (Developer Mode)');
  }

  if (!config.hasInviteLink) {
    recommendations.push('⚠️ DISCORD_INVITE_LINK missing - Create permanent invite link for your server');
  }

  // API Test recommendations
  if (apiTest?.success) {
    recommendations.push(`✅ Discord API accessible - App: ${apiTest.appName} (${apiTest.appId})`);
    
    if (apiTest.redirectUrisCount === 0) {
      recommendations.push('❌ No redirect URIs configured in Discord app - Add your redirect URI');
    } else if (!apiTest.redirectUris.includes(config.redirectUri)) {
      recommendations.push(`❌ Redirect URI mismatch - Discord app has: ${apiTest.redirectUris.join(', ')}, but env has: ${config.redirectUri}`);
    } else {
      recommendations.push('✅ Redirect URI correctly configured in Discord app');
    }
  } else if (apiTest?.error) {
    recommendations.push(`❌ Discord API test failed: ${apiTest.error}`);
  }

  // Token exchange test
  if (tokenTest?.endpointReachable) {
    if (tokenTest.actualError === 'invalid_client') {
      recommendations.push('❌ CRITICAL: Discord rejects your client credentials - Check CLIENT_ID and CLIENT_SECRET');
      recommendations.push('🔧 Verify Client ID and Secret in Discord Developer Portal > OAuth2');
    } else if (tokenTest.actualError === tokenTest.expectedError) {
      recommendations.push('✅ Token exchange endpoint accepts your credentials');
    } else {
      recommendations.push(`⚠️ Unexpected token exchange response: ${tokenTest.actualError}`);
    }
  }

  if (config.allRequiredPresent && !recommendations.some(r => r.includes('❌'))) {
    recommendations.push('✅ All required environment variables are present');
    recommendations.push('✅ Configuration looks good - restart your dev server if you just added these');
  }

  return recommendations;
} 