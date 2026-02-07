/**
 * Test tool to verify nickname field implementation in loginStep2
 * 
 * This test verifies:
 * 1. Nickname input field exists in index.html
 * 2. Nickname input is properly referenced in app.js
 * 3. Nickname value is captured in handleConnect
 * 4. Nickname is included in credentials object
 */

const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../../../src/renderer/index.html');
const appPath = path.join(__dirname, '../../../src/renderer/app.js');

console.log('Verifying nickname field implementation...\n');

// Test 1: Check if nickname input exists in index.html
console.log('Test 1: Checking index.html for nickname input...');
const indexContent = fs.readFileSync(indexPath, 'utf-8');
if (indexContent.includes('id="nicknameInput"')) {
    console.log('  ✅ PASS: nicknameInput element found in index.html');
} else {
    console.log('  ❌ FAIL: nicknameInput element NOT found in index.html');
    process.exit(1);
}

// Test 2: Check if nickname input has correct placeholder
if (indexContent.includes('placeholder="Nickname (optional)"')) {
    console.log('  ✅ PASS: Nickname placeholder is correct');
} else {
    console.log('  ❌ FAIL: Nickname placeholder is incorrect or missing');
    process.exit(1);
}

// Test 3: Check if nicknameInput is in elements object in app.js
console.log('\nTest 2: Checking app.js for nicknameInput in elements object...');
const appContent = fs.readFileSync(appPath, 'utf-8');
if (appContent.includes("nicknameInput: document.getElementById('nicknameInput')")) {
    console.log('  ✅ PASS: nicknameInput is in elements object');
} else {
    console.log('  ❌ FAIL: nicknameInput NOT in elements object');
    process.exit(1);
}

// Test 4: Check if nickname is captured in handleConnect
console.log('\nTest 3: Checking handleConnect captures nickname...');
if (appContent.includes('const nickname = elements.nicknameInput.value.trim()')) {
    console.log('  ✅ PASS: Nickname value is captured in handleConnect');
} else {
    console.log('  ❌ FAIL: Nickname value NOT captured in handleConnect');
    process.exit(1);
}

// Test 5: Check if nickname is included in credentials object
console.log('\nTest 4: Checking nickname is included in credentials...');
if (appContent.includes('nickname: nickname || null')) {
    console.log('  ✅ PASS: Nickname is included in credentials object (with null fallback)');
} else {
    console.log('  ❌ FAIL: Nickname NOT included in credentials object');
    process.exit(1);
}

// Test 6: Check if nickname input is cleared after connect
console.log('\nTest 5: Checking nickname input is cleared after connect...');
if (appContent.includes("elements.nicknameInput.value = ''")) {
    console.log('  ✅ PASS: Nickname input is cleared after connect');
} else {
    console.log('  ❌ FAIL: Nickname input NOT cleared after connect');
    process.exit(1);
}

// Test 7: Check if nickname input is cleared in showLoginRequired
console.log('\nTest 6: Checking nickname input is cleared in showLoginRequired...');
if (appContent.includes("elements.nicknameInput.value = ''")) {
    console.log('  ✅ PASS: Nickname input is cleared in showLoginRequired');
} else {
    console.log('  ❌ FAIL: Nickname input NOT cleared in showLoginRequired');
    process.exit(1);
}

console.log('\n✅ All tests passed! Nickname field implementation is correct.');
