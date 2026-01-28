const { google } = require('googleapis');
require('dotenv').config();

let sheets = null;
let drive = null;
let oauth2Client = null;

/**
 * Initialize Google Sheets API with OAuth
 */
const initGoogleSheets = async () => {
    try {
        // Check if OAuth credentials are configured
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
            console.warn('⚠️  Google OAuth credentials not configured. Using mock mode.');
            return null;
        }

        // Create OAuth2 client
        oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            'https://developers.google.com/oauthplayground' // Redirect URI
        );

        // Set refresh token
        oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        });

        // Initialize APIs
        sheets = google.sheets({ version: 'v4', auth: oauth2Client });
        drive = google.drive({ version: 'v3', auth: oauth2Client });

        // Test the connection
        await sheets.spreadsheets.create({
            requestBody: {
                properties: { title: 'TrustCheck Test' }
            }
        }).then(async (response) => {
            // Delete the test spreadsheet
            await drive.files.delete({ fileId: response.data.spreadsheetId });
            console.log('✅ Google Sheets API initialized (OAuth)');
        });

        return sheets;
    } catch (error) {
        console.error('❌ Google Sheets initialization error:', error.message);
        if (error.message.includes('invalid_grant')) {
            console.error('   → Your refresh token has expired. Generate a new one from OAuth Playground.');
        }
        return null;
    }
};

/**
 * Create a verification sheet for HR to fill
 */
const createVerificationSheet = async (candidateData, requestId) => {
    try {
        // Mock mode if not configured
        if (!sheets) {
            console.log('📝 MOCK: Creating Google Sheet for', candidateData.employeeName);
            return {
                spreadsheetId: `mock_sheet_${requestId}`,
                spreadsheetUrl: `https://docs.google.com/spreadsheets/d/mock_${requestId}`,
                isMock: true
            };
        }

        // Create new spreadsheet
        const createResponse = await sheets.spreadsheets.create({
            requestBody: {
                properties: {
                    title: `TrustCheck Verification - ${candidateData.employeeName} - ${requestId}`,
                },
                sheets: [{
                    properties: {
                        title: 'Verification Form',
                        gridProperties: {
                            frozenRowCount: 1,
                        }
                    }
                }]
            },
        });

        const spreadsheetId = createResponse.data.spreadsheetId;
        const sheetId = createResponse.data.sheets[0].properties.sheetId; // Get actual sheet ID

        // Prepare data for the sheet with Antecedent (Question), Stated (Value), HR Verified Value, and Comments
        const values = [
            ['Antecedent (Question)', 'Stated (Value)', 'HR Verified Value', 'Comments'],
            ['Is the document authentic?', 'N/A', '', ''],
            ['Tenure', candidateData.dates || 'N/A', '', ''],
            ['Cost to Company', candidateData.salary || 'N/A', '', ''],
            ['Employee Code', 'N/A', '', ''],
            ['Reporting Manager (Designation, Email ID & Tele No.)', 'N/A', '', ''],
            ['Reason for Leaving', 'N/A', '', ''],
            ['Is the candidate/Applicant eligible for rehire?', 'N/A', '', ''],
            ['Referee\'s Details', 'N/A', '', ''],
            ['Any other comments: (Please Specify)', 'N/A', '', ''],
            ['Designation', candidateData.designation || 'N/A', '', ''],
            ['Feedback on account of Disciplinary/Ethical/Integrity conduct on the job.', 'N/A', '', ''],
            ['Mode of Response', 'N/A', '', ''],
            ['Exit Formalities', 'N/A', '', ''],
            ['Official Email id', 'N/A', '', ''],
            ['Company Name', candidateData.companyName || 'N/A', '', ''],
            ['Verification via', 'N/A', '', ''],
            ['Vendor Name', 'N/A', '', ''],
            ['Initiation Date', new Date().toISOString().split('T')[0], '', ''],
            ['Report Received Date', 'N/A', '', ''],
        ];

        // Update sheet with data
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Verification Form!A1:D20',
            valueInputOption: 'RAW',
            requestBody: { values },
        });

        // Format the sheet using the correct sheetId
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [
                    // Header row formatting
                    {
                        repeatCell: {
                            range: {
                                sheetId: sheetId,
                                startRowIndex: 0,
                                endRowIndex: 1,
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: { red: 0.4, green: 0.7, blue: 1 },
                                    textFormat: { bold: true, foregroundColor: { red: 0, green: 0, blue: 0 } },
                                    horizontalAlignment: 'CENTER'
                                }
                            },
                            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
                        }
                    },
                    // Protect Antecedent (Question) and Stated (Value) columns
                    {
                        addProtectedRange: {
                            protectedRange: {
                                range: {
                                    sheetId: sheetId,
                                    startColumnIndex: 0,
                                    endColumnIndex: 2, // Protect first two columns (A and B)
                                },
                                description: 'Questions and Employee Data are read-only',
                                warningOnly: true,
                            }
                        }
                    },
                    // Auto-resize columns
                    {
                        autoResizeDimensions: {
                            dimensions: {
                                sheetId: sheetId,
                                dimension: 'COLUMNS',
                                startIndex: 0,
                                endIndex: 4, // Resize A, B, C, D
                            }
                        }
                    }
                ]
            }
        });

        // Make sheet publicly editable (anyone with link can edit)
        await drive.permissions.create({
            fileId: spreadsheetId,
            requestBody: {
                role: 'writer',
                type: 'anyone',
            },
        });

        const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

        console.log(`✅ Created verification sheet: ${spreadsheetUrl}`);

        return {
            spreadsheetId,
            spreadsheetUrl,
            isMock: false
        };

    } catch (error) {
        console.error('Error creating verification sheet:', error.message);
        if (error.message.includes('invalid_grant')) {
            console.error('   → Your refresh token has expired. Generate a new one from OAuth Playground.');
        }
        throw error;
    }
};

const getSheetResponses = async (spreadsheetId) => {
    try {
        // Mock mode
        if (!sheets || spreadsheetId.startsWith('mock_')) {
            console.log('📝 MOCK: Reading sheet responses');
            return {
                documentAuthentic: 'Yes',
                tenure: 'April 20, 2021 To May 20, 2023',
                costToCompany: 'INR 10,90,568/-PA',
                employeeCode: 'FX0380',
                reportingManager: 'N/A',
                reasonForLeaving: 'Career Advancement',
                eligibleForRehire: 'N/A',
                refereeDetails: 'N/A',
                otherComments: 'N/A',
                designation: 'Customer Success Manager',
                disciplinaryFeedback: 'N/A',
                modeOfResponse: 'N/A',
                exitFormalities: 'N/A',
                officialEmail: 'Not Mentioned',
                companyName: 'FleetX Technologies (P) Ltd',
                verificationVia: 'N/A',
                vendorName: 'N/A',
                initiationDate: new Date().toISOString().split('T')[0],
                reportReceivedDate: 'N/A',
                isMock: true
            };
        }

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Verification Form!A1:D20',
        });

        const rows = response.data.values;
        if (!rows || rows.length < 2) {
            return null; // No data filled yet
        }

        // Parse the responses (column C contains Verified Values, D contains Comments)
        // Use column C (index 2) as the verified value. If empty, it means HR hasn't verified it yet or left it blank.
        // For 'Any other comments' (row 10), the answer is in column C.
        const hrResponses = {
            documentAuthentic: rows[1]?.[2] || '',
            tenure: rows[2]?.[2] || '',
            costToCompany: rows[3]?.[2] || '',
            employeeCode: rows[4]?.[2] || '',
            reportingManager: rows[5]?.[2] || '',
            reasonForLeaving: rows[6]?.[2] || '',
            eligibleForRehire: rows[7]?.[2] || '',
            refereeDetails: rows[8]?.[2] || '',
            otherComments: rows[9]?.[2] || '',
            designation: rows[10]?.[2] || '',
            disciplinaryFeedback: rows[11]?.[2] || '',
            modeOfResponse: rows[12]?.[2] || '',
            exitFormalities: rows[13]?.[2] || '',
            officialEmail: rows[14]?.[2] || '',
            companyName: rows[15]?.[2] || '',
            verificationVia: rows[16]?.[2] || '',
            vendorName: rows[17]?.[2] || '',
            initiationDate: rows[18]?.[2] || '',
            reportReceivedDate: rows[19]?.[2] || '',
            isMock: false
        };

        // Check if HR has filled at least some fields
        const filledFields = Object.values(hrResponses).filter(v => v && v.trim() && v !== 'N/A').length;
        if (filledFields < 3) {
            return null; // Not enough data filled
        }

        return hrResponses;

    } catch (error) {
        console.error('Error reading sheet responses:', error.message);
        throw error;
    }
};

/**
 * Check if HR has responded to the sheet
 */
const hasHRResponded = async (spreadsheetId) => {
    try {
        const responses = await getSheetResponses(spreadsheetId);
        return responses !== null;
    } catch (error) {
        console.error('Error checking HR response:', error);
        return false;
    }
};

module.exports = {
    initGoogleSheets,
    createVerificationSheet,
    getSheetResponses,
    hasHRResponded
};