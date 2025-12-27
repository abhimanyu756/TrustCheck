const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
        // access your API key as an environment variable (see "Set up your API key" above)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }); // Using 1.5 Flash for speed/vision, upgrade to 1.5 Pro or 3 as needed

        const imagePart = fileToGenerativePart(fileBuffer, mimeType);

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();
        return text;
    } catch (error) {
        console.error("Error in Gemini analysis:", error);
        throw error;
    }
}

module.exports = { analyzeDocument };
