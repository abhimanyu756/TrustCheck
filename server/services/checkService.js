const {
    getCheck,
    getChecksByCase,
    updateCheckStatus,
    logActivity
} = require('./database');

/**
 * Get check by ID
 */
async function getCheckById(checkId) {
    try {
        return await getCheck(checkId);
    } catch (error) {
        console.error('Error getting check:', error);
        throw error;
    }
}

/**
 * Get all checks for a case
 */
async function getChecksForCase(caseId) {
    try {
        return await getChecksByCase(caseId);
    } catch (error) {
        console.error('Error getting checks for case:', error);
        throw error;
    }
}

/**
 * Update check status and data
 */
async function updateCheck(checkId, status, data = {}) {
    try {
        await updateCheckStatus(checkId, status, data);
        return { success: true };
    } catch (error) {
        console.error('Error updating check:', error);
        throw error;
    }
}

/**
 * Execute a check (trigger AI agent)
 */
async function executeCheck(checkId) {
    try {
        const check = await getCheck(checkId);
        if (!check) {
            throw new Error('Check not found');
        }

        // Fetch case data to get employee name and client ID
        const { getCase, getClient } = require('./database');
        const caseData = await getCase(check.caseId);

        // Fetch client configuration (SKU)
        const clientConfig = await getClient(caseData?.clientId);

        // Enrich check object with employee name and client SKU configuration
        const enrichedCheck = {
            ...check,
            employeeName: caseData?.employeeName || 'Employee',
            clientConfig: clientConfig || {}
        };

        // Update status to IN_PROGRESS
        await updateCheckStatus(checkId, 'IN_PROGRESS', {
            aiAgentStatus: 'RUNNING',
            startedAt: new Date().toISOString()
        });

        // Log activity - Check started
        await logActivity('check', checkId, 'CHECK_STARTED', 'Verification check execution started');

        // Import AI agent service
        const { executeCheckAgent } = require('./aiAgentService');

        // Execute the appropriate AI agent based on check type
        const result = await executeCheckAgent(enrichedCheck);

        // Update check with results
        await updateCheckStatus(checkId, 'COMPLETED', {
            aiAgentStatus: 'COMPLETED',
            verificationData: result.verificationData,
            discrepancies: result.discrepancies,
            riskScore: result.riskScore,
            riskLevel: result.riskLevel
        });

        // Log activity - Check completed
        await logActivity(
            'check',
            checkId,
            'CHECK_COMPLETED',
            `Check completed with ${result.riskLevel} (Score: ${result.riskScore})`,
            {
                riskLevel: result.riskLevel,
                riskScore: result.riskScore,
                discrepanciesCount: result.discrepancies?.length || 0
            }
        );

        return result;
    } catch (error) {
        console.error('Error executing check:', error);

        // Update check status to FAILED
        await updateCheckStatus(checkId, 'FAILED', {
            aiAgentStatus: 'FAILED'
        });

        throw error;
    }
}

module.exports = {
    getCheckById,
    getChecksForCase,
    updateCheck,
    executeCheck
};
