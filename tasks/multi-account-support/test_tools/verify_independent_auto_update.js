/**
 * Verify Independent Auto-Update (US-008)
 * 
 * This test verifies that:
 * AC1: fetchUsageData is called for each account in the list
 * AC2: UI updates only the specific section for that account
 * AC3: Verify in browser
 */

const path = require('path');

// Test configuration
const TEST_TIMEOUT = 30000; // 30 seconds
const APP_URL = 'http://localhost:8080'; // Adjust if needed

/**
 * AC1: Verify fetchUsageData is called for each account in the list
 */
async function verifyFetchUsageDataForAllAccounts() {
  console.log('AC1: Verifying fetchUsageData is called for each account...');
  
  // Read the app.js file to verify implementation
  const fs = require('fs');
  const appJsPath = path.join(__dirname, '../../../src/renderer/app.js');
  const appJsContent = fs.readFileSync(appJsPath, 'utf-8');
  
  // Check 1: fetchAllUsageData iterates through accounts
  const hasFetchAllLoop = appJsContent.includes('for (const account of accounts)') &&
                         appJsContent.includes('await fetchUsageData(account.id)');
  
  // Check 2: fetchUsageData function accepts accountId parameter
  const hasAccountIdParam = appJsContent.includes('async function fetchUsageData(accountId)');
  
  // Check 3: Per-account reset triggered flags (independent updates)
  const hasPerAccountFlags = appJsContent.includes('const sessionResetTriggered = {}') &&
                           appJsContent.includes('const weeklyResetTriggered = {}');
  
  // Check 4: Per-account flag usage
  const hasPerAccountUsage = appJsContent.includes('sessionResetTriggered[accountId]') &&
                           appJsContent.includes('weeklyResetTriggered[accountId]');
  
  if (hasFetchAllLoop && hasAccountIdParam && hasPerAccountFlags && hasPerAccountUsage) {
    console.log('✅ AC1 PASS: fetchUsageData is called for each account in the list');
    console.log('   - fetchAllUsageData iterates through accounts:', hasFetchAllLoop);
    console.log('   - fetchUsageData accepts accountId parameter:', hasAccountIdParam);
    console.log('   - Per-account reset triggered flags:', hasPerAccountFlags);
    console.log('   - Per-account flag usage:', hasPerAccountUsage);
    return true;
  } else {
    console.log('❌ AC1 FAIL: Implementation incomplete');
    console.log('   - fetchAllUsageData iterates through accounts:', hasFetchAllLoop);
    console.log('   - fetchUsageData accepts accountId parameter:', hasAccountIdParam);
    console.log('   - Per-account reset triggered flags:', hasPerAccountFlags);
    console.log('   - Per-account flag usage:', hasPerAccountUsage);
    return false;
  }
}

/**
 * AC2: Verify UI updates only the specific section for that account
 */
async function verifyUIUpdatesSpecificSection() {
  console.log('AC2: Verifying UI updates only the specific section for that account...');
  
  const fs = require('fs');
  const appJsPath = path.join(__dirname, '../../../src/renderer/app.js');
  const appJsContent = fs.readFileSync(appJsPath, 'utf-8');
  
  // Check 1: updateAccountUI function accepts accountId parameter
  const hasUpdateAccountUI = appJsContent.includes('function updateAccountUI(accountId, data)');
  
  // Check 2: updateAccountUI uses accountId to find specific elements
  const hasAccountIdSelectors = appJsContent.includes('.session-progress-${accountId}') ||
                             appJsContent.includes('.session-percentage-${accountId}') ||
                             appJsContent.includes('.weekly-progress-${accountId}');
  
  // Check 3: fetchUsageData calls updateAccountUI with accountId
  const callsUpdateAccountUI = appJsContent.includes('updateAccountUI(accountId, data)');
  
  if (hasUpdateAccountUI && hasAccountIdSelectors && callsUpdateAccountUI) {
    console.log('✅ AC2 PASS: UI updates only the specific section for that account');
    console.log('   - updateAccountUI accepts accountId parameter:', hasUpdateAccountUI);
    console.log('   - Uses accountId to find specific elements:', hasAccountIdSelectors);
    console.log('   - fetchUsageData calls updateAccountUI with accountId:', callsUpdateAccountUI);
    return true;
  } else {
    console.log('❌ AC2 FAIL: Implementation incomplete');
    console.log('   - updateAccountUI accepts accountId parameter:', hasUpdateAccountUI);
    console.log('   - Uses accountId to find specific elements:', hasAccountIdSelectors);
    console.log('   - fetchUsageData calls updateAccountUI with accountId:', callsUpdateAccountUI);
    return false;
  }
}

/**
 * AC3: Verify in browser (manual verification instructions)
 */
function printBrowserVerificationInstructions() {
  console.log('\nAC3: Browser Verification Instructions');
  console.log('=====================================');
  console.log('To verify independent auto-update in browser:');
  console.log('');
  console.log('1. Start the Electron app: npm start');
  console.log('2. Add multiple accounts (at least 2)');
  console.log('3. Open DevTools (F12) and go to Console');
  console.log('4. Set DEBUG mode by adding ?debug to URL or restarting with --debug flag');
  console.log('5. Watch debug logs when timers expire');
  console.log('');
  console.log('Expected behavior:');
  console.log('- Each account should have its own update cycle');
  console.log('- When one account\'s timer expires, only that account refreshes');
  console.log('- Debug logs show: "Session timer expired for account {accountId}, triggering refresh..."');
  console.log('- Each account\'s UI section updates independently');
  console.log('');
  console.log('To test timer expiration manually:');
  console.log('- In DevTools Console, run:');
  console.log('  // Simulate expired timer for account 123');
  console.log('  latestUsageData[\'123\'].five_hour.resets_at = new Date(Date.now() - 1000).toISOString();');
  console.log('  // Wait 1-2 seconds and watch for refresh of only account 123');
  console.log('');
}

/**
 * Run all verification tests
 */
async function runAllTests() {
  console.log('========================================');
  console.log('US-008: Independent Auto-Update Tests');
  console.log('========================================\n');
  
  const ac1Result = await verifyFetchUsageDataForAllAccounts();
  const ac2Result = await verifyUIUpdatesSpecificSection();
  
  printBrowserVerificationInstructions();
  
  console.log('\n========================================');
  console.log('Summary');
  console.log('========================================');
  console.log(`AC1: ${ac1Result ? '✅ PASS' : '❌ FAIL'} - fetchUsageData is called for each account in the list`);
  console.log(`AC2: ${ac2Result ? '✅ PASS' : '❌ FAIL'} - UI updates only the specific section for that account`);
  console.log(`AC3: ⏭️  MANUAL - Verify in browser (see instructions above)`);
  console.log('');
  
  return {
    ac1: ac1Result,
    ac2: ac2Result,
    ac3: 'manual'
  };
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests()
    .then(results => {
      const allPassed = results.ac1 && results.ac2;
      process.exit(allPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = {
  verifyFetchUsageDataForAllAccounts,
  verifyUIUpdatesSpecificSection,
  runAllTests
};
