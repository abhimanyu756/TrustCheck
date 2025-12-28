// Mock Email Service for Hackathon Demo
// In production, use NodeMailer with SMTP or Gmail API

async function sendVerificationEmail(hrEmail, candidateName, verificationLink) {
    console.log('=================================================');
    console.log('📧 MOCK EMAIL SENT');
    console.log(`To: ${hrEmail}`);
    console.log(`Subject: Background Verification Request - ${candidateName}`);
    console.log('-------------------------------------------------');
    console.log(`Dear HR Manager,`);
    console.log(``);
    console.log(`TrustCheck AI is verifying the employment of ${candidateName}.`);
    console.log(`Please click the secure link below to chat with our AI agent and verify details.`);
    console.log(``);
    console.log(`👉 Link: ${verificationLink}`);
    console.log('=================================================');

    return true;
}

module.exports = { sendVerificationEmail };
