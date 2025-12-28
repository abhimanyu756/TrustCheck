const express = require('express');
const router = express.Router();
const { createVerificationRequest, getRequest, chatWithHR } = require('../services/verificationService');
const { sendVerificationEmail } = require('../services/emailService');

router.post('/initiate', async (req, res) => {
    try {
        const { candidateData, hrEmail } = req.body;

        const requestId = await createVerificationRequest(candidateData);
        const link = `http://localhost:5173/verify/${requestId}`;

        await sendVerificationEmail(hrEmail, candidateData.employeeName, link);

        res.json({ success: true, requestId, message: 'Verification email sent' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to initiate verification' });
    }
});

router.post('/:id/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const { id } = req.params;

        const response = await chatWithHR(id, message);
        res.json({ response });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Chat failed' });
    }
});

router.get('/:id', async (req, res) => {
    const data = await getRequest(req.params.id);
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
});

module.exports = router;
