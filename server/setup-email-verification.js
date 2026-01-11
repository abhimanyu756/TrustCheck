#!/usr/bin/env node

/**
 * Interactive setup script for Google Sheets and Email configuration
 * Run: node setup-email-verification.js
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
    console.log('\n🔧 TrustCheck Email Verification Setup\n');
    console.log('This script will help you configure Google Sheets and Email services.\n');

    const setupChoice = await question('What would you like to set up?\n1. Gmail only\n2. Google Sheets only\n3. Both\n\nChoice (1/2/3): ');

    let emailConfig = '';
    let sheetsConfig = '';

    // Email Setup
    if (setupChoice === '1' || setupChoice === '3') {
        console.log('\n📧 Gmail Setup\n');
        console.log('You need a Gmail App Password. Follow these steps:');
        console.log('1. Enable 2-Factor Authentication on your Gmail');
        console.log('2. Go to: https://myaccount.google.com/apppasswords');
        console.log('3. Create an app password for "Mail"');
        console.log('4. Copy the 16-character password\n');

        const emailUser = await question('Enter your Gmail address: ');
        const emailPassword = await question('Enter your Gmail App Password (16 chars): ');

        emailConfig = `
# Email Service Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=${emailUser}
EMAIL_PASSWORD=${emailPassword}
`;
    }

    // Google Sheets Setup
    if (setupChoice === '2' || setupChoice === '3') {
        console.log('\n📊 Google Sheets Setup\n');
        console.log('You need a Google Cloud Service Account. Follow these steps:');
        console.log('1. Go to: https://console.cloud.google.com/');
        console.log('2. Create/select a project');
        console.log('3. Enable "Google Sheets API" and "Google Drive API"');
        console.log('4. Create Service Account → Generate JSON key');
        console.log('5. Download the JSON file\n');

        const jsonPath = await question('Enter the path to your service account JSON file: ');

        try {
            const jsonContent = fs.readFileSync(jsonPath.trim(), 'utf8');
            const credentials = JSON.parse(jsonContent);

            sheetsConfig = `
# Google Sheets API Configuration
GOOGLE_SHEETS_CLIENT_EMAIL=${credentials.client_email}
GOOGLE_SHEETS_PRIVATE_KEY="${credentials.private_key}"
`;
        } catch (error) {
            console.error('\n❌ Error reading JSON file:', error.message);
            console.log('\nPlease manually add these to your .env file:');
            console.log('GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com');
            console.log('GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYour key\\n-----END PRIVATE KEY-----\\n"');
        }
    }

    // Read existing .env
    const envPath = path.join(__dirname, '.env');
    let existingEnv = '';

    if (fs.existsSync(envPath)) {
        existingEnv = fs.readFileSync(envPath, 'utf8');

        // Remove old email/sheets config if exists
        existingEnv = existingEnv.replace(/# Email Service Configuration[\s\S]*?(?=\n#|$)/g, '');
        existingEnv = existingEnv.replace(/# Google Sheets API Configuration[\s\S]*?(?=\n#|$)/g, '');
        existingEnv = existingEnv.replace(/EMAIL_SERVICE=.*\n/g, '');
        existingEnv = existingEnv.replace(/EMAIL_USER=.*\n/g, '');
        existingEnv = existingEnv.replace(/EMAIL_PASSWORD=.*\n/g, '');
        existingEnv = existingEnv.replace(/GOOGLE_SHEETS_CLIENT_EMAIL=.*\n/g, '');
        existingEnv = existingEnv.replace(/GOOGLE_SHEETS_PRIVATE_KEY=.*\n/g, '');
    }

    // Append new config
    const newEnv = existingEnv.trim() + '\n' + emailConfig + sheetsConfig;

    // Write to .env
    fs.writeFileSync(envPath, newEnv.trim() + '\n');

    console.log('\n✅ Configuration saved to .env file!');
    console.log('\n🔄 Please restart your server for changes to take effect:');
    console.log('   npm run dev\n');

    rl.close();
}

main().catch(error => {
    console.error('Error:', error);
    rl.close();
    process.exit(1);
});
