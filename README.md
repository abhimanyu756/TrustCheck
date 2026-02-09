<p align="center">
  <img src="https://img.shields.io/badge/Gemini%203-Flash-blue?style=for-the-badge&logo=google&logoColor=white" alt="Gemini 3" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Pinecone-Vector%20DB-00C896?style=for-the-badge" alt="Pinecone" />
</p>

# 🔍 TrustCheck.ai

> **AI-Powered Background Verification Platform** — Automate employment, education, and criminal background checks using Gemini 3's multimodal AI agents.

TrustCheck.ai transforms the traditional 7-14 day verification process into an automated, AI-driven workflow that completes in hours. Built for the **Gemini 3 Hackathon**, it showcases the power of multimodal AI in enterprise workflows.

---

## ✨ Features

### 🤖 AI-Powered Verification Agents

| Agent | Capability |
|-------|------------|
| **Document Extraction** | Parses payslips, offer letters, certificates using Gemini 3 Vision |
| **Forensics Analysis** | Detects forged documents via PDF metadata analysis |
| **Voice Verification** | Makes autonomous calls to HR via Twilio + Gemini |
| **Email Processor** | Sends verification requests & classifies responses |

### 📊 Verification Types

- **🎓 Education Checks** — Verify degrees, marksheets with universities
- **💼 Employment Checks** — Confirm job history with previous employers
- **⚖️ Crime Checks** — Background screening via official records

### 🎯 Dashboard Features

- **Green Zone** — Fully verified candidates ready for hiring
- **Red Zone** — Flagged candidates requiring manual review
- **Email Inbox** — Track all outgoing/incoming verification emails
- **Risk Scoring** — Explainable AI-powered trust scores

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, TailwindCSS, react-pdf |
| **Backend** | Node.js, Express.js, Multer |
| **AI/ML** | Gemini 3 Flash Preview, text-embedding-004 |
| **Database** | Pinecone Vector Database |
| **Communication** | Gmail API (OAuth2), Twilio Voice SDK |
| **Deployment** | IBM Cloud VM, Nginx, PM2 |

---

## 📁 Project Structure

```
TrustCheck/
├── client/                    # React Frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Dashboard, Check Status, Email Inbox
│   │   ├── contexts/          # Toast notifications
│   │   └── config/            # API configuration
│   └── package.json
│
├── server/                    # Node.js Backend
│   ├── routes/                # API endpoints
│   │   ├── checkRoutes.js     # Check CRUD operations
│   │   ├── emailRoutes.js     # Email management
│   │   ├── callRoutes.js      # Voice verification
│   │   └── documentUploadRoutes.js
│   ├── services/              # Business logic
│   │   ├── aiAgentService.js  # Gemini agent orchestration
│   │   ├── geminiService.js   # Document extraction
│   │   ├── callService.js     # Twilio + Gemini voice
│   │   ├── emailService.js    # Gmail integration
│   │   ├── database.js        # Pinecone operations
│   │   └── forensicsService.js
│   └── package.json
│
├── GEMINI_INTEGRATION.md      # Gemini 3 feature documentation
├── PROJECT_STORY.md           # Hackathon submission story
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Pinecone account
- Google Cloud project (for Gmail API)
- Twilio account (for voice calls)
- Gemini API key

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/TrustCheck.git
cd TrustCheck
```

### 2. Backend Setup

```bash
cd server
npm install
```

Create `.env` file:

```env
# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Pinecone Vector Database
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=trustcheck-index

# Gmail API (OAuth2)
GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REFRESH_TOKEN=your_refresh_token
GMAIL_USER=your_email@gmail.com

# Twilio Voice (Optional)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# Server
PORT=3000
```

Start the server:

```bash
npm run dev
```

### 3. Frontend Setup

```bash
cd client
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

---

## 🔌 API Endpoints

### Clients
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clients` | List all clients |
| POST | `/api/clients` | Create new client |
| GET | `/api/clients/:clientId` | Get client details |

### Cases & Checks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cases/:clientId` | Get cases for client |
| POST | `/api/cases` | Create new case |
| GET | `/api/checks/:checkId` | Get check details |
| POST | `/api/checks/execute/:checkId` | Execute verification |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/document-upload/upload` | Upload document |
| GET | `/api/document-upload/download/:docId` | Download document |
| GET | `/api/document-upload/check/:checkId` | Get docs for check |

### Email & Calls
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/emails` | List all emails |
| POST | `/api/calls/initiate` | Start voice verification |
| GET | `/api/calls/:checkId/transcript` | Get call transcript |

---

## 🌐 Deployment

### IBM Cloud VM Deployment

```bash
# SSH into your VM
ssh root@your-vm-ip

# Clone and setup
cd /var/www
git clone https://github.com/yourusername/TrustCheck.git trustcheck
cd trustcheck

# Install dependencies
cd server && npm install
cd ../client && npm install && npm run build

# Copy frontend build to nginx
cp -r dist/* /var/www/html/

# Start backend with PM2
cd ../server
pm2 start server.js --name trustcheck-api
pm2 save
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

---

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | ✅ |
| `PINECONE_API_KEY` | Pinecone vector DB key | ✅ |
| `PINECONE_INDEX` | Pinecone index name | ✅ |
| `GMAIL_CLIENT_ID` | Google OAuth client ID | ✅ |
| `GMAIL_CLIENT_SECRET` | Google OAuth secret | ✅ |
| `GMAIL_REFRESH_TOKEN` | Gmail refresh token | ✅ |
| `GMAIL_USER` | Sending email address | ✅ |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | ⚪ |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | ⚪ |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | ⚪ |

---

## 📸 Screenshots

### Uploader Dashboard
Upload documents and initiate verification checks for candidates.

### Supervisor Dashboard
Monitor all checks across clients with real-time status updates.

### Email Inbox
Track verification emails with filtering by check type.

### Check Status
View detailed verification results with risk assessment.

---

## 🧪 Running Tests

```bash
# Backend tests
cd server
npm test

# Frontend tests
cd client
npm test
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Google Gemini Team** — For the incredible Gemini 3 Flash model
- **Pinecone** — For blazing-fast vector search
- **Twilio** — For voice API capabilities
- **IBM Cloud** — For reliable VM hosting

---

<p align="center">
  Built with ❤️ for the <strong>Gemini 3 Hackathon 2026</strong>
</p>
