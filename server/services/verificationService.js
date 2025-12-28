const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// In-memory store for demo (Use DB in prod)
const requests = {};

async function createVerificationRequest(data) {
    const id = Math.random().toString(36).substring(7);
    requests[id] = {
        id,
        candidateData: data,
        chatHistory: [],
        status: 'PENDING',
        createdAt: new Date(),
        hrResponses: {} // To store final verified facts
    };
    return id;
}

async function getRequest(id) {
    return requests[id];
}

async function chatWithHR(requestId, userMessage) {
    const request = requests[requestId];
    if (!request) throw new Error('Request not found');

    // Add user message to history
    request.chatHistory.push({ role: 'user', content: userMessage });

    // Construct context for Gemini
    const context = `
    You are TrustCheck's AI Investigator. You are chatting with the HR Manager of a previous company.
    
    Candidate Claims:
    - Name: ${request.candidateData.employeeName}
    - Role: ${request.candidateData.lastDesignation || 'Unknown'}
    - Dates: ${request.candidateData.dates || 'Unknown'}
    - Salary: ${request.candidateData.salary || 'Unknown'}
    
    Goal: Verify these details politely but firmly. Ask one question at a time.
    If the HR confirms everything, say "Thank you, verification complete." and output [VERIFIED].
    If there is a discrepancy, ask for clarification.
    
    Current Chat History:
    ${request.chatHistory.map(m => `${m.role}: ${m.content}`).join('\n')}
  `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const result = await model.generateContent(context);
    const response = result.response.text();

    // Add AI response to history
    request.chatHistory.push({ role: 'model', content: response });

    return response;
}

module.exports = { createVerificationRequest, getRequest, chatWithHR };
