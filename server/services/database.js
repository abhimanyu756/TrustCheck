const { Pinecone } = require('@pinecone-database/pinecone');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize Pinecone
let pinecone = null;
let index = null;

// Initialize Pinecone database
const initDB = async () => {
  try {
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const indexName = process.env.PINECONE_INDEX || 'trustcheck';

    try {
      index = pinecone.index(indexName);
      console.log(`✅ Connected to Pinecone index: ${indexName}`);
    } catch (error) {
      console.log(`Creating Pinecone index: ${indexName}...`);
      await pinecone.createIndex({
        name: indexName,
        dimension: 768, // Gemini embedding dimension
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

    console.log('✅ Pinecone database initialized successfully');
  } catch (error) {
    console.error('❌ Pinecone initialization error:', error);
    throw error;
  }
};

/**
 * Generate embeddings using Gemini
 */
const generateEmbedding = async (text) => {
  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Embedding generation error:', error);
    throw error;
  }
};

// Helper functions
const saveVerificationRequest = async (id, candidateData) => {
  try {
    const timestamp = new Date().toISOString();

    // Create searchable text for embedding
    const searchText = `
      Verification Request
      Employee: ${candidateData.employeeName}
      Company: ${candidateData.companyName}
      Designation: ${candidateData.designation || 'Unknown'}
      Email: ${candidateData.hrEmail}
    `.trim();

    const embedding = await generateEmbedding(searchText);

    // Store in Pinecone with metadata
    await index.upsert([{
      id: `verification_${id}`,
      values: embedding,
      metadata: {
        type: 'verification_request',
        request_id: id,
        candidate_data: JSON.stringify(candidateData),
        status: 'PENDING',
        created_at: timestamp,
        updated_at: timestamp
      }
    }]);

    return {
      id,
      candidate_data: candidateData,
      status: 'PENDING',
      created_at: timestamp,
      updated_at: timestamp
    };
  } catch (error) {
    console.error('Error saving verification request:', error);
    throw error;
  }
};

const getVerificationRequest = async (id) => {
  try {
    // Fetch verification request
    const verificationResult = await index.fetch([`verification_${id}`]);
    const verificationVector = verificationResult.records[`verification_${id}`];

    if (!verificationVector) return null;

    const metadata = verificationVector.metadata;
    const candidateData = JSON.parse(metadata.candidate_data);

    // Fetch chat history
    const chatResults = await index.query({
      vector: Array(768).fill(0), // Dummy vector for metadata-only query
      topK: 1000,
      includeMetadata: true,
      filter: {
        type: 'chat_message',
        request_id: id
      }
    });

    const chatHistory = chatResults.matches
      .map(match => ({
        role: match.metadata.role,
        content: match.metadata.content,
        created_at: match.metadata.created_at
      }))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Fetch HR responses
    const hrResults = await index.query({
      vector: Array(768).fill(0),
      topK: 1,
      includeMetadata: true,
      filter: {
        type: 'hr_response',
        request_id: id
      }
    });

    const hrResponses = hrResults.matches.length > 0
      ? JSON.parse(hrResults.matches[0].metadata.data)
      : {};

    // Fetch analysis results
    const analysisResults = await index.query({
      vector: Array(768).fill(0),
      topK: 1,
      includeMetadata: true,
      filter: {
        type: 'analysis_result',
        request_id: id
      }
    });

    let comparisonResult = null;
    let sentimentAnalysis = null;

    if (analysisResults.matches.length > 0) {
      const analysisMetadata = analysisResults.matches[0].metadata;
      comparisonResult = analysisMetadata.comparison_result
        ? JSON.parse(analysisMetadata.comparison_result)
        : null;
      sentimentAnalysis = analysisMetadata.sentiment_analysis
        ? JSON.parse(analysisMetadata.sentiment_analysis)
        : null;
    }

    return {
      id,
      candidateData,
      status: metadata.status,
      createdAt: metadata.created_at,
      chatHistory,
      hrResponses,
      comparisonResult,
      sentimentAnalysis
    };
  } catch (error) {
    console.error('Error getting verification request:', error);
    return null;
  }
};

const getAllVerificationRequests = async () => {
  try {
    // Query all verification requests
    const results = await index.query({
      vector: Array(768).fill(0),
      topK: 10000,
      includeMetadata: true,
      filter: {
        type: 'verification_request'
      }
    });

    const requests = await Promise.all(
      results.matches.map(async (match) => {
        const metadata = match.metadata;
        const candidateData = JSON.parse(metadata.candidate_data);
        const requestId = metadata.request_id;

        // Fetch analysis for this request
        const analysisResults = await index.query({
          vector: Array(768).fill(0),
          topK: 1,
          includeMetadata: true,
          filter: {
            type: 'analysis_result',
            request_id: requestId
          }
        });

        let comparisonResult = null;
        if (analysisResults.matches.length > 0) {
          const analysisMetadata = analysisResults.matches[0].metadata;
          comparisonResult = analysisMetadata.comparison_result
            ? JSON.parse(analysisMetadata.comparison_result)
            : null;
        }

        return {
          id: requestId,
          candidateName: candidateData.employeeName,
          company: candidateData.companyName,
          status: metadata.status,
          createdAt: metadata.created_at,
          riskLevel: comparisonResult?.overallRisk || 'PENDING',
          riskScore: comparisonResult?.riskScore || null,
          hasDiscrepancies: comparisonResult?.discrepancies?.length > 0
        };
      })
    );

    return requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    console.error('Error getting all verification requests:', error);
    return [];
  }
};

const saveChatMessage = async (requestId, role, content) => {
  try {
    const timestamp = new Date().toISOString();
    const messageId = `chat_${requestId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create embedding for the chat message
    const embedding = await generateEmbedding(content);

    await index.upsert([{
      id: messageId,
      values: embedding,
      metadata: {
        type: 'chat_message',
        request_id: requestId,
        role,
        content,
        created_at: timestamp
      }
    }]);
  } catch (error) {
    console.error('Error saving chat message:', error);
  }
};

const updateHRResponses = async (requestId, data) => {
  try {
    const timestamp = new Date().toISOString();
    const hrId = `hr_response_${requestId}`;

    // Create searchable text
    const searchText = `
      HR Response for ${requestId}
      Data: ${JSON.stringify(data)}
    `.trim();

    const embedding = await generateEmbedding(searchText);

    await index.upsert([{
      id: hrId,
      values: embedding,
      metadata: {
        type: 'hr_response',
        request_id: requestId,
        data: JSON.stringify(data),
        created_at: timestamp
      }
    }]);
  } catch (error) {
    console.error('Error updating HR responses:', error);
  }
};

const updateVerificationStatus = async (requestId, status) => {
  try {
    // Fetch existing verification request
    const verificationResult = await index.fetch([`verification_${requestId}`]);
    const verificationVector = verificationResult.records[`verification_${requestId}`];

    if (!verificationVector) return;

    const metadata = verificationVector.metadata;
    const updatedMetadata = {
      ...metadata,
      status,
      updated_at: new Date().toISOString()
    };

    // Update the vector with new metadata
    await index.upsert([{
      id: `verification_${requestId}`,
      values: verificationVector.values,
      metadata: updatedMetadata
    }]);
  } catch (error) {
    console.error('Error updating verification status:', error);
  }
};

const saveAnalysisResults = async (requestId, comparisonResult, sentimentAnalysis) => {
  try {
    const timestamp = new Date().toISOString();
    const analysisId = `analysis_${requestId}`;

    // Create searchable text
    const searchText = `
      Analysis for ${requestId}
      Risk Level: ${comparisonResult?.overallRisk || 'Unknown'}
      Risk Score: ${comparisonResult?.riskScore || 'N/A'}
      Sentiment: ${sentimentAnalysis?.overallSentiment || 'Unknown'}
    `.trim();

    const embedding = await generateEmbedding(searchText);

    await index.upsert([{
      id: analysisId,
      values: embedding,
      metadata: {
        type: 'analysis_result',
        request_id: requestId,
        comparison_result: JSON.stringify(comparisonResult),
        sentiment_analysis: JSON.stringify(sentimentAnalysis),
        created_at: timestamp
      }
    }]);
  } catch (error) {
    console.error('Error saving analysis results:', error);
  }
};

const saveDocumentAnalysis = async (documentType, extractedData, authenticityCheck, metadataForensics) => {
  try {
    const id = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    // Create searchable text
    const searchText = `
      Document Analysis
      Type: ${documentType}
      Employee: ${extractedData.employeeName || 'Unknown'}
      Company: ${extractedData.companyName || 'Unknown'}
      Suspicious: ${authenticityCheck.isSuspicious}
    `.trim();

    const embedding = await generateEmbedding(searchText);

    await index.upsert([{
      id,
      values: embedding,
      metadata: {
        type: 'document_analysis',
        document_type: documentType,
        extracted_data: JSON.stringify(extractedData),
        authenticity_check: JSON.stringify(authenticityCheck),
        metadata_forensics: JSON.stringify(metadataForensics),
        created_at: timestamp
      }
    }]);

    return id;
  } catch (error) {
    console.error('Error saving document analysis:', error);
    throw error;
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down Pinecone connection...');
  // Pinecone client doesn't require explicit cleanup
});

module.exports = {
  index,
  initDB,
  saveVerificationRequest,
  getVerificationRequest,
  getAllVerificationRequests,
  saveChatMessage,
  updateHRResponses,
  updateVerificationStatus,
  saveAnalysisResults,
  saveDocumentAnalysis
};
