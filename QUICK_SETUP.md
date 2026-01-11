# Quick Setup Guide for Real Email & Google Sheets

## Option 1: Interactive Setup (Recommended)

Run the setup script:
```bash
cd server
node setup-email-verification.js
```

Follow the prompts to configure Gmail and/or Google Sheets.

---

## Option 2: Manual Setup

### Step 1: Gmail Configuration

1. **Enable 2-Factor Authentication** on your Gmail account
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password

3. **Add to `.env`**:
   ```env
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=abcd efgh ijkl mnop
   ```
   (Remove spaces from the app password)

### Step 2: Google Sheets Configuration

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create/Select Project**
   - Click project dropdown → "New Project"
   - Name it "TrustCheck" → Create

3. **Enable APIs**
   - Go to "APIs & Services" → "Library"
   - Search and enable:
     - ✅ Google Sheets API
     - ✅ Google Drive API

4. **Create Service Account**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "Service Account"
   - Name: `trustcheck-service`
   - Click "Create and Continue"
   - Skip optional steps → "Done"

5. **Generate JSON Key**
   - Click on the service account you created
   - Go to "Keys" tab
   - "Add Key" → "Create New Key" → "JSON"
   - Download the file (e.g., `trustcheck-service-key.json`)

6. **Add to `.env`**:
   
   Open the downloaded JSON file and copy:
   - `client_email` value
   - `private_key` value (keep the `\n` characters)

   Add to `.env`:
   ```env
   GOOGLE_SHEETS_CLIENT_EMAIL=trustcheck-service@your-project.iam.gserviceaccount.com
   GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
   ```

   **Important**: Keep the quotes around the private key and preserve the `\n` characters!

### Step 3: Restart Server

```bash
npm run dev
```

You should see:
```
✅ Google Sheets API initialized
✅ Email service initialized
✅ Reminder service started
```

---

## Testing

### Test Email Sending

```bash
POST http://localhost:3000/api/email-verification/initiate

{
  "candidateData": {
    "employeeName": "Test User",
    "companyName": "Test Corp",
    "designation": "Developer",
    "dates": "2020-2023",
    "salary": "₹10 LPA"
  },
  "hrEmail": "your-test-email@gmail.com"
}
```

Check your email inbox for the verification email!

### Test Google Sheets

The response will include a `sheetUrl`. Open it to see the verification form!

---

## Troubleshooting

### Gmail Issues

**"Invalid credentials"**
- Make sure you're using an App Password, not your regular password
- Remove spaces from the app password
- Verify 2FA is enabled

**"Less secure app access"**
- This is outdated. Use App Passwords instead.

### Google Sheets Issues

**"Invalid credentials"**
- Check that both APIs are enabled (Sheets + Drive)
- Verify the private key includes `\n` characters
- Ensure quotes around the private key in .env

**"Permission denied"**
- The service account needs both Sheets and Drive API access
- Make sure both APIs are enabled in your project

**Sheet not accessible**
- Sheets are created with "anyone with link can edit" permissions
- No additional sharing needed!

---

## Security Notes

- ✅ Never commit `.env` file to git (already in `.gitignore`)
- ✅ Keep service account JSON file secure
- ✅ Use App Passwords, not your main Gmail password
- ✅ Rotate credentials periodically

---

## Need Help?

If you encounter issues:
1. Check server console for detailed error messages
2. Verify all steps above
3. Test with mock mode first to ensure code works
4. Check the full setup guide: `EMAIL_VERIFICATION_SETUP.md`
