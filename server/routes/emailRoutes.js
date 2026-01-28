const express = require('express');
const router = express.Router();
const { getActivityLogs } = require('../services/database');

/**
 * Get all sent emails
 * GET /api/emails/all
 */
router.get('/all', async (req, res) => {
    try {
        // Fetch all email-related activity logs
        const logs = await getActivityLogs('check', null);

        const emails = logs
            .filter(log => log.action === 'EMAIL_SENT')
            .map(log => {
                const metadata = JSON.parse(log.metadata || '{}');
                return {
                    emailId: log.logId,
                    checkId: log.entityId,
                    to: metadata.hrEmail || 'N/A',
                    from: 'noreply@trustcheck.ai',
                    subject: metadata.subject || 'Employment Verification Request',
                    body: metadata.emailBody || '',
                    sentAt: log.timestamp,
                    status: metadata.status || 'SENT',
                    googleSheetsUrl: metadata.googleSheetsUrl
                };
            });

        res.json({ success: true, emails });
    } catch (error) {
        console.error('Error fetching emails:', error);
        res.status(500).json({ error: 'Failed to fetch emails' });
    }
});

/**
 * Get emails for a specific check
 * GET /api/emails/check/:checkId
 */
router.get('/check/:checkId', async (req, res) => {
    try {
        const { checkId } = req.params;
        const logs = await getActivityLogs('check', checkId);

        const emails = logs
            .filter(log => log.action === 'EMAIL_SENT')
            .map(log => {
                // Parse metadata - it might be a string or object
                let metadata = {};
                if (typeof log.metadata === 'string') {
                    try {
                        metadata = JSON.parse(log.metadata);
                    } catch (e) {
                        console.error('Error parsing metadata:', e);
                        metadata = {};
                    }
                } else {
                    metadata = log.metadata || {};
                }

                return {
                    emailId: log.logId,
                    checkId: log.entityId,
                    to: metadata.hrEmail || 'N/A',
                    from: 'noreply@trustcheck.ai',
                    subject: metadata.subject || 'Employment Verification Request',
                    body: metadata.emailBody || '',
                    sentAt: log.timestamp,
                    status: metadata.status || 'SENT',
                    googleSheetsUrl: metadata.googleSheetsUrl
                };
            });

        res.json({ success: true, emails });
    } catch (error) {
        console.error('Error fetching emails for check:', error);
        res.status(500).json({ error: 'Failed to fetch emails' });
    }
});

/**
 * Get all HR responses
 * GET /api/emails/responses/all
 */
router.get('/responses/all', async (req, res) => {
    try {
        const logs = await getActivityLogs('check', null);

        const responses = logs
            .filter(log => log.action === 'HR_RESPONDED')
            .map(log => {
                // Parse metadata - it might be a string or object
                let metadata = {};
                if (typeof log.metadata === 'string') {
                    try {
                        metadata = JSON.parse(log.metadata);
                    } catch (e) {
                        console.error('Error parsing metadata:', e);
                        metadata = {};
                    }
                } else {
                    metadata = log.metadata || {};
                }
                return {
                    responseId: log.logId,
                    checkId: log.entityId,
                    respondedAt: log.timestamp,
                    hrEmail: metadata.hrEmail || 'N/A',
                    responseData: metadata.responseData || {},
                    verified: metadata.verified || false
                };
            });

        res.json({ success: true, responses });
    } catch (error) {
        console.error('Error fetching responses:', error);
        res.status(500).json({ error: 'Failed to fetch responses' });
    }
});

/**
 * Get HR responses for a specific check
 * GET /api/emails/responses/check/:checkId
 */
router.get('/responses/check/:checkId', async (req, res) => {
    try {
        const { checkId } = req.params;
        const logs = await getActivityLogs('check', checkId);

        const responses = logs
            .filter(log => log.action === 'HR_RESPONDED')
            .map(log => {
                // Parse metadata - it might be a string or object
                let metadata = {};
                if (typeof log.metadata === 'string') {
                    try {
                        metadata = JSON.parse(log.metadata);
                    } catch (e) {
                        console.error('Error parsing metadata:', e);
                        metadata = {};
                    }
                } else {
                    metadata = log.metadata || {};
                }
                return {
                    responseId: log.logId,
                    checkId: log.entityId,
                    respondedAt: log.timestamp,
                    hrEmail: metadata.hrEmail || 'N/A',
                    responseData: metadata.responseData || {},
                    verified: metadata.verified || false
                };
            });

        res.json({ success: true, responses });
    } catch (error) {
        console.error('Error fetching responses for check:', error);
        res.status(500).json({ error: 'Failed to fetch responses' });
    }
});

/**
 * Manually trigger email reply check
 * POST /api/emails/check-replies
 */
router.post('/check-replies', async (req, res) => {
    try {
        const { manualEmailCheck } = require('../services/emailMonitorService');
        const replies = await manualEmailCheck();

        res.json({
            success: true,
            message: `Checked for email replies. Found ${replies.length} new responses.`,
            replies: replies.map(r => ({
                checkId: r.checkId,
                from: r.from,
                subject: r.subject,
                hasData: Object.keys(r.responseData?.extractedInfo || {}).length > 0
            }))
        });
    } catch (error) {
        console.error('Error checking email replies:', error);
        res.status(500).json({
            error: 'Failed to check email replies',
            details: error.message
        });
    }
});

/**
 * Rebuild email-to-check mapping (DEBUG)
 * POST /api/emails/debug/rebuild-mapping
 */
router.post('/debug/rebuild-mapping', async (req, res) => {
    try {
        const { buildEmailCheckMapping } = require('../services/emailMonitorService');
        await buildEmailCheckMapping();

        res.json({
            success: true,
            message: 'Email-to-check mapping rebuilt successfully'
        });
    } catch (error) {
        console.error('Error rebuilding mapping:', error);
        res.status(500).json({
            error: 'Failed to rebuild mapping',
            details: error.message
        });
    }
});

module.exports = router;