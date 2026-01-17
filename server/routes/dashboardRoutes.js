const express = require('express');
const router = express.Router();
const {
    getAllClients,
    getCasesByClient,
    getChecksByCase,
    getActivityLogs
} = require('../services/database');

/**
 * Get comprehensive dashboard overview
 * GET /api/dashboard/overview
 */
router.get('/overview', async (req, res) => {
    try {
        const clients = await getAllClients();

        // Fetch all cases and checks for each client
        const dashboardData = await Promise.all(
            clients.map(async (client) => {
                const cases = await getCasesByClient(client.clientId);

                const casesWithChecks = await Promise.all(
                    cases.map(async (caseItem) => {
                        const checks = await getChecksByCase(caseItem.caseId);
                        return {
                            ...caseItem,
                            checks
                        };
                    })
                );

                return {
                    ...client,
                    cases: casesWithChecks
                };
            })
        );

        res.json({
            success: true,
            data: dashboardData
        });

    } catch (error) {
        console.error('Error fetching dashboard overview:', error);
        res.status(500).json({
            error: 'Failed to fetch dashboard overview'
        });
    }
});

/**
 * Get dashboard statistics
 * GET /api/dashboard/stats
 */
router.get('/stats', async (req, res) => {
    try {
        const clients = await getAllClients();

        let totalCases = 0;
        let totalChecks = 0;
        let greenZone = 0;
        let yellowZone = 0;
        let redZone = 0;
        let pending = 0;
        let completed = 0;

        for (const client of clients) {
            const cases = await getCasesByClient(client.clientId);
            totalCases += cases.length;

            for (const caseItem of cases) {
                const checks = await getChecksByCase(caseItem.caseId);
                totalChecks += checks.length;

                checks.forEach(check => {
                    if (check.status === 'COMPLETED') completed++;
                    else if (check.status === 'PENDING') pending++;

                    if (check.riskLevel === 'LOW_RISK') greenZone++;
                    else if (check.riskLevel === 'MEDIUM_RISK') yellowZone++;
                    else if (check.riskLevel === 'HIGH_RISK') redZone++;
                });
            }
        }

        res.json({
            success: true,
            stats: {
                totalClients: clients.length,
                totalCases,
                totalChecks,
                riskZones: {
                    green: greenZone,
                    yellow: yellowZone,
                    red: redZone
                },
                status: {
                    completed,
                    pending,
                    inProgress: totalChecks - completed - pending
                }
            }
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            error: 'Failed to fetch dashboard statistics'
        });
    }
});

module.exports = router;
