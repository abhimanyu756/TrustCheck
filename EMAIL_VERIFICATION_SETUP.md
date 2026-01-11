# Email-Based Verification Setup Guide

## Quick Start (Mock Mode)

The email verification system works **out of the box** in mock mode without any configuration! This is perfect for testing and hackathons.

### What Works in Mock Mode:
- ✅ Google Sheets creation (simulated)
- ✅ Email sending (logged to console)
- ✅ Reminder system
- ✅ Complete verification workflow

### Testing in Mock Mode:

1. **Start the server** (it's already running!)
   ```bash
   npm run dev
   ```

2. **Test the API** with Postman or curl:
   ```bash
   POST http://localhost:3000/api/email-verification/initiate
   
   Body:
   {
     "candidateData": {
       "employeeName": "John Doe",
       "companyName": "Tech Corp",
       "designation": "Senior Developer",
       "dates": "2020-2023",
       "salary": "₹15 LPA",
       "department": "Engineering"
     },
     "hrEmail": "hr@techcorp.com"
   }
   ```

3. **Check console** for mock email output

4. **Get status**:
   ```bash
   GET http://localhost:3000/api/email-verification/{requestId}/status
   ```

5. **Fetch sheet data** (returns mock HR responses):
   ```bash
   GET http://localhost:3000/api/email-verification/{requestId}/sheet-data
   ```

---

## Production Setup (Optional)

### 1. Email Service Setup

#### Option A: Gmail (Recommended for Hackathon)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification → App Passwords
   - Create password for "Mail"
3. Add to `.env`:
   ```env
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-16-char-app-password
   ```

#### Option B: Other SMTP

```env
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your-email
EMAIL_PASSWORD=your-password
```

### 2. Google Sheets API Setup

1. **Create Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project or select existing

2. **Enable Google Sheets API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

3. **Enable Google Drive API** (required for permissions):
   - Search for "Google Drive API"
   - Click "Enable"

4. **Create Service Account**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "Service Account"
   - Fill in details and click "Create"
   - Skip optional steps, click "Done"

5. **Generate Key**:
   - Click on the service account you just created
   - Go to "Keys" tab
   - Click "Add Key" → "Create New Key"
   - Choose "JSON" format
   - Download the key file

6. **Add to `.env`**:
   ```env
   GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
   ```

   **Note**: Copy the `client_email` and `private_key` from the downloaded JSON file.

### 3. Restart Server

```bash
npm run dev
```

You should see:
```
✅ Google Sheets API initialized
✅ Email service initialized
✅ Reminder service started (runs every hour)
```

---

## API Endpoints

### 1. Initiate Email Verification
```http
POST /api/email-verification/initiate

Body:
{
  "candidateData": {
    "employeeName": "string",
    "companyName": "string",
    "designation": "string",
    "dates": "string",
    "salary": "string",
    "department": "string"
  },
  "hrEmail": "string",
  "reminderConfig": {
    "enabled": true,
    "intervalHours": 24
  }
}

Response:
{
  "success": true,
  "requestId": "abc123",
  "sheetUrl": "https://docs.google.com/spreadsheets/d/...",
  "message": "Verification email sent successfully"
}
```

### 2. Check Status
```http
GET /api/email-verification/:id/status

Response:
{
  "requestId": "abc123",
  "status": "PENDING",
  "hrResponded": false,
  "createdAt": "2026-01-11T...",
  "candidateName": "John Doe",
  "company": "Tech Corp"
}
```

### 3. Fetch Sheet Data
```http
GET /api/email-verification/:id/sheet-data

Response:
{
  "hasResponded": true,
  "hrResponses": {
    "employeeName": "John Doe",
    "companyName": "Tech Corp",
    ...
  },
  "comparisonResult": {
    "overallRisk": "LOW",
    "riskScore": 15,
    "discrepancies": []
  }
}
```

### 4. Send Manual Reminder
```http
POST /api/email-verification/:id/send-reminder

Response:
{
  "success": true,
  "message": "Reminder sent successfully"
}
```

### 5. Update Reminder Config
```http
PUT /api/email-verification/:id/config

Body:
{
  "reminderConfig": {
    "enabled": false
  }
}
```

---

## Reminder System

The reminder service runs automatically every hour and:

1. Checks all pending email verifications
2. Sends reminders if HR hasn't responded after 24 hours
3. Escalates after 2 reminders
4. Marks for voice call if needed

**Configuration** (in `.env`):
```env
REMINDER_ENABLED=true
REMINDER_INTERVAL_HOURS=24
MAX_REMINDERS=2
```

---

## Workflow

```
1. Upload Documents → Gemini Extracts Data
2. User Reviews & Submits
3. System Creates Google Sheet
4. Email Sent to HR with Sheet Link
5. HR Fills Sheet
6. System Fetches & Compares Data
7. Risk Assessment Generated
8. Results Displayed on Dashboard
```

**If HR doesn't respond**:
- After 24h: Reminder 1
- After 48h: Reminder 2
- After 72h: Escalation email (ready for voice call)

---

## Troubleshooting

### Mock Mode Not Working?
- Check console for "⚠️ Google Sheets credentials not configured. Using mock mode."
- This is normal and expected!

### Real Emails Not Sending?
- Verify Gmail App Password is correct (16 characters, no spaces)
- Check console for email service initialization message
- Test with a simple email first

### Google Sheets Not Creating?
- Verify service account email and private key
- Ensure both Google Sheets API and Google Drive API are enabled
- Check private key format (should include `\n` for newlines)

### Reminders Not Sending?
- Check `REMINDER_ENABLED=true` in `.env`
- Reminders run every hour, so wait for the next cycle
- Use manual reminder endpoint for testing

---

## Next Steps

1. ✅ Backend is complete and working in mock mode
2. 📝 Create frontend components for email verification
3. 🎨 Add email verification tab to dashboard
4. 📞 (Optional) Implement voice calling in Phase 3

**The system is ready to use right now in mock mode!**
