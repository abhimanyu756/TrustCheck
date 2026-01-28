const pdfParse = require('pdf-parse');
const { GoogleGenAI } = require("@google/genai");
require('dotenv').config();

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = "gemini-2.5-flash";

/**
 * Extract PDF metadata and analyze for tampering
 */
async function analyzePDFMetadata(fileBuffer) {
  try {
    // pdf-parse v1.1.1 exports a function directly
    const data = await pdfParse(fileBuffer);

    const metadata = {
      pages: data.numpages,
      info: data.info || {},
      text: data.text.substring(0, 500) // First 500 chars for context
    };

    // Use Gemini to analyze metadata for suspicious patterns
    const prompt = `
You are a forensic document analyst. Analyze this PDF metadata for signs of tampering or fraud.

**PDF Metadata:**
- Creator: ${metadata.info.Creator || 'Unknown'}
- Producer: ${metadata.info.Producer || 'Unknown'}
- Creation Date: ${metadata.info.CreationDate || 'Unknown'}
- Modification Date: ${metadata.info.ModDate || 'Unknown'}
- Pages: ${metadata.pages}

**Red Flags to Check:**
1. Was this created in image editing software (Photoshop, GIMP, Canva)?
2. Is the creation date suspiciously recent?
3. Are there multiple modification dates suggesting edits?
4. Does the Producer field suggest it's a scan vs. a digitally created document?

Return JSON:
{
  "isSuspicious": boolean,
  "suspicionLevel": "LOW" | "MEDIUM" | "HIGH",
  "findings": [
    {
      "issue": "Created in Photoshop",
      "severity": "HIGH",
      "explanation": "Legitimate payslips are generated from HR systems, not image editors"
    }
  ],
  "recommendation": "string"
}
`;

    const result = await client.models.generateContent({
      model: MODEL_NAME,
      contents: [prompt]
    });
    const response = result.text;

    // Try to extract JSON from the response
    let analysisData;
    try {
      // First, try to clean and parse the response
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();

      // Try to find JSON object in the response
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON object found in response');
      }
    } catch (parseError) {
      console.warn('Failed to parse Gemini response as JSON:', parseError.message);
      console.warn('Response was:', response.substring(0, 200));

      // Return a safe default
      analysisData = {
        isSuspicious: false,
        suspicionLevel: 'LOW',
        findings: [],
        recommendation: 'Could not parse AI analysis - manual review recommended'
      };
    }

    return {
      metadata,
      analysis: analysisData
    };

  } catch (error) {
    console.error('Metadata analysis error:', error);
    return {
      metadata: { error: 'Failed to parse PDF' },
      analysis: {
        isSuspicious: false,
        suspicionLevel: 'LOW',
        findings: [],
        recommendation: 'Could not analyze metadata'
      }
    };
  }
}

/**
 * Analyze sentiment of HR responses for red flags
 */
async function analyzeSentiment(hrMessages) {
  try {
    const prompt = `
You are an expert in detecting deception and negative sentiment in professional communication.

Analyze these HR responses for red flags:
${hrMessages.map((msg, i) => `${i + 1}. "${msg}"`).join('\n')}

Look for:
- Hesitation or vague language
- Negative sentiment about the candidate
- Contradictions or inconsistencies
- Reluctance to confirm details
- Phrases like "would not rehire", "had issues", "terminated", etc.

Return JSON:
{
  "overallSentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "redFlags": [
    {
      "message": "quote from HR",
      "flag": "Reluctance to confirm",
      "severity": "MEDIUM"
    }
  ],
  "trustScore": 0-100,
  "summary": "Brief analysis"
}
`;

    const result = await client.models.generateContent({
      model: MODEL_NAME,
      contents: [prompt]
    });
    const response = result.text;

    // Try to extract JSON from the response
    try {
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();

      // Try to find JSON object in the response
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON object found in response');
      }
    } catch (parseError) {
      console.warn('Failed to parse sentiment analysis response:', parseError.message);
      console.warn('Response was:', response.substring(0, 200));

      // Return safe default
      return {
        overallSentiment: 'NEUTRAL',
        redFlags: [],
        trustScore: 50,
        summary: 'Could not parse AI sentiment analysis - manual review recommended'
      };
    }

  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return {
      overallSentiment: 'NEUTRAL',
      redFlags: [],
      trustScore: 50,
      summary: 'Could not analyze sentiment'
    };
  }
}

module.exports = { analyzePDFMetadata, analyzeSentiment };
