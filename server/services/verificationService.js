const { GoogleGenAI } = require("@google/genai");
const { compareData } = require('./comparisonService');
const { analyzeSentiment } = require('./forensicsService');
const {
    saveVerificationRequest,
    getVerificationRequest,
    getAllVerificationRequests,
    saveChatMessage,
    updateHRResponses,
    updateVerificationStatus,
    saveAnalysisResults
} = require('./database');
require('dotenv').config();

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = "gemini-2.5-flash";

async function createVerificationRequest(data) {
    const id = Math.random().toString(36).substring(7);
    await saveVerificationRequest(id, data);
    return id;
}

async function getRequest(id) {
    return await getVerificationRequest(id);
}

async function getAllRequests() {
    return await getAllVerificationRequests();
}

async function chatWithHR(requestId, userMessage) {
    const request = await getVerificationRequest(requestId);
    if (!request) throw new Error('Request not found');

    // Save user message to database
    await saveChatMessage(requestId, 'user', userMessage);

    // Extract structured data from HR responses using Gemini
    const extractionPrompt = `
Extract employment verification data from this HR response: "${userMessage}"

Return JSON with any mentioned fields:
{
  "employeeName": "...",
  "designation": "...",
  "salary": "...",
  "dates": "...",
  "department": "..."
}

If field not mentioned, omit it. Return only JSON.
`;

    try {
        const extractResult = await client.models.generateContent({
            model: MODEL_NAME,
            contents: [extractionPrompt]
        });
        const extractedJson = extractResult.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const extractedData = JSON.parse(extractedJson);

        // Merge and save extracted data
        const updatedHRResponses = { ...request.hrResponses, ...extractedData };
        await updateHRResponses(requestId, updatedHRResponses);
    } catch (e) {
        console.log('Could not extract structured data:', e.message);
    }

    // Construct context for Gemini
    const context = `
    You are TrustCheck's AI Investigator. You are chatting with the HR Manager of a previous company.
    
    Candidate Claims:
    - Name: ${request.candidateData.employeeName}
    - Company: ${request.candidateData.companyName || 'Unknown'}
    - Role: ${request.candidateData.designation || 'Unknown'}
    - Dates: ${request.candidateData.dates || 'Unknown'}
    - Salary: ${request.candidateData.salary || 'Unknown'}
    
    Goal: Verify these details politely but firmly. Ask one question at a time.
    If the HR confirms everything, say "Thank you, verification complete." and output [COMPLETE].
    If there is a discrepancy, note it and continue asking.
    
    Current Chat History:
    ${request.chatHistory.map(m => `${m.role}: ${m.content}`).join('\n')}
    user: ${userMessage}
  `;

    const result = await client.models.generateContent({
        model: MODEL_NAME,
        contents: [context]
    });
    const response = result.text;

    // Save AI response to database
    await saveChatMessage(requestId, 'model', response);

    // Check if verification is complete
    if (response.includes('[COMPLETE]')) {
        await updateVerificationStatus(requestId, 'COMPLETED');

        // Get updated request data
        const updatedRequest = await getVerificationRequest(requestId);

        // Run comparison analysis
        let comparisonResult = null;
        try {
            if (Object.keys(updatedRequest.hrResponses).length > 0) {
                comparisonResult = await compareData(updatedRequest.candidateData, updatedRequest.hrResponses);
            }
        } catch (e) {
            console.error('Comparison failed:', e);
        }

        // Run sentiment analysis on HR messages
        let sentimentAnalysis = null;
        try {
            const hrMessages = updatedRequest.chatHistory
                .filter(m => m.role === 'user')
                .map(m => m.content);

            if (hrMessages.length > 0) {
                sentimentAnalysis = await analyzeSentiment(hrMessages);
            }
        } catch (e) {
            console.error('Sentiment analysis failed:', e);
        }

        // Save analysis results
        if (comparisonResult || sentimentAnalysis) {
            await saveAnalysisResults(requestId, comparisonResult, sentimentAnalysis);
        }
    }

    return response;
}

module.exports = { createVerificationRequest, getRequest, getAllRequests, chatWithHR };
