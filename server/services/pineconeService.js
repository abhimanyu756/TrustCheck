const { Pinecone } = require('@pinecone-database/pinecone');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize Pinecone
let pinecone = null;
let index = null;

const initPinecone = async () => {
    try {
        pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });

        // Connect to index (create if doesn't exist)
        const indexName = process.env.PINECONE_INDEX || 'trustcheck-vectors';

        try {
            index = pinecone.index(indexName);
            console.log(`✅ Connected to Pinecone index: ${indexName}`);
        } catch (error) {
            console.log(`Creating Pinecone index: ${indexName}...`);
            await pinecone.createIndex({
                name: indexName,
                dimension: 768, // Match existing Pinecone index dimension
                metric: 'cosine',
                spec: {
                    serverless: {
                        cloud: 'aws',
                        region: 'us-east-1'
                    }
                }
            });
            index = pinecone.index(indexName);
            console.log(`✅ Created Pinecone index: ${indexName}`);
        }
    } catch (error) {
        console.error('❌ Pinecone initialization error:', error);
        throw error;
    }
};

/**
 * Generate embeddings using Gemini
 * Using text-embedding-004 with 768 dimensions to match Pinecone index
 */
const generateEmbedding = async (text) => {
    try {
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent(text, {
            taskType: "RETRIEVAL_DOCUMENT",
            outputDimensionality: 768
        });
        return result.embedding.values;
    } catch (error) {
        console.error('Embedding generation error:', error);
        throw error;
    }
};

/**
 * Store document analysis in Pinecone for similarity search
 */
const storeDocumentVector = async (documentId, documentData) => {
    try {
        // Create searchable text from document
        const searchText = `
      Document Type: ${documentData.documentType}
      Employee: ${documentData.extractedData.employeeName}
      Company: ${documentData.extractedData.companyName}
      Designation: ${documentData.extractedData.designation || 'Unknown'}
      Salary: ${documentData.extractedData.salary}
      Dates: ${documentData.extractedData.dates}
      Suspicious: ${documentData.authenticityCheck.isSuspicious}
      Reason: ${documentData.authenticityCheck.reason}
    `.trim();

        // Generate embedding
        const embedding = await generateEmbedding(searchText);

        // Store in Pinecone
        await index.upsert([{
            id: `doc_${documentId}`,
            values: embedding,
            metadata: {
                type: 'document',
                documentType: documentData.documentType,
                employeeName: documentData.extractedData.employeeName,
                companyName: documentData.extractedData.companyName,
                isSuspicious: documentData.authenticityCheck.isSuspicious,
                timestamp: new Date().toISOString()
            }
        }]);

        console.log(`✅ Stored document vector: doc_${documentId}`);
    } catch (error) {
        console.error('Error storing document vector:', error);
    }
};

/**
 * Store verification case in Pinecone
 */
const storeVerificationVector = async (verificationId, verificationData) => {
    try {
        const searchText = `
      Candidate: ${verificationData.candidateData.employeeName}
      Company: ${verificationData.candidateData.companyName}
      Status: ${verificationData.status}
      Risk Level: ${verificationData.comparisonResult?.overallRisk || 'Unknown'}
      Risk Score: ${verificationData.comparisonResult?.riskScore || 'N/A'}
      Discrepancies: ${verificationData.comparisonResult?.discrepancies?.map(d => d.field).join(', ') || 'None'}
      Sentiment: ${verificationData.sentimentAnalysis?.overallSentiment || 'Unknown'}
    `.trim();

        const embedding = await generateEmbedding(searchText);

        await index.upsert([{
            id: `verify_${verificationId}`,
            values: embedding,
            metadata: {
                type: 'verification',
                candidateName: verificationData.candidateData.employeeName,
                companyName: verificationData.candidateData.companyName,
                status: verificationData.status,
                riskLevel: verificationData.comparisonResult?.overallRisk || 'PENDING',
                riskScore: verificationData.comparisonResult?.riskScore || null,
                timestamp: new Date().toISOString()
            }
        }]);

        console.log(`✅ Stored verification vector: verify_${verificationId}`);
    } catch (error) {
        console.error('Error storing verification vector:', error);
    }
};

/**
 * Find similar documents (fraud pattern detection)
 */
const findSimilarDocuments = async (documentData, topK = 5) => {
    try {
        const searchText = `
      Document Type: ${documentData.documentType}
      Employee: ${documentData.extractedData.employeeName}
      Company: ${documentData.extractedData.companyName}
      Salary: ${documentData.extractedData.salary}
    `.trim();

        const embedding = await generateEmbedding(searchText);

        const results = await index.query({
            vector: embedding,
            topK: topK,
            includeMetadata: true,
            filter: { type: 'document' }
        });

        return results.matches.map(match => ({
            id: match.id,
            score: match.score,
            metadata: match.metadata
        }));
    } catch (error) {
        console.error('Error finding similar documents:', error);
        return [];
    }
};

/**
 * Find similar verification cases
 */
const findSimilarVerifications = async (candidateData, topK = 5) => {
    try {
        const searchText = `
      Candidate: ${candidateData.employeeName}
      Company: ${candidateData.companyName}
      Designation: ${candidateData.designation || 'Unknown'}
    `.trim();

        const embedding = await generateEmbedding(searchText);

        const results = await index.query({
            vector: embedding,
            topK: topK,
            includeMetadata: true,
            filter: { type: 'verification' }
        });

        return results.matches.map(match => ({
            id: match.id,
            score: match.score,
            metadata: match.metadata
        }));
    } catch (error) {
        console.error('Error finding similar verifications:', error);
        return [];
    }
};

/**
 * Semantic search across all vectors
 */
const semanticSearch = async (query, topK = 10) => {
    try {
        const embedding = await generateEmbedding(query);

        const results = await index.query({
            vector: embedding,
            topK: topK,
            includeMetadata: true
        });

        return results.matches.map(match => ({
            id: match.id,
            score: match.score,
            type: match.metadata.type,
            metadata: match.metadata
        }));
    } catch (error) {
        console.error('Semantic search error:', error);
        return [];
    }
};

module.exports = {
    initPinecone,
    generateEmbedding,
    storeDocumentVector,
    storeVerificationVector,
    findSimilarDocuments,
    findSimilarVerifications,
    semanticSearch
};
