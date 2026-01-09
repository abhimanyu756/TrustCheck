const express = require('express');
const router = express.Router();
const { getAllRequests } = require('../services/verificationService');

// Get all verification requests for dashboard
router.get('/requests', async (req, res) => {
    try {
        const requests = await getAllRequests();

        // Format for dashboard display
        const formatted = requests.map(r => ({
            id: r.id,
            candidateName: r.candidateData.employeeName,
            company: r.candidateData.companyName,
            status: r.status,
            createdAt: r.createdAt,
            riskLevel: r.comparisonResult?.overallRisk || 'PENDING',
            riskScore: r.comparisonResult?.riskScore || null,
            hasDiscrepancies: r.comparisonResult?.discrepancies?.length > 0
        }));

        res.json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

module.exports = router;
