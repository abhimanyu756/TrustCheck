const express = require('express');
const router = express.Router();
const multer = require('multer');
const { analyzeDocument } = require('../services/geminiService');

// Configure Multer to store files in memory
const upload = multer({ storage: multer.memoryStorage() });

router.post('/analyze', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileBuffer = req.file.buffer;
        const mimeType = req.file.mimetype;

        // Prompt for Gemini
        const prompt = `
      You are an expert background verification agent. Analyze this document (likely a payslip, offer letter, or tax form).
      
      1. Identify the Document Type.
      2. Extract key details: Employee Name, Company Name, Dates (Join/Exit), Salary (CTC/Monthly).
      3. Check for signs of tampering (inconsistent fonts, clear digital edits).
      
      Return the output in this JSON format:
      {
        "documentType": "string",
        "extractedData": {
          "employeeName": "string",
          "companyName": "string",
          "dates": "string",
          "salary": "string"
        },
        "authenticityCheck": {
          "isSuspicious": boolean,
          "reason": "string"
        }
      }
    `;

        const analysisResult = await analyzeDocument(fileBuffer, mimeType, prompt);

        // Clean the result to ensure it's valid JSON (remove markdown backticks if present)
        const cleanerJson = analysisResult.replace(/```json/g, '').replace(/```/g, '').trim();

        res.json(JSON.parse(cleanerJson));

    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: 'Failed to process document' });
    }
});

module.exports = router;
