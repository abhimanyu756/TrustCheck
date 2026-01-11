// Quick test with mock mode
// This will send real emails but use mock Google Sheets

const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function testWithMockMode() {
    console.log('🧪 Testing Email Verification (Mock Mode)\n');
    console.log('This will:');
    console.log('  ✅ Send REAL email to your Gmail');
    console.log('  ✅ Use mock Google Sheets URL');
    console.log('  ✅ Test complete workflow\n');

    const testData = {
        candidateData: {
            employeeName: "John Doe",
            companyName: "Tech Corp",
            designation: "Senior Developer",
            dates: "Jan 2020 - Dec 2023",
            salary: "₹15 LPA",
            department: "Engineering"
        },
        hrEmail: "abhimanyu81026@gmail.com",
        reminderConfig: {
            enabled: true,
            intervalHours: 24
        }
    };

    try {
        console.log('📤 Sending verification request...\n');

        const response = await axios.post(
            `${API_BASE}/api/email-verification/initiate`,
            testData
        );

        console.log('✅ SUCCESS!\n');
        console.log('📧 Email sent to:', testData.hrEmail);
        console.log('📊 Sheet URL:', response.data.sheetUrl);
        console.log('🆔 Request ID:', response.data.requestId);

        console.log('\n📬 Check your email inbox!');
        console.log('You should receive an email with:');
        console.log('  - Professional HTML template');
        console.log('  - "Open Verification Form" button');
        console.log('  - Mock Google Sheets link\n');

        if (response.data.sheetUrl.includes('mock')) {
            console.log('ℹ️  Running in MOCK MODE');
            console.log('   To use real Google Sheets, see: google_sheets_troubleshooting.md\n');
        }

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);

        if (error.response?.data?.details?.includes('permission')) {
            console.log('\n💡 TIP: Use mock mode for testing!');
            console.log('   Comment out Google Sheets credentials in .env');
            console.log('   See: google_sheets_troubleshooting.md\n');
        }
    }
}

testWithMockMode();
