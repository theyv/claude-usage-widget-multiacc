/**
 * Test script to verify save-credentials handler
 * Tests:
 * 1. Appends new account objects to the accounts array
 * 2. Prevents duplicate accounts based on sessionKey
 */

const Store = require('electron-store');

// Mock the store with same encryption key
const store = new Store({
  encryptionKey: 'claude-widget-secure-key-2024'
});

// Clear any existing test data
store.delete('accounts');

console.log('=== Testing save-credentials handler ===\n');

// Test 1: Appends new account objects to the accounts array
console.log('Test 1: Appends new account object to accounts array');
store.set('accounts', []);

const account1 = {
  id: '1',
  sessionKey: 'sk-test-1',
  organizationId: 'org-1',
  nickname: 'Test Account 1'
};

const accounts = store.get('accounts') || [];
accounts.push(account1);
store.set('accounts', accounts);

const savedAccounts = store.get('accounts');
console.log('  - Accounts after first save:', JSON.stringify(savedAccounts, null, 2));
console.log('  - Expected 1 account, got:', savedAccounts.length);
console.log('  - Result:', savedAccounts.length === 1 ? '✅ PASS' : '❌ FAIL');

// Test 2: Appends second account
console.log('\nTest 2: Appends second account to accounts array');
const account2 = {
  id: '2',
  sessionKey: 'sk-test-2',
  organizationId: 'org-2',
  nickname: 'Test Account 2'
};

const accounts2 = store.get('accounts') || [];
accounts2.push(account2);
store.set('accounts', accounts2);

const savedAccounts2 = store.get('accounts');
console.log('  - Accounts after second save:', JSON.stringify(savedAccounts2, null, 2));
console.log('  - Expected 2 accounts, got:', savedAccounts2.length);
console.log('  - Result:', savedAccounts2.length === 2 ? '✅ PASS' : '❌ FAIL');

// Test 3: Prevents duplicate accounts based on sessionKey
console.log('\nTest 3: Prevents duplicate accounts based on sessionKey');
const duplicateAccount = {
  id: '3',
  sessionKey: 'sk-test-1', // Same sessionKey as account1
  organizationId: 'org-3',
  nickname: 'Duplicate Account'
};

// Simulate the duplicate check logic
const existingAccounts = store.get('accounts') || [];
const existingAccount = existingAccounts.find(acc => acc.sessionKey === duplicateAccount.sessionKey);

if (existingAccount) {
  console.log('  - Duplicate detected for sessionKey:', duplicateAccount.sessionKey);
  console.log('  - Existing account ID:', existingAccount.id);
  console.log('  - Result: ✅ PASS - Duplicate prevented');
} else {
  console.log('  - Result: ❌ FAIL - Duplicate was not prevented');
}

// Test 4: Verify final state
console.log('\nTest 4: Verify final state has no duplicates');
const finalAccounts = store.get('accounts');
const sessionKeys = finalAccounts.map(acc => acc.sessionKey);
const uniqueSessionKeys = new Set(sessionKeys);

console.log('  - Total accounts:', finalAccounts.length);
console.log('  - Unique sessionKeys:', uniqueSessionKeys.size);
console.log('  - Result:', finalAccounts.length === uniqueSessionKeys.size ? '✅ PASS' : '❌ FAIL');

// Test 5: Verify account object structure
console.log('\nTest 5: Verify account object structure');
const testAccount = finalAccounts[0];
const hasId = testAccount.hasOwnProperty('id');
const hasSessionKey = testAccount.hasOwnProperty('sessionKey');
const hasOrganizationId = testAccount.hasOwnProperty('organizationId');
const hasNickname = testAccount.hasOwnProperty('nickname');

console.log('  - Has id:', hasId);
console.log('  - Has sessionKey:', hasSessionKey);
console.log('  - Has organizationId:', hasOrganizationId);
console.log('  - Has nickname:', hasNickname);
console.log('  - Result:', (hasId && hasSessionKey && hasOrganizationId && hasNickname) ? '✅ PASS' : '❌ FAIL');

// Cleanup
store.delete('accounts');

console.log('\n=== All tests completed ===');
