const express = require('express');
const router = express.Router();
const { createVerificationSheet, getSheetResponses, hasHRResponded } = require('../services/googleSheetsService');
const { sendVerificationEmail } = require('../services/emailService');
const { sendManualReminder } = require('../services/reminderService');
const { compareData } = require('../services/comparisonService');
const {
    saveVerificationRequest,
    getVerificationRequest,
    updateVerificationMetadata,
    updateVerificationStatus,
    saveAnalysisResults
} = require('../services/database');

/**
 * Initiate email-based verification
 * POST /api/email-verification/initiate
 */
router.post('/initiate', async (req, res) => {
    try {
        const { candidateData, hrEmail, reminderConfig } = req.body;

        if (!candidateData || !hrEmail) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        console.log('📧 Initiating email verification for:', candidateData.employeeName);

        // Generate unique request ID
        const requestId = Math.random().toString(36).substring(7);

        // Create Google Sheet for HR verification
        console.log('📊 Creating Google Sheet...');
        const sheetData = await createVerificationSheet(candidateData, requestId);
        console.log('✅ Sheet created:', sheetData.spreadsheetUrl);

        // Save verification request to database
        const verificationData = {
            ...candidateData,
            hrEmail
        };

        console.log('💾 Saving to database...');
        await saveVerificationRequest(requestId, verificationData);

        // Store email-specific metadata separately to avoid size limits
        const emailMetadata = {
            verificationType: 'EMAIL',
            googleSheetsId: sheetData.spreadsheetId,
            googleSheetsUrl: sheetData.spreadsheetUrl,
            hrEmail: hrEmail,
            emailsSent: [{
                timestamp: new Date().toISOString(),
                type: 'INITIAL'
            }],
            reminderConfig: reminderConfig || {
                enabled: true,
                intervalHours: 24
            }
        };

        // Store as a separate vector to avoid metadata size limits
        const { index } = require('../services/database');
        const { generateEmbedding } = require('../services/pineconeService');

        const metadataText = `Email verification metadata for ${requestId}`;
        const embedding = await generateEmbedding(metadataText);

        await index.upsert([{
            id: `email_meta_${requestId}`,
            values: embedding,
            metadata: {
                type: 'email_verification_metadata',
                request_id: requestId,
                verification_type: 'EMAIL',
                google_sheets_id: sheetData.spreadsheetId,
                google_sheets_url: sheetData.spreadsheetUrl,
                hr_email: hrEmail,
                created_at: new Date().toISOString()
            }
        }]);

        // Send initial verification email
        console.log('📧 Sending email to:', hrEmail);
        await sendVerificationEmail(
            hrEmail,
            candidateData.employeeName,
            sheetData.spreadsheetUrl,
            requestId
        );
        console.log('✅ Email sent successfully');

        res.json({
            success: true,
            requestId,
            sheetUrl: sheetData.spreadsheetUrl,
            message: 'Verification email sent successfully'
        });

    } catch (error) {
        console.error('❌ Email verification initiation error:', error);
        console.error('Error details:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({
            error: 'Failed to initiate email verification',
            details: error.message
        });
    }
});

/**
 * Get verification status
 * GET /api/email-verification/:id/status
 */
router.get('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const request = await getVerificationRequest(id);

        if (!request) {
            return res.status(404).json({ error: 'Verification request not found' });
        }

        // Check if HR has responded
        const googleSheetsId = request.googleSheetsId;
        const hrResponded = googleSheetsId ? await hasHRResponded(googleSheetsId) : false;

        res.json({
            requestId: id,
            status: request.status,
            hrResponded,
            createdAt: request.createdAt,
            candidateName: request.candidateData?.employeeName,
            company: request.candidateData?.companyName
        });

    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Failed to check status' });
    }
});

/**
 * Fetch and process Google Sheets responses
 * GET /api/email-verification/:id/sheet-data
 */
router.get('/:id/sheet-data', async (req, res) => {
    try {
        const { id } = req.params;
        const request = await getVerificationRequest(id);

        if (!request) {
            return res.status(404).json({ error: 'Verification request not found' });
        }

        const googleSheetsId = request.googleSheetsId;
        if (!googleSheetsId) {
            return res.status(400).json({ error: 'Not an email-based verification' });
        }

        // Fetch HR responses from sheet
        const hrResponses = await getSheetResponses(googleSheetsId);

        if (!hrResponses) {
            return res.json({
                hasResponded: false,
                message: 'HR has not filled the verification form yet'
            });
        }

        // Compare candidate data with HR responses
        const comparisonResult = await compareData(request.candidateData, hrResponses);

        // Save analysis results
        await saveAnalysisResults(id, comparisonResult, null);

        // Update status to completed
        await updateVerificationStatus(id, 'COMPLETED');

        res.json({
            hasResponded: true,
            hrResponses,
            comparisonResult,
            message: 'Verification completed successfully'
        });

    } catch (error) {
        console.error('Sheet data fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch sheet data' });
    }
});

/**
 * Send manual reminder
 * POST /api/email-verification/:id/send-reminder
 */
router.post('/:id/send-reminder', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await sendManualReminder(id);

        res.json(result);

    } catch (error) {
        console.error('Manual reminder error:', error);
        res.status(500).json({ error: 'Failed to send reminder' });
    }
});

/**
 * Update reminder configuration
 * PUT /api/email-verification/:id/config
 */
router.put('/:id/config', async (req, res) => {
    try {
        const { id } = req.params;
        const { reminderConfig } = req.body;

        await updateVerificationMetadata(id, {
            reminder_config: JSON.stringify(reminderConfig)
        });

        res.json({
            success: true,
            message: 'Reminder configuration updated'
        });

    } catch (error) {
        console.error('Config update error:', error);
        res.status(500).json({ error: 'Failed to update configuration' });
    }
});

module.exports = router;
