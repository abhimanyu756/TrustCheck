# Pinecone Integration Guide

## Overview

TrustCheck uses **Pinecone** vector database for semantic search and fraud pattern detection. This enables:
- Finding similar documents that were previously flagged as fraudulent
- Detecting patterns across verification cases
- Semantic search across all historical data

## Setup

### 1. Create Pinecone Account
Visit [pinecone.io](https://www.pinecone.io/) and create a free account.

### 2. Create API Key
1. Go to your Pinecone dashboard
2. Navigate to API Keys
3. Create a new API key
4. Copy the key

### 3. Configure Environment
Add to `server/.env`:
```env
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX=trustcheck-vectors
```

### 4. Index Creation
The application automatically creates the index on first run with:
- **Dimension**: 1024 (Gemini embedding size)
- **Metric**: Cosine similarity
- **Cloud**: AWS (Serverless)
- **Region**: us-east-1

## Features

### 1. Document Similarity Search
When a document is uploaded:
- Gemini generates embeddings from document content
- Stored in Pinecone with metadata
- Finds top 3 similar past documents
- Returns similarity scores and flags

### 2. Verification Case Matching
When verification completes:
- Stores verification outcome in Pinecone
- Includes risk scores, discrepancies, sentiment
- Enables finding similar past cases

### 3. Semantic Search
Search across all documents and verifications using natural language queries.

## How It Works

```javascript
// Document Upload Flow
1. Upload document → Gemini analysis
2. Generate embedding from extracted data
3. Store vector in Pinecone
4. Query for similar documents
5. Return results with similarity scores

// Verification Flow
1. HR chat completes
2. Generate embedding from case details
3. Store in Pinecone with risk metadata
4. Future cases can find similar patterns
```

## Data Stored

### Document Vectors
- Employee name
- Company name
- Document type
- Suspicious flag
- Timestamp

### Verification Vectors
- Candidate details
- Risk level & score
- Discrepancies found
- Sentiment analysis
- Status

## Benefits

1. **Fraud Pattern Detection**: Automatically identifies documents similar to previously flagged fraudulent ones
2. **Historical Context**: Shows if similar cases were problematic
3. **Trend Analysis**: Detect patterns across companies or document types
4. **Instant Insights**: Real-time similarity matching during upload

## Example Response

```json
{
  "documentType": "Payslip",
  "extractedData": {...},
  "similarCases": [
    {
      "similarity": "92.5%",
      "employeeName": "John Doe",
      "companyName": "ABC Corp",
      "wasSuspicious": true
    }
  ]
}
```

## Free Tier Limits

Pinecone free tier includes:
- 1 index
- 100K vectors
- Serverless deployment

Perfect for hackathon and initial production use!
