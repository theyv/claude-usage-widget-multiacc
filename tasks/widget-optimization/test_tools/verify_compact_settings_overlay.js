/**
 * Verify Compact Settings Overlay CSS (US-009)
 * 
 * This test verifies that the settings overlay has been made more compact
 * by checking CSS values for reduced padding and font sizes.
 */

const fs = require('fs');
const path = require('path');

// Read the CSS file
const cssPath = path.join(__dirname, '../../../src/renderer/styles.css');
const cssContent = fs.readFileSync(cssPath, 'utf-8');

console.log('=== Verifying Compact Settings Overlay (US-009) ===\n');

// Test results
const results = {
  passed: [],
  failed: []
};

/**
 * Extract CSS value for a specific property from a selector
 */
function extractCssValue(cssContent, selector, property) {
  // Find the selector block - CSS selectors start with . for classes
  const selectorRegex = new RegExp(`${selector.replace(/\./g, '\\.')}\\s*\\{([^}]+)\\}`, 's');
  const match = cssContent.match(selectorRegex);
  
  if (!match) {
    return null;
  }
  
  const block = match[1];
  // Match property at start of line or preceded by whitespace to avoid partial matches
  const propRegex = new RegExp(`(?:^|\\n)\\s*${property}\\s*:\\s*([^;]+);`, 'm');
  const propMatch = block.match(propRegex);
  
  return propMatch ? propMatch[1].trim() : null;
}

/**
 * Verify CSS value matches expected
 */
function verifyCssValue(selector, property, expectedValue, description) {
  const actualValue = extractCssValue(cssContent, selector, property);
  const passed = actualValue === expectedValue;
  
  if (passed) {
    results.passed.push(`${description}: ${selector} { ${property}: ${actualValue} }`);
    console.log(`✅ PASS: ${description}`);
    console.log(`   ${selector} { ${property}: ${actualValue} }\n`);
  } else {
    results.failed.push(`${description}: expected ${expectedValue}, got ${actualValue}`);
    console.log(`❌ FAIL: ${description}`);
    console.log(`   ${selector} { ${property}: expected ${expectedValue}, got ${actualValue} }\n`);
  }
  
  return passed;
}

// AC1: Reduce padding and font sizes in .settings-content
console.log('--- AC1: Reduce padding and font sizes in .settings-content ---');
verifyCssValue('settings-content', 'padding', '0 16px', 'Settings content padding reduced');
verifyCssValue('settings-content', 'gap', '8px', 'Settings content gap reduced');

// AC2: Shrink account item rows and buttons in settings list
console.log('--- AC2: Shrink account item rows and buttons in settings list ---');
verifyCssValue('settings-section-title', 'font-size', '12px', 'Settings section title font size reduced');
verifyCssValue('settings-section-title', 'margin-bottom', '8px', 'Settings section title margin reduced');

verifyCssValue('accounts-list', 'gap', '6px', 'Accounts list gap reduced');
verifyCssValue('accounts-list', 'margin-bottom', '12px', 'Accounts list margin reduced');

verifyCssValue('account-item', 'padding', '6px 10px', 'Account item padding reduced');

verifyCssValue('account-info', 'gap', '6px', 'Account info gap reduced');

// Verify buttons are compact
verifyCssValue('edit-account-btn', 'padding', '4px 8px', 'Edit account button padding reduced');
verifyCssValue('edit-account-btn', 'font-size', '9px', 'Edit account button font size reduced');

verifyCssValue('save-nickname-btn', 'padding', '4px 8px', 'Save nickname button padding reduced');
verifyCssValue('save-nickname-btn', 'font-size', '9px', 'Save nickname button font size reduced');

verifyCssValue('cancel-nickname-btn', 'padding', '4px 8px', 'Cancel nickname button padding reduced');
verifyCssValue('cancel-nickname-btn', 'font-size', '9px', 'Cancel nickname button font size reduced');

verifyCssValue('remove-account-btn', 'padding', '4px 8px', 'Remove account button padding reduced');
verifyCssValue('remove-account-btn', 'font-size', '9px', 'Remove account button font size reduced');

verifyCssValue('add-account-btn', 'padding', '6px 12px', 'Add account button padding reduced');
verifyCssValue('add-account-btn', 'font-size', '10px', 'Add account button font size reduced');

verifyCssValue('logout-btn', 'padding', '5px 10px', 'Logout button padding reduced');
verifyCssValue('logout-btn', 'font-size', '10px', 'Logout button font size reduced');

verifyCssValue('icon-close-settings-btn', 'padding', '4px', 'Icon close settings button padding reduced');
verifyCssValue('icon-close-settings-btn', 'font-size', '18px', 'Icon close settings button font size reduced');
verifyCssValue('icon-close-settings-btn', 'width', '26px', 'Icon close settings button width reduced');
verifyCssValue('icon-close-settings-btn', 'height', '26px', 'Icon close settings button height reduced');

// Summary
console.log('=== Summary ===');
console.log(`Total Passed: ${results.passed.length}`);
console.log(`Total Failed: ${results.failed.length}`);

if (results.failed.length > 0) {
  console.log('\nFailed checks:');
  results.failed.forEach(fail => console.log(`  - ${fail}`));
  process.exit(1);
} else {
  console.log('\n✅ All checks passed!');
  process.exit(0);
}
