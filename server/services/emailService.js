const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
require('dotenv').config();

let transporter = null;

/**
 * Initialize email transporter
 */
const initEmailService = () => {
    try {
        // Check if email is configured
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            console.warn('⚠️  Email credentials not configured. Using mock mode.');
            return null;
        }

        const emailService = process.env.EMAIL_SERVICE || 'gmail';

        transporter = nodemailer.createTransport({
            service: emailService,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        console.log('✅ Email service initialized');
        return transporter;
    } catch (error) {
        console.error('❌ Email service initialization error:', error.message);
        return null;
    }
};

/**
 * Email templates
 */
const templates = {
    initialVerification: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .info-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 TrustCheck Background Verification</h1>
        </div>
        <div class="content">
            <p>Dear HR Manager,</p>
            
            <p>We are conducting a background verification for <strong>{{candidateName}}</strong> who has applied for a position at a new organization.</p>
            
            <div class="info-box">
                <h3>📋 What We Need:</h3>
                <p>Please verify the employment details by filling out the Google Sheet linked below. It will only take 2-3 minutes.</p>
            </div>
            
            <p style="text-align: center;">
                <a href="{{sheetUrl}}" class="button">📝 Open Verification Form</a>
            </p>
            
            <div class="info-box">
                <h3>ℹ️ Information to Verify:</h3>
                <ul>
                    <li>Employment dates</li>
                    <li>Job title/designation</li>
                    <li>Salary/CTC</li>
                    <li>Reason for leaving</li>
                    <li>Eligibility for rehire</li>
                </ul>
            </div>
            
            <p><strong>Verification ID:</strong> {{requestId}}</p>
            
            <p>If you have any questions, please reply to this email.</p>
            
            <p>Thank you for your cooperation!</p>
            
            <p>Best regards,<br><strong>TrustCheck AI Team</strong></p>
        </div>
        <div class="footer">
            <p>This is an automated verification request from TrustCheck AI</p>
            <p>Powered by Gemini AI</p>
        </div>
    </div>
</body>
</html>
    `,

    reminder: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .alert-box { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ Reminder: Verification Pending</h1>
        </div>
        <div class="content">
            <p>Dear HR Manager,</p>
            
            <div class="alert-box">
                <p><strong>This is reminder #{{reminderCount}}</strong></p>
                <p>We haven't received a response for the background verification of <strong>{{candidateName}}</strong>.</p>
            </div>
            
            <p>We kindly request you to complete the verification form at your earliest convenience.</p>
            
            <p style="text-align: center;">
                <a href="{{sheetUrl}}" class="button">📝 Complete Verification Form</a>
            </p>
            
            <p><strong>Verification ID:</strong> {{requestId}}</p>
            
            <p>If you're unable to verify, please reply to this email with the reason.</p>
            
            <p>Thank you!</p>
            
            <p>Best regards,<br><strong>TrustCheck AI Team</strong></p>
        </div>
        <div class="footer">
            <p>This is an automated reminder from TrustCheck AI</p>
        </div>
    </div>
</body>
</html>
    `,

    finalEscalation: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #fa709a; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .urgent-box { background: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚨 Final Notice: Verification Required</h1>
        </div>
        <div class="content">
            <p>Dear HR Manager,</p>
            
            <div class="urgent-box">
                <p><strong>⚠️ This is our final email reminder</strong></p>
                <p>We have not received verification for <strong>{{candidateName}}</strong> despite previous reminders.</p>
            </div>
            
            <p>Please complete the verification form immediately:</p>
            
            <p style="text-align: center;">
                <a href="{{sheetUrl}}" class="button">📝 Complete Verification NOW</a>
            </p>
            
            <div class="urgent-box">
                <p><strong>Next Steps:</strong></p>
                <p>If we don't receive a response within 24 hours, we will attempt to contact you via phone call to complete the verification.</p>
            </div>
            
            <p><strong>Verification ID:</strong> {{requestId}}</p>
            
            <p>If there are any issues preventing you from completing this verification, please reply to this email immediately.</p>
            
            <p>Thank you for your urgent attention to this matter.</p>
            
            <p>Best regards,<br><strong>TrustCheck AI Team</strong></p>
        </div>
        <div class="footer">
            <p>This is a final automated notice from TrustCheck AI</p>
        </div>
    </div>
</body>
</html>
    `
};

// Add this to your emailService.js - Updated sendVerificationEmail function

/**
 * Send initial verification email with Google Sheets link
 * UPDATED: Now includes checkId in subject for better tracking
 */
async function sendVerificationEmail(hrEmail, candidateName, sheetUrl, requestId, checkId = null) {
    try {
        // Mock mode
        if (!transporter) {
            console.log('=================================================');
            console.log('📧 MOCK EMAIL: Initial Verification');
            console.log(`To: ${hrEmail}`);
            console.log(`Subject: Background Verification Request - ${candidateName} [Check: ${checkId || requestId}]`);
            console.log(`Sheet URL: ${sheetUrl}`);
            console.log(`Check ID: ${checkId || requestId}`);
            console.log('=================================================');

            // Log activity even in mock mode
            if (checkId) {
                const { logActivity } = require('./database');
                const template = handlebars.compile(templates.initialVerification);
                const htmlBody = template({
                    candidateName,
                    sheetUrl,
                    requestId: checkId || requestId,
                    checkId: checkId || requestId
                });

                await logActivity('check', checkId, 'EMAIL_SENT', `Verification email sent to ${hrEmail}`, {
                    hrEmail,
                    subject: `Background Verification Request - ${candidateName} [Check: ${checkId || requestId}]`,
                    emailBody: htmlBody,  // Store full HTML for proper rendering
                    googleSheetsUrl: sheetUrl,
                    status: 'SENT',
                    messageId: `mock_${Date.now()}`
                });
            }

            return { success: true, messageId: `mock_${Date.now()}`, isMock: true };
        }

        const template = handlebars.compile(templates.initialVerification);
        const html = template({
            candidateName,
            sheetUrl,
            requestId: checkId || requestId,
            checkId: checkId || requestId
        });

        // Include check ID in subject for easier tracking
        const subject = `Background Verification Request - ${candidateName} [Check: ${checkId || requestId}]`;

        const mailOptions = {
            from: `TrustCheck AI <${process.env.EMAIL_USER}>`,
            to: hrEmail,
            subject: subject,
            html: html,
            // Add custom headers for better threading
            headers: {
                'X-TrustCheck-ID': checkId || requestId,
                'X-Check-Type': 'EMPLOYMENT_VERIFICATION'
            }
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Verification email sent to ${hrEmail}: ${info.messageId}`);

        // Log activity with message ID for tracking
        if (checkId) {
            const { logActivity } = require('./database');
            await logActivity('check', checkId, 'EMAIL_SENT', `Verification email sent to ${hrEmail}`, {
                hrEmail,
                subject: mailOptions.subject,
                emailBody: html,  // Store full HTML for proper rendering
                googleSheetsUrl: sheetUrl,
                status: 'SENT',
                messageId: info.messageId,
                gmailMessageId: info.messageId
            });
        }

        return { success: true, messageId: info.messageId, isMock: false };
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw error;
    }
}

/**
 * Send reminder email
 */
async function sendReminderEmail(hrEmail, candidateName, sheetUrl, requestId, reminderCount) {
    try {
        // Mock mode
        if (!transporter) {
            console.log('=================================================');
            console.log(`📧 MOCK EMAIL: Reminder #${reminderCount}`);
            console.log(`To: ${hrEmail}`);
            console.log(`Subject: Reminder ${reminderCount}: Verification Pending - ${candidateName}`);
            console.log(`Sheet URL: ${sheetUrl}`);
            console.log('=================================================');
            return { success: true, messageId: `mock_reminder_${Date.now()}`, isMock: true };
        }

        const template = handlebars.compile(templates.reminder);
        const html = template({ candidateName, sheetUrl, requestId, reminderCount });

        const mailOptions = {
            from: `TrustCheck AI <${process.env.EMAIL_USER}>`,
            to: hrEmail,
            subject: `Reminder ${reminderCount}: Verification Pending - ${candidateName}`,
            html: html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Reminder ${reminderCount} sent to ${hrEmail}: ${info.messageId}`);

        return { success: true, messageId: info.messageId, isMock: false };
    } catch (error) {
        console.error('Error sending reminder email:', error);
        throw error;
    }
}

/**
 * Send final escalation email before voice call
 */
async function sendEscalationEmail(hrEmail, candidateName, sheetUrl, requestId) {
    try {
        // Mock mode
        if (!transporter) {
            console.log('=================================================');
            console.log('📧 MOCK EMAIL: Final Escalation');
            console.log(`To: ${hrEmail}`);
            console.log(`Subject: URGENT: Final Notice - Verification Required - ${candidateName}`);
            console.log('=================================================');
            return { success: true, messageId: `mock_escalation_${Date.now()}`, isMock: true };
        }

        const template = handlebars.compile(templates.finalEscalation);
        const html = template({ candidateName, sheetUrl, requestId });

        const mailOptions = {
            from: `TrustCheck AI <${process.env.EMAIL_USER}>`,
            to: hrEmail,
            subject: `URGENT: Final Notice - Verification Required - ${candidateName}`,
            html: html,
            priority: 'high',
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Escalation email sent to ${hrEmail}: ${info.messageId}`);

        return { success: true, messageId: info.messageId, isMock: false };
    } catch (error) {
        console.error('Error sending escalation email:', error);
        throw error;
    }
}

module.exports = {
    initEmailService,
    sendVerificationEmail,
    sendReminderEmail,
    sendEscalationEmail
};
