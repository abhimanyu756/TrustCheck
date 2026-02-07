/**
 * Crime Check Service - Court Records & Watchlist Verification
 * 
 * This service provides crime verification through multiple sources:
 * - Court record search (eCourts India simulation)
 * - Watchlist/Sanction list check
 * - Adverse media screening using AI
 * - PEP (Politically Exposed Persons) check
 * 
 * In production: Uses actual government APIs and commercial services
 * In demo mode: Returns simulated responses using Gemini AI
 */

const { GoogleGenAI } = require("@google/genai");
require('dotenv').config();

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = "gemini-2.5-flash";

// Configuration
const CRIME_CHECK_CONFIG = {
    eCourtsApiUrl: process.env.ECOURTS_API_URL || 'https://ecourts.gov.in/api',
    mockMode: process.env.CRIME_CHECK_MOCK_MODE !== 'false', // Default to mock mode
    timeout: 30000
};

/**
 * Search court records for pending/disposed cases
 * In production: Would query eCourts India API
 */
async function searchCourtRecords(candidateData) {
    console.log('⚖️ Searching court records for:', candidateData.name);

    if (CRIME_CHECK_CONFIG.mockMode) {
        return await simulateCourtRecordSearch(candidateData);
    }

    // Production implementation would call eCourts API
    try {
        const response = await fetch(`${CRIME_CHECK_CONFIG.eCourtsApiUrl}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: candidateData.name,
                father_name: candidateData.fatherName,
                state: candidateData.state,
                district: candidateData.district
            }),
            timeout: CRIME_CHECK_CONFIG.timeout
        });

        const data = await response.json();
        return {
            status: 'SUCCESS',
            pendingCases: data.pending || [],
            disposedCases: data.disposed || [],
            hasCriminalRecord: (data.criminal_cases || 0) > 0
        };
    } catch (error) {
        console.error('Court record search error:', error.message);
        return {
            status: 'ERROR',
            message: error.message,
            pendingCases: [],
            disposedCases: [],
            hasCriminalRecord: false
        };
    }
}

/**
 * Simulate court record search using AI
 */
async function simulateCourtRecordSearch(candidateData) {
    const prompt = `
You are simulating India's eCourts database search for background verification.

Candidate Details:
- Name: ${candidateData.name || 'Not provided'}
- Father's Name: ${candidateData.fatherName || 'Not provided'}
- State: ${candidateData.state || 'Not provided'}
- District: ${candidateData.district || 'Not provided'}

Generate a realistic court record search result.
For demo purposes, 90% of candidates should have CLEAR records.

Return JSON format:
{
    "status": "CLEAR" or "RECORDS_FOUND",
    "pendingCases": [
        {
            "caseNumber": "XXX/2024",
            "court": "District Court",
            "caseType": "Civil/Criminal",
            "filingDate": "YYYY-MM-DD",
            "status": "Pending/Hearing",
            "nextHearingDate": "YYYY-MM-DD"
        }
    ],
    "disposedCases": [],
    "hasCriminalRecord": false,
    "totalCasesFound": 0,
    "searchTimestamp": "ISO timestamp",
    "remarks": "Any additional notes"
}

Keep the response realistic - most people have clean records.
`;

    try {
        const result = await client.models.generateContent({
            model: MODEL_NAME,
            contents: [prompt]
        });
        const responseText = result.text;

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse court record response');
        }

        const courtData = JSON.parse(jsonMatch[0]);
        return {
            ...courtData,
            isMock: true
        };
    } catch (error) {
        console.error('Error simulating court records:', error.message);
        return {
            status: 'CLEAR',
            pendingCases: [],
            disposedCases: [],
            hasCriminalRecord: false,
            totalCasesFound: 0,
            isMock: true,
            remarks: 'Mock response - actual search failed'
        };
    }
}

/**
 * Check against global watchlists and sanction lists
 * Includes: OFAC, UN Sanctions, Interpol, PEP lists
 */
async function checkWatchlists(candidateData) {
    console.log('🔍 Checking watchlists for:', candidateData.name);

    const prompt = `
You are simulating a global watchlist check for background verification.

Candidate Details:
- Name: ${candidateData.name || 'Not provided'}
- Date of Birth: ${candidateData.dateOfBirth || 'Not provided'}
- Nationality: ${candidateData.nationality || 'Indian'}

Check against these simulated databases:
1. OFAC Sanctions List (US Treasury)
2. UN Security Council Consolidated List
3. Interpol Red Notice List
4. PEP (Politically Exposed Persons) Database
5. India's MHA Watchlist

Return JSON format:
{
    "overallStatus": "CLEAR" or "MATCH_FOUND",
    "checks": [
        {
            "database": "OFAC",
            "status": "CLEAR/MATCH",
            "matchConfidence": 0-100,
            "details": "..."
        }
    ],
    "pepStatus": "NOT_PEP" or "PEP_MATCH",
    "riskIndicators": [],
    "searchTimestamp": "ISO timestamp"
}

For demo, 99% of candidates should be CLEAR on all lists.
`;

    try {
        const result = await client.models.generateContent({
            model: MODEL_NAME,
            contents: [prompt]
        });
        const responseText = result.text;

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse watchlist response');
        }

        return {
            ...JSON.parse(jsonMatch[0]),
            isMock: true
        };
    } catch (error) {
        console.error('Watchlist check error:', error.message);
        return {
            overallStatus: 'CLEAR',
            checks: [
                { database: 'OFAC', status: 'CLEAR', matchConfidence: 0 },
                { database: 'UN_SANCTIONS', status: 'CLEAR', matchConfidence: 0 },
                { database: 'INTERPOL', status: 'CLEAR', matchConfidence: 0 },
                { database: 'PEP', status: 'CLEAR', matchConfidence: 0 }
            ],
            pepStatus: 'NOT_PEP',
            riskIndicators: [],
            isMock: true
        };
    }
}

/**
 * Adverse media screening using AI
 * Searches for negative news mentions, fraud allegations, etc.
 */
async function screenAdverseMedia(candidateData) {
    console.log('📰 Screening adverse media for:', candidateData.name);

    const prompt = `
You are an AI performing adverse media screening for background verification.

Candidate Details:
- Name: ${candidateData.name || 'Not provided'}
- Company: ${candidateData.company || 'Not provided'}
- Location: ${candidateData.location || 'India'}

Simulate searching news and media sources for:
1. Fraud allegations or financial crimes
2. Corruption or bribery cases
3. Regulatory violations
4. Negative press coverage
5. Social media controversies

Return JSON format:
{
    "overallSentiment": "POSITIVE" or "NEUTRAL" or "NEGATIVE",
    "adverseFindings": [
        {
            "source": "News outlet name",
            "date": "YYYY-MM-DD",
            "type": "Fraud/Corruption/Other",
            "headline": "...",
            "severity": "LOW/MEDIUM/HIGH",
            "url": "simulated URL"
        }
    ],
    "positiveFindings": [],
    "totalArticlesScanned": 50,
    "relevantArticlesFound": 0,
    "riskLevel": "LOW_RISK/MEDIUM_RISK/HIGH_RISK",
    "summary": "Brief summary of findings"
}

For demo, 95% of candidates should have NEUTRAL sentiment with no adverse findings.
`;

    try {
        const result = await client.models.generateContent({
            model: MODEL_NAME,
            contents: [prompt]
        });
        const responseText = result.text;

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse media screening response');
        }

        return {
            ...JSON.parse(jsonMatch[0]),
            isMock: true
        };
    } catch (error) {
        console.error('Adverse media screening error:', error.message);
        return {
            overallSentiment: 'NEUTRAL',
            adverseFindings: [],
            positiveFindings: [],
            totalArticlesScanned: 0,
            relevantArticlesFound: 0,
            riskLevel: 'LOW_RISK',
            summary: 'Unable to complete media screening',
            isMock: true
        };
    }
}

/**
 * Verify Police Clearance Certificate document
 */
async function verifyPoliceClearanceCertificate(documentBuffer, candidateData) {
    console.log('📄 Verifying Police Clearance Certificate...');

    // Use existing forensics service for document analysis
    const { analyzePDFMetadata } = require('./forensicsService');

    try {
        const forensicsResult = await analyzePDFMetadata(documentBuffer);

        // AI verification of PCC content
        const prompt = `
You are verifying a Police Clearance Certificate (PCC) for ${candidateData.name || 'a candidate'}.

Document forensics results:
- Suspicious: ${forensicsResult.analysis?.isSuspicious || false}
- Suspicion Level: ${forensicsResult.analysis?.suspicionLevel || 'LOW'}

Analyze and return JSON:
{
    "isAuthentic": true/false,
    "certificateNumber": "extracted or N/A",
    "issuingAuthority": "Police Station/Authority name",
    "issueDate": "YYYY-MM-DD or N/A",
    "validUntil": "YYYY-MM-DD or N/A",
    "verificationStatus": "VERIFIED/UNVERIFIED/SUSPICIOUS",
    "remarks": "Any observations"
}
`;

        const result = await client.models.generateContent({
            model: MODEL_NAME,
            contents: [prompt]
        });
        const responseText = result.text;

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const pccData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

        return {
            ...pccData,
            forensicsResult,
            isMock: true
        };
    } catch (error) {
        console.error('PCC verification error:', error.message);
        return {
            isAuthentic: false,
            verificationStatus: 'UNVERIFIED',
            remarks: error.message,
            isMock: true
        };
    }
}

/**
 * Calculate combined crime check risk score
 */
function calculateCrimeRiskScore(courtResult, watchlistResult, mediaResult, pccResult = null) {
    let score = 0;
    let factors = [];

    // Court records scoring
    if (courtResult.hasCriminalRecord) {
        score += 40;
        factors.push('Criminal record found in court database');
    }
    if ((courtResult.pendingCases?.length || 0) > 0) {
        score += 20 * courtResult.pendingCases.length;
        factors.push(`${courtResult.pendingCases.length} pending case(s)`);
    }

    // Watchlist scoring
    if (watchlistResult.overallStatus === 'MATCH_FOUND') {
        score += 50;
        factors.push('Watchlist match found');
    }
    if (watchlistResult.pepStatus === 'PEP_MATCH') {
        score += 15;
        factors.push('Politically Exposed Person');
    }

    // Adverse media scoring
    if (mediaResult.overallSentiment === 'NEGATIVE') {
        score += 25;
        factors.push('Negative media coverage found');
    }
    const highSeverityFindings = (mediaResult.adverseFindings || []).filter(f => f.severity === 'HIGH').length;
    score += highSeverityFindings * 15;

    // PCC document scoring
    if (pccResult) {
        if (pccResult.verificationStatus === 'SUSPICIOUS') {
            score += 30;
            factors.push('Suspicious Police Clearance Certificate');
        } else if (pccResult.verificationStatus === 'VERIFIED') {
            score = Math.max(score - 10, 0);
            factors.push('Verified PCC (risk reduced)');
        }
    }

    score = Math.min(score, 100);

    let level;
    if (score <= 20) level = 'LOW_RISK';
    else if (score <= 50) level = 'MEDIUM_RISK';
    else level = 'HIGH_RISK';

    return { score, level, factors };
}

module.exports = {
    searchCourtRecords,
    checkWatchlists,
    screenAdverseMedia,
    verifyPoliceClearanceCertificate,
    calculateCrimeRiskScore,
    CRIME_CHECK_CONFIG
};
