/**
 * Regenerate Gmail OAuth Token with Correct Scopes
 * 
 * Your current token only has SMTP scopes for sending emails.
 * We need Gmail API scopes to read incoming emails.
 * 
 * Run this to get a new refresh token with the right permissions.
 */

const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env');
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

// Gmail API scopes needed for reading and modifying emails
const scopes = [
    'https://www.googleapis.com/auth/gmail.modify',   // Read and modify emails
    'https://www.googleapis.com/auth/gmail.readonly', // Read emails
    'https://mail.google.com/'                        // Full Gmail access (includes send)
];

// Generate authorization URL
const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',  // Required to get refresh token
    scope: scopes,
    prompt: 'consent'  // Force consent screen to get new refresh token
});

console.log('\n===========================================');
console.log('📧 Gmail OAuth Token Generator (with Email Reading Scopes)');
console.log('===========================================\n');
console.log('⚠️  IMPORTANT: This will replace your current refresh token.');
console.log('The new token will have permissions to:');
console.log('  ✓ Send emails (existing)');
console.log('  ✓ Read emails (NEW - needed for monitoring HR replies)');
console.log('  ✓ Modify emails (mark as read, etc.)');
console.log('\n===========================================\n');
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
        console.log('✅ Success! Your new tokens:');
        console.log('===========================================\n');
        console.log('Replace these lines in your .env file:\n');
        console.log(`GOOGLE_REFRESH_TOKEN=${token.refresh_token}`);
        console.log(`GMAIL_REFRESH_TOKEN=${token.refresh_token}`);
        console.log('\n(Use the same token for both variables)');
        console.log('\n===========================================\n');

        if (!token.refresh_token) {
            console.log('⚠️  Warning: No refresh token received.');
            console.log('This might happen if you\'ve already authorized this app.');
            console.log('\nTo fix this:');
            console.log('1. Go to: https://myaccount.google.com/permissions');
            console.log('2. Remove access for your app');
            console.log('3. Run this script again\n');
        } else {
            console.log('✅ Next steps:');
            console.log('1. Update your .env file with the new GOOGLE_REFRESH_TOKEN');
            console.log('2. Also update GMAIL_REFRESH_TOKEN with the same value');
            console.log('3. Restart your server: npm run dev');
            console.log('4. Email monitoring will now work!\n');
        }
    });
});
