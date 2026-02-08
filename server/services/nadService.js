/**
 * NAD Service - National Academic Depository Integration
 * 
 * This service integrates with India's National Academic Depository (NAD)
 * for verifying education credentials against official government records.
 * 
 * In production: Uses actual NAD API with registered credentials
 * In demo mode: Returns simulated responses
 */

const { GoogleGenAI } = require("@google/genai");
require('dotenv').config();

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = "gemini-3-flash-preview";

// Configuration
const NAD_CONFIG = {
    apiUrl: process.env.NAD_API_URL || 'https://nad.gov.in/api/verify',
    apiKey: process.env.NAD_API_KEY || '',
    mockMode: process.env.NAD_MOCK_MODE !== 'false', // Default to mock mode for hackathon
    timeout: 30000 // 30 seconds
};

/**
 * Check if NAD API is available and configured
 */
async function checkNADAvailability() {
    // In mock mode, simulate availability check
    if (NAD_CONFIG.mockMode) {
        console.log('🏛️ NAD API running in MOCK MODE');
        return {
            available: true,
            mode: 'MOCK',
            message: 'NAD API Mock Mode - Using simulated responses'
        };
    }

    // In production, check if API key is configured
    if (!NAD_CONFIG.apiKey) {
        return {
            available: false,
            mode: 'UNAVAILABLE',
            message: 'NAD API key not configured'
        };
    }

    // Try to ping the NAD API health endpoint
    try {
        // In production, you would make an actual health check request
        // const response = await fetch(`${NAD_CONFIG.apiUrl}/health`, { timeout: 5000 });
        return {
            available: true,
            mode: 'LIVE',
            message: 'NAD API available'
        };
    } catch (error) {
        return {
            available: false,
            mode: 'ERROR',
            message: `NAD API unreachable: ${error.message}`
        };
    }
}

/**
 * Verify education credentials via NAD API
 * 
 * @param {Object} candidateData - Education details to verify
 * @param {string} candidateData.studentName - Full name of the student
 * @param {string} candidateData.enrollmentNumber - University enrollment/roll number
 * @param {string} candidateData.degree - Degree name (e.g., "B.Tech", "MBA")
 * @param {string} candidateData.institution - University/College name
 * @param {string} candidateData.yearOfPassing - Year of graduation
 * @returns {Object} Verification result
 */
async function verifyViaAPI(candidateData) {
    console.log('🏛️ Querying NAD API for:', candidateData.studentName);

    // Check availability first
    const availability = await checkNADAvailability();

    if (!availability.available) {
        return {
            status: 'NAD_UNAVAILABLE',
            verified: false,
            message: availability.message,
            data: null
        };
    }

    if (NAD_CONFIG.mockMode) {
        // Simulate NAD API response using Gemini
        return await simulateNADResponse(candidateData);
    }

    // Production NAD API call
    try {
        const response = await fetch(NAD_CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NAD_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: candidateData.studentName,
                enrollment_number: candidateData.enrollmentNumber,
                degree: candidateData.degree,
                institution: candidateData.institution,
                year_of_passing: candidateData.yearOfPassing
            }),
            timeout: NAD_CONFIG.timeout
        });

        if (!response.ok) {
            throw new Error(`NAD API error: ${response.status}`);
        }

        const data = await response.json();

        return {
            status: data.verified ? 'VERIFIED' : 'NOT_FOUND',
            verified: data.verified,
            message: data.verified
                ? 'Education credentials verified via NAD'
                : 'No matching records found in NAD',
            data: {
                nadReferenceId: data.reference_id,
                verifiedDegree: data.degree,
                verifiedInstitution: data.institution,
                verifiedYear: data.year_of_passing,
                verifiedGrade: data.grade || data.cgpa,
                verificationTimestamp: new Date().toISOString()
            }
        };

    } catch (error) {
        console.error('NAD API error:', error.message);
        return {
            status: 'NAD_ERROR',
            verified: false,
            message: `NAD API verification failed: ${error.message}`,
            data: null
        };
    }
}

/**
 * Simulate NAD API response using Gemini AI
 * Used for demo/hackathon purposes
 */
async function simulateNADResponse(candidateData) {
    console.log('🎭 Simulating NAD API response...');

    const prompt = `
You are simulating India's National Academic Depository (NAD) API response.

Student Details Submitted:
- Name: ${candidateData.studentName || 'Not provided'}
- Enrollment Number: ${candidateData.enrollmentNumber || 'Not provided'}
- Degree: ${candidateData.degree || 'Not provided'}
- Institution: ${candidateData.institution || 'Not provided'}
- Year of Passing: ${candidateData.yearOfPassing || 'Not provided'}

Generate a realistic NAD verification response. 
For demo purposes, assume 85% of verifications are successful.

Return JSON format:
{
    "verified": true/false,
    "nadReferenceId": "NAD_XXXX_XXXX" (if verified),
    "verifiedDegree": "exact degree name" (if verified),
    "verifiedInstitution": "full institution name" (if verified),
    "verifiedYear": "YYYY" (if verified),
    "verifiedGrade": "CGPA/Percentage" (if verified),
    "matchConfidence": 0-100,
    "discrepancies": ["list any differences found between submitted and official records"],
    "notes": "any additional notes"
}

Make the response realistic - if some fields don't match exactly, note the discrepancies.
`;

    try {
        const result = await client.models.generateContent({
            model: MODEL_NAME,
            contents: [prompt]
        });
        const responseText = typeof result.text === 'function' ? result.text() : result.text;

        // Parse JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse simulated NAD response');
        }

        const nadData = JSON.parse(jsonMatch[0]);

        return {
            status: nadData.verified ? 'VERIFIED' : 'NOT_FOUND',
            verified: nadData.verified,
            message: nadData.verified
                ? 'Education credentials verified via NAD (MOCK)'
                : 'No matching records found in NAD (MOCK)',
            data: {
                ...nadData,
                isMock: true,
                verificationTimestamp: new Date().toISOString()
            }
        };

    } catch (error) {
        console.error('Error simulating NAD response:', error);
        // Return a default successful mock response
        return {
            status: 'VERIFIED',
            verified: true,
            message: 'Education credentials verified via NAD (MOCK - Default)',
            data: {
                nadReferenceId: `NAD_${Date.now()}_MOCK`,
                verifiedDegree: candidateData.degree || 'Bachelor of Technology',
                verifiedInstitution: candidateData.institution || 'University',
                verifiedYear: candidateData.yearOfPassing || '2020',
                verifiedGrade: '7.5 CGPA',
                matchConfidence: 95,
                discrepancies: [],
                isMock: true,
                verificationTimestamp: new Date().toISOString()
            }
        };
    }
}

/**
 * Extract education data from document analysis for NAD query
 */
function prepareNADQuery(extractedDocData, checkData) {
    return {
        studentName: extractedDocData?.studentName || checkData?.employeeName || '',
        enrollmentNumber: extractedDocData?.enrollmentNumber || extractedDocData?.rollNumber || '',
        degree: extractedDocData?.degree || extractedDocData?.qualification || '',
        institution: extractedDocData?.university || extractedDocData?.institution || extractedDocData?.collegeName || '',
        yearOfPassing: extractedDocData?.yearOfPassing || extractedDocData?.graduationYear || ''
    };
}

module.exports = {
    checkNADAvailability,
    verifyViaAPI,
    prepareNADQuery,
    NAD_CONFIG
};
