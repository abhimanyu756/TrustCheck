# Quick Fix: Get Gmail API Token Using OAuth Playground

Since you already have OAuth set up with the OAuth Playground redirect URI, let's use that same method to get a new token with Gmail API scopes!

## Steps:

### 1. Go to OAuth Playground
Visit: https://developers.google.com/oauthplayground

### 2. Configure Settings (Top Right Gear Icon)
- Check "Use your own OAuth credentials"
- OAuth Client ID: `<YOUR_CLIENT_ID>`
- OAuth Client secret: `<YOUR_CLIENT_SECRET>`

### 3. Select Gmail API Scopes (Left Side)
Find and select these scopes:
- ✅ `https://www.googleapis.com/auth/gmail.modify`
- ✅ `https://www.googleapis.com/auth/gmail.readonly`  
- ✅ `https://mail.google.com/` (Full Gmail access)

### 4. Authorize APIs
- Click "Authorize APIs" button
- Sign in with your Google account (abhimanyu81026@gmail.com)
- Click "Allow" to grant permissions

### 5. Exchange Authorization Code
- Click "Exchange authorization code for tokens"
- Copy the **Refresh token** that appears

### 6. Update Your .env File
Replace these two lines in your `.env`:
```env
GOOGLE_REFRESH_TOKEN=<paste_your_new_refresh_token_here>
GMAIL_REFRESH_TOKEN=<paste_the_same_token_here>
```

### 7. Restart Your Server
```bash
npm run dev
```

## ✅ Done!
Your email monitoring will now work! The system will:
- Check Gmail inbox every 5 minutes for HR replies
- Parse the responses automatically
- Display them in your UI

## Test It
After restarting, manually trigger a check:
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/emails/check-replies" -Method POST
```
