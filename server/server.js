require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./services/database');
const { initPinecone } = require('./services/pineconeService');
const { initGoogleSheets } = require('./services/googleSheetsService');
const { initEmailService } = require('./services/emailService');
const { startReminderService } = require('./services/reminderService');
const { initGmailMonitoring, startEmailMonitoring } = require('./services/emailMonitorService');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadRoutes = require('./routes/uploadRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const emailVerificationRoutes = require('./routes/emailVerificationRoutes');
const testChatRoutes = require('./routes/testChatRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const clientRoutes = require('./routes/clientRoutes');
const caseRoutes = require('./routes/caseRoutes');
const checkRoutes = require('./routes/checkRoutes');
const documentUploadRoutes = require('./routes/documentUploadRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const emailRoutes = require('./routes/emailRoutes');

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('TrustCheck API is running');
});

app.use('/api/documents', uploadRoutes);
app.use('/api/verify', verificationRoutes);
app.use('/api/email-verification', emailVerificationRoutes);
app.use('/api/chat', testChatRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/checks', checkRoutes);
app.use('/api/document-upload', documentUploadRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/emails', emailRoutes);

// Initialize all services, then start server
Promise.all([
    initDB(),
    initPinecone(),
    initGoogleSheets(),
    initEmailService(),
    initGmailMonitoring()
])
    .then(() => {
        // Start reminder service
        startReminderService();

        // Start email monitoring service (checks for HR replies every 5 minutes)
        startEmailMonitoring(5);

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Test chat at: http://localhost:5173/test-chat`);
            console.log(`✅ All services initialized`);
        });
    })
    .catch((error) => {
        console.error('Failed to initialize services:', error);
        process.exit(1);
    });