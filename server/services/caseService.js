const {
    saveCase,
    getCase,
    getCasesByClient,
    updateCaseStatus,
    getChecksByCase
} = require('./database');

/**
 * Create a new case with auto-generated checks
 */
async function createCase(clientId, employeeData, previousEmployments = []) {
    try {
        const result = await saveCase(clientId, employeeData, previousEmployments);
        return result;
    } catch (error) {
        console.error('Error creating case:', error);
        throw error;
    }
}

/**
 * Get case by ID with all checks
 */
async function getCaseById(caseId) {
    try {
        return await getCase(caseId);
    } catch (error) {
        console.error('Error getting case:', error);
        throw error;
    }
}

/**
 * Get all cases for a client
 */
async function getCasesForClient(clientId) {
    try {
        return await getCasesByClient(clientId);
    } catch (error) {
        console.error('Error getting cases for client:', error);
        throw error;
    }
}

/**
 * Update case status and calculate overall risk
 */
async function updateCase(caseId, status, overallRiskLevel = null) {
    try {
        await updateCaseStatus(caseId, status, overallRiskLevel);
        return { success: true };
    } catch (error) {
        console.error('Error updating case:', error);
        throw error;
    }
}

/**
 * Calculate overall risk for a case based on all checks
 */
async function calculateOverallRisk(caseId) {
    try {
        const checks = await getChecksByCase(caseId);

        // Check if all checks are completed
        const allCompleted = checks.every(check => check.status === 'COMPLETED');
        if (!allCompleted) {
            return { status: 'IN_PROGRESS', overallRisk: null };
        }

        // Calculate average risk score
        const riskScores = checks
            .filter(check => check.riskScore !== null)
            .map(check => check.riskScore);

        if (riskScores.length === 0) {
            return { status: 'COMPLETED', overallRisk: 'UNKNOWN' };
        }

        const avgRiskScore = riskScores.reduce((a, b) => a + b, 0) / riskScores.length;

        // Determine overall risk level
        let overallRisk;
        if (avgRiskScore >= 70) {
            overallRisk = 'HIGH_RISK';
        } else if (avgRiskScore >= 40) {
            overallRisk = 'MEDIUM_RISK';
        } else {
            overallRisk = 'LOW_RISK';
        }

        // Update case with overall risk
        await updateCaseStatus(caseId, 'COMPLETED', overallRisk);

        return {
            status: 'COMPLETED',
            overallRisk,
            avgRiskScore,
            checksCompleted: checks.length
        };
    } catch (error) {
        console.error('Error calculating overall risk:', error);
        throw error;
    }
}

module.exports = {
    createCase,
    getCaseById,
    getCasesForClient,
    updateCase,
    calculateOverallRisk
};
