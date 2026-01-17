const express = require('express');
const router = express.Router();
const { getActivityLogs, getAllActivityLogs } = require('../services/database');

/**
 * Get activity logs for a specific entity (case or check)
 * GET /api/activity-logs/:entityType/:entityId
 */
router.get('/:entityType/:entityId', async (req, res) => {
    try {
        const { entityType, entityId } = req.params;

        if (!['case', 'check'].includes(entityType)) {
            return res.status(400).json({ error: 'Invalid entity type. Must be "case" or "check"' });
        }

        const logs = await getActivityLogs(entityType, entityId);

        res.json({
            success: true,
            logs
        });

    } catch (error) {
        console.error('Error fetching activity logs:', error);
        res.status(500).json({
            error: 'Failed to fetch activity logs'
        });
    }
});

/**
 * Get all recent activity logs
 * GET /api/activity-logs/all?limit=100
 */
router.get('/all', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const logs = await getAllActivityLogs(limit);

        res.json({
            success: true,
            logs
        });

    } catch (error) {
        console.error('Error fetching all activity logs:', error);
        res.status(500).json({
            error: 'Failed to fetch activity logs'
        });
    }
});

module.exports = router;
