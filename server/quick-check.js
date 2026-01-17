/**
 * Quick status check for a verification
 * Shows if auto-polling is detecting the filled sheet
 */

const { getVerificationRequest } = require('./services/database');
const { hasHRResponded, getSheetResponses } = require('./services/googleSheetsService');

async function quickCheck() {
    const requestId = process.argv[2] || '73yrw';

    console.log(`\n🔍 Quick Status Check: ${requestId}\n`);

    try {
        const verification = await getVerificationRequest(requestId);

        if (!verification) {
            console.log('❌ Verification not found');
            console.log('\n💡 Tip: Get request ID from dashboard URL');
            process.exit(1);
        }

        console.log('📋 Status:', verification.status);
        console.log('📊 Google Sheets ID:', verification.googleSheetsId || '❌ NOT SAVED');

        if (!verification.googleSheetsId) {
            console.log('\n⚠️  This verification was created before the fix.');
            console.log('   Create a NEW verification to test auto-fetch.');
            process.exit(0);
        }

        console.log('🔗 Sheet URL:', verification.googleSheetsUrl);
        console.log('\n🔄 Checking if HR filled the sheet...');

        const filled = await hasHRResponded(verification.googleSheetsId);

        if (filled) {
            console.log('✅ YES! HR has filled the sheet');
            console.log('\n📊 Fetching data...');
            const data = await getSheetResponses(verification.googleSheetsId);
            console.log('   Employee:', data.employeeName);
            console.log('   Company:', data.companyName);
            console.log('   Eligible for Rehire:', data.eligibleForRehire);
            console.log('   Performance:', data.performanceRating);

            if (verification.status === 'PENDING') {
                console.log('\n⏳ Status is still PENDING');
                console.log('   Run: node test-auto-fetch.js');
                console.log('   This will process the sheet immediately!');
            } else {
                console.log('\n✅ Status updated:', verification.status);
                console.log('   Auto-fetch already processed this!');
            }
        } else {
            console.log('❌ NO - Sheet is empty or HR hasn\'t filled it');
            console.log('\n💡 Next steps:');
            console.log('   1. Open:', verification.googleSheetsUrl);
            console.log('   2. Fill the form (as HR)');
            console.log('   3. Run: node test-auto-fetch.js');
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }

    process.exit(0);
}

quickCheck();
