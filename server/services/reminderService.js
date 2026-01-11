const cron = require('node-cron');
const { getAllVerificationRequests, updateVerificationMetadata } = require('./database');
const { hasHRResponded } = require('./googleSheetsService');
const { sendReminderEmail, sendEscalationEmail } = require('./emailService');

let reminderJob = null;

/**
 * Configuration for reminders
 */
const config = {
    enabled: process.env.REMINDER_ENABLED !== 'false',
    intervalHours: parseInt(process.env.REMINDER_INTERVAL_HOURS) || 24,
    maxReminders: parseInt(process.env.MAX_REMINDERS) || 2,
};

/**
 * Check and send reminders for pending verifications
 */
const checkAndSendReminders = async () => {
    try {
        console.log('🔔 Checking for pending verifications needing reminders...');

        const allRequests = await getAllVerificationRequests();

        // Filter email-based verifications that are pending
        const emailVerifications = allRequests.filter(req =>
            req.verificationType === 'EMAIL' &&
            req.status === 'PENDING' &&
            req.googleSheetsId
        );

        for (const request of emailVerifications) {
            try {
                // Check if HR has responded
                const hasResponded = await hasHRResponded(request.googleSheetsId);

                if (hasResponded) {
                    console.log(`✅ HR has responded for ${request.id}, skipping reminder`);
                    continue;
                }

                // Check when last email was sent
                const emailsSent = request.emailsSent || [];
                const lastEmail = emailsSent[emailsSent.length - 1];

                if (!lastEmail) {
                    console.log(`⚠️  No email record for ${request.id}, skipping`);
                    continue;
                }

                const hoursSinceLastEmail = (Date.now() - new Date(lastEmail.timestamp).getTime()) / (1000 * 60 * 60);

                // Check if it's time to send a reminder
                if (hoursSinceLastEmail < config.intervalHours) {
                    console.log(`⏳ Too soon to send reminder for ${request.id} (${hoursSinceLastEmail.toFixed(1)}h ago)`);
                    continue;
                }

                // Count how many reminders have been sent
                const reminderCount = emailsSent.filter(e => e.type.startsWith('REMINDER')).length;

                if (reminderCount >= config.maxReminders) {
                    // Send escalation email before voice call
                    if (!emailsSent.some(e => e.type === 'ESCALATION')) {
                        console.log(`🚨 Sending escalation email for ${request.id}`);

                        await sendEscalationEmail(
                            request.hrEmail,
                            request.candidateData.employeeName,
                            request.googleSheetsUrl,
                            request.id
                        );

                        // Update metadata
                        const updatedEmails = [...emailsSent, {
                            timestamp: new Date().toISOString(),
                            type: 'ESCALATION'
                        }];

                        await updateVerificationMetadata(request.id, {
                            emailsSent: updatedEmails,
                            needsVoiceCall: true
                        });
                    }
                    continue;
                }

                // Send reminder
                const nextReminderNum = reminderCount + 1;
                console.log(`📧 Sending reminder #${nextReminderNum} for ${request.id}`);

                await sendReminderEmail(
                    request.hrEmail,
                    request.candidateData.employeeName,
                    request.googleSheetsUrl,
                    request.id,
                    nextReminderNum
                );

                // Update metadata
                const updatedEmails = [...emailsSent, {
                    timestamp: new Date().toISOString(),
                    type: `REMINDER_${nextReminderNum}`
                }];

                await updateVerificationMetadata(request.id, {
                    emailsSent: updatedEmails
                });

            } catch (error) {
                console.error(`Error processing reminder for ${request.id}:`, error);
            }
        }

        console.log('✅ Reminder check complete');

    } catch (error) {
        console.error('Error in reminder service:', error);
    }
};

/**
 * Start the reminder scheduler
 */
const startReminderService = () => {
    if (!config.enabled) {
        console.log('⚠️  Reminder service is disabled');
        return;
    }

    // Run every hour
    reminderJob = cron.schedule('0 * * * *', checkAndSendReminders);

    console.log('✅ Reminder service started (runs every hour)');
};

/**
 * Stop the reminder scheduler
 */
const stopReminderService = () => {
    if (reminderJob) {
        reminderJob.stop();
        console.log('🛑 Reminder service stopped');
    }
};

/**
 * Manually trigger reminder check (for testing/dashboard)
 */
const triggerReminderCheck = async () => {
    console.log('🔔 Manual reminder check triggered');
    await checkAndSendReminders();
};

/**
 * Send a manual reminder for a specific verification
 */
const sendManualReminder = async (requestId) => {
    try {
        const allRequests = await getAllVerificationRequests();
        const request = allRequests.find(r => r.id === requestId);

        if (!request) {
            throw new Error('Verification request not found');
        }

        if (request.verificationType !== 'EMAIL') {
            throw new Error('Not an email-based verification');
        }

        // Check if HR has already responded
        const hasResponded = await hasHRResponded(request.googleSheetsId);
        if (hasResponded) {
            return { success: false, message: 'HR has already responded' };
        }

        const emailsSent = request.emailsSent || [];
        const reminderCount = emailsSent.filter(e => e.type.startsWith('REMINDER')).length;

        await sendReminderEmail(
            request.hrEmail,
            request.candidateData.employeeName,
            request.googleSheetsUrl,
            request.id,
            reminderCount + 1
        );

        // Update metadata
        const updatedEmails = [...emailsSent, {
            timestamp: new Date().toISOString(),
            type: `REMINDER_${reminderCount + 1}`,
            manual: true
        }];

        await updateVerificationMetadata(request.id, {
            emailsSent: updatedEmails
        });

        return { success: true, message: 'Reminder sent successfully' };

    } catch (error) {
        console.error('Error sending manual reminder:', error);
        throw error;
    }
};

module.exports = {
    startReminderService,
    stopReminderService,
    triggerReminderCheck,
    sendManualReminder,
    config
};
