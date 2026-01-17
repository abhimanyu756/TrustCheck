/**
 * Test script to manually trigger auto-fetch and comparison
 * Run this to immediately check for filled sheets and process them
 */

const { triggerReminderCheck } = require('./services/reminderService');

async function testAutoFetch() {
    console.log('🔄 Manually triggering auto-fetch check...\n');

    try {
        // This will check all pending verifications
        // If HR has filled the sheet, it will:
        // 1. Fetch the data
        // 2. Run comparison
        // 3. Calculate risk score
        // 4. Update status to GREEN/YELLOW/RED
        await triggerReminderCheck();

        console.log('\n✅ Auto-fetch check complete!');
        console.log('📊 Check your dashboard to see updated statuses');

    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}

testAutoFetch();
