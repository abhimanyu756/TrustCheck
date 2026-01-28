const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = "gemini-2.5-flash";

/**
 * Automated Comparison Service
 * Compares HR-verified data with employee-submitted data
 * Applies client-specific rules and assigns to Green/Red zones
 */

/**
 * Main comparison function
 * Compares employee data with HR-verified data and assigns zone
 */
async function compareVerificationData(checkId, employeeData, hrData, clientRules) {
  try {
    console.log(`\n🔍 Starting comparison for check ${checkId}...`);

    // Step 1: Identify discrepancies
    const discrepancies = identifyDiscrepancies(employeeData, hrData);
    console.log(`   Found ${discrepancies.length} discrepancies`);

    // Step 2: Use AI to analyze discrepancies
    const aiAnalysis = await analyzeDiscrepanciesWithAI(employeeData, hrData, discrepancies);

    // Step 3: Evaluate against client rules
    const ruleEvaluation = evaluateClientRules(discrepancies, clientRules, aiAnalysis);

    // Step 4: Calculate risk score
    const riskScore = calculateRiskScore(discrepancies, aiAnalysis, ruleEvaluation);

    // Step 5: Assign zone based on risk score and rules
    const zone = assignZone(riskScore, discrepancies, ruleEvaluation, clientRules);

    const comparisonResults = {
      checkId,
      zone,
      riskScore,
      discrepancies,
      aiAnalysis,
      ruleEvaluation,
      comparedAt: new Date().toISOString(),
      summary: generateSummary(zone, riskScore, discrepancies, aiAnalysis)
    };

    console.log(`   ✅ Comparison complete: Zone=${zone}, Risk Score=${riskScore}`);
    return comparisonResults;

  } catch (error) {
    console.error('Error in comparison:', error);
    throw error;
  }
}

/**
 * Identify discrepancies between employee and HR data
 */
function identifyDiscrepancies(employeeData, hrData) {
  const discrepancies = [];

  // Compare common fields
  const fieldsToCompare = [
    { key: 'employeeName', label: 'Employee Name', type: 'string' },
    { key: 'designation', label: 'Designation', type: 'string' },
    { key: 'employmentDates', label: 'Employment Dates', type: 'date' },
    { key: 'salary', label: 'Salary/CTC', type: 'number' },
    { key: 'reasonForLeaving', label: 'Reason for Leaving', type: 'string' },
    { key: 'eligibleForRehire', label: 'Eligible for Rehire', type: 'boolean' },
    { key: 'performanceRating', label: 'Performance Rating', type: 'string' }
  ];

  for (const field of fieldsToCompare) {
    const employeeValue = employeeData[field.key];
    const hrValue = hrData[field.key];

    if (employeeValue && hrValue) {
      const discrepancy = compareField(field, employeeValue, hrValue);
      if (discrepancy) {
        discrepancies.push(discrepancy);
      }
    }
  }

  return discrepancies;
}

/**
 * Compare individual field values
 */
function compareField(field, employeeValue, hrValue) {
  const employeeStr = String(employeeValue).toLowerCase().trim();
  const hrStr = String(hrValue).toLowerCase().trim();

  if (employeeStr === hrStr) {
    return null; // No discrepancy
  }

  let severity = 'LOW';
  let difference = null;

  // Field-specific comparison logic
  switch (field.type) {
    case 'number':
      // For salary, calculate percentage difference
      const empNum = parseFloat(employeeStr.replace(/[^0-9.]/g, ''));
      const hrNum = parseFloat(hrStr.replace(/[^0-9.]/g, ''));
      if (!isNaN(empNum) && !isNaN(hrNum)) {
        const percentDiff = Math.abs((empNum - hrNum) / hrNum * 100);
        difference = `${percentDiff.toFixed(1)}%`;

        if (percentDiff > 20) severity = 'HIGH';
        else if (percentDiff > 10) severity = 'MEDIUM';
        else severity = 'LOW';
      }
      break;

    case 'date':
      // For dates, check if they're within reasonable range
      severity = 'MEDIUM';
      break;

    case 'boolean':
      // Boolean mismatches are always high severity
      severity = 'HIGH';
      break;

    case 'string':
      // For strings, check similarity
      const similarity = calculateStringSimilarity(employeeStr, hrStr);
      if (similarity < 0.5) severity = 'HIGH';
      else if (similarity < 0.8) severity = 'MEDIUM';
      else severity = 'LOW';
      break;
  }

  return {
    field: field.label,
    fieldKey: field.key,
    employeeValue: employeeValue,
    hrValue: hrValue,
    severity,
    difference
  };
}

/**
 * Calculate string similarity (simple Levenshtein-based)
 */
function calculateStringSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Use Gemini AI to analyze discrepancies
 */
async function analyzeDiscrepanciesWithAI(employeeData, hrData, discrepancies) {
  if (discrepancies.length === 0) {
    return {
      reasoning: 'No discrepancies found. All data matches perfectly.',
      riskLevel: 'LOW',
      recommendations: ['Approve verification'],
      confidence: 1.0
    };
  }

  try {
    const prompt = `You are an expert background verification analyst. Analyze the following discrepancies between employee-submitted data and HR-verified data.

Employee Data:
${JSON.stringify(employeeData, null, 2)}

HR-Verified Data:
${JSON.stringify(hrData, null, 2)}

Discrepancies Found:
${JSON.stringify(discrepancies, null, 2)}

Please analyze:
1. Are these discrepancies significant or minor?
2. Could they be explained by normal variations (e.g., rounding, abbreviations)?
3. Do they indicate potential fraud or just data entry errors?
4. What is the overall risk level: LOW, MEDIUM, or HIGH?
5. Should this verification be auto-approved (GREEN) or require manual review (RED)?

Provide your analysis in JSON format:
{
  "reasoning": "detailed explanation",
  "riskLevel": "LOW|MEDIUM|HIGH",
  "recommendations": ["list of recommendations"],
  "confidence": 0.0-1.0,
  "suggestedZone": "GREEN|RED"
}`;

    const result = await client.models.generateContent({
      model: MODEL_NAME,
      contents: [prompt]
    });
    const response = result.text;

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback if AI doesn't return proper JSON
    return {
      reasoning: response,
      riskLevel: discrepancies.some(d => d.severity === 'HIGH') ? 'HIGH' : 'MEDIUM',
      recommendations: ['Manual review recommended'],
      confidence: 0.7,
      suggestedZone: 'RED'
    };

  } catch (error) {
    console.error('AI analysis error:', error);
    // Fallback to rule-based analysis
    return {
      reasoning: 'AI analysis unavailable. Using rule-based assessment.',
      riskLevel: discrepancies.some(d => d.severity === 'HIGH') ? 'HIGH' : 'MEDIUM',
      recommendations: ['Manual review recommended due to AI unavailability'],
      confidence: 0.5,
      suggestedZone: 'RED'
    };
  }
}

/**
 * Evaluate discrepancies against client-specific rules
 */
function evaluateClientRules(discrepancies, clientRules, aiAnalysis) {
  const evaluation = {
    rulesApplied: [],
    rulesPassed: [],
    rulesFailed: [],
    clientSKU: clientRules?.sku || 'STANDARD'
  };

  // Default rules based on client SKU
  const skuRules = {
    BASIC: {
      maxDiscrepancies: 3,
      allowedSeverity: ['LOW', 'MEDIUM'],
      criticalFields: ['employeeName']
    },
    STANDARD: {
      maxDiscrepancies: 2,
      allowedSeverity: ['LOW'],
      criticalFields: ['employeeName', 'designation']
    },
    PREMIUM: {
      maxDiscrepancies: 1,
      allowedSeverity: ['LOW'],
      criticalFields: ['employeeName', 'designation', 'employmentDates']
    },
    ENTERPRISE: {
      maxDiscrepancies: 0,
      allowedSeverity: [],
      criticalFields: ['employeeName', 'designation', 'employmentDates', 'salary']
    }
  };

  const rules = skuRules[evaluation.clientSKU] || skuRules.STANDARD;

  // Rule 1: Maximum discrepancies
  const rule1 = {
    name: 'Maximum Discrepancies',
    description: `Client allows maximum ${rules.maxDiscrepancies} discrepancies`,
    passed: discrepancies.length <= rules.maxDiscrepancies,
    actual: discrepancies.length,
    expected: `<= ${rules.maxDiscrepancies}`
  };
  evaluation.rulesApplied.push(rule1);
  if (rule1.passed) evaluation.rulesPassed.push(rule1.name);
  else evaluation.rulesFailed.push(rule1.name);

  // Rule 2: Severity check
  const highSeverityCount = discrepancies.filter(d => d.severity === 'HIGH').length;
  const rule2 = {
    name: 'Severity Tolerance',
    description: `High severity discrepancies not allowed for ${evaluation.clientSKU} tier`,
    passed: highSeverityCount === 0 || rules.allowedSeverity.includes('HIGH'),
    actual: `${highSeverityCount} high severity`,
    expected: 'No high severity discrepancies'
  };
  evaluation.rulesApplied.push(rule2);
  if (rule2.passed) evaluation.rulesPassed.push(rule2.name);
  else evaluation.rulesFailed.push(rule2.name);

  // Rule 3: Critical fields must match
  const criticalFieldDiscrepancies = discrepancies.filter(d =>
    rules.criticalFields.includes(d.fieldKey)
  );
  const rule3 = {
    name: 'Critical Fields Match',
    description: `Critical fields (${rules.criticalFields.join(', ')}) must match exactly`,
    passed: criticalFieldDiscrepancies.length === 0,
    actual: criticalFieldDiscrepancies.map(d => d.field).join(', ') || 'All match',
    expected: 'All critical fields match'
  };
  evaluation.rulesApplied.push(rule3);
  if (rule3.passed) evaluation.rulesPassed.push(rule3.name);
  else evaluation.rulesFailed.push(rule3.name);

  return evaluation;
}

/**
 * Calculate overall risk score (0-100)
 */
function calculateRiskScore(discrepancies, aiAnalysis, ruleEvaluation) {
  let score = 0;

  // Base score from discrepancy count (0-30 points)
  score += Math.min(discrepancies.length * 10, 30);

  // Severity-based scoring (0-30 points)
  const severityScores = { LOW: 5, MEDIUM: 10, HIGH: 20 };
  const severityScore = discrepancies.reduce((sum, d) => sum + severityScores[d.severity], 0);
  score += Math.min(severityScore, 30);

  // AI risk level (0-20 points)
  const aiRiskScores = { LOW: 0, MEDIUM: 10, HIGH: 20 };
  score += aiRiskScores[aiAnalysis.riskLevel] || 10;

  // Failed rules (0-20 points)
  score += Math.min(ruleEvaluation.rulesFailed.length * 10, 20);

  return Math.min(score, 100);
}

/**
 * Assign zone based on risk score and rules
 */
function assignZone(riskScore, discrepancies, ruleEvaluation, clientRules) {
  // Auto-assign to RED if any critical rules failed
  if (ruleEvaluation.rulesFailed.length > 0) {
    return 'RED';
  }

  // Use risk score thresholds
  const threshold = clientRules?.riskThreshold || 30;

  if (riskScore <= threshold && discrepancies.length === 0) {
    return 'GREEN';
  } else if (riskScore <= threshold) {
    return 'GREEN'; // Low risk, minor discrepancies
  } else {
    return 'RED'; // High risk, needs manual review
  }
}

/**
 * Generate human-readable summary
 */
function generateSummary(zone, riskScore, discrepancies, aiAnalysis) {
  if (zone === 'GREEN') {
    return {
      status: 'APPROVED',
      message: 'Verification passed all checks. Data matches with acceptable tolerance.',
      details: `Risk Score: ${riskScore}/100. ${discrepancies.length} minor discrepancies found.`,
      action: 'Auto-approved for processing'
    };
  } else {
    return {
      status: 'NEEDS_REVIEW',
      message: 'Verification flagged for manual review due to discrepancies or rule violations.',
      details: `Risk Score: ${riskScore}/100. ${discrepancies.length} discrepancies found.`,
      action: 'Requires supervisor review'
    };
  }
}

module.exports = {
  compareVerificationData,
  identifyDiscrepancies,
  analyzeDiscrepanciesWithAI,
  evaluateClientRules,
  calculateRiskScore,
  assignZone
};
