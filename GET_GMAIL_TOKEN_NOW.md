# 🚀 Get Gmail Token - Step by Step

## The Issue
Your current token has "metadata" scope only, which doesn't allow searching emails. You need FULL Gmail API access.

## ✅ Solution: Get New Token (5 minutes)

### Step 1: Open OAuth Playground
**Click here:** https://developers.google.com/oauthplayground

### Step 2: Configure OAuth (Top Right ⚙️ Icon)
1. Click the **gear icon** (⚙️) in top right
2. Check ☑️ **"Use your own OAuth credentials"**
3. Enter:
   - **OAuth Client ID:** 
   - **OAuth Client secret:** 
4. Click **Close**

### Step 3: Select Gmail Scopes (Left Side)
Scroll down in the left panel and find **"Gmail API v1"**

Select THESE scopes (check the boxes):
- ☑️ `https://mail.google.com/` **(IMPORTANT - This is the full access scope!)**
- ☑️ `https://www.googleapis.com/auth/gmail.modify`
- ☑️ `https://www.googleapis.com/auth/gmail.readonly`

### Step 4: Authorize
1. Click **"Authorize APIs"** button (blue button on left)
2. Choose your Google account: **abhimanyu81026@gmail.com**
3. Click **"Allow"** to grant all permissions
4. You'll be redirected back to OAuth Playground

### Step 5: Get Token
1. Click **"Exchange authorization code for tokens"** (blue button)
2. You'll see a **"Refresh token"** appear
3. **COPY the entire refresh token** (starts with `1//`)

### Step 6: Update .env File
Open `server/.env` and replace BOTH lines:

```env
GOOGLE_REFRESH_TOKEN=<paste_your_new_token_here>
GMAIL_REFRESH_TOKEN=<paste_your_new_token_here>
```

### Step 7: Restart Server
```bash
npm run dev
```

## ✅ Done!
You should see:
```
✅ Gmail monitoring service initialized
📧 Checking for new HR email replies...
Found X potential replies
```

No more errors! 🎉
