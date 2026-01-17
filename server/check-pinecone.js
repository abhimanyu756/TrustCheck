/**
 * Check what's actually in Pinecone
 */

const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

async function checkPinecone() {
    console.log('\n🔍 Checking Pinecone Database...\n');

    try {
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });

        const indexName = process.env.PINECONE_INDEX || 'trustcheck';
        const index = pinecone.index(indexName);

        console.log(`📊 Connected to index: ${indexName}\n`);

        // Query all records
        console.log('Querying all records...\n');

        const results = await index.query({
            vector: Array(768).fill(0),
            topK: 100,
            includeMetadata: true
        });

        console.log(`Found ${results.matches.length} total records\n`);

        if (results.matches.length === 0) {
            console.log('❌ Database is EMPTY!');
            console.log('\n💡 This means:');
            console.log('   1. No verifications have been created yet, OR');
            console.log('   2. Verifications are not being saved to Pinecone');
            console.log('\n   Try uploading a document and creating a verification.');
            process.exit(0);
        }

        // Group by type
        const byType = {};
        results.matches.forEach(match => {
            const type = match.metadata?.type || 'unknown';
            byType[type] = (byType[type] || 0) + 1;
        });

        console.log('Records by type:');
        Object.entries(byType).forEach(([type, count]) => {
            console.log(`  ${type}: ${count}`);
        });

        console.log('\n📋 Sample records:\n');
        results.matches.slice(0, 5).forEach((match, i) => {
            console.log(`${i + 1}. ID: ${match.id}`);
            console.log(`   Type: ${match.metadata?.type}`);
            console.log(`   Request ID: ${match.metadata?.request_id || 'N/A'}`);
            if (match.metadata?.type === 'verification_request') {
                console.log(`   Status: ${match.metadata?.status}`);
                console.log(`   Google Sheets ID: ${match.metadata?.googleSheetsId || match.metadata?.google_sheets_id || '❌ NOT SAVED'}`);
            }
            console.log('');
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    }

    process.exit(0);
}

checkPinecone();
