/**
 * Gmail OAuth Token Generator
 * Run this script to get your Gmail API refresh token
 * 
 * Usage:
 * 1. Install googleapis: npm install googleapis
 * 2. Update CLIENT_ID and CLIENT_SECRET below
 * 3. Run: node getGmailToken.js
 * 4. Follow the authorization URL
 * 5. Copy the refresh token to your .env file
 */

const { google } = require('googleapis');
const readline = require('readline');

// REPLACE THESE WITH YOUR CREDENTIALS FROM GOOGLE CLOUD CONSOLE
const CLIENT_ID = 'YOUR_CLIENT_ID_HERE';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET_HERE';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

// Gmail scopes needed
const scopes = [
    'https://www.googleapis.com/auth/gmail.modify',  // Read and modify emails
    'https://www.googleapis.com/auth/gmail.readonly'  // Read emails
];

// Generate authorization URL
const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',  // Required to get refresh token
    scope: scopes,
    prompt: 'consent'  // Force consent screen to get refresh token
});

console.log('\n===========================================');
console.log('Gmail API Token Generator');
console.log('===========================================\n');
console.log('Step 1: Authorize this app by visiting this URL:\n');
console.log(authUrl);
console.log('\n');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.question('Step 2: Enter the authorization code from that page here: ', (code) => {
    rl.close();

    oauth2Client.getToken(code, (err, token) => {
        if (err) {
            console.error('\n❌ Error retrieving access token:', err);
            return;
        }

        console.log('\n===========================================');
        console.log('✅ Success! Your tokens:');
        console.log('===========================================\n');
        console.log('Add these to your .env file:\n');
        console.log(`GMAIL_CLIENT_ID=${CLIENT_ID}`);
        console.log(`GMAIL_CLIENT_SECRET=${CLIENT_SECRET}`);
        console.log(`GMAIL_REFRESH_TOKEN=${token.refresh_token}`);
        console.log(`GMAIL_REDIRECT_URI=${REDIRECT_URI}`);
        console.log('\n===========================================\n');

        if (!token.refresh_token) {
            console.log('⚠️  Warning: No refresh token received.');
            console.log('This might happen if you\'ve already authorized this app.');
            console.log('Try revoking access at: https://myaccount.google.com/permissions');
            console.log('Then run this script again.\n');
        }
    });
});
