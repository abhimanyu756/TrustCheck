/**
 * Debug script to check verification status and Google Sheet
 */

const { getVerificationRequest } = require('./services/database');
const { hasHRResponded, getSheetResponses } = require('./services/googleSheetsService');

async function debugVerification() {
    const requestId = process.argv[2];

    if (!requestId) {
        console.log('Usage: node debug-verification.js <requestId>');
        console.log('Example: node debug-verification.js 4noiz');
        process.exit(1);
    }

    console.log(`\n🔍 Debugging verification: ${requestId}\n`);

    try {
        // Get verification from database
        const verification = await getVerificationRequest(requestId);

        if (!verification) {
            console.log('❌ Verification not found in database');
            process.exit(1);
        }

        console.log('📋 Verification Details:');
        console.log('  Status:', verification.status);
        console.log('  Google Sheets ID:', verification.googleSheetsId);
        console.log('  Google Sheets URL:', verification.googleSheetsUrl);
        console.log('  Created:', verification.createdAt);
        console.log('  Candidate:', verification.candidateData?.employeeName);

        if (!verification.googleSheetsId) {
            console.log('\n⚠️  No Google Sheets ID found. This is not an email-based verification.');
            process.exit(0);
        }

        // Check if HR has responded
        console.log('\n🔍 Checking if HR has filled the sheet...');
        const hasResponded = await hasHRResponded(verification.googleSheetsId);
        console.log('  HR Responded:', hasResponded ? '✅ YES' : '❌ NO');

        if (hasResponded) {
            console.log('\n📊 Fetching HR responses...');
            const hrData = await getSheetResponses(verification.googleSheetsId);
            console.log('  HR Data:', JSON.stringify(hrData, null, 2));
        } else {
            console.log('\n⏳ Sheet is empty or HR has not filled it yet.');
            console.log('   Sheet URL:', verification.googleSheetsUrl);
            console.log('   Ask HR to fill the form at the above URL.');
        }

        console.log('\n💡 To manually trigger fetch and compare:');
        console.log(`   POST http://localhost:3000/api/verify/${requestId}/fetch-and-compare`);
        console.log('   OR run: node test-auto-fetch.js\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
    }

    process.exit(0);
}

debugVerification();
