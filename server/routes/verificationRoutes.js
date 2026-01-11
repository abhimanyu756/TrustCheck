const express = require('express');
const router = express.Router();
const { createVerificationRequest, getRequest, chatWithHR } = require('../services/verificationService');
const { sendVerificationEmail } = require('../services/emailService');
const { createVerificationSheet, getSheetResponses, hasHRResponded } = require('../services/googleSheetsService');
const { compareData } = require('../services/comparisonService');
const { getVerificationRequest, saveAnalysisResults, updateVerificationStatus } = require('../services/database');

router.post('/initiate', async (req, res) => {
    try {
        const { candidateData, hrEmail } = req.body;

        console.log('📧 Initiating verification for:', candidateData.employeeName);

        // Create verification request
        const requestId = await createVerificationRequest(candidateData);

        // Create Google Sheet for HR verification
        console.log('📊 Creating Google Sheet...');
        const sheetData = await createVerificationSheet(candidateData, requestId);
        console.log('✅ Sheet created:', sheetData.spreadsheetUrl);

        // Send email with Google Sheets link
        console.log('📧 Sending email to:', hrEmail);
        await sendVerificationEmail(hrEmail, candidateData.employeeName, sheetData.spreadsheetUrl, requestId);
        console.log('✅ Email sent successfully');

        res.json({
            success: true,
            requestId,
            sheetUrl: sheetData.spreadsheetUrl,
            message: 'Verification email sent with Google Sheets link'
        });
    } catch (error) {
        console.error('❌ Verification initiation error:', error);
        console.error('Error details:', error.message);
        res.status(500).json({
            error: 'Failed to initiate verification',
            details: error.message
        });
    }
});

router.post('/:id/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const { id } = req.params;

        const response = await chatWithHR(id, message);
        res.json({ response });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Chat failed' });
    }
});

router.get('/:id', async (req, res) => {
    const data = await getRequest(req.params.id);
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
});

// Check verification status
router.get('/:id/status', async (req, res) => {
    try {
        const request = await getVerificationRequest(req.params.id);
        if (!request) {
            return res.status(404).json({ error: 'Verification not found' });
        }

        const hrResponded = request.googleSheetsId ? await hasHRResponded(request.googleSheetsId) : false;

        res.json({
            id: req.params.id,
            status: request.status,
            hrResponded,
            zone: request.zone,
            riskScore: request.riskScore,
            createdAt: request.createdAt
        });
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Failed to check status' });
    }
});

// Get verification results
router.get('/:id/results', async (req, res) => {
    try {
        const request = await getVerificationRequest(req.params.id);
        if (!request) {
            return res.status(404).json({ error: 'Verification not found' });
        }

        if (request.status === 'PENDING') {
            return res.json({
                status: 'PENDING',
                message: 'Verification still pending HR response'
            });
        }

        res.json({
            id: req.params.id,
            status: request.status,
            zone: request.zone,
            riskScore: request.riskScore,
            comparisonResult: request.comparisonResult,
            candidateData: request.candidateData,
            hrData: request.hrData
        });
    } catch (error) {
        console.error('Results fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch results' });
    }
});

// Manually trigger fetch and compare
router.post('/:id/fetch-and-compare', async (req, res) => {
    try {
        const request = await getVerificationRequest(req.params.id);
        if (!request) {
            return res.status(404).json({ error: 'Verification not found' });
        }

        if (!request.googleSheetsId) {
            return res.status(400).json({ error: 'Not an email-based verification' });
        }

        // Check if HR has filled the sheet
        const hasResponded = await hasHRResponded(request.googleSheetsId);
        if (!hasResponded) {
            return res.json({
                success: false,
                message: 'HR has not filled the verification form yet'
            });
        }

        // Fetch HR data
        const hrData = await getSheetResponses(request.googleSheetsId);

        // Run comparison
        const comparisonResult = await compareData(request.candidateData, hrData);

        // Save results
        await saveAnalysisResults(req.params.id, comparisonResult, null);

        // Update status
        const newStatus = comparisonResult.zone === 'GREEN' ? 'VERIFIED_GREEN' :
            comparisonResult.zone === 'YELLOW' ? 'VERIFIED_YELLOW' : 'VERIFIED_RED';
        await updateVerificationStatus(req.params.id, newStatus);

        res.json({
            success: true,
            status: newStatus,
            zone: comparisonResult.zone,
            riskScore: comparisonResult.riskScore,
            comparisonResult
        });
    } catch (error) {
        console.error('Fetch and compare error:', error);
        res.status(500).json({ error: 'Failed to fetch and compare data' });
    }
});

module.exports = router;
