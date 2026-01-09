const express = require('express');
const router = express.Router();
const multer = require('multer');
const { analyzeDocument } = require('../services/geminiService');
const { analyzePDFMetadata } = require('../services/forensicsService');
const { storeDocumentVector, findSimilarDocuments } = require('../services/pineconeService');
const { saveDocumentAnalysis } = require('../services/database');

// Configure Multer to store files in memory
const upload = multer({ storage: multer.memoryStorage() });

router.post('/analyze', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;

    // Step 1: Metadata Forensics (for PDFs)
    let metadataAnalysis = null;
    if (mimeType === 'application/pdf') {
      metadataAnalysis = await analyzePDFMetadata(fileBuffer);
    }

    // Step 2: Visual Analysis with Gemini
    const prompt = `
      You are an expert background verification agent. Analyze this document (likely a payslip, offer letter, or tax form).
      
      1. Identify the Document Type.
      2. Extract key details: Employee Name, Company Name, Dates (Join/Exit), Salary (CTC/Monthly), Designation.
      3. Check for signs of tampering (inconsistent fonts, clear digital edits, misaligned elements).
      
      Return the output in this JSON format:
      {
        "documentType": "string",
        "extractedData": {
          "employeeName": "string",
          "companyName": "string",
          "dates": "string",
          "salary": "string",
          "designation": "string"
        },
        "authenticityCheck": {
          "isSuspicious": boolean,
          "reason": "string",
          "visualAnomalies": ["list of issues found"]
        }
      }
    `;

    const analysisResult = await analyzeDocument(fileBuffer, mimeType, prompt);

    // Robust JSON parsing
    let geminiAnalysis;
    try {
      const cleanerJson = analysisResult.replace(/```json/g, '').replace(/```/g, '').trim();

      // Try to find JSON object in the response
      const jsonMatch = cleanerJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        geminiAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON object found in Gemini response');
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini analysis:', parseError.message);
      console.error('Response was:', analysisResult.substring(0, 300));

      // Return safe default structure
      geminiAnalysis = {
        documentType: 'Unknown',
        extractedData: {
          employeeName: 'Could not extract',
          companyName: 'Could not extract',
          dates: 'Could not extract',
          salary: 'Could not extract',
          designation: 'Could not extract'
        },
        authenticityCheck: {
          isSuspicious: true,
          reason: 'AI analysis failed - manual review required',
          visualAnomalies: ['Failed to parse AI response']
        }
      };
    }

    // Step 3: Combine analyses
    const combinedResult = {
      ...geminiAnalysis,
      metadataForensics: metadataAnalysis,
      authenticityCheck: {
        ...geminiAnalysis.authenticityCheck,
        isSuspicious: geminiAnalysis.authenticityCheck.isSuspicious ||
          (metadataAnalysis?.analysis?.isSuspicious || false),
        reason: metadataAnalysis?.analysis?.isSuspicious
          ? `${geminiAnalysis.authenticityCheck.reason} | METADATA: ${metadataAnalysis.analysis.findings.map(f => f.issue).join(', ')}`
          : geminiAnalysis.authenticityCheck.reason
      }
    };

    // Step 4: Save to database
    const documentId = await saveDocumentAnalysis(
      combinedResult.documentType,
      combinedResult.extractedData,
      combinedResult.authenticityCheck,
      combinedResult.metadataForensics
    );

    // Step 5: Store in Pinecone and find similar cases
    let similarCases = [];
    try {
      await storeDocumentVector(documentId, combinedResult);
      similarCases = await findSimilarDocuments(combinedResult, 3);
    } catch (pineconeError) {
      console.error('Pinecone error:', pineconeError);
      // Continue even if Pinecone fails
    }

    // Add similar cases to response
    const finalResult = {
      ...combinedResult,
      documentId,
      similarCases: similarCases.map(c => ({
        similarity: (c.score * 100).toFixed(1) + '%',
        employeeName: c.metadata.employeeName,
        companyName: c.metadata.companyName,
        wasSuspicious: c.metadata.isSuspicious
      }))
    };

    res.json(finalResult);

  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'Failed to process document' });
  }
});

module.exports = router;
