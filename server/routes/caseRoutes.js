const express = require('express');
const router = express.Router();
const {
    createCase,
    getCaseById,
    getCasesForClient,
    updateCase,
    calculateOverallRisk
} = require('../services/caseService');
const { executeCheck } = require('../services/checkService');
const { getChecksByCase } = require('../services/database');

/**
 * POST /api/cases
 * Create a new case with auto-generated checks
 */
router.post('/', async (req, res) => {
    try {
        const { clientId, employeeData, previousEmployments } = req.body;
        const result = await createCase(clientId, employeeData, previousEmployments);
        res.json(result);
    } catch (error) {
        console.error('Error creating case:', error);
        res.status(500).json({ error: 'Failed to create case' });
    }
});

/**
 * GET /api/cases/:id
 * Get case by ID with all checks
 */
router.get('/:id', async (req, res) => {
    try {
        const caseData = await getCaseById(req.params.id);
        if (!caseData) {
            return res.status(404).json({ error: 'Case not found' });
        }
        res.json(caseData);
    } catch (error) {
        console.error('Error getting case:', error);
        res.status(500).json({ error: 'Failed to get case' });
    }
});

/**
 * GET /api/clients/:clientId/cases
 * Get all cases for a client
 */
router.get('/client/:clientId', async (req, res) => {
    try {
        const cases = await getCasesForClient(req.params.clientId);
        res.json(cases);
    } catch (error) {
        console.error('Error getting cases:', error);
        res.status(500).json({ error: 'Failed to get cases' });
    }
});

/**
 * PUT /api/cases/:id
 * Update case status
 */
router.put('/:id', async (req, res) => {
    try {
        const { status, overallRiskLevel } = req.body;
        await updateCase(req.params.id, status, overallRiskLevel);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating case:', error);
        res.status(500).json({ error: 'Failed to update case' });
    }
});

/**
 * POST /api/cases/:id/execute
 * Execute all checks for a case
 */
router.post('/:id/execute', async (req, res) => {
    try {
        const caseId = req.params.id;
        const checks = await getChecksByCase(caseId);

        // Execute all checks
        const results = [];
        for (const check of checks) {
            try {
                const result = await executeCheck(check.checkId);
                results.push({ checkId: check.checkId, success: true, result });
            } catch (error) {
                results.push({ checkId: check.checkId, success: false, error: error.message });
            }
        }

        // Calculate overall risk
        const riskResult = await calculateOverallRisk(caseId);

        res.json({
            success: true,
            checksExecuted: results.length,
            results,
            overallRisk: riskResult
        });
    } catch (error) {
        console.error('Error executing case checks:', error);
        res.status(500).json({ error: 'Failed to execute case checks' });
    }
});

module.exports = router;
