const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Compare candidate claims vs HR verified data using Gemini
 */
async function compareData(candidateData, hrVerifiedData) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
You are a forensic analyst comparing employment verification data.

**CANDIDATE CLAIMS:**
${JSON.stringify(candidateData, null, 2)}

**HR VERIFIED DATA:**
${JSON.stringify(hrVerifiedData, null, 2)}

Analyze the discrepancies and generate a risk assessment. Return JSON:
{
  "overallRisk": "LOW" | "MEDIUM" | "HIGH",
  "riskScore": 0-100,
  "discrepancies": [
    {
      "field": "salary",
      "claimed": "80000",
      "verified": "60000",
      "severity": "HIGH",
      "analysis": "Candidate inflated salary by 33%"
    }
  ],
  "recommendation": "PROCEED" | "INVESTIGATE" | "REJECT",
  "summary": "Brief overall assessment"
}
`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        // Clean JSON response
        const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);

    } catch (error) {
        console.error('Comparison Error:', error);
        throw error;
    }
}

module.exports = { compareData };
