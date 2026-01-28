const express = require('express');
const router = express.Router();
const { getAllChecks, getCheck, getCase, updateCheckStatus, logActivity, getClient } = require('../services/database');

/**
 * Zone Management Routes
 * Handles Green Zone (approved) and Red Zone (needs review) checks
 */

/**
 * GET /api/zones/green
 * Get all checks in Green Zone (approved)
 */
router.get('/green', async (req, res) => {
    try {
        const allChecks = await getAllChecks();

        // Filter for Green Zone checks
        const greenZoneChecks = allChecks.filter(check =>
            check.zone === 'GREEN' || check.status === 'VERIFIED'
        );

        // Enrich with case and client information
        const enrichedChecks = await Promise.all(
            greenZoneChecks.map(async (check) => {
                // Fetch case data for employee name
                const caseData = await getCase(check.caseId);
                // Fetch client data using clientId from case
                const clientId = caseData?.clientId || check.clientId;
                const client = clientId ? await getClient(clientId) : null;

                return {
                    ...check,
                    employeeName: caseData?.employeeName || check.verificationData?.employeeName || 'Unknown',
                    clientId: clientId || 'Unknown',
                    clientName: client?.companyName || 'Unknown',
                    clientSKU: client?.skuName || 'STANDARD'
                };
            })
        );

        res.json({
            success: true,
            count: enrichedChecks.length,
            checks: enrichedChecks
        });
    } catch (error) {
        console.error('Error fetching Green Zone checks:', error);
        res.status(500).json({ error: 'Failed to fetch Green Zone checks' });
    }
});

/**
 * GET /api/zones/red
 * Get all checks in Red Zone (needs manual review)
 */
router.get('/red', async (req, res) => {
    try {
        const allChecks = await getAllChecks();

        // Filter for Red Zone checks
        const redZoneChecks = allChecks.filter(check =>
            check.zone === 'RED' || check.status === 'NEEDS_REVIEW'
        );

        // Sort by risk score (highest first)
        redZoneChecks.sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));

        // Enrich with case and client information
        const enrichedChecks = await Promise.all(
            redZoneChecks.map(async (check) => {
                // Fetch case data for employee name
                const caseData = await getCase(check.caseId);
                // Fetch client data using clientId from case
                const clientId = caseData?.clientId || check.clientId;
                const client = clientId ? await getClient(clientId) : null;

                return {
                    ...check,
                    employeeName: caseData?.employeeName || check.verificationData?.employeeName || 'Unknown',
                    clientId: clientId || 'Unknown',
                    clientName: client?.companyName || 'Unknown',
                    clientSKU: client?.skuName || 'STANDARD',
                    priority: check.riskScore > 70 ? 'HIGH' : check.riskScore > 40 ? 'MEDIUM' : 'LOW'
                };
            })
        );

        res.json({
            success: true,
            count: enrichedChecks.length,
            checks: enrichedChecks
        });
    } catch (error) {
        console.error('Error fetching Red Zone checks:', error);
        res.status(500).json({ error: 'Failed to fetch Red Zone checks' });
    }
});

/**
 * GET /api/zones/comparison/:checkId
 * Get detailed comparison results for a specific check
 */
router.get('/comparison/:checkId', async (req, res) => {
    try {
        const { checkId } = req.params;
        const check = await getCheck(checkId);

        if (!check) {
            return res.status(404).json({ error: 'Check not found' });
        }

        const client = await getClient(check.clientId);

        res.json({
            success: true,
            check: {
                ...check,
                clientName: client?.companyName || 'Unknown',
                clientSKU: client?.skuName || 'STANDARD'
            },
            comparisonResults: check.verificationData?.comparisonResults || null
        });
    } catch (error) {
        console.error('Error fetching comparison details:', error);
        res.status(500).json({ error: 'Failed to fetch comparison details' });
    }
});

/**
 * POST /api/zones/review/:checkId
 * Supervisor manual review and override
 */
router.post('/review/:checkId', async (req, res) => {
    try {
        const { checkId } = req.params;
        const { decision, notes, reviewedBy } = req.body;

        if (!decision || !['APPROVED', 'REJECTED'].includes(decision)) {
            return res.status(400).json({ error: 'Invalid decision. Must be APPROVED or REJECTED' });
        }

        const check = await getCheck(checkId);
        if (!check) {
            return res.status(404).json({ error: 'Check not found' });
        }

        // Update check with supervisor review
        const supervisorReview = {
            reviewedBy: reviewedBy || 'Supervisor',
            reviewedAt: new Date().toISOString(),
            decision,
            notes: notes || '',
            previousZone: check.zone,
            previousStatus: check.status
        };

        const newZone = decision === 'APPROVED' ? 'GREEN' : 'RED';
        const newStatus = decision === 'APPROVED' ? 'VERIFIED' : 'REJECTED';

        await updateCheckStatus(checkId, newStatus, {
            zone: newZone,
            verificationData: {
                ...check.verificationData,
                supervisorReview
            }
        });

        // Log the review activity
        await logActivity(
            'check',
            checkId,
            'SUPERVISOR_REVIEW',
            `Supervisor ${decision.toLowerCase()} the check`,
            {
                decision,
                notes,
                reviewedBy: reviewedBy || 'Supervisor',
                previousZone: check.zone,
                newZone
            }
        );

        res.json({
            success: true,
            message: `Check ${decision.toLowerCase()} successfully`,
            check: {
                checkId,
                zone: newZone,
                status: newStatus,
                supervisorReview
            }
        });
    } catch (error) {
        console.error('Error processing supervisor review:', error);
        res.status(500).json({ error: 'Failed to process review' });
    }
});

/**
 * GET /api/zones/stats
 * Get zone statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const allChecks = await getAllChecks();

        const stats = {
            total: allChecks.length,
            greenZone: allChecks.filter(c => c.zone === 'GREEN').length,
            redZone: allChecks.filter(c => c.zone === 'RED').length,
            pending: allChecks.filter(c => !c.zone || c.zone === 'PENDING').length,
            verified: allChecks.filter(c => c.status === 'VERIFIED').length,
            needsReview: allChecks.filter(c => c.status === 'NEEDS_REVIEW').length,
            averageRiskScore: allChecks.reduce((sum, c) => sum + (c.riskScore || 0), 0) / allChecks.length || 0,
            highRisk: allChecks.filter(c => (c.riskScore || 0) > 70).length,
            mediumRisk: allChecks.filter(c => (c.riskScore || 0) > 40 && (c.riskScore || 0) <= 70).length,
            lowRisk: allChecks.filter(c => (c.riskScore || 0) <= 40).length
        };

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Error fetching zone stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

/**
 * POST /api/zones/reassign/:checkId
 * Manually reassign a check to a different zone
 */
router.post('/reassign/:checkId', async (req, res) => {
    try {
        const { checkId } = req.params;
        const { newZone, reason, assignedBy } = req.body;

        if (!newZone || !['GREEN', 'RED'].includes(newZone)) {
            return res.status(400).json({ error: 'Invalid zone. Must be GREEN or RED' });
        }

        const check = await getCheck(checkId);
        if (!check) {
            return res.status(404).json({ error: 'Check not found' });
        }

        const previousZone = check.zone;
        const newStatus = newZone === 'GREEN' ? 'VERIFIED' : 'NEEDS_REVIEW';

        await updateCheckStatus(checkId, newStatus, {
            zone: newZone
        });

        // Log the reassignment
        await logActivity(
            'check',
            checkId,
            'ZONE_REASSIGNED',
            `Check reassigned from ${previousZone} to ${newZone} zone`,
            {
                previousZone,
                newZone,
                reason: reason || 'Manual reassignment',
                assignedBy: assignedBy || 'System'
            }
        );

        res.json({
            success: true,
            message: `Check reassigned to ${newZone} zone`,
            check: {
                checkId,
                previousZone,
                newZone,
                status: newStatus
            }
        });
    } catch (error) {
        console.error('Error reassigning check:', error);
        res.status(500).json({ error: 'Failed to reassign check' });
    }
});

module.exports = router;
