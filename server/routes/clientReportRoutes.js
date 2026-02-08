const express = require('express');
const router = express.Router();
const { sendClientReportEmail } = require('../services/emailService');

/**
 * POST /api/reports/client/:clientId
 * Send verification report email to a specific client
 */
router.post('/client/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        const { getClient, getCasesByClient, getChecksByCase } = require('../services/database');

        // Get client info
        const client = await getClient(clientId);
        if (!client) {
            return res.status(404).json({ success: false, error: 'Client not found' });
        }

        // Get all cases for this client
        const cases = await getCasesByClient(clientId);

        // Collect all checks and categorize by zone
        const greenEmployees = [];
        const redEmployees = [];
        let totalChecks = 0;

        for (const caseData of cases) {
            const checks = await getChecksByCase(caseData.caseId);

            for (const check of checks) {
                totalChecks++;
                const employee = {
                    employeeName: caseData.employeeName || 'Unknown',
                    checkType: check.checkType,
                    riskScore: check.riskScore || 0,
                    status: check.status,
                    reason: check.riskLevel === 'HIGH_RISK' ? 'High risk score detected' : null
                };

                // Determine zone - use explicit zone, or infer from status/riskScore
                const zone = check.zone || '';
                const isGreen = zone === 'GREEN' ||
                    (check.status === 'COMPLETED' && (check.riskScore || 0) < 30);
                const isRed = zone === 'RED' ||
                    check.status === 'NEEDS_REVIEW' ||
                    check.status === 'FLAGGED' ||
                    (check.riskScore || 0) >= 70;

                if (isGreen && !isRed) {
                    greenEmployees.push(employee);
                } else if (isRed) {
                    redEmployees.push(employee);
                }
            }
        }

        // Send the report email
        const clientEmail = client.contactEmail || req.body.email;
        if (!clientEmail) {
            return res.status(400).json({
                success: false,
                error: 'Client email not found. Please provide email in request body.',
                greenEmployees,
                redEmployees,
                totalChecks
            });
        }

        // Generate Google Sheet first
        const { createClientReportSheet } = require('../services/googleSheetsService');
        let sheetUrl = null;
        try {
            const sheetResult = await createClientReportSheet(client.companyName, {
                greenEmployees,
                redEmployees,
                totalChecks
            });
            sheetUrl = sheetResult.spreadsheetUrl;
            console.log('✅ Generated sheet for email:', sheetUrl);
        } catch (sheetError) {
            console.error('Warning: Could not generate sheet:', sheetError.message);
            // Continue even if sheet fails - email will still be sent
        }

        const result = await sendClientReportEmail(clientEmail, client.companyName, {
            greenEmployees,
            redEmployees,
            totalChecks,
            sheetUrl
        });

        res.json({
            success: true,
            message: `Report sent to ${clientEmail}`,
            data: {
                clientName: client.companyName,
                clientEmail,
                greenCount: greenEmployees.length,
                redCount: redEmployees.length,
                totalChecks,
                sheetUrl
            },
            emailResult: result
        });

    } catch (error) {
        console.error('Error sending client report:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/reports/preview/:clientId
 * Preview report data without sending email
 */
router.post('/preview/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        const { getClient, getCasesByClient, getChecksByCase } = require('../services/database');

        const client = await getClient(clientId);
        if (!client) {
            return res.status(404).json({ success: false, error: 'Client not found' });
        }

        const cases = await getCasesByClient(clientId);

        const greenEmployees = [];
        const redEmployees = [];
        let totalChecks = 0;

        for (const caseData of cases) {
            const checks = await getChecksByCase(caseData.caseId);

            for (const check of checks) {
                totalChecks++;
                const employee = {
                    employeeName: caseData.employeeName || 'Unknown',
                    checkType: check.checkType,
                    riskScore: check.riskScore || 0,
                    status: check.status,
                    caseId: caseData.caseId,
                    checkId: check.checkId
                };

                // Determine zone - use explicit zone, or infer from status/riskScore
                const zone = check.zone || '';
                const isGreen = zone === 'GREEN' ||
                    (check.status === 'COMPLETED' && (check.riskScore || 0) < 30);
                const isRed = zone === 'RED' ||
                    check.status === 'NEEDS_REVIEW' ||
                    check.status === 'FLAGGED' ||
                    (check.riskScore || 0) >= 70;

                if (isGreen && !isRed) {
                    greenEmployees.push(employee);
                } else if (isRed) {
                    redEmployees.push(employee);
                }
            }
        }

        res.json({
            success: true,
            preview: {
                clientName: client.companyName,
                clientEmail: client.contactEmail,
                greenEmployees,
                redEmployees,
                greenCount: greenEmployees.length,
                redCount: redEmployees.length,
                totalChecks
            }
        });

    } catch (error) {
        console.error('Error generating report preview:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/reports/sheet/:clientId
 * Generate a Google Sheet report for a specific client
 */
router.post('/sheet/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        const { getClient, getCasesByClient, getChecksByCase } = require('../services/database');
        const { createClientReportSheet } = require('../services/googleSheetsService');

        const client = await getClient(clientId);
        if (!client) {
            return res.status(404).json({ success: false, error: 'Client not found' });
        }

        const cases = await getCasesByClient(clientId);

        const greenEmployees = [];
        const redEmployees = [];
        let totalChecks = 0;

        for (const caseData of cases) {
            const checks = await getChecksByCase(caseData.caseId);

            for (const check of checks) {
                totalChecks++;
                const employee = {
                    employeeName: caseData.employeeName || 'Unknown',
                    checkType: check.checkType,
                    riskScore: check.riskScore || 0,
                    status: check.status,
                    caseId: caseData.caseId,
                    checkId: check.checkId,
                    companyName: check.companyName || '',
                    designation: caseData.positionApplied || ''
                };

                // Determine zone
                const zone = check.zone || '';
                const isGreen = zone === 'GREEN' ||
                    (check.status === 'COMPLETED' && (check.riskScore || 0) < 30);
                const isRed = zone === 'RED' ||
                    check.status === 'NEEDS_REVIEW' ||
                    check.status === 'FLAGGED' ||
                    (check.riskScore || 0) >= 70;

                if (isGreen && !isRed) {
                    greenEmployees.push(employee);
                } else if (isRed) {
                    employee.reason = check.riskLevel === 'HIGH_RISK' ? 'High risk score detected' : 'Needs manual review';
                    redEmployees.push(employee);
                }
            }
        }

        // Create Google Sheet report
        const sheetResult = await createClientReportSheet(client.companyName, {
            greenEmployees,
            redEmployees,
            totalChecks,
            cases
        });

        res.json({
            success: true,
            message: 'Google Sheet report generated successfully',
            data: {
                clientName: client.companyName,
                spreadsheetId: sheetResult.spreadsheetId,
                spreadsheetUrl: sheetResult.spreadsheetUrl,
                isMock: sheetResult.isMock,
                greenCount: greenEmployees.length,
                redCount: redEmployees.length,
                totalChecks
            }
        });

    } catch (error) {
        console.error('Error generating Google Sheet report:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
