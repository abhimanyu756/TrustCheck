/**
 * List all verifications and check which ones have Google Sheets IDs
 */

const { getAllVerificationRequests } = require('./services/database');

async function listAll() {
    console.log('\n📋 All Verifications:\n');

    try {
        const requests = await getAllVerificationRequests();

        if (requests.length === 0) {
            console.log('No verifications found');
            process.exit(0);
        }

        console.log(`Found ${requests.length} verification(s):\n`);

        requests.forEach((req, index) => {
            console.log(`${index + 1}. ID: ${req.id}`);
            console.log(`   Status: ${req.status}`);
            console.log(`   Candidate: ${req.candidateData?.employeeName || 'N/A'}`);
            console.log(`   Created: ${req.createdAt}`);
            console.log(`   Google Sheets ID: ${req.googleSheetsId || '❌ NOT SAVED'}`);
            console.log(`   Google Sheets URL: ${req.googleSheetsUrl || '❌ NOT SAVED'}`);
            console.log(`   HR Email: ${req.hrEmail || 'N/A'}`);
            console.log(`   Verification Type: ${req.verificationType || 'N/A'}`);
            console.log('');
        });

        const withSheets = requests.filter(r => r.googleSheetsId);
        const withoutSheets = requests.filter(r => !r.googleSheetsId);

        console.log(`\n✅ With Google Sheets ID: ${withSheets.length}`);
        console.log(`❌ Without Google Sheets ID: ${withoutSheets.length}`);

        if (withoutSheets.length > 0) {
            console.log('\n⚠️  Verifications without Google Sheets ID:');
            withoutSheets.forEach(r => {
                console.log(`   - ${r.id} (${r.candidateData?.employeeName})`);
            });
            console.log('\n   These were created before the fix or the metadata wasn\'t saved.');
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
    }

    process.exit(0);
}

listAll();
