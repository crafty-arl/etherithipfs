// Quick Discord debug script
require('dotenv').config({ path: '.env.local' });

console.log('=== Discord Configuration Debug ===');
console.log('');

const config = {
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET ? '***SET***' : 'MISSING',
  DISCORD_REDIRECT_URI: process.env.DISCORD_REDIRECT_URI,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '***SET***' : 'MISSING',
  NODE_ENV: process.env.NODE_ENV
};

console.log('Environment Variables:');
Object.entries(config).forEach(([key, value]) => {
  const status = value ? '✅' : '❌';
  console.log(`${status} ${key}: ${value || 'MISSING'}`);
});

console.log('');
console.log('=== Validation ===');

// Check redirect URI format
const redirectUri = process.env.DISCORD_REDIRECT_URI;
if (redirectUri) {
  const isValid = redirectUri.includes('/api/auth/discord/callback');
  console.log(`${isValid ? '✅' : '❌'} Redirect URI format: ${isValid ? 'Valid' : 'Invalid - should end with /api/auth/discord/callback'}`);
}

// Check if all required are set
const allSet = config.DISCORD_CLIENT_ID && 
              config.DISCORD_CLIENT_SECRET !== 'MISSING' && 
              config.DISCORD_REDIRECT_URI && 
              config.NEXTAUTH_SECRET !== 'MISSING';

console.log(`${allSet ? '✅' : '❌'} All required variables: ${allSet ? 'Set' : 'Missing some variables'}`);

console.log('');
console.log('=== Next Steps ===');
if (!allSet) {
  console.log('1. Update your .env.local file with missing variables');
  console.log('2. Restart your development server: npm run dev');
  console.log('3. Visit Discord Developer Portal to get credentials');
} else {
  console.log('1. Go to Discord Developer Portal');
  console.log('2. Reset your Client Secret');
  console.log('3. Update .env.local with new secret');
  console.log('4. Verify redirect URI matches exactly');
  console.log('5. Restart dev server');
} 