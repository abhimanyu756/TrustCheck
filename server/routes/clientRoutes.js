const express = require('express');
const router = express.Router();
const { createClient, getClientById, listAllClients } = require('../services/clientService');

/**
 * POST /api/clients
 * Create a new client
 */
router.post('/', async (req, res) => {
    try {
        const clientData = req.body;
        const result = await createClient(clientData);
        res.json(result);
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ error: 'Failed to create client' });
    }
});

/**
 * GET /api/clients
 * Get all clients
 */
router.get('/', async (req, res) => {
    try {
        const clients = await listAllClients();
        res.json(clients);
    } catch (error) {
        console.error('Error getting clients:', error);
        res.status(500).json({ error: 'Failed to get clients' });
    }
});

/**
 * GET /api/clients/:id
 * Get client by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const client = await getClientById(req.params.id);
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json(client);
    } catch (error) {
        console.error('Error getting client:', error);
        res.status(500).json({ error: 'Failed to get client' });
    }
});

module.exports = router;
