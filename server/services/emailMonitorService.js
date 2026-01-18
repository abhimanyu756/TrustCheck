const { google } = require('googleapis');
const { logActivity } = require('./database');
require('dotenv').config();

let gmail = null;
let oauth2Client = null;

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

        gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        console.log('✅ Gmail monitoring service initialized');
        return gmail;
    } catch (error) {
        console.error('❌ Gmail monitoring initialization error:', error.message);
        return null;
    }
}

/**
 * Check for new email replies from HR
 * This should be called periodically (e.g., every 5 minutes)
 */
async function checkForEmailReplies() {
    if (!gmail) {
        console.log('Gmail monitoring not initialized');
        return [];
    }

    try {
        console.log('📧 Checking for new HR email replies...');

        // Search for unread emails in inbox
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: 'is:unread in:inbox subject:(RE: Background Verification OR RE: Employment Verification)',
            maxResults: 10
        });

        const messages = response.data.messages || [];

        if (messages.length === 0) {
            console.log('No new HR replies found');
            return [];
        }

        console.log(`Found ${messages.length} potential HR replies`);

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
                const inReplyTo = headers.find(h => h.name === 'In-Reply-To')?.value || '';
                const references = headers.find(h => h.name === 'References')?.value || '';

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

                // Try to extract checkId from the original email thread
                // Look for "Verification ID:" or "Request ID:" in the email body or references
                const checkIdMatch = emailBody.match(/(?:Verification ID|Request ID|Check ID):\s*([A-Za-z0-9_-]+)/i);
                let checkId = null;

                if (checkIdMatch) {
                    checkId = checkIdMatch[1];
                    // If it's an employment request ID (ends with _EMP), extract the checkId
                    if (checkId.endsWith('_EMP')) {
                        checkId = checkId.replace('_EMP', '');
                    }
                }

                if (!checkId) {
                    console.log(`Could not extract checkId from email ${message.id}, skipping...`);
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
                    source: 'EMAIL_REPLY'
                });

                console.log(`✅ Logged HR response for check ${checkId} from ${from}`);

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
                console.error(`Error processing message ${message.id}:`, error);
            }
        }

        return processedReplies;

    } catch (error) {
        console.error('Error checking for email replies:', error);
        return [];
    }
}

/**
 * Parse HR response data from email body
 * Tries to extract structured information from the email text
 */
function parseHREmailResponse(emailBody) {
    const responseData = {
        rawResponse: emailBody,
        extractedInfo: {}
    };

    // Try to extract common verification fields
    const patterns = {
        employeeName: /(?:employee name|name):\s*([^\n]+)/i,
        designation: /(?:designation|position|title):\s*([^\n]+)/i,
        employmentDates: /(?:employment dates|dates|period):\s*([^\n]+)/i,
        salary: /(?:salary|ctc|compensation):\s*([^\n]+)/i,
        verified: /(?:verified|confirm|yes|correct):\s*(yes|no|true|false|confirmed)/i,
        eligibleForRehire: /(?:eligible for rehire|rehire):\s*(yes|no)/i,
        performanceRating: /(?:performance|rating):\s*([0-5](?:\.[0-9])?)/i
    };

    for (const [key, pattern] of Object.entries(patterns)) {
        const match = emailBody.match(pattern);
        if (match) {
            responseData.extractedInfo[key] = match[1].trim();
        }
    }

    // If we found any extracted info, mark as verified
    if (Object.keys(responseData.extractedInfo).length > 0) {
        responseData.extractedInfo.verified = true;
    }

    return responseData;
}

/**
 * Start periodic monitoring of email replies
 * Checks every 5 minutes for new replies
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
    }, intervalMinutes * 60 * 1000);

    return interval;
}

module.exports = {
    initGmailMonitoring,
    checkForEmailReplies,
    startEmailMonitoring,
    parseHREmailResponse
};
