const { Pinecone } = require('@pinecone-database/pinecone');
const { GoogleGenAI } = require("@google/genai");
const { GoogleGenerativeAI } = require("@google/generative-ai"); // Old SDK for embeddings
require('dotenv').config();

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // Old SDK instance for embeddings

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
 * Generate embeddings using Gemini (OLD SDK)
 * Using text-embedding-004 with 768 dimensions to match Pinecone index
 */
const generateEmbedding = async (text) => {
  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Embedding generation error:', error);
    // Fallback: return a random vector (Pinecone rejects all-zero vectors)
    console.warn('Using fallback random vector for embedding');
    return Array(768).fill(0).map(() => Math.random() * 0.01 - 0.005);
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
          hasDiscrepancies: comparisonResult?.discrepancies?.length > 0,
          // Add Google Sheets metadata for auto-polling
          googleSheetsId: metadata.googleSheetsId || metadata.google_sheets_id || null,
          googleSheetsUrl: metadata.googleSheetsUrl || metadata.google_sheets_url || null,
          hrEmail: metadata.hrEmail || metadata.hr_email || null,
          verificationType: metadata.verificationType || metadata.verification_type || null,
          candidateData: candidateData,
          zone: metadata.zone || comparisonResult?.zone || null
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

/**
 * Update verification metadata (for email-based verifications)
 */
const updateVerificationMetadata = async (requestId, metadata) => {
  try {
    console.log(`📝 Updating metadata for ${requestId}:`, metadata);

    // Fetch existing verification request
    const verificationResult = await index.fetch([`verification_${requestId}`]);
    const verificationVector = verificationResult.records[`verification_${requestId}`];

    if (!verificationVector) {
      console.error(`❌ Verification ${requestId} not found in database`);
      return;
    }

    console.log(`✅ Found verification ${requestId}, current metadata:`, verificationVector.metadata);

    const existingMetadata = verificationVector.metadata;
    const updatedMetadata = {
      ...existingMetadata,
      ...metadata,
      updated_at: new Date().toISOString()
    };

    console.log(`📊 Upserting with new metadata:`, updatedMetadata);

    // Update the vector with new metadata
    await index.upsert([{
      id: `verification_${requestId}`,
      values: verificationVector.values,
      metadata: updatedMetadata
    }]);

    console.log(`✅ Successfully updated metadata for ${requestId}`);
  } catch (error) {
    console.error(`❌ Error updating verification metadata for ${requestId}:`, error);
    throw error; // Re-throw to see the error in the calling function
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

// ============================================
// CLIENT OPERATIONS
// ============================================

const saveClient = async (clientData) => {
  try {
    const clientId = `CLT_${new Date().toISOString().split('T')[0].replace(/-/g, '')}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const searchText = `
      Client
      Company: ${clientData.companyName}
      Contact: ${clientData.contactPerson}
      Email: ${clientData.email}
    `.trim();

    const embedding = await generateEmbedding(searchText);

    await index.upsert([{
      id: `client_${clientId}`,
      values: embedding,
      metadata: {
        type: 'client',
        client_id: clientId,
        company_name: clientData.companyName,
        contact_person: clientData.contactPerson,
        email: clientData.email,
        phone: clientData.phone || '',
        address: clientData.address || '',
        total_employees: clientData.totalEmployees || 0,
        // SKU Configuration
        sku_name: clientData.skuName || '',
        primary_verification_method: clientData.primaryVerificationMethod || 'hr_rm_verification',
        fallback_method: clientData.fallbackMethod || 'uan_verification',
        verification_type: clientData.verificationType || 'written',
        special_instructions: JSON.stringify(clientData.specialInstructions || []),
        status: 'ACTIVE',
        created_at: timestamp
      }
    }]);

    return {
      clientId,
      ...clientData,
      status: 'ACTIVE',
      createdAt: timestamp
    };
  } catch (error) {
    console.error('Error saving client:', error);
    throw error;
  }
};

const getClient = async (clientId) => {
  try {
    const result = await index.fetch([`client_${clientId}`]);
    const vector = result.records[`client_${clientId}`];

    if (!vector) return null;

    const metadata = vector.metadata;
    return {
      clientId: metadata.client_id,
      companyName: metadata.company_name,
      contactPerson: metadata.contact_person,
      email: metadata.email,
      phone: metadata.phone,
      address: metadata.address,
      totalEmployees: metadata.total_employees,
      // SKU Configuration
      skuName: metadata.sku_name,
      primaryVerificationMethod: metadata.primary_verification_method,
      fallbackMethod: metadata.fallback_method,
      verificationType: metadata.verification_type,
      specialInstructions: JSON.parse(metadata.special_instructions || '[]'),
      status: metadata.status,
      createdAt: metadata.created_at
    };
  } catch (error) {
    console.error('Error getting client:', error);
    return null;
  }
};

const getAllClients = async () => {
  try {
    const results = await index.query({
      vector: Array(768).fill(0),
      topK: 10000,
      includeMetadata: true,
      filter: {
        type: 'client'
      }
    });

    const clients = results.matches.map(match => {
      const metadata = match.metadata;
      return {
        clientId: metadata.client_id,
        companyName: metadata.company_name,
        contactPerson: metadata.contact_person,
        email: metadata.email,
        phone: metadata.phone,
        address: metadata.address,
        totalEmployees: metadata.total_employees,
        skuName: metadata.sku_name,
        status: metadata.status,
        createdAt: metadata.created_at
      };
    });

    return clients.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    console.error('Error getting all clients:', error);
    return [];
  }
};

// ============================================
// CASE OPERATIONS
// ============================================

const saveCase = async (clientId, employeeData, previousEmployments = []) => {
  try {
    const caseId = `CASE_${new Date().toISOString().split('T')[0].replace(/-/g, '')}_EMP${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const searchText = `
      Case
      Employee: ${employeeData.employeeName}
      Email: ${employeeData.employeeEmail}
      Position: ${employeeData.positionApplied}
    `.trim();

    const embedding = await generateEmbedding(searchText);

    await index.upsert([{
      id: `case_${caseId}`,
      values: embedding,
      metadata: {
        type: 'case',
        case_id: caseId,
        client_id: clientId,
        employee_name: employeeData.employeeName,
        employee_email: employeeData.employeeEmail,
        employee_phone: employeeData.employeePhone || '',
        date_of_birth: employeeData.dateOfBirth || '',
        position_applied: employeeData.positionApplied,
        status: 'PENDING',
        overall_risk_level: '',
        created_at: timestamp,
        updated_at: timestamp
      }
    }]);

    // Auto-create checks: 1 Education + 1 Crime + N Employment
    const checkIds = [];

    // 1. Education Check
    const eduCheckId = await saveCheck(caseId, 'EDUCATION', null, null);
    checkIds.push(eduCheckId);

    // 2. Crime Check
    const crimeCheckId = await saveCheck(caseId, 'CRIME', null, null);
    checkIds.push(crimeCheckId);

    // 3. Employment Checks (one per previous company)
    for (let i = 0; i < previousEmployments.length; i++) {
      const employment = previousEmployments[i];
      const empCheckId = await saveCheck(caseId, 'EMPLOYMENT', employment, i + 1);
      checkIds.push(empCheckId);
    }

    return {
      caseId,
      clientId,
      employeeData,
      checkIds,
      status: 'PENDING',
      createdAt: timestamp
    };
  } catch (error) {
    console.error('Error saving case:', error);
    throw error;
  }
};

const getCase = async (caseId) => {
  try {
    const result = await index.fetch([`case_${caseId}`]);
    const vector = result.records[`case_${caseId}`];

    if (!vector) return null;

    const metadata = vector.metadata;

    // Fetch all checks for this case
    const checks = await getChecksByCase(caseId);

    return {
      caseId: metadata.case_id,
      clientId: metadata.client_id,
      employeeName: metadata.employee_name,
      employeeEmail: metadata.employee_email,
      employeePhone: metadata.employee_phone,
      dateOfBirth: metadata.date_of_birth,
      positionApplied: metadata.position_applied,
      status: metadata.status,
      overallRiskLevel: metadata.overall_risk_level,
      createdAt: metadata.created_at,
      updatedAt: metadata.updated_at,
      checks
    };
  } catch (error) {
    console.error('Error getting case:', error);
    return null;
  }
};

const getCasesByClient = async (clientId) => {
  try {
    const results = await index.query({
      vector: Array(768).fill(0),
      topK: 10000,
      includeMetadata: true,
      filter: {
        type: 'case',
        client_id: clientId
      }
    });

    const cases = await Promise.all(
      results.matches.map(async (match) => {
        const metadata = match.metadata;
        const checks = await getChecksByCase(metadata.case_id);

        return {
          caseId: metadata.case_id,
          clientId: metadata.client_id,
          employeeName: metadata.employee_name,
          employeeEmail: metadata.employee_email,
          positionApplied: metadata.position_applied,
          status: metadata.status,
          overallRiskLevel: metadata.overall_risk_level,
          createdAt: metadata.created_at,
          checksCount: checks.length,
          completedChecks: checks.filter(c => c.status === 'COMPLETED').length
        };
      })
    );

    return cases.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    console.error('Error getting cases by client:', error);
    return [];
  }
};

const updateCaseStatus = async (caseId, status, overallRiskLevel = null) => {
  try {
    const result = await index.fetch([`case_${caseId}`]);
    const vector = result.records[`case_${caseId}`];

    if (!vector) return;

    const metadata = vector.metadata;
    const updatedMetadata = {
      ...metadata,
      status,
      overall_risk_level: overallRiskLevel,
      updated_at: new Date().toISOString()
    };

    await index.upsert([{
      id: `case_${caseId}`,
      values: vector.values,
      metadata: updatedMetadata
    }]);
  } catch (error) {
    console.error('Error updating case status:', error);
  }
};

// ============================================
// CHECK OPERATIONS
// ============================================

const saveCheck = async (caseId, checkType, employmentData = null, companyIndex = null) => {
  try {
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0].replace(/-/g, '');
    const randomStr = Math.random().toString(36).substr(2, 3).toUpperCase();

    let checkId;
    if (checkType === 'EDUCATION') {
      checkId = `CHK_EDU_${dateStr}_${randomStr}`;
    } else if (checkType === 'CRIME') {
      checkId = `CHK_CRM_${dateStr}_${randomStr}`;
    } else if (checkType === 'EMPLOYMENT') {
      checkId = `CHK_EMP_${dateStr}_${randomStr}_C${companyIndex}`;
    }

    const searchText = `
      Check ${checkType}
      Case: ${caseId}
      ${employmentData ? `Company: ${employmentData.companyName}` : ''}
    `.trim();

    const embedding = await generateEmbedding(searchText);

    const metadata = {
      type: 'check',
      check_id: checkId,
      case_id: caseId,
      check_type: checkType,
      company_name: employmentData?.companyName || '',
      company_index: companyIndex || 0,
      hr_email: employmentData?.hrEmail || '',
      employment_dates: employmentData?.employmentDates || '',
      designation: employmentData?.designation || '',
      uan_number: employmentData?.uanNumber || '',
      status: 'PENDING',
      ai_agent_status: 'NOT_STARTED',
      verification_data: '{}',
      discrepancies: '[]',
      risk_score: 0,
      risk_level: '',
      started_at: '',
      completed_at: '',
      created_at: timestamp
    };

    await index.upsert([{
      id: `check_${checkId}`,
      values: embedding,
      metadata
    }]);

    return checkId;
  } catch (error) {
    console.error('Error saving check:', error);
    throw error;
  }
};

const getCheck = async (checkId) => {
  try {
    const result = await index.fetch([`check_${checkId}`]);
    const vector = result.records[`check_${checkId}`];

    if (!vector) return null;

    const metadata = vector.metadata;
    return {
      checkId: metadata.check_id,
      caseId: metadata.case_id,
      checkType: metadata.check_type,
      companyName: metadata.company_name,
      companyIndex: metadata.company_index,
      hrEmail: metadata.hr_email,
      employmentDates: metadata.employment_dates,
      designation: metadata.designation,
      uanNumber: metadata.uan_number,
      status: metadata.status,
      zone: metadata.zone || '',
      aiAgentStatus: metadata.ai_agent_status,
      verificationData: JSON.parse(metadata.verification_data || '{}'),
      discrepancies: JSON.parse(metadata.discrepancies || '[]'),
      riskScore: metadata.risk_score,
      riskLevel: metadata.risk_level,
      startedAt: metadata.started_at,
      completedAt: metadata.completed_at,
      createdAt: metadata.created_at
    };
  } catch (error) {
    console.error('Error getting check:', error);
    return null;
  }
};

const getChecksByCase = async (caseId) => {
  try {
    const results = await index.query({
      vector: Array(768).fill(0),
      topK: 10000,
      includeMetadata: true,
      filter: {
        type: 'check',
        case_id: caseId
      }
    });

    const checks = results.matches.map(match => {
      const metadata = match.metadata;
      return {
        checkId: metadata.check_id,
        caseId: metadata.case_id,
        checkType: metadata.check_type,
        companyName: metadata.company_name,
        companyIndex: metadata.company_index,
        hrEmail: metadata.hr_email,
        employmentDates: metadata.employment_dates,
        status: metadata.status,
        aiAgentStatus: metadata.ai_agent_status,
        riskScore: metadata.risk_score,
        riskLevel: metadata.risk_level,
        createdAt: metadata.created_at
      };
    });

    // Sort: Education, Crime, then Employment checks by company index
    return checks.sort((a, b) => {
      const order = { 'EDUCATION': 1, 'CRIME': 2, 'EMPLOYMENT': 3 };
      if (order[a.checkType] !== order[b.checkType]) {
        return order[a.checkType] - order[b.checkType];
      }
      if (a.checkType === 'EMPLOYMENT' && b.checkType === 'EMPLOYMENT') {
        return (a.companyIndex || 0) - (b.companyIndex || 0);
      }
      return 0;
    });
  } catch (error) {
    console.error('Error getting checks by case:', error);
    return [];
  }
};

const getAllChecks = async () => {
  try {
    const results = await index.query({
      vector: Array(768).fill(0),
      topK: 10000,
      includeMetadata: true,
      filter: {
        type: 'check'
      }
    });

    const checks = results.matches.map(match => {
      const metadata = match.metadata;
      return {
        checkId: metadata.check_id,
        caseId: metadata.case_id,
        checkType: metadata.check_type,
        companyName: metadata.company_name,
        companyIndex: metadata.company_index,
        hrEmail: metadata.hr_email,
        employmentDates: metadata.employment_dates,
        designation: metadata.designation,
        status: metadata.status,
        zone: metadata.zone || '',
        aiAgentStatus: metadata.ai_agent_status,
        verificationData: JSON.parse(metadata.verification_data || '{}'),
        discrepancies: JSON.parse(metadata.discrepancies || '[]'),
        riskScore: metadata.risk_score,
        riskLevel: metadata.risk_level,
        startedAt: metadata.started_at,
        completedAt: metadata.completed_at,
        createdAt: metadata.created_at
      };
    });

    return checks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    console.error('Error getting all checks:', error);
    return [];
  }
};

const updateCheckStatus = async (checkId, status, data = {}) => {
  try {
    const result = await index.fetch([`check_${checkId}`]);
    const vector = result.records[`check_${checkId}`];

    if (!vector) return;

    const metadata = vector.metadata;
    const timestamp = new Date().toISOString();

    const updatedMetadata = {
      ...metadata,
      status,
      zone: data.zone || metadata.zone || '',
      ai_agent_status: data.aiAgentStatus || metadata.ai_agent_status,
      verification_data: JSON.stringify(data.verificationData || JSON.parse(metadata.verification_data || '{}')),
      discrepancies: JSON.stringify(data.discrepancies || JSON.parse(metadata.discrepancies || '[]')),
      risk_score: data.riskScore !== undefined ? data.riskScore : metadata.risk_score,
      risk_level: data.riskLevel || metadata.risk_level,
      started_at: data.startedAt || metadata.started_at || (status === 'IN_PROGRESS' ? timestamp : ''),
      completed_at: status === 'COMPLETED' ? timestamp : (metadata.completed_at || '')
    };

    await index.upsert([{
      id: `check_${checkId}`,
      values: vector.values,
      metadata: updatedMetadata
    }]);
  } catch (error) {
    console.error('Error updating check status:', error);
  }
};

// ============================================
// DOCUMENT OPERATIONS
// ============================================

const saveDocument = async (clientId, caseId, checkId, documentType, fileData) => {
  try {
    const documentId = `DOC_${new Date().toISOString().split('T')[0].replace(/-/g, '')}_${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const searchText = `
      Document
      Type: ${documentType}
      Check: ${checkId}
      Case: ${caseId}
    `.trim();

    const embedding = await generateEmbedding(searchText);

    // Store file as base64 in metadata (for small files)
    // For larger files, consider using external storage (S3, etc.)
    await index.upsert([{
      id: `document_${documentId}`,
      values: embedding,
      metadata: {
        type: 'document',
        document_id: documentId,
        client_id: clientId,
        case_id: caseId,
        check_id: checkId,
        document_type: documentType,
        file_name: fileData.fileName,
        file_type: fileData.fileType,
        file_size: fileData.fileSize,
        // Store file as base64 string (limit: ~40KB per metadata field)
        file_data: fileData.fileBuffer.toString('base64').substring(0, 40000),
        uploaded_at: timestamp
      }
    }]);

    return {
      documentId,
      clientId,
      caseId,
      checkId,
      documentType,
      fileName: fileData.fileName,
      uploadedAt: timestamp
    };
  } catch (error) {
    console.error('Error saving document:', error);
    throw error;
  }
};

const updateDocumentMetadata = async (documentId, metadata) => {
  try {
    const result = await index.fetch([`document_${documentId}`]);
    const vector = result.records[`document_${documentId}`];

    if (!vector) return;

    const currentMetadata = vector.metadata;
    const updatedMetadata = {
      ...currentMetadata,
      ...metadata,
      extracted_data: JSON.stringify(metadata.extractedData || {}),
      updated_at: new Date().toISOString()
    };

    // Remove complex object from spread before stringifying if passed directly
    if (metadata.extractedData) delete updatedMetadata.extractedData;

    await index.upsert([{
      id: `document_${documentId}`,
      values: vector.values,
      metadata: updatedMetadata
    }]);

    console.log(`✅ Updated metadata for document ${documentId}`);
  } catch (error) {
    console.error('Error updating document metadata:', error);
  }
};

const getDocumentsByCheck = async (checkId) => {
  try {
    const results = await index.query({
      vector: Array(768).fill(0),
      topK: 100,
      includeMetadata: true,
      filter: {
        type: 'document',
        check_id: checkId
      }
    });

    return results.matches.map(match => {
      const metadata = match.metadata;
      return {
        documentId: metadata.document_id,
        clientId: metadata.client_id,
        caseId: metadata.case_id,
        checkId: metadata.check_id,
        documentType: metadata.document_type,
        fileName: metadata.file_name,
        fileType: metadata.file_type,
        fileSize: metadata.file_size,
        uploadedAt: metadata.uploaded_at,
        extractedData: metadata.extracted_data ? JSON.parse(metadata.extracted_data) : null
      };
    });
  } catch (error) {
    console.error('Error getting documents by check:', error);
    return [];
  }
};

const getDocumentsByCase = async (caseId) => {
  try {
    const results = await index.query({
      vector: Array(768).fill(0),
      topK: 1000,
      includeMetadata: true,
      filter: {
        type: 'document',
        case_id: caseId
      }
    });

    return results.matches.map(match => {
      const metadata = match.metadata;
      return {
        documentId: metadata.document_id,
        clientId: metadata.client_id,
        caseId: metadata.case_id,
        checkId: metadata.check_id,
        documentType: metadata.document_type,
        fileName: metadata.file_name,
        fileType: metadata.file_type,
        fileSize: metadata.file_size,
        uploadedAt: metadata.uploaded_at,
        extractedData: metadata.extracted_data ? JSON.parse(metadata.extracted_data) : null
      };
    });
  } catch (error) {
    console.error('Error getting documents by case:', error);
    return [];
  }
};

const getDocument = async (documentId) => {
  try {
    const result = await index.fetch([`document_${documentId}`]);
    const vector = result.records[`document_${documentId}`];

    if (!vector) return null;

    const metadata = vector.metadata;
    return {
      documentId: metadata.document_id,
      clientId: metadata.client_id,
      caseId: metadata.case_id,
      checkId: metadata.check_id,
      documentType: metadata.document_type,
      fileName: metadata.file_name,
      fileType: metadata.file_type,
      fileSize: metadata.file_size,
      fileData: Buffer.from(metadata.file_data, 'base64'),
      uploadedAt: metadata.uploaded_at
    };
  } catch (error) {
    console.error('Error getting document:', error);
    return null;
  }
};

const deleteDocument = async (documentId) => {
  try {
    await index.deleteOne(`document_${documentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

// ============================================
// ACTIVITY LOG OPERATIONS
// ============================================

const logActivity = async (entityType, entityId, action, description, metadata = {}) => {
  try {
    const logId = `LOG_${new Date().toISOString().split('T')[0].replace(/-/g, '')}_${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const searchText = `
      Activity Log
      ${entityType}: ${entityId}
      Action: ${action}
      ${description}
    `.trim();

    const embedding = await generateEmbedding(searchText);

    await index.upsert([{
      id: `activity_${logId}`,
      values: embedding,
      metadata: {
        type: 'activity_log',
        log_id: logId,
        entity_type: entityType, // 'case' or 'check'
        entity_id: entityId,
        action: action, // e.g., 'DOCUMENT_UPLOADED', 'EMAIL_SENT', 'SHEET_CREATED', 'HR_RESPONDED'
        description: description,
        metadata: JSON.stringify(metadata),
        timestamp: timestamp
      }
    }]);

    console.log(`📝 Activity logged: ${action} for ${entityType} ${entityId}`);
    return { logId, timestamp };
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - logging should not break the main flow
  }
};

const getActivityLogs = async (entityType, entityId) => {
  try {
    // Build filter conditionally based on whether entityId is provided
    const filter = {
      type: 'activity_log',
      entity_type: entityType
    };

    // Only add entity_id filter if entityId is not null
    if (entityId !== null && entityId !== undefined) {
      filter.entity_id = entityId;
    }

    const results = await index.query({
      vector: Array(768).fill(0),
      topK: 1000,
      includeMetadata: true,
      filter: filter
    });

    const logs = results.matches.map(match => {
      const metadata = match.metadata;
      return {
        logId: metadata.log_id,
        entityType: metadata.entity_type,
        entityId: metadata.entity_id,
        action: metadata.action,
        description: metadata.description,
        metadata: metadata.metadata,
        timestamp: metadata.timestamp
      };
    });

    // Sort by timestamp (newest first)
    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    console.error('Error getting activity logs:', error);
    return [];
  }
};

const getAllActivityLogs = async (limit = 100) => {
  try {
    const results = await index.query({
      vector: Array(768).fill(0),
      topK: limit,
      includeMetadata: true,
      filter: {
        type: 'activity_log'
      }
    });

    const logs = results.matches.map(match => {
      const metadata = match.metadata;
      return {
        logId: metadata.log_id,
        entityType: metadata.entity_type,
        entityId: metadata.entity_id,
        action: metadata.action,
        description: metadata.description,
        metadata: JSON.parse(metadata.metadata || '{}'),
        timestamp: metadata.timestamp
      };
    });

    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    console.error('Error getting all activity logs:', error);
    return [];
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
  updateVerificationMetadata,
  saveAnalysisResults,
  saveDocumentAnalysis,
  // Client operations
  saveClient,
  getClient,
  getAllClients,
  // Case operations
  saveCase,
  getCase,
  getCasesByClient,
  updateCaseStatus,
  // Check operations
  saveCheck,
  getCheck,
  getChecksByCase,
  getAllChecks,
  updateCheckStatus,
  // Document operations
  saveDocument,
  getDocument,
  getDocumentsByCheck,
  getDocumentsByCase,
  deleteDocument,
  updateDocumentMetadata,
  // Activity log operations
  logActivity,
  getActivityLogs,
  getAllActivityLogs
};
