const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

/**
 * Script to delete and recreate Pinecone index with correct dimensions
 * Run this to fix the dimension mismatch error
 */
async function resetPineconeIndex() {
    try {
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });

        const indexName = process.env.PINECONE_INDEX || 'trustcheck';

        console.log(`🔍 Checking for existing index: ${indexName}...`);

        // List all indexes
        const indexes = await pinecone.listIndexes();
        console.log('Available indexes:', JSON.stringify(indexes, null, 2));

        const existingIndex = indexes.indexes?.find(idx => idx.name === indexName);

        if (existingIndex) {
            console.log(`\n📊 Found existing index:`);
            console.log(`   Name: ${existingIndex.name}`);
            console.log(`   Dimension: ${existingIndex.dimension}`);
            console.log(`   Metric: ${existingIndex.metric}`);

            console.log(`\n⚠️  WARNING: The index has ${existingIndex.dimension} dimensions, but we need 768.`);
            console.log(`\n🗑️  Attempting to delete index: ${indexName}...`);

            try {
                await pinecone.deleteIndex(indexName);
                console.log(`✅ Index deleted successfully`);

                // Wait for deletion to complete
                console.log('⏳ Waiting for deletion to complete (10 seconds)...');
                await new Promise(resolve => setTimeout(resolve, 10000));
            } catch (deleteError) {
                console.error('❌ Error deleting index:', deleteError.message);
                console.error('Full error:', deleteError);
                console.log('\n💡 MANUAL SOLUTION:');
                console.log('   1. Go to https://app.pinecone.io/');
                console.log(`   2. Delete the index named "${indexName}"`);
                console.log('   3. Restart your server - it will auto-create the index with correct dimensions');
                process.exit(1);
            }
        } else {
            console.log(`ℹ️  No existing index found with name: ${indexName}`);
        }

        // Create new index with correct dimensions
        console.log(`\n🔨 Creating new index with 768 dimensions...`);
        await pinecone.createIndex({
            name: indexName,
            dimension: 768, // Gemini text-embedding-004 dimension
            metric: 'cosine',
            spec: {
                serverless: {
                    cloud: 'aws',
                    region: 'us-east-1'
                }
            }
        });

        console.log(`✅ Index created successfully with 768 dimensions!`);
        console.log(`\n🎉 Your Pinecone index is now ready to use.`);
        console.log(`   You can restart your server and the dimension error should be resolved.`);

    } catch (error) {
        console.error('❌ Error resetting Pinecone index:', error.message);
        console.error('Full error:', error);

        console.log('\n💡 MANUAL SOLUTION:');
        console.log('   1. Go to https://app.pinecone.io/');
        console.log('   2. Delete the index named "trustcheck"');
        console.log('   3. Restart your server - it will auto-create the index with correct dimensions');

        process.exit(1);
    }
}

// Run the script
resetPineconeIndex();
