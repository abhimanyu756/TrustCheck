const express = require('express');
const router = express.Router();
const {
    getCheckById,
    getChecksForCase,
    updateCheck,
    executeCheck
} = require('../services/checkService');

/**
 * GET /api/checks/:id
 * Get check by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const check = await getCheckById(req.params.id);
        if (!check) {
            return res.status(404).json({ error: 'Check not found' });
        }
        res.json(check);
    } catch (error) {
        console.error('Error getting check:', error);
        res.status(500).json({ error: 'Failed to get check' });
    }
});

/**
 * GET /api/cases/:caseId/checks
 * Get all checks for a case
 */
router.get('/case/:caseId', async (req, res) => {
    try {
        const checks = await getChecksForCase(req.params.caseId);
        res.json(checks);
    } catch (error) {
        console.error('Error getting checks:', error);
        res.status(500).json({ error: 'Failed to get checks' });
    }
});

/**
 * PUT /api/checks/:id/status
 * Update check status
 */
router.put('/:id/status', async (req, res) => {
    try {
        const { status, data } = req.body;
        await updateCheck(req.params.id, status, data);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating check:', error);
        res.status(500).json({ error: 'Failed to update check' });
    }
});

/**
 * POST /api/checks/:id/execute
 * Execute a specific check
 */
router.post('/:id/execute', async (req, res) => {
    try {
        const result = await executeCheck(req.params.id);
        res.json({
            success: true,
            checkId: req.params.id,
            result
        });
    } catch (error) {
        console.error('Error executing check:', error);
        res.status(500).json({ error: 'Failed to execute check' });
    }
});

module.exports = router;
