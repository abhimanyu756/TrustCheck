const express = require('express');
const router = express.Router();
const { getAllRequests } = require('../services/verificationService');

// Get all verification requests for dashboard
router.get('/requests', async (req, res) => {
    try {
        const requests = await getAllRequests();

        // The getAllRequests function already returns formatted data
        // No need to reformat, just return it directly
        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

module.exports = router;
