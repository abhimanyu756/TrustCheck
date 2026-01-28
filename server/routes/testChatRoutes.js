const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require("@google/genai");
require('dotenv').config();

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = "gemini-2.5-flash";

router.post('/test', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log('📨 Received message:', message);

        // Test Gemini API
        const result = await client.models.generateContent({
            model: MODEL_NAME,
            contents: [message]
        });
        const response = result.text;

        console.log('✅ Gemini responded:', response.substring(0, 100) + '...');

        res.json({
            success: true,
            response,
            model: MODEL_NAME
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