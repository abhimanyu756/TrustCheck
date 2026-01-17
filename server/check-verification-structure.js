/**
 * Check verification request metadata structure
 */

const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

async function checkVerificationStructure() {
    console.log('\n🔍 Checking Verification Request Structure...\n');

    try {
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });

        const indexName = process.env.PINECONE_INDEX || 'trustcheck';
        const index = pinecone.index(indexName);

        // Query verification requests
        const results = await index.query({
            vector: Array(768).fill(0),
            topK: 100,
            includeMetadata: true,
            filter: {
                type: 'verification_request'
            }
        });

        console.log(`Found ${results.matches.length} verification requests\n`);

        if (results.matches.length === 0) {
            console.log('❌ No verification requests found with type filter!');
            console.log('\nTrying without filter...\n');

            const allResults = await index.query({
                vector: Array(768).fill(0),
                topK: 100,
                includeMetadata: true
            });

            const verifications = allResults.matches.filter(m =>
                m.id.startsWith('verification_')
            );

            console.log(`Found ${verifications.length} records with ID starting with 'verification_'\n`);

            if (verifications.length > 0) {
                console.log('Sample verification metadata:');
                console.log(JSON.stringify(verifications[0].metadata, null, 2));
            }

            process.exit(0);
        }

        console.log('✅ Verification requests found!\n');

        results.matches.slice(0, 3).forEach((match, i) => {
            console.log(`${i + 1}. ID: ${match.id}`);
            console.log('   Metadata:');
            console.log(`   - request_id: ${match.metadata.request_id}`);
            console.log(`   - status: ${match.metadata.status}`);
            console.log(`   - googleSheetsId: ${match.metadata.googleSheetsId || match.metadata.google_sheets_id || '❌ NOT FOUND'}`);
            console.log(`   - googleSheetsUrl: ${match.metadata.googleSheetsUrl || match.metadata.google_sheets_url || '❌ NOT FOUND'}`);
            console.log(`   - hrEmail: ${match.metadata.hrEmail || match.metadata.hr_email || '❌ NOT FOUND'}`);
            console.log(`   - verificationType: ${match.metadata.verificationType || match.metadata.verification_type || '❌ NOT FOUND'}`);
            console.log(`   - created_at: ${match.metadata.created_at}`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    process.exit(0);
}

checkVerificationStructure();
