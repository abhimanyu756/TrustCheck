require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./services/database');
const { initPinecone } = require('./services/pineconeService');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadRoutes = require('./routes/uploadRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const testChatRoutes = require('./routes/testChatRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('TrustCheck API is running');
});

app.use('/api/documents', uploadRoutes);
app.use('/api/verify', verificationRoutes);
app.use('/api/chat', testChatRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Initialize database and Pinecone, then start server
Promise.all([initDB(), initPinecone()])
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Test chat at: http://localhost:5173/test-chat`);
            console.log(`✅ Connected to Pinecone`);
        });
    })
    .catch((error) => {
        console.error('Failed to initialize services:', error);
        process.exit(1);
    });