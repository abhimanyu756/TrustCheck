const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/test', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log('📨 Received message:', message);

        // Test Gemini API
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const result = await model.generateContent(message);
        const response = result.response.text();

        console.log('✅ Gemini responded:', response.substring(0, 100) + '...');

        res.json({
            success: true,
            response,
            model: 'gemini-2.5-flash-lite'
        });

    } catch (error) {
        console.error('❌ Chat Error:', error.message);

        // Detailed error response
        res.status(500).json({
            error: error.message,
            details: error.status ? `HTTP ${error.status}: ${error.statusText}` : 'Unknown error',
            suggestion: error.status === 429
                ? 'API quota exceeded. Wait or check your billing at https://ai.google.dev/gemini-api/docs/rate-limits'
                : 'Check your API key and network connection'
        });
    }
});

module.exports = router;