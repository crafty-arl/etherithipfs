# Fix Discord Client Secret Issue

## Problem
Your `DISCORD_CLIENT_SECRET` environment variable is incorrect, causing Discord OAuth to fail with "invalid_client" error.

## Solution Steps

### 1. Get New Client Secret from Discord
1. Visit [Discord Developer Portal](https://discord.com/developers/applications)
2. Click on your app **"EtherithApp"** 
3. Navigate to **OAuth2** tab
4. Under **Client Information**, click **"Reset Secret"**
5. **IMPORTANT**: Copy the secret immediately (it only shows once!)

### 2. Update Environment Variables
Open your `.env.local` file and update:
```
DISCORD_CLIENT_SECRET=your_new_secret_here
```

### 3. Restart Development Server
```bash
# Stop your current server (Ctrl+C)
# Then restart:
npm run dev
```

### 4. Test the Fix
1. Try Discord authentication again
2. Check the debug endpoint: http://localhost:3000/api/debug/discord-config
3. Look for: "✅ Token exchange endpoint accepts your credentials"

## Verification
After fixing, you should see in the debug output:
- `"actualError": "invalid_grant"` (this is expected with test code)
- NOT `"actualError": "invalid_client"`

The `invalid_grant` error means Discord accepts your credentials but rejects the fake test code, which is the expected behavior. 