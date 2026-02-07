const express = require('express');
const router = express.Router();
const {
    initiateHRCall,
    generateAnswerTwiML,
    processGatheredSpeech,
    handleCallStatus,
    getCallSession,
    endCall
} = require('../services/callService');
const { getCheck, getCase } = require('../services/database');

/**
 * POST /api/calls/:checkId/initiate
 * Initiate an AI verification call to HR
 */
router.post('/:checkId/initiate', async (req, res) => {
    try {
        const { checkId } = req.params;
        const { hrPhone } = req.body;

        if (!hrPhone) {
            return res.status(400).json({ error: 'HR phone number is required' });
        }

        // Validate phone number format (basic validation)
        const phoneRegex = /^\+?[1-9]\d{9,14}$/;
        if (!phoneRegex.test(hrPhone.replace(/[\s-]/g, ''))) {
            return res.status(400).json({ error: 'Invalid phone number format. Use format: +91XXXXXXXXXX' });
        }

        // Get check details
        const check = await getCheck(checkId);
        if (!check) {
            return res.status(404).json({ error: 'Check not found' });
        }

        // Get case details for employee name
        const caseData = await getCase(check.caseId);

        // Prepare candidate data
        const candidateData = {
            employeeName: caseData?.employeeName || 'the candidate',
            companyName: check.companyName,
            designation: check.designation,
            employmentDates: check.employmentDates
        };

        // Initiate the call
        const result = await initiateHRCall(checkId, hrPhone, candidateData);

        res.json(result);
    } catch (error) {
        console.error('Error initiating call:', error);
        res.status(500).json({ error: error.message || 'Failed to initiate call' });
    }
});

/**
 * GET /api/calls/:checkId/status
 * Get current call status
 */
router.get('/:checkId/status', (req, res) => {
    try {
        const { checkId } = req.params;
        const session = getCallSession(checkId);

        if (!session) {
            return res.json({
                status: 'NO_CALL',
                message: 'No active or recent call for this check'
            });
        }

        res.json({
            status: session.status,
            callSid: session.callSid,
            startTime: session.startTime,
            endTime: session.endTime,
            questionsAnswered: session.conversation?.length || 0,
            totalQuestions: 6,
            responses: session.responses
        });
    } catch (error) {
        console.error('Error getting call status:', error);
        res.status(500).json({ error: 'Failed to get call status' });
    }
});

/**
 * POST /api/calls/:checkId/end
 * End an active call
 */
router.post('/:checkId/end', async (req, res) => {
    try {
        const { checkId } = req.params;
        const result = await endCall(checkId);
        res.json(result);
    } catch (error) {
        console.error('Error ending call:', error);
        res.status(500).json({ error: error.message || 'Failed to end call' });
    }
});

// ============================================
// TWILIO WEBHOOKS (called by Twilio servers)
// ============================================

/**
 * POST /api/calls/webhook/answer
 * Called when call is answered - provides initial TwiML
 */
router.post('/webhook/answer', (req, res) => {
    try {
        const { checkId } = req.query;
        console.log(`📞 Call answered for check: ${checkId}`);

        const twiml = generateAnswerTwiML(checkId);

        res.type('text/xml');
        res.send(twiml);
    } catch (error) {
        console.error('Error handling answer webhook:', error);
        const twilio = require('twilio');
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say('Sorry, there was an error. Goodbye.');
        twiml.hangup();
        res.type('text/xml');
        res.send(twiml.toString());
    }
});

/**
 * POST /api/calls/webhook/gather
 * Called when speech is gathered - process and continue
 */
router.post('/webhook/gather', async (req, res) => {
    try {
        const { checkId, question, retry } = req.query;
        const speechResult = req.body.SpeechResult || '';

        console.log(`🎤 Speech gathered for check ${checkId}, Q${question}: "${speechResult}"`);

        // If retry and no speech, give up on this question
        if (retry && !speechResult) {
            const twilio = require('twilio');
            const twiml = new twilio.twiml.VoiceResponse();
            twiml.say(
                { voice: 'Polly.Aditi', language: 'en-IN' },
                'I am having trouble hearing you. Let me move on to the next question.'
            );

            // Process with "no response" to skip
            const processedTwiml = await processGatheredSpeech(
                checkId,
                parseInt(question),
                'No response provided'
            );
            res.type('text/xml');
            res.send(processedTwiml);
            return;
        }

        const twiml = await processGatheredSpeech(
            checkId,
            parseInt(question),
            speechResult || 'No response provided'
        );

        res.type('text/xml');
        res.send(twiml);
    } catch (error) {
        console.error('Error handling gather webhook:', error);
        const twilio = require('twilio');
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say('Sorry, there was an error. Goodbye.');
        twiml.hangup();
        res.type('text/xml');
        res.send(twiml.toString());
    }
});

/**
 * POST /api/calls/webhook/status
 * Called for call status updates
 */
router.post('/webhook/status', (req, res) => {
    try {
        const { checkId } = req.query;
        const { CallSid, CallStatus } = req.body;

        console.log(`📱 Call status update - Check: ${checkId}, Status: ${CallStatus}`);

        handleCallStatus(checkId, CallStatus, CallSid);

        res.sendStatus(200);
    } catch (error) {
        console.error('Error handling status webhook:', error);
        res.sendStatus(500);
    }
});

/**
 * POST /api/calls/webhook/dtmf
 * Handle DTMF (keypad) input from the call
 */
router.post('/webhook/dtmf', async (req, res) => {
    try {
        const { checkId, q } = req.query;
        const digits = req.body.Digits || '';
        const questionNum = parseInt(q);

        console.log(`🔢 DTMF received for check ${checkId}, Q${questionNum}: "${digits}"`);

        const session = getCallSession(checkId);
        if (!session) {
            const twilio = require('twilio');
            const twiml = new twilio.twiml.VoiceResponse();
            twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' }, 'Sorry, session expired. Goodbye.');
            twiml.hangup();
            res.type('text/xml');
            return res.send(twiml.toString());
        }

        const { candidateData } = session;
        const baseUrl = process.env.BASE_URL;
        const response = digits === '1' ? 'Yes' : 'No';

        // Store response
        const questionFields = ['hrConfirmed', 'employeeWorked', 'datesConfirmed', 'designationConfirmed', 'exitVoluntary', 'rehireEligible'];
        const field = questionFields[questionNum - 1];
        session.responses[field] = response;
        session.conversation.push({
            question: `Question ${questionNum}`,
            answer: response,
            timestamp: new Date().toISOString()
        });

        const twilio = require('twilio');
        const twiml = new twilio.twiml.VoiceResponse();

        // Questions flow
        const questions = [
            `Question 2: Did ${candidateData.employeeName} work at ${candidateData.companyName}?`,
            `Question 3: Were their employment dates from ${candidateData.employmentDates || 'the dates on record'}?`,
            `Question 4: Was their designation ${candidateData.designation || 'as stated'}?`,
            `Question 5: Was their exit voluntary?`,
            `Question 6: Would you consider re-hiring this person?`
        ];

        const nextQ = questionNum + 1;

        if (digits === '2' && questionNum === 1) {
            // Not HR - end call
            twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' },
                'I understand. Please have someone from HR call us back. Thank you. Goodbye.');
            twiml.hangup();
            session.status = 'NEEDS_HR';
        } else if (nextQ <= 6) {
            // More questions
            twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' },
                `Thank you. ${questions[questionNum - 1]}`);
            const gather = twiml.gather({
                numDigits: 1,
                timeout: 10,
                action: `${baseUrl}/api/calls/webhook/dtmf?checkId=${checkId}&q=${nextQ}`,
                method: 'POST'
            });
            gather.say({ voice: 'Polly.Aditi', language: 'en-IN' }, 'Press 1 for Yes, or 2 for No.');
            twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' }, 'No response received. Goodbye.');
            twiml.hangup();
        } else {
            // All done
            twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' },
                'Thank you very much for your time and cooperation. This information will help us complete the verification. Have a great day. Goodbye!');
            twiml.hangup();
            session.status = 'COMPLETED';
            session.endTime = new Date().toISOString();

            // Log to database
            const { logActivity } = require('../services/database');
            await logActivity('check', checkId, 'CALL_COMPLETED',
                `AI verification call completed with ${session.conversation.length} responses`, {
                callSid: session.callSid,
                responses: session.responses,
                conversation: session.conversation
            });
        }

        res.type('text/xml');
        res.send(twiml.toString());
    } catch (error) {
        console.error('Error handling DTMF webhook:', error);
        const twilio = require('twilio');
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say('Sorry, there was an error. Goodbye.');
        twiml.hangup();
        res.type('text/xml');
        res.send(twiml.toString());
    }
});

/**
 * POST /api/calls/webhook/speech
 * Handle speech input from the call - conversational flow
 */
router.post('/webhook/speech', async (req, res) => {
    try {
        const { checkId, q } = req.query;
        const speechResult = req.body.SpeechResult || '';
        const questionNum = parseInt(q);

        console.log(`🎤 Speech received for check ${checkId}, Q${questionNum}: "${speechResult}"`);

        const session = getCallSession(checkId);
        if (!session) {
            const twilio = require('twilio');
            const twiml = new twilio.twiml.VoiceResponse();
            twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' }, 'Sorry, session expired. Goodbye.');
            twiml.hangup();
            res.type('text/xml');
            return res.send(twiml.toString());
        }

        const { candidateData } = session;
        const baseUrl = process.env.BASE_URL;

        // Store response
        const questionFields = ['hrConfirmed', 'employeeWorked', 'employmentDates', 'designation', 'exitType', 'rehireEligible'];
        const field = questionFields[questionNum - 1];
        session.responses[field] = speechResult;
        session.conversation.push({
            question: `Question ${questionNum}`,
            answer: speechResult,
            timestamp: new Date().toISOString()
        });

        const twilio = require('twilio');
        const twiml = new twilio.twiml.VoiceResponse();

        // Questions for the conversation
        const questions = [
            null, // Q1 is already asked
            `Thank you. Next question: Did ${candidateData.employeeName} work at ${candidateData.companyName}?`,
            `Great. What were their dates of employment? We have ${candidateData.employmentDates || 'dates not provided'} on record.`,
            `Thank you. What was their job title or designation? We have ${candidateData.designation || 'not specified'} on record.`,
            `I see. Was their exit from the company voluntary or involuntary?`,
            `Almost done. Would your company consider re-hiring ${candidateData.employeeName}?`
        ];

        const nextQ = questionNum + 1;

        // Check if person said they are NOT from HR on Q1
        if (questionNum === 1) {
            const lowerSpeech = speechResult.toLowerCase();
            if (lowerSpeech.includes('no') || lowerSpeech.includes('not') || lowerSpeech.includes('wrong')) {
                twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' },
                    'I understand you are not from HR. Could you please transfer me to someone from the HR department? I will call back later. Thank you. Goodbye.');
                twiml.hangup();
                session.status = 'NEEDS_HR';
                res.type('text/xml');
                return res.send(twiml.toString());
            }
        }

        if (nextQ <= 6) {
            // More questions to ask
            twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' }, questions[questionNum]);
            twiml.gather({
                input: 'speech',
                timeout: 8,
                speechTimeout: 'auto',
                language: 'en-IN',
                action: `${baseUrl}/api/calls/webhook/speech?checkId=${checkId}&q=${nextQ}`,
                method: 'POST'
            });
            // If no response, retry once
            twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' }, 'I didn\'t catch that. Could you please repeat?');
            twiml.gather({
                input: 'speech',
                timeout: 5,
                speechTimeout: 'auto',
                language: 'en-IN',
                action: `${baseUrl}/api/calls/webhook/speech?checkId=${checkId}&q=${nextQ}`,
                method: 'POST'
            });
            twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' }, 'Sorry, I could not hear you. Goodbye.');
            twiml.hangup();
        } else {
            // All questions answered
            twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' },
                'Thank you very much for your time and cooperation. This information will help us complete the background verification. Have a great day. Goodbye!');
            twiml.hangup();
            session.status = 'COMPLETED';
            session.endTime = new Date().toISOString();

            // Log to database
            const { logActivity } = require('../services/database');
            await logActivity('check', checkId, 'CALL_COMPLETED',
                `AI verification call completed with ${session.conversation.length} responses`, {
                callSid: session.callSid,
                responses: session.responses,
                conversation: session.conversation
            });
        }

        res.type('text/xml');
        res.send(twiml.toString());
    } catch (error) {
        console.error('Error handling speech webhook:', error);
        const twilio = require('twilio');
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say('Sorry, there was an error. Goodbye.');
        twiml.hangup();
        res.type('text/xml');
        res.send(twiml.toString());
    }
});

module.exports = router;
