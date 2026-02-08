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

/**
 * Education verification email template
 */
const educationVerificationTemplate = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2e7d32 0%, #4caf50 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #2e7d32; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .info-box { background: white; padding: 15px; border-left: 4px solid #2e7d32; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 Education Verification Request</h1>
        </div>
        <div class="content">
            <p>Dear Registrar/Controller of Examinations,</p>
            
            <p>We are conducting an education background verification for <strong>{{studentName}}</strong> who claims to have studied at your institution.</p>
            
            <div class="info-box">
                <h3>📋 What We Need:</h3>
                <p>Please verify the education credentials by filling out the Google Sheet linked below. It will only take 2-3 minutes.</p>
            </div>
            
            <p style="text-align: center;">
                <a href="{{sheetUrl}}" class="button">📝 Open Verification Form</a>
            </p>
            
            <div class="info-box">
                <h3>ℹ️ Information to Verify:</h3>
                <ul>
                    <li>Student enrollment status</li>
                    <li>Degree/qualification awarded</li>
                    <li>Year of passing</li>
                    <li>Grades/CGPA/Percentage</li>
                    <li>Authenticity of certificate</li>
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
`;

/**
 * Send education verification email to university registrar
 */
async function sendEducationVerificationEmail(registrarEmail, studentName, sheetUrl, requestId, checkId = null) {
    try {
        // Mock mode
        if (!transporter) {
            console.log('=================================================');
            console.log('📧 MOCK EMAIL: Education Verification');
            console.log(`To: ${registrarEmail}`);
            console.log(`Subject: Education Verification Request - ${studentName} [Check: ${checkId || requestId}]`);
            console.log(`Sheet URL: ${sheetUrl}`);
            console.log(`Check ID: ${checkId || requestId}`);
            console.log('=================================================');

            // Log activity even in mock mode
            if (checkId) {
                const { logActivity } = require('./database');
                const template = handlebars.compile(educationVerificationTemplate);
                const htmlBody = template({
                    studentName,
                    sheetUrl,
                    requestId: checkId || requestId
                });

                await logActivity('check', checkId, 'EDUCATION_EMAIL_SENT', `Education verification email sent to ${registrarEmail}`, {
                    registrarEmail,
                    subject: `Education Verification Request - ${studentName} [Check: ${checkId || requestId}]`,
                    emailBody: htmlBody,
                    googleSheetsUrl: sheetUrl,
                    status: 'SENT',
                    messageId: `mock_edu_${Date.now()}`
                });
            }

            return { success: true, messageId: `mock_edu_${Date.now()}`, isMock: true };
        }

        const template = handlebars.compile(educationVerificationTemplate);
        const html = template({
            studentName,
            sheetUrl,
            requestId: checkId || requestId
        });

        const subject = `Education Verification Request - ${studentName} [Check: ${checkId || requestId}]`;

        const mailOptions = {
            from: `TrustCheck AI <${process.env.EMAIL_USER}>`,
            to: registrarEmail,
            subject: subject,
            html: html,
            headers: {
                'X-TrustCheck-ID': checkId || requestId,
                'X-Check-Type': 'EDUCATION_VERIFICATION'
            }
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Education verification email sent to ${registrarEmail}: ${info.messageId}`);

        // Log activity
        if (checkId) {
            const { logActivity } = require('./database');
            await logActivity('check', checkId, 'EDUCATION_EMAIL_SENT', `Education verification email sent to ${registrarEmail}`, {
                registrarEmail,
                subject: mailOptions.subject,
                emailBody: html,
                googleSheetsUrl: sheetUrl,
                status: 'SENT',
                messageId: info.messageId
            });
        }

        return { success: true, messageId: info.messageId, isMock: false };
    } catch (error) {
        console.error('Error sending education verification email:', error);
        throw error;
    }
}

/**
 * Police verification email template
 */
const policeVerificationTemplate = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1a237e 0%, #3949ab 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #1a237e; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .info-box { background: white; padding: 15px; border-left: 4px solid #1a237e; margin: 20px 0; }
        .alert-box { background: #fff3e0; padding: 15px; border-left: 4px solid #ff9800; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚔 Police Verification Request</h1>
        </div>
        <div class="content">
            <p>Dear Sir/Madam,</p>
            
            <p>We are conducting a background verification for <strong>{{candidateName}}</strong> as part of an employment screening process.</p>
            
            <div class="info-box">
                <h3>📋 Verification Required:</h3>
                <p>Please verify the following details by filling out the Google Sheet linked below. Your official input is essential for completing this background check.</p>
            </div>
            
            <p style="text-align: center;">
                <a href="{{sheetUrl}}" class="button">📝 Open Verification Form</a>
            </p>
            
            <div class="alert-box">
                <h3>⚠️ Important Note:</h3>
                <p>This is an official background verification request. Please verify the candidate's address, criminal history, and general character as per standard police verification procedures.</p>
            </div>
            
            <div class="info-box">
                <h3>ℹ️ Information to Verify:</h3>
                <ul>
                    <li>Address verification</li>
                    <li>Criminal record check</li>
                    <li>Pending cases status</li>
                    <li>General character assessment</li>
                    <li>Neighbor/Landlord references</li>
                </ul>
            </div>
            
            <p><strong>Verification ID:</strong> {{requestId}}</p>
            
            <p>If you have any questions, please reply to this email.</p>
            
            <p>Thank you for your cooperation!</p>
            
            <p>Best regards,<br><strong>TrustCheck AI Team</strong></p>
        </div>
        <div class="footer">
            <p>This is an automated verification request from TrustCheck AI</p>
            <p>Background Verification System - Powered by Gemini AI</p>
        </div>
    </div>
</body>
</html>
`;

/**
 * Send police verification email to local police station
 */
async function sendPoliceVerificationEmail(policeEmail, candidateName, sheetUrl, requestId, checkId = null) {
    try {
        // Mock mode
        if (!transporter) {
            console.log('=================================================');
            console.log('📧 MOCK EMAIL: Police Verification');
            console.log(`To: ${policeEmail}`);
            console.log(`Subject: Police Verification Request - ${candidateName} [Check: ${checkId || requestId}]`);
            console.log(`Sheet URL: ${sheetUrl}`);
            console.log(`Check ID: ${checkId || requestId}`);
            console.log('=================================================');

            // Log activity even in mock mode
            if (checkId) {
                const { logActivity } = require('./database');
                const template = handlebars.compile(policeVerificationTemplate);
                const htmlBody = template({
                    candidateName,
                    sheetUrl,
                    requestId: checkId || requestId
                });

                await logActivity('check', checkId, 'POLICE_EMAIL_SENT', `Police verification email sent to ${policeEmail}`, {
                    policeEmail,
                    subject: `Police Verification Request - ${candidateName} [Check: ${checkId || requestId}]`,
                    emailBody: htmlBody,
                    googleSheetsUrl: sheetUrl,
                    status: 'SENT',
                    messageId: `mock_police_${Date.now()}`
                });
            }

            return { success: true, messageId: `mock_police_${Date.now()}`, isMock: true };
        }

        const template = handlebars.compile(policeVerificationTemplate);
        const html = template({
            candidateName,
            sheetUrl,
            requestId: checkId || requestId
        });

        const subject = `Police Verification Request - ${candidateName} [Check: ${checkId || requestId}]`;

        const mailOptions = {
            from: `TrustCheck AI <${process.env.EMAIL_USER}>`,
            to: policeEmail,
            subject: subject,
            html: html,
            headers: {
                'X-TrustCheck-ID': checkId || requestId,
                'X-Check-Type': 'POLICE_VERIFICATION'
            }
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Police verification email sent to ${policeEmail}: ${info.messageId}`);

        // Log activity
        if (checkId) {
            const { logActivity } = require('./database');
            await logActivity('check', checkId, 'POLICE_EMAIL_SENT', `Police verification email sent to ${policeEmail}`, {
                policeEmail,
                subject: mailOptions.subject,
                emailBody: html,
                googleSheetsUrl: sheetUrl,
                status: 'SENT',
                messageId: info.messageId
            });
        }

        return { success: true, messageId: info.messageId, isMock: false };
    } catch (error) {
        console.error('Error sending police verification email:', error);
        throw error;
    }
}

/**
 * Client Report Email Template
 */
const clientReportTemplate = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 700px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .summary-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .green-zone { border-left: 4px solid #10b981; }
        .red-zone { border-left: 4px solid #ef4444; }
        .employee-list { margin: 10px 0; padding: 0; }
        .employee-item { padding: 10px; margin: 5px 0; background: #f8f9fa; border-radius: 4px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; }
        .badge-green { background: #d1fae5; color: #065f46; }
        .badge-red { background: #fee2e2; color: #991b1b; }
        .stats-grid { display: flex; gap: 15px; margin: 20px 0; }
        .stat-card { flex: 1; text-align: center; padding: 15px; background: white; border-radius: 8px; }
        .stat-number { font-size: 24px; font-weight: bold; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 Verification Report</h1>
            <p>TrustCheck AI Background Verification</p>
        </div>
        <div class="content">
            <p>Dear {{clientName}},</p>
            
            <p>Please find below the verification summary report for your organization.</p>
            
            <div class="stats-grid">
                <div class="stat-card" style="border: 2px solid #10b981;">
                    <div class="stat-number" style="color: #10b981;">{{greenCount}}</div>
                    <div>Green Zone</div>
                </div>
                <div class="stat-card" style="border: 2px solid #ef4444;">
                    <div class="stat-number" style="color: #ef4444;">{{redCount}}</div>
                    <div>Red Zone</div>
                </div>
                <div class="stat-card" style="border: 2px solid #3b82f6;">
                    <div class="stat-number" style="color: #3b82f6;">{{totalChecks}}</div>
                    <div>Total Checks</div>
                </div>
            </div>

            {{#if greenEmployees.length}}
            <div class="summary-box green-zone">
                <h3>✅ Green Zone - Good to Go</h3>
                <p>The following employees have been verified successfully with low risk scores:</p>
                <div class="employee-list">
                    {{#each greenEmployees}}
                    <div class="employee-item">
                        <strong>{{this.employeeName}}</strong>
                        <span class="badge badge-green">Verified</span>
                        <br><small>Check: {{this.checkType}} | Risk Score: {{this.riskScore}}%</small>
                    </div>
                    {{/each}}
                </div>
            </div>
            {{/if}}

            {{#if redEmployees.length}}
            <div class="summary-box red-zone">
                <h3>⚠️ Red Zone - Requires Discussion</h3>
                <p>The following employees require further discussion or review:</p>
                <div class="employee-list">
                    {{#each redEmployees}}
                    <div class="employee-item">
                        <strong>{{this.employeeName}}</strong>
                        <span class="badge badge-red">Needs Review</span>
                        <br><small>Check: {{this.checkType}} | Risk Score: {{this.riskScore}}%</small>
                        {{#if this.reason}}<br><small>Reason: {{this.reason}}</small>{{/if}}
                    </div>
                    {{/each}}
                </div>
            </div>
            {{/if}}

            {{#if sheetUrl}}
            <div style="margin: 25px 0; padding: 20px; background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); border-radius: 12px; text-align: center;">
                <p style="color: white; font-size: 16px; margin: 0 0 15px 0; font-weight: bold;">📊 View Full Report in Google Sheets</p>
                <a href="{{sheetUrl}}" style="display: inline-block; background: white; color: #16a34a; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Open Detailed Report →</a>
            </div>
            {{/if}}

            <p>If you have any questions regarding this report, please feel free to reach out to our verification team.</p>
            
            <p>Best regards,<br><strong>TrustCheck AI Team</strong></p>
        </div>
        <div class="footer">
            <p>This is an automated report from TrustCheck AI</p>
            <p>Powered by Gemini AI | Report generated on {{reportDate}}</p>
        </div>
    </div>
</body>
</html>
`;

/**
 * Send client verification report email
 */
async function sendClientReportEmail(clientEmail, clientName, reportData) {
    try {
        if (!transporter) {
            initEmailService();
        }

        const { greenEmployees = [], redEmployees = [], totalChecks = 0, sheetUrl = null } = reportData;

        const template = handlebars.compile(clientReportTemplate);
        const html = template({
            clientName,
            greenEmployees,
            redEmployees,
            greenCount: greenEmployees.length,
            redCount: redEmployees.length,
            totalChecks,
            sheetUrl,
            reportDate: new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        });

        const mailOptions = {
            from: `"TrustCheck AI" <${process.env.EMAIL_USER}>`,
            to: clientEmail,
            subject: `Verification Report - ${greenEmployees.length} Approved, ${redEmployees.length} Require Review`,
            html
        };

        if (!transporter) {
            console.log('📧 [MOCK] Would send client report email to:', clientEmail);
            console.log('📧 [MOCK] Subject:', mailOptions.subject);
            return { success: true, isMock: true };
        }

        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Client report email sent to ${clientEmail}: ${info.messageId}`);

        return { success: true, messageId: info.messageId, isMock: false };
    } catch (error) {
        console.error('Error sending client report email:', error);
        throw error;
    }
}

module.exports = {
    initEmailService,
    sendVerificationEmail,
    sendReminderEmail,
    sendEscalationEmail,
    sendEducationVerificationEmail,
    sendPoliceVerificationEmail,
    sendClientReportEmail
};
