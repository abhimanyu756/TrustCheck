# IBM Cloud Deployment Guide - TrustCheck

Complete step-by-step guide to deploy TrustCheck on IBM Cloud Code Engine.

## 📋 Prerequisites

You need:
- IBM Cloud account with $300 credits ✅
- Environment variables ready ✅
- Application files (already prepared) ✅

---

## Step 1: Install IBM Cloud CLI

### Windows (PowerShell as Administrator)
```powershell
# Download and run installer
iex (New-Object Net.WebClient).DownloadString('https://clis.cloud.ibm.com/install/powershell')
```

### OR Download manually:
1. Go to: https://cloud.ibm.com/docs/cli
2. Download Windows 64-bit installer
3. Run the installer

### Verify installation:
```powershell
ibmcloud version
```

---

## Step 2: Login to IBM Cloud

```powershell
# Login (opens browser for authentication)
ibmcloud login --sso

# OR with API key
ibmcloud login --apikey YOUR_API_KEY
```

---

## Step 3: Install Code Engine Plugin

```powershell
ibmcloud plugin install code-engine
```

---

## Step 4: Create and Select Project

```powershell
# Target Tokyo region (closest to India)
ibmcloud target -r jp-tok

# Create project
ibmcloud ce project create --name trustcheck

# Select the project
ibmcloud ce project select --name trustcheck
```

---

## Step 5: Deploy Backend API

Navigate to server directory and deploy:

```powershell
cd E:\work\Hackathon\Gemini3-Hackathon\TrustCheck\server

# Build and deploy
ibmcloud ce application create `
  --name trustcheck-api `
  --build-source . `
  --port 3000 `
  --min-scale 1 `
  --max-scale 3 `
  --memory 512M `
  --cpu 0.5

# Get the URL (save this!)
ibmcloud ce application get --name trustcheck-api --output url
```

### Set Environment Variables:
```powershell
ibmcloud ce application update --name trustcheck-api `
  --env GEMINI_API_KEY="your-gemini-api-key" `
  --env PINECONE_API_KEY="your-pinecone-api-key" `
  --env PINECONE_INDEX="your-pinecone-index" `
  --env PINECONE_ENVIRONMENT="your-pinecone-environment" `
  --env EMAIL_USER="your-email@gmail.com" `
  --env EMAIL_PASSWORD="your-app-password" `
  --env EMAIL_SERVICE="gmail" `
  --env GOOGLE_CLIENT_ID="your-google-client-id" `
  --env GOOGLE_CLIENT_SECRET="your-google-client-secret" `
  --env GOOGLE_REFRESH_TOKEN="your-google-refresh-token" `
  --env NODE_ENV="production" `
  --env TWILIO_ACCOUNT_SID="your-twilio-sid" `
  --env TWILIO_AUTH_TOKEN="your-twilio-token" `
  --env TWILIO_PHONE_NUMBER="your-twilio-number"
```

---

## Step 6: Deploy Frontend

Navigate to client directory and deploy:

```powershell
cd E:\work\Hackathon\Gemini3-Hackathon\TrustCheck\client

# Replace BACKEND_URL with your actual backend URL from Step 5
ibmcloud ce application create `
  --name trustcheck-ui `
  --build-source . `
  --port 80 `
  --min-scale 1 `
  --max-scale 3 `
  --memory 256M `
  --cpu 0.25 `
  --build-argument VITE_API_URL=https://trustcheck-api.xxxxx.jp-tok.codeengine.appdomain.cloud

# Get the frontend URL
ibmcloud ce application get --name trustcheck-ui --output url
```

---

## Step 7: Verify Deployment

1. Open frontend URL in browser
2. Create a test client and case
3. Test verification flow
4. Check backend logs: `ibmcloud ce application logs --name trustcheck-api --follow`

---

## 🚨 Troubleshooting

### View Logs
```powershell
ibmcloud ce application logs --name trustcheck-api --follow
ibmcloud ce application logs --name trustcheck-ui --follow
```

### Rebuild After Changes
```powershell
ibmcloud ce application update --name trustcheck-api --build-source .
ibmcloud ce application update --name trustcheck-ui --build-source .
```

### Scale Down (Save Costs)
```powershell
ibmcloud ce application update --name trustcheck-api --min-scale 0
ibmcloud ce application update --name trustcheck-ui --min-scale 0
```

### Delete Applications
```powershell
ibmcloud ce application delete --name trustcheck-api
ibmcloud ce application delete --name trustcheck-ui
```

---

## 💰 Cost Estimate

| Service | Spec | Est. Monthly |
|---------|------|--------------|
| Backend | 512MB, 0.5 vCPU | ~$15 |
| Frontend | 256MB, 0.25 vCPU | ~$8 |
| **Total** | | **~$23/month** |

With $300 credits: **~13 months** of hosting!
