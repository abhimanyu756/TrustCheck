# Email Monitoring Setup Guide

## Overview
The TrustCheck system now includes automatic monitoring of incoming email replies from HR. When HR replies directly to the verification email (instead of filling the Google Sheet), the system will automatically capture and process those replies.

## How It Works

1. **Automatic Monitoring**: The system checks for new email replies every 5 minutes
2. **Email Parsing**: When an HR reply is detected, the system:
   - Extracts the checkId from the email thread
   - Parses the email body for verification data
   - Logs it as an `HR_RESPONDED` activity
   - Marks the email as read
3. **UI Display**: The response will then appear in the "Awaiting HR Response" section

## Gmail API Setup

To enable email monitoring, you need to configure Gmail API credentials:

### Step 1: Enable Gmail API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Enable the **Gmail API**
4. Go to **APIs & Services** > **Credentials**

### Step 2: Create OAuth 2.0 Credentials
1. Click **Create Credentials** > **OAuth 2.0 Client ID**
2. Configure the OAuth consent screen if prompted
3. Application type: **Web application**
4. Add authorized redirect URI: `http://localhost:3000/oauth2callback`
5. Save and download the credentials

### Step 3: Get Refresh Token
Run this script to get your refresh token:

```javascript
const { google } = require('googleapis');
const readline = require('readline');

const oauth2Client = new google.auth.OAuth2(
    'YOUR_CLIENT_ID',
    'YOUR_CLIENT_SECRET',
    'http://localhost:3000/oauth2callback'
);

const scopes = ['https://www.googleapis.com/auth/gmail.modify'];
const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
});

console.log('Authorize this app by visiting:', url);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oauth2Client.getToken(code, (err, token) => {
        if (err) return console.error('Error retrieving access token', err);
        console.log('Refresh Token:', token.refresh_token);
    });
});
```

### Step 4: Add to .env File
Add these variables to your `.env` file:

```env
# Gmail API Configuration
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REFRESH_TOKEN=your_refresh_token_here
GMAIL_REDIRECT_URI=http://localhost:3000/oauth2callback
```

## Manual Email Check

You can manually trigger an email check using the API:

```bash
curl -X POST http://localhost:3000/api/emails/check-replies
```

This will immediately check for new email replies and return the results.

## Email Format Requirements

For the system to properly parse HR email replies, the email should:

1. **Be a reply** to the original verification email
2. **Include the Verification ID** in the email body (automatically included in the thread)
3. **Optionally include** structured data like:
   ```
   Employee Name: John Doe
   Designation: Software Engineer
   Employment Dates: Jan 2020 - Dec 2022
   Salary: $80,000
   Verified: Yes
   Eligible for Rehire: Yes
   Performance Rating: 4.5
   ```

## Troubleshooting

### Email monitoring not working
- Check that Gmail API credentials are correctly configured in `.env`
- Verify the Gmail account has access to the inbox
- Check server logs for any Gmail API errors

### Responses not appearing in UI
- Ensure the email contains the Verification ID or Check ID
- Check that the email subject contains "RE: Background Verification" or "RE: Employment Verification"
- Verify the email is unread when the check runs

### Manual trigger
If automatic monitoring isn't working, you can manually trigger checks:
```bash
curl -X POST http://localhost:3000/api/emails/check-replies
```

## Monitoring Frequency

By default, the system checks for new emails every **5 minutes**. You can adjust this in `server.js`:

```javascript
// Check every 2 minutes instead
startEmailMonitoring(2);
```

## Security Notes

- The refresh token provides ongoing access to the Gmail account
- Store credentials securely and never commit them to version control
- Consider using a dedicated email account for TrustCheck
- Regularly rotate credentials for security
