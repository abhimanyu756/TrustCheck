const twilio = require('twilio');
const { GoogleGenAI } = require("@google/genai");
require('dotenv').config();

// Initialize Twilio client
const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// Initialize Gemini AI
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = "gemini-2.5-flash";

// Store active call sessions
const activeCalls = new Map();

/**
 * Initiate an outbound call to HR for verification
 */
async function initiateHRCall(checkId, hrPhone, candidateData) {
    try {
        console.log(`📞 Initiating call to HR at ${hrPhone} for check ${checkId}`);

        const baseUrl = process.env.BASE_URL;
        if (!baseUrl) {
            throw new Error('BASE_URL not configured. Please set ngrok URL in .env');
        }

        // Store call session data
        activeCalls.set(checkId, {
            status: 'INITIATING',
            hrPhone,
            candidateData,
            conversation: [],
            responses: {},
            questionIndex: 0,
            startTime: new Date().toISOString()
        });

        // Create inline TwiML for conversational speech flow
        // Uses speech recognition for natural conversation
        const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Aditi" language="en-IN">Hello, this is an automated call from TrustCheck, a background verification service. We are conducting an employment verification for ${candidateData.employeeName} who claims to have worked at ${candidateData.companyName}.</Say>
    
    <Say voice="Polly.Aditi" language="en-IN">I will ask you a few questions. Please speak your answer clearly after each question.</Say>
    
    <Say voice="Polly.Aditi" language="en-IN">First question: Am I speaking with someone from the HR department?</Say>
    <Gather input="speech" timeout="5" speechTimeout="auto" language="en-IN" action="${baseUrl}/api/calls/webhook/speech?checkId=${checkId}&amp;q=1" method="POST">
    </Gather>
    <Say voice="Polly.Aditi" language="en-IN">I didn't hear you. Let me repeat. Are you from HR?</Say>
    <Gather input="speech" timeout="5" speechTimeout="auto" language="en-IN" action="${baseUrl}/api/calls/webhook/speech?checkId=${checkId}&amp;q=1" method="POST">
    </Gather>
    <Say voice="Polly.Aditi" language="en-IN">Sorry, I could not hear you. I will call back later. Goodbye.</Say>
    <Hangup/>
</Response>`;

        // Make the outbound call with inline TwiML
        const call = await twilioClient.calls.create({
            to: hrPhone,
            from: process.env.TWILIO_PHONE_NUMBER,
            twiml: twimlResponse,  // Use inline TwiML instead of URL
            statusCallback: `${baseUrl}/api/calls/webhook/status?checkId=${checkId}`,
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            timeout: 60
        });

        // Update session with call SID
        const session = activeCalls.get(checkId);
        session.callSid = call.sid;
        session.status = 'RINGING';
        activeCalls.set(checkId, session);

        console.log(`✅ Call initiated with SID: ${call.sid}`);

        // Log activity
        const { logActivity } = require('./database');
        await logActivity('check', checkId, 'CALL_INITIATED', `AI call initiated to HR at ${hrPhone}`, {
            callSid: call.sid,
            hrPhone,
            employeeName: candidateData.employeeName
        });

        return {
            success: true,
            callSid: call.sid,
            status: 'RINGING',
            message: 'Call initiated successfully'
        };
    } catch (error) {
        console.error('Error initiating call:', error);
        throw error;
    }
}

/**
 * Generate TwiML for call answered - initial greeting
 */
function generateAnswerTwiML(checkId) {
    const session = activeCalls.get(checkId);
    if (!session) {
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' }, 'Sorry, there was an error. Goodbye.');
        twiml.hangup();
        return twiml.toString();
    }

    const { candidateData } = session;
    const baseUrl = process.env.BASE_URL;

    const twiml = new twilio.twiml.VoiceResponse();

    // Initial greeting
    twiml.say(
        { voice: 'Polly.Aditi', language: 'en-IN' },
        `Hello, this is an automated call from TrustCheck, a background verification service. ` +
        `We are conducting an employment verification for ${candidateData.employeeName} who claims to have worked at ${candidateData.companyName}. ` +
        `Am I speaking with someone from the HR department?`
    );

    // Gather speech response
    const gather = twiml.gather({
        input: 'speech',
        speechTimeout: 'auto',
        language: 'en-IN',
        action: `${baseUrl}/api/calls/webhook/gather?checkId=${checkId}&question=0`,
        method: 'POST'
    });

    // If no response, try again
    twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' }, 'I did not hear a response. Let me try again.');
    twiml.redirect(`${baseUrl}/api/calls/webhook/answer?checkId=${checkId}`);

    // Update session
    session.status = 'IN_PROGRESS';
    session.currentQuestion = 'HR_CONFIRMATION';
    activeCalls.set(checkId, session);

    return twiml.toString();
}

/**
 * Verification questions to ask HR
 */
const VERIFICATION_QUESTIONS = [
    {
        id: 'HR_CONFIRMATION',
        question: (data) => `Am I speaking with someone from the HR department of ${data.companyName}?`,
        field: 'hrConfirmed'
    },
    {
        id: 'EMPLOYEE_WORKED',
        question: (data) => `Can you confirm if ${data.employeeName} worked at ${data.companyName}?`,
        field: 'employeeWorked'
    },
    {
        id: 'EMPLOYMENT_DATES',
        question: (data) => `What were ${data.employeeName}'s dates of employment? We have ${data.employmentDates || 'dates not provided'} on record.`,
        field: 'employmentDates'
    },
    {
        id: 'DESIGNATION',
        question: (data) => `What was ${data.employeeName}'s job title or designation? We have ${data.designation || 'designation not provided'} on record.`,
        field: 'designation'
    },
    {
        id: 'EXIT_TYPE',
        question: (data) => `Was ${data.employeeName}'s exit from the company voluntary or involuntary?`,
        field: 'exitType'
    },
    {
        id: 'REHIRE',
        question: (data) => `Would your company consider re-hiring ${data.employeeName}?`,
        field: 'rehireEligible'
    }
];

/**
 * Process gathered speech and continue conversation
 */
async function processGatheredSpeech(checkId, questionIndex, speechResult) {
    try {
        const session = activeCalls.get(checkId);
        if (!session) {
            throw new Error('Call session not found');
        }

        const { candidateData } = session;
        const baseUrl = process.env.BASE_URL;

        // Store the response
        const currentQuestion = VERIFICATION_QUESTIONS[questionIndex];
        session.responses[currentQuestion.field] = speechResult;
        session.conversation.push({
            question: currentQuestion.question(candidateData),
            answer: speechResult,
            timestamp: new Date().toISOString()
        });

        console.log(`📝 Q: ${currentQuestion.id} | A: ${speechResult}`);

        // Move to next question
        const nextIndex = questionIndex + 1;
        session.questionIndex = nextIndex;
        activeCalls.set(checkId, session);

        const twiml = new twilio.twiml.VoiceResponse();

        // Check if HR said they're not from HR department (question 0)
        if (questionIndex === 0) {
            const isHR = await analyzeResponse(speechResult, 'Is this person from HR? Answer yes or no.');
            if (!isHR) {
                twiml.say(
                    { voice: 'Polly.Aditi', language: 'en-IN' },
                    'I understand. Could you please transfer me to someone from the HR department? ' +
                    'I will call back later. Thank you for your time. Goodbye.'
                );
                twiml.hangup();
                session.status = 'NEEDS_TRANSFER';
                activeCalls.set(checkId, session);
                return twiml.toString();
            }
        }

        // Check if more questions remain
        if (nextIndex < VERIFICATION_QUESTIONS.length) {
            const nextQuestion = VERIFICATION_QUESTIONS[nextIndex];

            // Generate AI acknowledgment and next question
            const acknowledgment = await generateAIAcknowledgment(speechResult);

            twiml.say(
                { voice: 'Polly.Aditi', language: 'en-IN' },
                `${acknowledgment} ${nextQuestion.question(candidateData)}`
            );

            const gather = twiml.gather({
                input: 'speech',
                speechTimeout: 'auto',
                language: 'en-IN',
                action: `${baseUrl}/api/calls/webhook/gather?checkId=${checkId}&question=${nextIndex}`,
                method: 'POST'
            });

            twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' }, 'I did not hear a response.');
            twiml.redirect(`${baseUrl}/api/calls/webhook/gather?checkId=${checkId}&question=${nextIndex}&retry=true`);
        } else {
            // All questions answered - end call
            twiml.say(
                { voice: 'Polly.Aditi', language: 'en-IN' },
                'Thank you very much for your time and cooperation. ' +
                'This information will help us complete the background verification. ' +
                'Have a great day. Goodbye!'
            );
            twiml.hangup();

            // Mark session as completed
            session.status = 'COMPLETED';
            session.endTime = new Date().toISOString();
            activeCalls.set(checkId, session);

            // Save responses to database
            await saveCallResponses(checkId, session);
        }

        return twiml.toString();
    } catch (error) {
        console.error('Error processing speech:', error);
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' }, 'I apologize, there was an error. Goodbye.');
        twiml.hangup();
        return twiml.toString();
    }
}

/**
 * Generate AI acknowledgment for HR response
 */
async function generateAIAcknowledgment(response) {
    try {
        const result = await genAI.models.generateContent({
            model: MODEL_NAME,
            contents: [`Generate a brief, professional acknowledgment (1 short sentence, max 10 words) for this HR response during a phone verification call: "${response}". Just the acknowledgment, nothing else.`]
        });

        const acknowledgment = result.text.trim();
        return acknowledgment || 'Thank you.';
    } catch (error) {
        console.error('Error generating acknowledgment:', error);
        return 'Thank you.';
    }
}

/**
 * Analyze response using AI
 */
async function analyzeResponse(response, question) {
    try {
        const result = await genAI.models.generateContent({
            model: MODEL_NAME,
            contents: [`Based on this phone response: "${response}", answer this question: ${question}. Reply with only "yes" or "no".`]
        });

        const answer = result.text.trim().toLowerCase();
        return answer.includes('yes');
    } catch (error) {
        console.error('Error analyzing response:', error);
        return true; // Default to yes to continue
    }
}

/**
 * Save call responses to database
 */
async function saveCallResponses(checkId, session) {
    try {
        const { logActivity, updateCheck, getCheck } = require('./database');

        // Log call completion
        await logActivity('check', checkId, 'CALL_COMPLETED',
            `AI verification call completed with ${session.conversation.length} questions answered`, {
            callSid: session.callSid,
            duration: calculateDuration(session.startTime, session.endTime),
            responses: session.responses,
            conversation: session.conversation
        });

        // Update check with call verification data
        const check = await getCheck(checkId);
        if (check) {
            // Store call verification results
            await logActivity('check', checkId, 'CALL_VERIFICATION_DATA',
                'HR responses from phone verification', {
                hrConfirmed: session.responses.hrConfirmed,
                employeeWorked: session.responses.employeeWorked,
                employmentDates: session.responses.employmentDates,
                designation: session.responses.designation,
                exitType: session.responses.exitType,
                rehireEligible: session.responses.rehireEligible,
                verificationMethod: 'PHONE_CALL'
            });
        }

        console.log(`✅ Call responses saved for check ${checkId}`);
        return true;
    } catch (error) {
        console.error('Error saving call responses:', error);
        return false;
    }
}

/**
 * Calculate call duration
 */
function calculateDuration(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate - startDate;
    const diffSecs = Math.floor(diffMs / 1000);
    const mins = Math.floor(diffSecs / 60);
    const secs = diffSecs % 60;
    return `${mins}m ${secs}s`;
}

/**
 * Handle call status updates
 */
function handleCallStatus(checkId, status, callSid) {
    const session = activeCalls.get(checkId);
    if (session) {
        session.twilioStatus = status;
        if (status === 'completed' || status === 'failed' || status === 'busy' || status === 'no-answer') {
            session.status = status.toUpperCase();
            session.endTime = new Date().toISOString();
        }
        activeCalls.set(checkId, session);
        console.log(`📱 Call status update for ${checkId}: ${status}`);
    }
}

/**
 * Get call session status
 */
function getCallSession(checkId) {
    return activeCalls.get(checkId) || null;
}

/**
 * End an active call
 */
async function endCall(checkId) {
    try {
        const session = activeCalls.get(checkId);
        if (!session || !session.callSid) {
            throw new Error('No active call found');
        }

        await twilioClient.calls(session.callSid).update({ status: 'completed' });

        session.status = 'ENDED_BY_USER';
        session.endTime = new Date().toISOString();
        activeCalls.set(checkId, session);

        return { success: true, message: 'Call ended' };
    } catch (error) {
        console.error('Error ending call:', error);
        throw error;
    }
}

module.exports = {
    initiateHRCall,
    generateAnswerTwiML,
    processGatheredSpeech,
    handleCallStatus,
    getCallSession,
    endCall,
    VERIFICATION_QUESTIONS
};
