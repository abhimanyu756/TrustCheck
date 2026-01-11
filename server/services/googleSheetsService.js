const { google } = require('googleapis');
require('dotenv').config();

let sheets = null;
let auth = null;

/**
 * Initialize Google Sheets API with service account
 */
const initGoogleSheets = async () => {
    try {
        // Check if credentials are configured
        if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL || !process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
            console.warn('⚠️  Google Sheets credentials not configured. Using mock mode.');
            return null;
        }

        auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive.file'
            ],
        });

        sheets = google.sheets({ version: 'v4', auth });
        console.log('✅ Google Sheets API initialized');
        return sheets;
    } catch (error) {
        console.error('❌ Google Sheets initialization error:', error.message);
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

        // Prepare data for the sheet
        const values = [
            ['Field', 'Candidate Claims', 'HR Verified Value', 'Comments'],
            ['Employee Name', candidateData.employeeName || '', '', ''],
            ['Company Name', candidateData.companyName || '', '', ''],
            ['Designation/Role', candidateData.designation || '', '', ''],
            ['Employment Dates', candidateData.dates || '', '', ''],
            ['Salary/CTC', candidateData.salary || '', '', ''],
            ['Department', candidateData.department || '', '', ''],
            ['Reason for Leaving', '', '', ''],
            ['Eligible for Rehire?', '', 'Yes/No', ''],
            ['Performance Rating', '', '1-5', ''],
            ['', '', '', ''],
            ['HR Name', '', '', ''],
            ['HR Email', '', '', ''],
            ['Verification Date', '', '', ''],
        ];

        // Update sheet with data
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Verification Form!A1:D14',
            valueInputOption: 'RAW',
            requestBody: { values },
        });

        // Format the sheet
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [
                    // Header row formatting
                    {
                        repeatCell: {
                            range: {
                                sheetId: 0,
                                startRowIndex: 0,
                                endRowIndex: 1,
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: { red: 0.2, green: 0.5, blue: 0.8 },
                                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                                }
                            },
                            fields: 'userEnteredFormat(backgroundColor,textFormat)',
                        }
                    },
                    // Protect candidate claims column
                    {
                        addProtectedRange: {
                            protectedRange: {
                                range: {
                                    sheetId: 0,
                                    startColumnIndex: 1,
                                    endColumnIndex: 2,
                                },
                                description: 'Candidate claims are read-only',
                                warningOnly: true,
                            }
                        }
                    },
                    // Auto-resize columns
                    {
                        autoResizeDimensions: {
                            dimensions: {
                                sheetId: 0,
                                dimension: 'COLUMNS',
                                startIndex: 0,
                                endIndex: 4,
                            }
                        }
                    }
                ]
            }
        });

        // Make sheet publicly editable (anyone with link can edit)
        const drive = google.drive({ version: 'v3', auth });
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
        console.error('Error creating verification sheet:', error);
        throw error;
    }
};

/**
 * Read HR responses from the sheet
 */
const getSheetResponses = async (spreadsheetId) => {
    try {
        // Mock mode
        if (!sheets || spreadsheetId.startsWith('mock_')) {
            console.log('📝 MOCK: Reading sheet responses');
            return {
                employeeName: 'John Doe',
                companyName: 'Tech Corp',
                designation: 'Senior Developer',
                dates: '2020-2023',
                salary: '₹15 LPA',
                department: 'Engineering',
                reasonForLeaving: 'Better opportunity',
                eligibleForRehire: 'Yes',
                performanceRating: '4',
                hrName: 'Jane Smith',
                hrEmail: 'jane@techcorp.com',
                verificationDate: new Date().toISOString().split('T')[0],
                isMock: true
            };
        }

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Verification Form!A1:D14',
        });

        const rows = response.data.values;
        if (!rows || rows.length < 2) {
            return null; // No data filled yet
        }

        // Parse the responses (column C contains HR verified values)
        const hrResponses = {
            employeeName: rows[1]?.[2] || '',
            companyName: rows[2]?.[2] || '',
            designation: rows[3]?.[2] || '',
            dates: rows[4]?.[2] || '',
            salary: rows[5]?.[2] || '',
            department: rows[6]?.[2] || '',
            reasonForLeaving: rows[7]?.[2] || '',
            eligibleForRehire: rows[8]?.[2] || '',
            performanceRating: rows[9]?.[2] || '',
            hrName: rows[11]?.[2] || '',
            hrEmail: rows[12]?.[2] || '',
            verificationDate: rows[13]?.[2] || '',
            isMock: false
        };

        // Check if HR has filled at least some fields
        const filledFields = Object.values(hrResponses).filter(v => v && v.trim()).length;
        if (filledFields < 3) {
            return null; // Not enough data filled
        }

        return hrResponses;

    } catch (error) {
        console.error('Error reading sheet responses:', error);
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
