const { google } = require('googleapis');
const { logActivity, getChecksByCase, getAllCases } = require('./database');
require('dotenv').config();

let gmail = null;
let oauth2Client = null;

// Store mapping of email message IDs to check IDs
const emailToCheckMap = new Map();

/**
 * Initialize Gmail API for monitoring incoming emails
 */
async function initGmailMonitoring() {
    try {
        // Check if Gmail credentials are configured
        if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN) {
            console.warn('⚠️  Gmail API credentials not configured. Email monitoring disabled.');
            return null;
        }

        oauth2Client = new google.auth.OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/oauth2callback'
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });

        // Force token refresh to ensure we have a valid access token
        try {
            const { credentials } = await oauth2Client.refreshAccessToken();
            oauth2Client.setCredentials(credentials);
            console.log('✅ Gmail access token refreshed');
        } catch (refreshError) {
            console.error('❌ Failed to refresh Gmail token:', refreshError.message);
            console.log('   Please get a new refresh token from OAuth Playground');
            return null;
        }

        gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        console.log('✅ Gmail monitoring service initialized');

        // Build initial email-to-check mapping
        await buildEmailCheckMapping();

        return gmail;
    } catch (error) {
        console.error('❌ Gmail monitoring initialization error:', error.message);
        return null;
    }
}

/**
 * Build mapping between sent email message IDs and check IDs
 * This allows us to match replies back to specific checks
 */
async function buildEmailCheckMapping() {
    try {
        console.log('🗺️  Building email-to-check mapping...');

        // Get all cases and their checks
        const { getAllClients } = require('./database');
        const clients = await getAllClients();

        for (const client of clients) {
            const { getCasesByClient } = require('./database');
            const cases = await getCasesByClient(client.clientId);

            for (const caseItem of cases) {
                const checks = await getChecksByCase(caseItem.caseId);

                for (const check of checks) {
                    // Get activity logs for this check
                    const { getActivityLogs } = require('./database');
                    const logs = await getActivityLogs('check', check.checkId);

                    // Find EMAIL_SENT activities
                    const emailLogs = logs.filter(log => log.action === 'EMAIL_SENT');

                    for (const emailLog of emailLogs) {
                        const metadata = typeof emailLog.metadata === 'string'
                            ? JSON.parse(emailLog.metadata)
                            : emailLog.metadata;

                        if (metadata.messageId) {
                            emailToCheckMap.set(metadata.messageId, check.checkId);
                            console.log(`   Mapped email ${metadata.messageId} → check ${check.checkId}`);
                        }
                    }
                }
            }
        }

        console.log(`✅ Built mapping for ${emailToCheckMap.size} sent emails`);
    } catch (error) {
        console.error('Error building email-check mapping:', error);
    }
}

/**
 * Extract check ID from email using multiple methods
 */
function extractCheckId(fullMessage, emailBody) {
    // Method 1: Check References/In-Reply-To headers against our mapping
    const headers = fullMessage.data.payload.headers;
    const inReplyTo = headers.find(h => h.name === 'In-Reply-To')?.value || '';
    const references = headers.find(h => h.name === 'References')?.value || '';

    // Extract message IDs from headers
    const messageIdPattern = /<([^>]+)>/g;
    const allMessageIds = [...inReplyTo.matchAll(messageIdPattern), ...references.matchAll(messageIdPattern)]
        .map(match => match[1]);

    // Check our mapping
    for (const msgId of allMessageIds) {
        const checkId = emailToCheckMap.get(msgId);
        if (checkId) {
            console.log(`   ✅ Found checkId via message ID mapping: ${checkId}`);
            return checkId;
        }
    }

    // Method 2: Extract from subject line
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const subjectMatch = subject.match(/\[Check[:#\s]+([A-Za-z0-9_-]+)\]/i);
    if (subjectMatch) {
        console.log(`   ✅ Found checkId in subject: ${subjectMatch[1]}`);
        return subjectMatch[1];
    }

    // Method 3: Parse email body for various ID patterns
    const patterns = [
        /Check\s*ID[:#\s]+([A-Za-z0-9_-]+)/i,
        /Verification\s*ID[:#\s]+([A-Za-z0-9_-]+)/i,
        /Request\s*ID[:#\s]+([A-Za-z0-9_-]+)(?:_EMP)?/i,
        /Case\s*ID[:#\s]+([A-Za-z0-9_-]+)/i
    ];

    for (const pattern of patterns) {
        const match = emailBody.match(pattern);
        if (match) {
            let checkId = match[1];
            // Remove _EMP suffix if present
            checkId = checkId.replace(/_EMP$/, '');
            console.log(`   ✅ Found checkId in email body: ${checkId}`);
            return checkId;
        }
    }

    return null;
}

/**
 * Check for new email replies from HR
 */
async function checkForEmailReplies() {
    if (!gmail) {
        console.log('Gmail monitoring not initialized');
        return [];
    }

    try {
        console.log('📧 Checking for new HR email replies...');

        // Search for unread emails - broader search
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: 'is:unread in:inbox (subject:RE OR subject:Re OR subject:Fwd)',
            maxResults: 20
        });

        const messages = response.data.messages || [];

        if (messages.length === 0) {
            console.log('No new replies found');
            return [];
        }

        console.log(`Found ${messages.length} potential replies`);

        const processedReplies = [];

        for (const message of messages) {
            try {
                // Get full message details
                const fullMessage = await gmail.users.messages.get({
                    userId: 'me',
                    id: message.id,
                    format: 'full'
                });

                // Extract email details
                const headers = fullMessage.data.payload.headers;
                const from = headers.find(h => h.name === 'From')?.value || '';
                const subject = headers.find(h => h.name === 'Subject')?.value || '';
                const date = headers.find(h => h.name === 'Date')?.value || '';

                // Extract email body
                let emailBody = '';
                if (fullMessage.data.payload.parts) {
                    const textPart = fullMessage.data.payload.parts.find(part => part.mimeType === 'text/plain');
                    if (textPart && textPart.body.data) {
                        emailBody = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
                    }
                } else if (fullMessage.data.payload.body.data) {
                    emailBody = Buffer.from(fullMessage.data.payload.body.data, 'base64').toString('utf-8');
                }

                // Try to extract checkId using multiple methods
                const checkId = extractCheckId(fullMessage, emailBody);

                if (!checkId) {
                    console.log(`   ⚠️  Could not extract checkId from email "${subject.substring(0, 50)}..."`);
                    console.log(`   From: ${from}`);

                    // Mark as read anyway to avoid reprocessing
                    await gmail.users.messages.modify({
                        userId: 'me',
                        id: message.id,
                        requestBody: {
                            removeLabelIds: ['UNREAD']
                        }
                    });
                    continue;
                }

                console.log(`   📨 Processing reply for check ${checkId} from ${from}`);

                // Parse HR response data from email body
                const responseData = parseHREmailResponse(emailBody);

                // Log HR response activity
                await logActivity('check', checkId, 'HR_RESPONDED', `HR responded via email from ${from}`, {
                    hrEmail: from,
                    responseData: responseData,
                    verified: true,
                    emailBody: emailBody,
                    receivedAt: date,
                    messageId: message.id,
                    source: 'EMAIL_REPLY',
                    subject: subject
                });

                console.log(`   ✅ Logged HR response for check ${checkId}`);

                // Trigger automatic comparison and zone assignment
                try {
                    await processHRResponseAndCompare(checkId, responseData, from);
                } catch (compError) {
                    console.error(`   ⚠️  Comparison failed for check ${checkId}:`, compError.message);
                    // Continue processing even if comparison fails
                }

                // Mark email as read
                await gmail.users.messages.modify({
                    userId: 'me',
                    id: message.id,
                    requestBody: {
                        removeLabelIds: ['UNREAD']
                    }
                });

                processedReplies.push({
                    checkId,
                    from,
                    subject,
                    responseData,
                    messageId: message.id
                });

            } catch (error) {
                console.error(`   ❌ Error processing message ${message.id}:`, error.message);
            }
        }

        if (processedReplies.length > 0) {
            console.log(`\n✅ Processed ${processedReplies.length} HR replies successfully`);
        }

        return processedReplies;

    } catch (error) {
        console.error('Error checking for email replies:', error);
        return [];
    }
}

/**
 * Parse HR response data from email body
 */
function parseHREmailResponse(emailBody) {
    const responseData = {
        rawResponse: emailBody,
        extractedInfo: {},
        hasGoogleSheetLink: false,
        googleSheetUrl: null
    };

    // Extract only the actual reply (before the quoted original email)
    // Look for common reply separators
    const replyPatterns = [
        /On .+wrote:/i,
        /From:.+Sent:/i,
        /-----Original Message-----/i,
        /________________________________/,
        />.*$/gm  // Lines starting with > are quoted
    ];

    let actualReply = emailBody;

    // Find the first occurrence of a reply separator
    for (const pattern of replyPatterns) {
        const match = emailBody.match(pattern);
        if (match) {
            actualReply = emailBody.substring(0, match.index).trim();
            break;
        }
    }

    // Check if HR provided a Google Sheets link
    const sheetUrlPattern = /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/;
    const sheetMatch = actualReply.match(sheetUrlPattern);

    if (sheetMatch) {
        responseData.hasGoogleSheetLink = true;
        responseData.googleSheetUrl = sheetMatch[0];
        responseData.extractedInfo.responseMethod = 'GOOGLE_SHEET';
        responseData.extractedInfo.message = 'HR provided Google Sheet link for verification';
        responseData.extractedInfo.verified = false; // Will be verified when sheet is checked
        return responseData;
    }

    // If no Google Sheet link, try to parse structured data from the actual reply
    const patterns = {
        employeeName: /(?:employee\s*name|name|full\s*name)[:\s]+([^\n\r]+)/i,
        designation: /(?:designation|position|job\s*title|title|role)[:\s]+([^\n\r]+)/i,
        employmentDates: /(?:employment\s*dates?|employment\s*period|dates?|period|tenure)[:\s]+([^\n\r]+)/i,
        salary: /(?:salary|ctc|compensation|package)[:\s]+([^\n\r]+)/i,
        verified: /(?:verified|confirm|yes|correct|accurate)[:\s]*(yes|no|true|false|confirmed|accurate)/i,
        eligibleForRehire: /(?:eligible\s*for\s*rehire|rehire\s*eligible|rehire)[:\s]*(yes|no)/i,
        performanceRating: /(?:performance\s*rating?|performance|rating)[:\s]*([0-5](?:\.[0-9])?|excellent|good|average|poor)/i,
        reasonForLeaving: /(?:reason\s*for\s*leaving|exit\s*reason|resignation\s*reason|left\s*because)[:\s]+([^\n\r]+)/i
    };

    for (const [key, pattern] of Object.entries(patterns)) {
        const match = actualReply.match(pattern);
        if (match) {
            // Make sure we're not matching template text (lines starting with >)
            const matchedLine = emailBody.substring(Math.max(0, match.index - 50), match.index + match[0].length);
            if (!matchedLine.includes('>')) {
                responseData.extractedInfo[key] = match[1].trim();
            }
        }
    }

    // If we found any extracted info, mark as verified
    if (Object.keys(responseData.extractedInfo).length > 0) {
        responseData.extractedInfo.verified = true;
        responseData.extractedInfo.responseMethod = 'EMAIL_REPLY';
    } else {
        // No structured data found, just store the raw reply
        responseData.extractedInfo.message = actualReply;
        responseData.extractedInfo.responseMethod = 'EMAIL_REPLY';
        responseData.extractedInfo.verified = false;
    }

    return responseData;
}

/**
 * Start periodic monitoring of email replies
 */
function startEmailMonitoring(intervalMinutes = 5) {
    if (!gmail) {
        console.log('Gmail monitoring not initialized, skipping periodic checks');
        return null;
    }

    console.log(`🔄 Starting email monitoring (checking every ${intervalMinutes} minutes)`);

    // Check immediately on start
    checkForEmailReplies();

    // Then check periodically
    const interval = setInterval(() => {
        checkForEmailReplies();
        // Rebuild mapping periodically to catch new sent emails
        buildEmailCheckMapping();
    }, intervalMinutes * 60 * 1000);

    return interval;
}

/**
 * Manually trigger email check (for testing)
 */
async function manualEmailCheck() {
    console.log('🔍 Manual email check triggered');
    await buildEmailCheckMapping();
    return await checkForEmailReplies();
}

/**
 * Process HR response and trigger comparison
 * This orchestrates the comparison workflow after HR responds
 */
async function processHRResponseAndCompare(checkId, hrResponseData, hrEmail) {
    try {
        console.log(`\n🔄 Processing HR response for comparison: ${checkId}`);

        // Step 1: Get the check details and employee data
        const { getCheck, getClient } = require('./database');
        const check = await getCheck(checkId);

        if (!check) {
            console.error(`   ❌ Check not found: ${checkId}`);
            return;
        }

        // Step 2: Get employee data from the check
        const employeeData = {
            employeeName: check.employeeName || '',
            designation: check.designation || '',
            employmentDates: check.employmentDates || '',
            salary: check.salary || '',
            companyName: check.companyName || ''
        };

        // Step 3: Get HR data - either from email response or Google Sheet
        let hrData = {};

        if (hrResponseData.hasGoogleSheetLink && hrResponseData.googleSheetUrl) {
            console.log(`   📊 Fetching data from Google Sheet...`);
            hrData = await fetchGoogleSheetData(hrResponseData.googleSheetUrl, checkId);
        } else if (hrResponseData.extractedInfo) {
            console.log(`   📧 Using data from email response...`);
            hrData = hrResponseData.extractedInfo;
        } else {
            console.log(`   ⚠️  No structured HR data available for comparison`);
            return;
        }

        // Step 4: Get client rules
        const client = await getClient(check.clientId);
        const clientRules = {
            sku: client?.skuName || 'STANDARD',
            riskThreshold: 30 // Default threshold
        };

        // Step 5: Run comparison
        const { compareVerificationData } = require('./comparisonService');
        const comparisonResults = await compareVerificationData(
            checkId,
            employeeData,
            hrData,
            clientRules
        );

        // Step 6: Update check with comparison results and zone assignment
        await updateCheckWithComparison(checkId, comparisonResults);

        console.log(`   ✅ Comparison complete and saved for check ${checkId}`);
        console.log(`   📍 Zone: ${comparisonResults.zone}, Risk Score: ${comparisonResults.riskScore}`);

    } catch (error) {
        console.error(`Error in processHRResponseAndCompare:`, error);
        throw error;
    }
}

/**
 * Fetch data from Google Sheets
 */
async function fetchGoogleSheetData(sheetUrl, checkId) {
    try {
        // For now, we'll skip Google Sheets fetching since the function doesn't exist
        // The HR data will come from the email response instead
        console.log(`   ⚠️  Google Sheets data fetching not yet implemented`);
        return {};
    } catch (error) {
        console.error('Error fetching Google Sheet data:', error);
        return {};
    }
}

/**
 * Update check record with comparison results
 */
async function updateCheckWithComparison(checkId, comparisonResults) {
    try {
        const { updateCheckStatus, logActivity } = require('./database');

        // Update check status and zone
        await updateCheckStatus(checkId, comparisonResults.zone === 'GREEN' ? 'VERIFIED' : 'NEEDS_REVIEW', {
            zone: comparisonResults.zone,
            riskScore: comparisonResults.riskScore,
            riskLevel: comparisonResults.aiAnalysis?.riskLevel || 'MEDIUM',
            verificationData: {
                zone: comparisonResults.zone,
                comparisonResults: comparisonResults
            },
            discrepancies: comparisonResults.discrepancies
        });

        // Log the comparison activity
        await logActivity(
            'check',
            checkId,
            'COMPARISON_COMPLETED',
            `Automated comparison completed: ${comparisonResults.zone} zone, risk score ${comparisonResults.riskScore}`,
            {
                zone: comparisonResults.zone,
                riskScore: comparisonResults.riskScore,
                discrepancyCount: comparisonResults.discrepancies.length,
                summary: comparisonResults.summary
            }
        );

    } catch (error) {
        console.error('Error updating check with comparison:', error);
        throw error;
    }
}

module.exports = {
    initGmailMonitoring,
    checkForEmailReplies,
    startEmailMonitoring,
    parseHREmailResponse,
    manualEmailCheck,
    buildEmailCheckMapping,
    processHRResponseAndCompare
};