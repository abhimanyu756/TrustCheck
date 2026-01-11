#!/usr/bin/env node

/**
 * OAuth Setup Helper for Google Sheets
 * This script helps you set up OAuth credentials step by step
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
    console.log('\n🔐 Google Sheets OAuth Setup Helper\n');

    console.log('This script will help you configure OAuth for Google Sheets.\n');
    console.log('Before starting, make sure you have:');
    console.log('1. Created OAuth Client ID in Google Cloud Console');
    console.log('2. Added https://developers.google.com/oauthplayground as redirect URI');
    console.log('3. Generated refresh token from OAuth Playground\n');

    const hasCredentials = await question('Do you have all OAuth credentials ready? (y/n): ');

    if (hasCredentials.toLowerCase() !== 'y') {
        console.log('\n📖 Please follow the OAuth setup guide first:');
        console.log('   See: oauth_setup_guide.md\n');
        console.log('Quick links:');
        console.log('1. Create OAuth Client: https://console.cloud.google.com/apis/credentials');
        console.log('2. Get Refresh Token: https://developers.google.com/oauthplayground\n');
        rl.close();
        return;
    }

    console.log('\n✅ Great! Let\'s configure your credentials.\n');

    const clientId = await question('Enter your Client ID (ends with .apps.googleusercontent.com): ');
    const clientSecret = await question('Enter your Client Secret (starts with GOCSPX-): ');
    const refreshToken = await question('Enter your Refresh Token (starts with 1//): ');

    // Validate inputs
    if (!clientId.includes('.apps.googleusercontent.com')) {
        console.log('\n⚠️  Warning: Client ID should end with .apps.googleusercontent.com');
    }

    if (!clientSecret.startsWith('GOCSPX-')) {
        console.log('\n⚠️  Warning: Client Secret should start with GOCSPX-');
    }

    if (!refreshToken.startsWith('1//')) {
        console.log('\n⚠️  Warning: Refresh Token should start with 1//');
    }

    // Read existing .env
    const envPath = path.join(__dirname, '.env');
    let existingEnv = '';

    if (fs.existsSync(envPath)) {
        existingEnv = fs.readFileSync(envPath, 'utf8');

        // Remove old OAuth config if exists
        existingEnv = existingEnv.replace(/# Google OAuth.*\n/g, '');
        existingEnv = existingEnv.replace(/GOOGLE_CLIENT_ID=.*\n/g, '');
        existingEnv = existingEnv.replace(/GOOGLE_CLIENT_SECRET=.*\n/g, '');
        existingEnv = existingEnv.replace(/GOOGLE_REFRESH_TOKEN=.*\n/g, '');

        // Comment out old service account credentials
        existingEnv = existingEnv.replace(/GOOGLE_SHEETS_CLIENT_EMAIL=/g, '# GOOGLE_SHEETS_CLIENT_EMAIL=');
        existingEnv = existingEnv.replace(/GOOGLE_SHEETS_PRIVATE_KEY=/g, '# GOOGLE_SHEETS_PRIVATE_KEY=');
    }

    // Add new OAuth config
    const oauthConfig = `
# Google OAuth Credentials (for Sheets)
GOOGLE_CLIENT_ID=${clientId.trim()}
GOOGLE_CLIENT_SECRET=${clientSecret.trim()}
GOOGLE_REFRESH_TOKEN=${refreshToken.trim()}
`;

    const newEnv = existingEnv.trim() + '\n' + oauthConfig;

    // Write to .env
    fs.writeFileSync(envPath, newEnv.trim() + '\n');

    console.log('\n✅ OAuth credentials saved to .env file!');
    console.log('\n📝 Summary:');
    console.log(`   Client ID: ${clientId.substring(0, 20)}...`);
    console.log(`   Client Secret: ${clientSecret.substring(0, 15)}...`);
    console.log(`   Refresh Token: ${refreshToken.substring(0, 10)}...`);

    console.log('\n🔄 Next steps:');
    console.log('1. Restart your server: npm run dev');
    console.log('2. You should see: ✅ Google Sheets API initialized (OAuth)');
    console.log('3. Test: node test-email-verification.js\n');

    rl.close();
}

main().catch(error => {
    console.error('Error:', error);
    rl.close();
    process.exit(1);
});
