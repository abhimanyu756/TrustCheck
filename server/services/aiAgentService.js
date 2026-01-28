const { GoogleGenAI } = require("@google/genai");
require('dotenv').config();

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = "gemini-2.5-flash";

/**
 * Main function to execute check based on type
 */
async function executeCheckAgent(check) {
    try {
        console.log(`🤖 Executing ${check.checkType} check for ${check.checkId}`);

        switch (check.checkType) {
            case 'EDUCATION':
                return await executeEducationCheck(check);
            case 'CRIME':
                return await executeCrimeCheck(check);
            case 'EMPLOYMENT':
                return await executeEmploymentCheck(check);
            default:
                throw new Error(`Unknown check type: ${check.checkType}`);
        }
    } catch (error) {
        console.error('Error in AI agent execution:', error);
        throw error;
    }
}

/**
 * Education Check Agent
 * Simulates government education portal verification
 */
async function executeEducationCheck(check) {
    try {
        console.log('📚 Running Education Check Agent...');

        // Simulate education verification
        // In production, this would call actual government education portal APIs

        const prompt = `
You are an AI agent verifying education credentials.

Task: Simulate a government education portal verification.

Generate a realistic verification result with:
1. Verified education details (degree, institution, year, marks/grade)
2. Any discrepancies found (if any)
3. Risk assessment (LOW_RISK, MEDIUM_RISK, HIGH_RISK)
4. Risk score (0-100)

Return JSON format:
{
  "verificationData": {
    "degree": "...",
    "institution": "...",
    "year": "...",
    "grade": "...",
    "verified": true/false
  },
  "discrepancies": ["list of discrepancies if any"],
  "riskScore": 0-100,
  "riskLevel": "LOW_RISK/MEDIUM_RISK/HIGH_RISK",
  "notes": "Additional notes"
}

For this simulation, assume the education is verified with LOW_RISK (score: 15).
`;

        const result = await client.models.generateContent({
            model: MODEL_NAME,
            contents: [prompt]
        });
        const responseText = result.text;

        // Parse JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse AI response');
        }

        const parsedResult = JSON.parse(jsonMatch[0]);

        console.log('✅ Education check completed:', parsedResult.riskLevel);
        return parsedResult;

    } catch (error) {
        console.error('Error in education check:', error);
        throw error;
    }
}

/**
 * Crime Check Agent
 * Simulates government crime database lookup
 */
async function executeCrimeCheck(check) {
    try {
        console.log('🔍 Running Crime Check Agent...');

        // Simulate crime database verification
        // In production, this would call actual government crime database APIs

        const prompt = `
You are an AI agent verifying criminal records.

Task: Simulate a government crime database lookup.

Generate a realistic verification result with:
1. Criminal record status (CLEAR, RECORDS_FOUND)
2. Any records found (if any)
3. Risk assessment (LOW_RISK, MEDIUM_RISK, HIGH_RISK)
4. Risk score (0-100)

Return JSON format:
{
  "verificationData": {
    "recordStatus": "CLEAR/RECORDS_FOUND",
    "recordsFound": [],
    "verified": true
  },
  "discrepancies": [],
  "riskScore": 0-100,
  "riskLevel": "LOW_RISK/MEDIUM_RISK/HIGH_RISK",
  "notes": "Additional notes"
}

For this simulation, assume no criminal records found with LOW_RISK (score: 5).
`;

        const result = await client.models.generateContent({
            model: MODEL_NAME,
            contents: [prompt]
        });
        const responseText = result.text;

        // Parse JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse AI response');
        }

        const parsedResult = JSON.parse(jsonMatch[0]);

        console.log('✅ Crime check completed:', parsedResult.riskLevel);
        return parsedResult;

    } catch (error) {
        console.error('Error in crime check:', error);
        throw error;
    }
}

/**
 * Employment Check Agent
 * Uses existing HR outreach system with email and Google Sheets
 */
async function executeEmploymentCheck(check) {
    try {
        console.log(`💼 Running Employment Check Agent for ${check.companyName}...`);

        // Import existing services
        const { createVerificationSheet, getSheetResponses, hasHRResponded } = require('./googleSheetsService');
        const { sendVerificationEmail } = require('./emailService');
        const { compareVerificationData } = require('./comparisonService');
        const { getDocumentsByCheck } = require('./database');

        // Fetch documents and check for extracted data
        const documents = await getDocumentsByCheck(check.checkId);
        let extractedData = {};

        // Merge data from all documents (later uploads overwrite earlier ones)
        if (documents && documents.length > 0) {
            console.log(`📄 Found ${documents.length} documents for this check.`);
            documents.forEach(doc => {
                if (doc.extractedData) { // Note: getDocumentsByCheck needs to ensure this field is returned from metadata
                    try {
                        const data = typeof doc.extractedData === 'string' ? JSON.parse(doc.extractedData) : doc.extractedData;
                        extractedData = { ...extractedData, ...data };
                    } catch (e) { console.error('Error parsing extracted data', e); }
                }
            });
        }

        if (Object.keys(extractedData).length > 0) {
            console.log('✨ Using extracted document data for verification request');
        }

        // Prepare candidate data for this specific employment
        const candidateData = {
            employeeName: extractedData.employeeName || check.employeeName || 'Employee',
            companyName: extractedData.companyName || check.companyName,
            designation: extractedData.designation || check.designation,
            employmentDates: extractedData.employmentDates || check.employmentDates,
            salary: extractedData.salary || check.salary || '', // Add salary if extracted
            hrEmail: check.hrEmail // HR email usually comes from the check request itself, not the document
        };

        // Create unique request ID for this employment check
        const employmentRequestId = `${check.checkId}_EMP`;

        try {
            // Step 1: Create Google Sheet for HR verification
            console.log('📊 Creating Google Sheet for HR verification...');
            const sheetData = await createVerificationSheet(candidateData, employmentRequestId);
            console.log('✅ Sheet created:', sheetData.spreadsheetUrl);

            // Step 2: Send verification email to HR
            if (check.hrEmail) {
                console.log('📧 Sending verification email to:', check.hrEmail);
                await sendVerificationEmail(
                    check.hrEmail,
                    candidateData.employeeName,
                    sheetData.spreadsheetUrl,
                    employmentRequestId,
                    check.checkId  // Pass checkId for activity logging
                );
                console.log('✅ Email sent successfully');
            }

            // Step 3: Check if HR has already responded (for testing/demo)
            // In production, this would be polled or triggered by webhook
            const hrResponded = await hasHRResponded(sheetData.spreadsheetId);

            if (hrResponded) {
                // HR has responded - fetch and compare data
                const hrResponses = await getSheetResponses(sheetData.spreadsheetId);
                const comparisonResult = await compareVerificationData(check.checkId, candidateData, hrResponses, null);

                // Log HR response activity
                const { logActivity } = require('./database');
                await logActivity('check', check.checkId, 'HR_RESPONDED', `HR responded to verification request for ${check.companyName}`, {
                    hrEmail: check.hrEmail,
                    responseData: hrResponses,
                    verified: true,
                    googleSheetsUrl: sheetData.spreadsheetUrl
                });

                return {
                    verificationData: {
                        companyName: check.companyName,
                        designation: check.designation,
                        employmentDates: check.employmentDates,
                        verified: true,
                        hrResponse: hrResponses,
                        googleSheetsUrl: sheetData.spreadsheetUrl,
                        method: 'EMAIL_VERIFICATION'
                    },
                    discrepancies: comparisonResult.discrepancies || [],
                    riskScore: comparisonResult.riskScore || 20,
                    riskLevel: comparisonResult.overallRisk || 'LOW_RISK',
                    notes: `Email sent to ${check.hrEmail}. ${hrResponded ? 'HR has responded.' : 'Awaiting HR response.'}`
                };
            } else {
                // HR hasn't responded yet - return pending status
                return {
                    verificationData: {
                        companyName: check.companyName,
                        designation: check.designation,
                        employmentDates: check.employmentDates,
                        verified: false,
                        googleSheetsUrl: sheetData.spreadsheetUrl,
                        hrEmail: check.hrEmail,
                        status: 'PENDING_HR_RESPONSE',
                        method: 'EMAIL_VERIFICATION'
                    },
                    discrepancies: [],
                    riskScore: 0,
                    riskLevel: 'PENDING',
                    notes: `Verification email sent to ${check.hrEmail}. Awaiting HR response via Google Sheets.`
                };
            }

        } catch (emailError) {
            console.error('Email verification failed, falling back to simulated check:', emailError);

            // Fallback to simulated verification if email system fails
            const prompt = `
You are an AI agent verifying previous employment.

Company: ${check.companyName || 'Unknown'}
Employment Dates: ${check.employmentDates || 'Not provided'}
Designation: ${check.designation || 'Not provided'}

Task: Simulate HR verification response.

Generate a realistic verification result with:
1. Employment verification details
2. Any discrepancies found
3. Risk assessment
4. Risk score (0-100)

Return JSON format:
{
  "verificationData": {
    "companyName": "...",
    "designation": "...",
    "employmentDates": "...",
    "verified": true/false,
    "hrResponse": "...",
    "method": "SIMULATED"
  },
  "discrepancies": ["list of discrepancies if any"],
  "riskScore": 0-100,
  "riskLevel": "LOW_RISK/MEDIUM_RISK/HIGH_RISK",
  "notes": "Additional notes"
}

For this simulation, assume employment is verified with LOW_RISK (score: 20).
`;

            const result = await client.models.generateContent({
                model: MODEL_NAME,
                contents: [prompt]
            });
            const responseText = result.text;

            // Parse JSON response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Failed to parse AI response');
            }

            const parsedResult = JSON.parse(jsonMatch[0]);
            parsedResult.notes = `${parsedResult.notes} (Email system unavailable - simulated check)`;

            console.log('✅ Employment check completed (simulated):', parsedResult.riskLevel);
            return parsedResult;
        }

    } catch (error) {
        console.error('Error in employment check:', error);
        throw error;
    }
}

module.exports = {
    executeCheckAgent,
    executeEducationCheck,
    executeCrimeCheck,
    executeEmploymentCheck
};
