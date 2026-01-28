const { GoogleGenAI } = require("@google/genai");
require('dotenv').config();

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL_NAME = "gemini-2.5-flash";

const fileToGenerativePart = (buffer, mimeType) => {
    return {
        inlineData: {
            data: buffer.toString("base64"),
            mimeType,
        },
    };
};

async function analyzeDocument(fileBuffer, mimeType, prompt) {
    try {
        const response = await client.models.generateContent({
            model: MODEL_NAME,
            contents: [
                {
                    inlineData: {
                        data: fileBuffer.toString("base64"),
                        mimeType
                    }
                },
                prompt
            ]
        });

        return response.text;
    } catch (error) {
        console.error("Error in Gemini analysis:", error);
        throw error;
    }
}

async function extractDocumentData(fileBuffer, mimeType) {
    try {
        const prompt = `
        Carefully analyze this employment document (payslip, salary slip, experience letter, offer letter, Form 16, or relieving letter).
        
        Extract ALL of the following fields. Look carefully for each one:
        
        1. employeeName: Full name of the employee (look for "Employee Name", "Name", or header)
        2. companyName: Company/Employer name (look for company logo, header, or "Employer Name")
        3. designation: Job title/position/grade (look for "Designation", "Grade", "Position", "Job Title", "Role")
        4. employmentDates: 
           - For payslips: the pay period month/year (e.g., "January 2026" or "01/2026")
           - For letters: joining date, relieving date, or tenure period
        5. salary: 
           - For payslips: Gross Salary, Net Pay, or Total Earnings with currency symbol
           - For offer letters: CTC or monthly salary offered
        6. uanNumber: Universal Account Number (12-digit number starting with 1), also check for:
           - PF Number / EPF Number
           - Employee PF Account Number
           - EPFO Member ID
        7. documentType: Classify as one of: "Payslip", "Salary Slip", "Form 16", "Experience Letter", "Offer Letter", "Relieving Letter", "Appointment Letter", "Other"
        8. confidence: Your confidence in the extraction accuracy (0.0 to 1.0)
        
        IMPORTANT: 
        - Search the ENTIRE document thoroughly
        - For Indian payslips, UAN is usually a 12-digit number
        - Designation might be in a table or separate section
        - Return ONLY a valid JSON object, no markdown formatting
        - Use null for fields you cannot find
        `;

        const response = await client.models.generateContent({
            model: MODEL_NAME,
            contents: [
                {
                    inlineData: {
                        data: fileBuffer.toString("base64"),
                        mimeType
                    }
                },
                prompt
            ]
        });

        const text = response.text;

        // Parse JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return null;

    } catch (error) {
        console.error("Error in Gemini extraction:", error);
        return null; // Return null on error so flow doesn't break
    }
}

module.exports = { analyzeDocument, extractDocumentData };
