const { GoogleGenAI } = require("@google/genai");
require('dotenv').config();

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = "gemini-3-flash-preview";

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
 * Education Check Agent - THREE-TIER VERIFICATION
 * 
 * Tier 1: Document Analysis (AI-powered extraction + forensics)
 * Tier 2: NAD API Verification (National Academic Depository)
 * Tier 3: University Email Outreach (Fallback)
 */
async function executeEducationCheck(check) {
    try {
        console.log('📚 Running Education Check Agent (Three-Tier System)...');
        console.log(`   Check ID: ${check.checkId}`);

        // Import required services
        const { analyzePDFMetadata } = require('./forensicsService');
        const { verifyViaAPI, prepareNADQuery, checkNADAvailability } = require('./nadService');
        const { getDocumentsByCheck, getCase, logActivity } = require('./database');

        // Get case info for employee name
        const caseData = await getCase(check.caseId);
        const employeeName = caseData?.employeeName || 'Unknown';

        // Initialize result object
        let verificationResult = {
            tier1: null,
            tier2: null,
            tier3: null,
            currentTier: 1,
            verificationData: {},
            discrepancies: [],
            riskScore: 0,
            riskLevel: 'PENDING',
            notes: ''
        };

        // ═══════════════════════════════════════════════════════════════
        // TIER 1: DOCUMENT ANALYSIS
        // ═══════════════════════════════════════════════════════════════
        console.log('\n📄 TIER 1: Document Analysis...');

        const documents = await getDocumentsByCheck(check.checkId);
        let extractedData = {};
        let forensicsResults = [];

        if (documents && documents.length > 0) {
            console.log(`   Found ${documents.length} document(s) for education check`);

            for (const doc of documents) {
                // Analyze each document
                if (doc.extractedData) {
                    try {
                        const data = typeof doc.extractedData === 'string'
                            ? JSON.parse(doc.extractedData)
                            : doc.extractedData;
                        extractedData = { ...extractedData, ...data };
                    } catch (e) {
                        console.error('   Error parsing extracted data:', e.message);
                    }
                }

                // Run PDF forensics if we have file data
                if (doc.fileData) {
                    try {
                        const fileBuffer = Buffer.from(doc.fileData, 'base64');
                        const forensicResult = await analyzePDFMetadata(fileBuffer);
                        forensicsResults.push({
                            documentId: doc.documentId,
                            documentType: doc.documentType,
                            ...forensicResult
                        });
                    } catch (e) {
                        console.error('   Forensics error for document:', e.message);
                    }
                }
            }

            // AI-powered education data extraction if not already extracted
            if (Object.keys(extractedData).length === 0) {
                extractedData = await extractEducationDataWithAI(documents);
            }

            verificationResult.tier1 = {
                status: 'COMPLETED',
                documentsAnalyzed: documents.length,
                extractedData,
                forensicsResults,
                suspiciousDocuments: forensicsResults.filter(f => f.analysis?.isSuspicious).length
            };

            // Calculate Tier 1 risk
            const tier1Risk = calculateDocumentRisk(extractedData, forensicsResults);
            verificationResult.riskScore = tier1Risk.score;

            console.log(`   ✅ Tier 1 Complete - Extracted: ${Object.keys(extractedData).length} fields`);
            console.log(`   📊 Document Risk Score: ${tier1Risk.score}`);

        } else {
            console.log('   ⚠️ No documents uploaded for education check');
            verificationResult.tier1 = {
                status: 'NO_DOCUMENTS',
                documentsAnalyzed: 0,
                extractedData: {},
                forensicsResults: []
            };

            // Use AI to generate placeholder data for demo
            extractedData = await generateDemoEducationData(employeeName);
            verificationResult.tier1.extractedData = extractedData;
        }

        // Log Tier 1 activity
        await logActivity('check', check.checkId, 'TIER1_COMPLETE',
            `Tier 1 Document Analysis completed. Analyzed ${documents?.length || 0} documents.`,
            verificationResult.tier1
        );

        // ═══════════════════════════════════════════════════════════════
        // TIER 2: NAD API VERIFICATION
        // ═══════════════════════════════════════════════════════════════
        console.log('\n🏛️ TIER 2: NAD API Verification...');
        verificationResult.currentTier = 2;

        const nadAvailability = await checkNADAvailability();

        if (nadAvailability.available) {
            // Prepare query from extracted data
            const nadQuery = prepareNADQuery(extractedData, { employeeName });
            console.log('   Querying NAD with:', nadQuery);

            const nadResult = await verifyViaAPI(nadQuery);

            verificationResult.tier2 = {
                status: nadResult.status,
                verified: nadResult.verified,
                apiMode: nadAvailability.mode,
                data: nadResult.data,
                message: nadResult.message
            };

            if (nadResult.verified) {
                console.log('   ✅ NAD Verification SUCCESSFUL');

                // Cross-reference NAD data with document data
                const crossRefResult = crossReferenceData(extractedData, nadResult.data);
                verificationResult.discrepancies = crossRefResult.discrepancies;

                // Calculate risk based on NAD + documents
                const nadRisk = calculateFinalRisk(
                    verificationResult.tier1,
                    verificationResult.tier2,
                    crossRefResult
                );

                verificationResult.riskScore = nadRisk.score;
                verificationResult.riskLevel = nadRisk.level;
                verificationResult.notes = `Education verified via NAD (${nadAvailability.mode}). ${crossRefResult.discrepancies.length} discrepancies found.`;

                // Log Tier 2 success
                await logActivity('check', check.checkId, 'TIER2_VERIFIED',
                    `NAD verification successful. Mode: ${nadAvailability.mode}`,
                    verificationResult.tier2
                );

                // ALWAYS proceed to Tier 3 for university email confirmation
                // (Don't return early - continue to Tier 3 below)

            } else {
                console.log('   ⚠️ NAD Verification: No matching records');
                verificationResult.tier2.status = 'NOT_FOUND';

                // Log and proceed to Tier 3
                await logActivity('check', check.checkId, 'TIER2_NOT_FOUND',
                    'NAD verification found no matching records. Proceeding to Tier 3.',
                    verificationResult.tier2
                );
            }
        } else {
            console.log('   ⚠️ NAD API unavailable:', nadAvailability.message);
            verificationResult.tier2 = {
                status: 'NAD_UNAVAILABLE',
                verified: false,
                message: nadAvailability.message
            };

            await logActivity('check', check.checkId, 'TIER2_UNAVAILABLE',
                `NAD API unavailable: ${nadAvailability.message}. Proceeding to Tier 3.`,
                verificationResult.tier2
            );
        }

        // ═══════════════════════════════════════════════════════════════
        // TIER 3: UNIVERSITY EMAIL OUTREACH
        // ═══════════════════════════════════════════════════════════════
        console.log('\n📧 TIER 3: University Email Outreach...');
        verificationResult.currentTier = 3;

        // Get registrar email from check data or extracted data
        const registrarEmail = check.registrarEmail || extractedData.universityEmail || null;

        if (registrarEmail) {
            const outreachResult = await initiateUniversityOutreach(
                check,
                extractedData,
                employeeName,
                registrarEmail
            );

            verificationResult.tier3 = outreachResult;
            verificationResult.notes = `University verification email sent to ${registrarEmail}. Awaiting response.`;
            verificationResult.riskLevel = 'PENDING';

            return buildFinalResult(verificationResult, extractedData, 'PENDING_UNIVERSITY_RESPONSE');

        } else {
            console.log('   ⚠️ No registrar email available for Tier 3');

            verificationResult.tier3 = {
                status: 'NO_REGISTRAR_EMAIL',
                message: 'University registrar email not provided'
            };

            // Calculate risk based on available data only
            const documentOnlyRisk = calculateDocumentOnlyRisk(verificationResult.tier1);
            verificationResult.riskScore = documentOnlyRisk.score;
            verificationResult.riskLevel = documentOnlyRisk.level;
            verificationResult.notes = 'Education verification based on document analysis only. NAD unavailable, no registrar email for manual verification.';

            await logActivity('check', check.checkId, 'VERIFICATION_PARTIAL',
                'Education check completed with document analysis only. NAD unavailable, no registrar email.',
                verificationResult
            );

            return buildFinalResult(verificationResult, extractedData, 'DOCUMENT_ONLY');
        }

    } catch (error) {
        console.error('❌ Error in education check:', error);
        throw error;
    }
}

/**
 * Extract education data from documents using AI
 */
async function extractEducationDataWithAI(documents) {
    const prompt = `
Extract education details from these document descriptions:
${documents.map(d => `- ${d.documentType}: ${d.fileName}`).join('\n')}

Return JSON with:
{
    "studentName": "",
    "enrollmentNumber": "",
    "degree": "",
    "specialization": "",
    "institution": "",
    "university": "",
    "yearOfPassing": "",
    "grade": "",
    "percentage": ""
}
`;

    try {
        const result = await client.models.generateContent({
            model: MODEL_NAME,
            contents: [prompt]
        });
        const responseText = typeof result.text === 'function' ? result.text() : result.text;

        // Clean the response - remove markdown code blocks if present
        let cleanText = responseText
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/g, '')
            .trim();

        // Try to find and parse valid JSON object
        const jsonStart = cleanText.indexOf('{');
        const jsonEnd = cleanText.lastIndexOf('}');

        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            const jsonStr = cleanText.substring(jsonStart, jsonEnd + 1);
            try {
                return JSON.parse(jsonStr);
            } catch (parseErr) {
                console.error('JSON parse failed, trying fallback:', parseErr.message);
                console.error('Raw response:', responseText.substring(0, 500));
                // Return empty object instead of throwing
                return {};
            }
        }

        return {};
    } catch (e) {
        console.error('AI extraction error:', e.message);
        // Return empty object instead of throwing to allow check to continue
        return {};
    }
}

/**
 * Generate demo education data when no documents available
 */
async function generateDemoEducationData(employeeName) {
    const prompt = `
Generate realistic education details for a job candidate named "${employeeName}".

Return JSON:
{
    "studentName": "${employeeName}",
    "enrollmentNumber": "XX/XXX/XXXX",
    "degree": "B.Tech/MBA/etc",
    "specialization": "field of study",
    "institution": "college name",
    "university": "university name", 
    "yearOfPassing": "20XX",
    "grade": "X.X CGPA",
    "percentage": "XX%"
}
`;

    try {
        const result = await client.models.generateContent({
            model: MODEL_NAME,
            contents: [prompt]
        });
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : { studentName: employeeName };
    } catch (e) {
        return { studentName: employeeName };
    }
}

/**
 * Calculate risk score from document analysis
 */
function calculateDocumentRisk(extractedData, forensicsResults) {
    let score = 10; // Base low risk
    let factors = [];

    // Check for suspicious documents
    const suspiciousCount = forensicsResults.filter(f => f.analysis?.isSuspicious).length;
    if (suspiciousCount > 0) {
        score += suspiciousCount * 25;
        factors.push(`${suspiciousCount} suspicious document(s) detected`);
    }

    // Check for missing critical fields
    const criticalFields = ['degree', 'institution', 'yearOfPassing'];
    const missingFields = criticalFields.filter(f => !extractedData[f]);
    if (missingFields.length > 0) {
        score += missingFields.length * 10;
        factors.push(`Missing fields: ${missingFields.join(', ')}`);
    }

    return {
        score: Math.min(score, 100),
        factors
    };
}

/**
 * Cross-reference extracted data with NAD verified data
 */
function crossReferenceData(extractedData, nadData) {
    const discrepancies = [];

    // Compare key fields
    if (nadData.verifiedDegree && extractedData.degree) {
        if (!nadData.verifiedDegree.toLowerCase().includes(extractedData.degree.toLowerCase())) {
            discrepancies.push({
                field: 'degree',
                submitted: extractedData.degree,
                verified: nadData.verifiedDegree,
                severity: 'MEDIUM'
            });
        }
    }

    if (nadData.verifiedYear && extractedData.yearOfPassing) {
        if (nadData.verifiedYear !== extractedData.yearOfPassing) {
            discrepancies.push({
                field: 'yearOfPassing',
                submitted: extractedData.yearOfPassing,
                verified: nadData.verifiedYear,
                severity: 'HIGH'
            });
        }
    }

    if (nadData.verifiedInstitution && extractedData.institution) {
        if (!nadData.verifiedInstitution.toLowerCase().includes(extractedData.institution.toLowerCase().substring(0, 10))) {
            discrepancies.push({
                field: 'institution',
                submitted: extractedData.institution,
                verified: nadData.verifiedInstitution,
                severity: 'HIGH'
            });
        }
    }

    return { discrepancies };
}

/**
 * Calculate final risk score combining all tiers
 */
function calculateFinalRisk(tier1Result, tier2Result, crossRefResult) {
    let score = 0;

    // Tier 1 base score
    const suspiciousCount = tier1Result.forensicsResults?.filter(f => f.analysis?.isSuspicious).length || 0;
    score += suspiciousCount * 20;

    // Tier 2 verification bonus/penalty
    if (tier2Result.verified) {
        score = Math.max(score - 10, 0); // Reduce risk if NAD verified
    } else {
        score += 15; // Increase if not verifiable
    }

    // Discrepancy penalties
    score += crossRefResult.discrepancies.filter(d => d.severity === 'HIGH').length * 20;
    score += crossRefResult.discrepancies.filter(d => d.severity === 'MEDIUM').length * 10;

    score = Math.min(score, 100);

    let level;
    if (score <= 30) level = 'LOW_RISK';
    else if (score <= 60) level = 'MEDIUM_RISK';
    else level = 'HIGH_RISK';

    return { score, level };
}

/**
 * Calculate risk when only document analysis is available
 */
function calculateDocumentOnlyRisk(tier1Result) {
    let score = 30; // Higher base since no external verification

    const suspiciousCount = tier1Result.forensicsResults?.filter(f => f.analysis?.isSuspicious).length || 0;
    score += suspiciousCount * 25;

    if (tier1Result.status === 'NO_DOCUMENTS') {
        score = 50; // Medium risk if no documents
    }

    score = Math.min(score, 100);

    let level;
    if (score <= 30) level = 'LOW_RISK';
    else if (score <= 60) level = 'MEDIUM_RISK';
    else level = 'HIGH_RISK';

    return { score, level };
}

/**
 * Initiate university email outreach (Tier 3)
 */
async function initiateUniversityOutreach(check, extractedData, employeeName, registrarEmail) {
    console.log(`   📧 Sending verification request to: ${registrarEmail}`);

    const { createEducationVerificationSheet } = require('./googleSheetsService');
    const { sendEducationVerificationEmail } = require('./emailService');
    const { logActivity } = require('./database');

    try {
        // Create Google Sheet for university registrar
        const studentData = {
            studentName: employeeName,
            enrollmentNumber: extractedData.enrollmentNumber || '',
            degree: extractedData.degree || '',
            specialization: extractedData.specialization || '',
            institution: extractedData.institution || '',
            university: extractedData.university || '',
            yearOfPassing: extractedData.yearOfPassing || ''
        };

        const requestId = `${check.checkId}_EDU`;
        const sheetData = await createEducationVerificationSheet(studentData, requestId);
        console.log('   ✅ Education verification sheet created:', sheetData.spreadsheetUrl);

        // Send email to registrar
        await sendEducationVerificationEmail(
            registrarEmail,
            studentData.studentName,
            sheetData.spreadsheetUrl,
            requestId,
            check.checkId
        );
        console.log('   ✅ Verification email sent to registrar');

        await logActivity('check', check.checkId, 'TIER3_EMAIL_SENT',
            `University verification email sent to ${registrarEmail}`,
            { registrarEmail, sheetUrl: sheetData.spreadsheetUrl }
        );

        return {
            status: 'EMAIL_SENT',
            registrarEmail,
            googleSheetsUrl: sheetData.spreadsheetUrl,
            spreadsheetId: sheetData.spreadsheetId,
            requestId,
            sentAt: new Date().toISOString()
        };

    } catch (error) {
        console.error('   ❌ University outreach failed:', error.message);

        return {
            status: 'OUTREACH_FAILED',
            error: error.message
        };
    }
}

/**
 * Build the final result object
 */
function buildFinalResult(verificationResult, extractedData, status) {
    return {
        verificationData: {
            degree: extractedData.degree || '',
            institution: extractedData.institution || extractedData.university || '',
            year: extractedData.yearOfPassing || '',
            grade: extractedData.grade || extractedData.percentage || '',
            verified: status === 'NAD_VERIFIED',
            verificationMethod: status,
            tiers: {
                tier1: verificationResult.tier1,
                tier2: verificationResult.tier2,
                tier3: verificationResult.tier3
            }
        },
        discrepancies: verificationResult.discrepancies || [],
        riskScore: verificationResult.riskScore,
        riskLevel: verificationResult.riskLevel,
        notes: verificationResult.notes
    };
}


/**
 * Crime Check Agent - THREE-TIER VERIFICATION
 * 
 * Tier 1: Database Checks (Court records, Watchlists, Adverse media)
 * Tier 2: Document Verification (Police Clearance Certificate)
 * Tier 3: Police Station Outreach (Physical verification request)
 */
async function executeCrimeCheck(check) {
    try {
        console.log('🔍 Running Crime Check Agent (Three-Tier System)...');
        console.log(`   Check ID: ${check.checkId}`);

        // Import required services
        const {
            searchCourtRecords,
            checkWatchlists,
            screenAdverseMedia,
            verifyPoliceClearanceCertificate,
            calculateCrimeRiskScore
        } = require('./crimeCheckService');
        const { getDocumentsByCheck, getCase, logActivity } = require('./database');

        // Get case info for candidate details
        const caseData = await getCase(check.caseId);
        const candidateData = {
            name: caseData?.employeeName || 'Unknown',
            fatherName: caseData?.fatherName || '',
            dateOfBirth: caseData?.dateOfBirth || '',
            state: caseData?.state || 'Maharashtra',
            district: caseData?.district || 'Mumbai',
            nationality: 'Indian'
        };

        // Initialize result object
        let verificationResult = {
            tier1: null,
            tier2: null,
            tier3: null,
            currentTier: 1,
            verificationData: {},
            discrepancies: [],
            riskScore: 0,
            riskLevel: 'PENDING',
            notes: ''
        };

        // ═══════════════════════════════════════════════════════════════
        // TIER 1: DATABASE CHECKS
        // ═══════════════════════════════════════════════════════════════
        console.log('\n⚖️ TIER 1: Database Checks...');

        // 1a. Court Record Search
        console.log('   📋 Searching court records...');
        const courtResult = await searchCourtRecords(candidateData);
        console.log(`   ✅ Court search: ${courtResult.status}`);

        // 1b. Watchlist/Sanctions Check
        console.log('   🔍 Checking watchlists...');
        const watchlistResult = await checkWatchlists(candidateData);
        console.log(`   ✅ Watchlist check: ${watchlistResult.overallStatus}`);

        // 1c. Adverse Media Screening
        console.log('   📰 Screening adverse media...');
        const mediaResult = await screenAdverseMedia(candidateData);
        console.log(`   ✅ Media screening: ${mediaResult.overallSentiment}`);

        verificationResult.tier1 = {
            status: 'COMPLETED',
            courtRecords: courtResult,
            watchlistCheck: watchlistResult,
            adverseMedia: mediaResult,
            timestamp: new Date().toISOString()
        };

        // Log Tier 1 activity
        await logActivity('check', check.checkId, 'TIER1_COMPLETE',
            `Tier 1 Database Checks completed. Court: ${courtResult.status}, Watchlist: ${watchlistResult.overallStatus}, Media: ${mediaResult.overallSentiment}`,
            verificationResult.tier1
        );

        // Check if Tier 1 found any critical issues
        const tier1HasIssues = courtResult.hasCriminalRecord ||
            watchlistResult.overallStatus === 'MATCH_FOUND' ||
            mediaResult.overallSentiment === 'NEGATIVE';

        if (tier1HasIssues) {
            console.log('   ⚠️ Tier 1 found potential issues - proceeding to Tier 2 for document verification');
        }

        // ═══════════════════════════════════════════════════════════════
        // TIER 2: DOCUMENT VERIFICATION
        // ═══════════════════════════════════════════════════════════════
        console.log('\n📄 TIER 2: Document Verification...');
        verificationResult.currentTier = 2;

        const documents = await getDocumentsByCheck(check.checkId);
        let pccResult = null;

        if (documents && documents.length > 0) {
            console.log(`   Found ${documents.length} document(s) for crime check`);

            // Look for Police Clearance Certificate
            const pccDoc = documents.find(d =>
                d.documentType?.toLowerCase().includes('police') ||
                d.documentType?.toLowerCase().includes('pcc') ||
                d.fileName?.toLowerCase().includes('police') ||
                d.fileName?.toLowerCase().includes('clearance')
            );

            if (pccDoc && pccDoc.fileData) {
                console.log('   🔍 Found Police Clearance Certificate - verifying...');
                const fileBuffer = Buffer.from(pccDoc.fileData, 'base64');
                pccResult = await verifyPoliceClearanceCertificate(fileBuffer, candidateData);
                console.log(`   ✅ PCC Verification: ${pccResult.verificationStatus}`);
            } else {
                console.log('   ⚠️ No Police Clearance Certificate found in documents');
            }

            verificationResult.tier2 = {
                status: 'COMPLETED',
                documentsChecked: documents.length,
                pccVerification: pccResult,
                timestamp: new Date().toISOString()
            };

            await logActivity('check', check.checkId, 'TIER2_COMPLETE',
                `Tier 2 Document Verification completed. PCC: ${pccResult?.verificationStatus || 'Not Found'}`,
                verificationResult.tier2
            );

        } else {
            console.log('   ⚠️ No documents uploaded for crime check');
            verificationResult.tier2 = {
                status: 'NO_DOCUMENTS',
                documentsChecked: 0,
                pccVerification: null
            };
        }

        // Calculate risk score from Tier 1 & 2
        const riskCalculation = calculateCrimeRiskScore(
            courtResult,
            watchlistResult,
            mediaResult,
            pccResult
        );

        verificationResult.riskScore = riskCalculation.score;
        verificationResult.riskLevel = riskCalculation.level;

        console.log(`   📊 Current Risk Score: ${riskCalculation.score} (${riskCalculation.level})`);

        // Determine if Tier 3 is needed
        const needsTier3 = riskCalculation.score > 30 ||
            tier1HasIssues ||
            (pccResult && pccResult.verificationStatus === 'SUSPICIOUS');

        // ═══════════════════════════════════════════════════════════════
        // TIER 3: POLICE STATION OUTREACH (if needed)
        // ═══════════════════════════════════════════════════════════════
        if (needsTier3 && check.policeStationEmail) {
            console.log('\n🚔 TIER 3: Police Station Outreach...');
            verificationResult.currentTier = 3;

            const outreachResult = await initiatePoliceOutreach(
                check,
                candidateData,
                verificationResult.tier1
            );

            verificationResult.tier3 = outreachResult;
            verificationResult.notes = `Police verification requested. Risk factors: ${riskCalculation.factors.join(', ')}`;

            if (outreachResult.status === 'EMAIL_SENT') {
                verificationResult.riskLevel = 'PENDING_POLICE_VERIFICATION';
                return buildCrimeCheckResult(verificationResult, 'PENDING_POLICE_RESPONSE');
            }
        } else if (needsTier3) {
            console.log('\n⚠️ TIER 3: Skipped - No police station email configured');
            verificationResult.tier3 = {
                status: 'SKIPPED',
                reason: 'No police station email provided'
            };
            verificationResult.notes = `Verification based on Tier 1 & 2. Risk factors: ${riskCalculation.factors.join(', ')}`;
        } else {
            console.log('\n✅ Tier 3 not required - low risk profile');
            verificationResult.tier3 = {
                status: 'NOT_REQUIRED',
                reason: 'Low risk - database checks sufficient'
            };
            verificationResult.notes = 'Criminal background check cleared via database verification.';
        }

        // Final logging
        await logActivity('check', check.checkId, 'CRIME_CHECK_COMPLETE',
            `Crime check completed. Risk: ${riskCalculation.level} (${riskCalculation.score})`,
            {
                riskScore: riskCalculation.score,
                riskLevel: riskCalculation.level,
                factors: riskCalculation.factors
            }
        );

        console.log(`\n✅ Crime check completed: ${verificationResult.riskLevel}`);
        return buildCrimeCheckResult(verificationResult, 'COMPLETED');

    } catch (error) {
        console.error('❌ Error in crime check:', error);
        throw error;
    }
}

/**
 * Initiate police station outreach (Tier 3)
 */
async function initiatePoliceOutreach(check, candidateData, tier1Results) {
    console.log(`   📧 Sending verification request to police station...`);

    const { createPoliceVerificationSheet } = require('./googleSheetsService');
    const { sendPoliceVerificationEmail } = require('./emailService');
    const { logActivity } = require('./database');

    try {
        const requestId = `${check.checkId}_CRM`;
        const sheetData = await createPoliceVerificationSheet({
            candidateName: candidateData.name,
            fatherName: candidateData.fatherName,
            dateOfBirth: candidateData.dateOfBirth,
            address: candidateData.address || '',
            courtRecordsFound: tier1Results.courtRecords?.hasCriminalRecord || false,
            pendingCases: tier1Results.courtRecords?.pendingCases?.length || 0
        }, requestId);

        console.log('   ✅ Police verification sheet created:', sheetData.spreadsheetUrl);

        await sendPoliceVerificationEmail(
            check.policeStationEmail,
            candidateData.name,
            sheetData.spreadsheetUrl,
            requestId,
            check.checkId
        );
        console.log('   ✅ Verification email sent to police station');

        await logActivity('check', check.checkId, 'TIER3_EMAIL_SENT',
            `Police verification email sent`,
            { policeEmail: check.policeStationEmail, sheetUrl: sheetData.spreadsheetUrl }
        );

        return {
            status: 'EMAIL_SENT',
            policeStationEmail: check.policeStationEmail,
            googleSheetsUrl: sheetData.spreadsheetUrl,
            spreadsheetId: sheetData.spreadsheetId,
            requestId,
            sentAt: new Date().toISOString()
        };

    } catch (error) {
        console.error('   ❌ Police outreach failed:', error.message);
        return {
            status: 'OUTREACH_FAILED',
            error: error.message
        };
    }
}

/**
 * Build the final crime check result object
 */
function buildCrimeCheckResult(verificationResult, status) {
    return {
        verificationData: {
            recordStatus: verificationResult.tier1?.courtRecords?.status || 'UNKNOWN',
            hasCriminalRecord: verificationResult.tier1?.courtRecords?.hasCriminalRecord || false,
            pendingCases: verificationResult.tier1?.courtRecords?.pendingCases || [],
            watchlistStatus: verificationResult.tier1?.watchlistCheck?.overallStatus || 'UNKNOWN',
            mediaScreening: verificationResult.tier1?.adverseMedia?.overallSentiment || 'UNKNOWN',
            pccStatus: verificationResult.tier2?.pccVerification?.verificationStatus || 'NOT_CHECKED',
            verified: status === 'COMPLETED' && verificationResult.riskLevel === 'LOW_RISK',
            verificationMethod: status,
            tiers: {
                tier1: verificationResult.tier1,
                tier2: verificationResult.tier2,
                tier3: verificationResult.tier3
            }
        },
        discrepancies: verificationResult.discrepancies || [],
        riskScore: verificationResult.riskScore,
        riskLevel: verificationResult.riskLevel,
        notes: verificationResult.notes
    };
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
