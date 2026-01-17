const {
    saveClient,
    getClient,
    getAllClients
} = require('./database');

/**
 * Create a new client
 */
async function createClient(clientData) {
    try {
        const result = await saveClient(clientData);
        return result;
    } catch (error) {
        console.error('Error creating client:', error);
        throw error;
    }
}

/**
 * Get client by ID
 */
async function getClientById(clientId) {
    try {
        return await getClient(clientId);
    } catch (error) {
        console.error('Error getting client:', error);
        throw error;
    }
}

/**
 * Get all clients
 */
async function listAllClients() {
    try {
        return await getAllClients();
    } catch (error) {
        console.error('Error listing clients:', error);
        throw error;
    }
}

module.exports = {
    createClient,
    getClientById,
    listAllClients
};
