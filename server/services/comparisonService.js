const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Default client rules
const DEFAULT_CLIENT_RULES = {
  salaryTolerance: 10, // ±10%
  datesTolerance: 30, // ±30 days  
  greenZoneThreshold: 30,
  redZoneThreshold: 70,
  scoringWeights: {
    nameMismatch: 30,
    salaryMismatch: 20,
    datesMismatch: 15,
    notEligibleForRehire: 25,
    lowPerformance: 10,
    designationMismatch: 10
  }
};

/**
 * Fuzzy string matching
 */
function fuzzyMatch(str1, str2, threshold = 0.8) {
  if (!str1 || !str2) return false;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return true;

  // Simple similarity check
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.includes(shorter)) return true;

  return false;
}

/**
 * Extract numeric value from salary
 */
function extractSalary(salaryStr) {
  if (!salaryStr) return 0;
  const cleaned = salaryStr.replace(/[₹$,]/g, '').trim();
  if (cleaned.toLowerCase().includes('lpa')) {
    return parseFloat(cleaned.replace(/[^0-9.]/g, '')) * 100000;
  }
  return parseFloat(cleaned.replace(/[^0-9.]/g, '')) || 0;
}

/**
 * Calculate percentage difference
 */
function calculatePercentageDiff(value1, value2) {
  const num1 = extractSalary(value1);
  const num2 = extractSalary(value2);
  if (num1 === 0) return 0;
  return Math.abs(((num2 - num1) / num1) * 100);
}

/**
 * Deterministic comparison with client rules
 */
async function compareWithRules(candidateData, hrData, clientRules = DEFAULT_CLIENT_RULES) {
  let riskScore = 0;
  const discrepancies = [];
  const matches = [];
  const rules = { ...DEFAULT_CLIENT_RULES, ...clientRules };

  // Name comparison
  if (!fuzzyMatch(candidateData.employeeName, hrData.employeeName)) {
    riskScore += rules.scoringWeights.nameMismatch;
    discrepancies.push({
      field: 'Employee Name',
      severity: 'CRITICAL',
      candidate: candidateData.employeeName,
      hr: hrData.employeeName
    });
  } else {
    matches.push({ field: 'Employee Name' });
  }

  // Salary comparison
  if (candidateData.salary && hrData.salary) {
    const salaryDiff = calculatePercentageDiff(candidateData.salary, hrData.salary);
    if (salaryDiff > rules.salaryTolerance) {
      riskScore += rules.scoringWeights.salaryMismatch;
      discrepancies.push({
        field: 'Salary',
        severity: 'HIGH',
        candidate: candidateData.salary,
        hr: hrData.salary,
        difference: `${salaryDiff.toFixed(1)}%`
      });
    } else {
      matches.push({ field: 'Salary' });
    }
  }

  // Eligible for rehire
  if (hrData.eligibleForRehire && hrData.eligibleForRehire.toLowerCase().includes('no')) {
    riskScore += rules.scoringWeights.notEligibleForRehire;
    discrepancies.push({
      field: 'Eligible for Rehire',
      severity: 'CRITICAL',
      value: 'No'
    });
  } else if (hrData.eligibleForRehire) {
    matches.push({ field: 'Eligible for Rehire' });
  }

  // Performance rating
  if (hrData.performanceRating) {
    const rating = parseInt(hrData.performanceRating);
    if (rating < 3) {
      riskScore += rules.scoringWeights.lowPerformance;
      discrepancies.push({
        field: 'Performance Rating',
        severity: 'MEDIUM',
        value: hrData.performanceRating
      });
    } else {
      matches.push({ field: 'Performance Rating' });
    }
  }

  riskScore = Math.min(riskScore, 100);

  // Determine zone
  let zone = 'GREEN';
  if (riskScore >= rules.redZoneThreshold) {
    zone = 'RED';
  } else if (riskScore >= rules.greenZoneThreshold) {
    zone = 'YELLOW';
  }

  return {
    riskScore,
    zone,
    discrepancies,
    matches,
    matchRate: ((matches.length / (matches.length + discrepancies.length)) * 100).toFixed(1)
  };
}

/**
 * Compare candidate claims vs HR verified data using Gemini + Rules
 */
async function compareData(candidateData, hrVerifiedData, clientRules = DEFAULT_CLIENT_RULES) {
  try {
    // First, get deterministic rule-based comparison
    const ruleBasedResult = await compareWithRules(candidateData, hrVerifiedData, clientRules);

    // Then, get Gemini AI analysis for detailed insights
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
You are a forensic analyst comparing employment verification data.

**CANDIDATE CLAIMS:**
${JSON.stringify(candidateData, null, 2)}

**HR VERIFIED DATA:**
${JSON.stringify(hrVerifiedData, null, 2)}

Analyze the discrepancies and provide detailed insights. Return JSON:
{
  "overallRisk": "LOW" | "MEDIUM" | "HIGH",
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
    const geminiAnalysis = JSON.parse(cleanJson);

    // Combine rule-based and AI analysis
    return {
      riskScore: ruleBasedResult.riskScore,
      zone: ruleBasedResult.zone,
      overallRisk: geminiAnalysis.overallRisk || ruleBasedResult.zone,
      discrepancies: ruleBasedResult.discrepancies,
      matches: ruleBasedResult.matches,
      matchRate: ruleBasedResult.matchRate,
      recommendation: geminiAnalysis.recommendation,
      summary: geminiAnalysis.summary,
      aiInsights: geminiAnalysis.discrepancies,
      comparedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Comparison Error:', error);

    // Fallback to rule-based only if Gemini fails
    const ruleBasedResult = await compareWithRules(candidateData, hrVerifiedData, clientRules);
    return {
      ...ruleBasedResult,
      overallRisk: ruleBasedResult.zone,
      recommendation: ruleBasedResult.zone === 'GREEN' ? 'PROCEED' : 'INVESTIGATE',
      summary: `${ruleBasedResult.discrepancies.length} discrepancies found. Risk score: ${ruleBasedResult.riskScore}/100`,
      comparedAt: new Date().toISOString()
    };
  }
}

module.exports = { compareData, DEFAULT_CLIENT_RULES };

