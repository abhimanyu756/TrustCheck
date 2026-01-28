/**
 * Test Gmail Token Scopes
 * This will show you what scopes your current token has
 */

const { google } = require('googleapis');
require('dotenv').config();

async function testTokenScopes() {
    try {
        console.log('\n🔍 Testing Gmail API Token Scopes...\n');

        const oauth2Client = new google.auth.OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            'http://localhost:3000/oauth2callback'
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });

        // Get token info to see scopes
        const tokenInfo = await oauth2Client.getTokenInfo(
            oauth2Client.credentials.access_token ||
            await oauth2Client.getAccessToken().then(res => res.token)
        );

        console.log('✅ Current Token Scopes:');
        console.log('========================');
        if (tokenInfo.scopes) {
            tokenInfo.scopes.forEach(scope => {
                console.log(`  - ${scope}`);
            });
        }

        console.log('\n📋 Required Scopes for Email Monitoring:');
        console.log('=========================================');
        console.log('  - https://mail.google.com/');
        console.log('  OR');
        console.log('  - https://www.googleapis.com/auth/gmail.modify');
        console.log('  - https://www.googleapis.com/auth/gmail.readonly');

        // Check if we have the right scopes
        const hasFullAccess = tokenInfo.scopes && tokenInfo.scopes.includes('https://mail.google.com/');
        const hasModify = tokenInfo.scopes && tokenInfo.scopes.includes('https://www.googleapis.com/auth/gmail.modify');
        const hasReadonly = tokenInfo.scopes && tokenInfo.scopes.includes('https://www.googleapis.com/auth/gmail.readonly');

        console.log('\n🔎 Scope Check:');
        console.log('===============');
        console.log(`  Full Gmail Access: ${hasFullAccess ? '✅ YES' : '❌ NO'}`);
        console.log(`  Gmail Modify: ${hasModify ? '✅ YES' : '❌ NO'}`);
        console.log(`  Gmail Readonly: ${hasReadonly ? '✅ YES' : '❌ NO'}`);

        if (!hasFullAccess && (!hasModify || !hasReadonly)) {
            console.log('\n❌ PROBLEM FOUND!');
            console.log('=================');
            console.log('Your token does NOT have the required Gmail API scopes.');
            console.log('\n📝 TO FIX:');
            console.log('1. Go to: https://myaccount.google.com/permissions');
            console.log('2. Find and REMOVE "TrustCheck" or your app');
            console.log('3. Go to OAuth Playground: https://developers.google.com/oauthplayground');
            console.log('4. Select scope: https://mail.google.com/');
            console.log('5. Get new refresh token');
            console.log('6. Update .env file\n');
        } else {
            console.log('\n✅ Token scopes look good!');
            console.log('The error might be something else.\n');
        }

    } catch (error) {
        console.error('\n❌ Error testing token:', error.message);
        console.log('\nThis might mean your token is invalid or expired.');
        console.log('Try getting a new token from OAuth Playground.\n');
    }
}

testTokenScopes();
