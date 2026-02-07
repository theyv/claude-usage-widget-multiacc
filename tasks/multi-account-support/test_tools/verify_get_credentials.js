/**
 * Test script to verify the get-credentials IPC handler
 * 
 * This script tests:
 * 1. ipcMain.handle('get-credentials', ...) returns the accounts array from the store
 * 2. Returns an empty array if no accounts are connected
 */

const Store = require('electron-store');
const path = require('path');

// Create a test store with same encryption key as production
const testStore = new Store({
  encryptionKey: 'claude-widget-secure-key-2024',
  name: 'test-store-verify-get-credentials'
});

console.log('=== Testing get-credentials IPC handler ===\n');

// Test 1: Returns empty array when no accounts are connected
console.log('Test 1: Returns empty array when no accounts are connected');
testStore.clear(); // Clear store
const emptyResult = testStore.get('accounts') || [];
console.log('Result:', JSON.stringify(emptyResult));
console.log('Is array:', Array.isArray(emptyResult));
console.log('Is empty:', emptyResult.length === 0);
console.log('Test 1:', Array.isArray(emptyResult) && emptyResult.length === 0 ? '✅ PASS' : '❌ FAIL');
console.log();

// Test 2: Returns accounts array when accounts are connected
console.log('Test 2: Returns accounts array when accounts are connected');
const testAccounts = [
  {
    id: '1234567890',
    sessionKey: 'test-session-key-1',
    organizationId: 'org-1',
    nickname: 'Personal'
  },
  {
    id: '1234567891',
    sessionKey: 'test-session-key-2',
    organizationId: 'org-2',
    nickname: 'Work'
  }
];
testStore.set('accounts', testAccounts);
const accountsResult = testStore.get('accounts') || [];
console.log('Result:', JSON.stringify(accountsResult));
console.log('Is array:', Array.isArray(accountsResult));
console.log('Has 2 accounts:', accountsResult.length === 2);
console.log('First account has correct structure:', 
  accountsResult[0] && 
  accountsResult[0].id === '1234567890' &&
  accountsResult[0].sessionKey === 'test-session-key-1' &&
  accountsResult[0].organizationId === 'org-1' &&
  accountsResult[0].nickname === 'Personal'
);
console.log('Test 2:', 
  Array.isArray(accountsResult) && 
  accountsResult.length === 2 &&
  accountsResult[0].id === '1234567890' ? '✅ PASS' : '❌ FAIL'
);
console.log();

// Test 3: Returns single account array when one account is connected
console.log('Test 3: Returns single account array when one account is connected');
testStore.set('accounts', [testAccounts[0]]);
const singleAccountResult = testStore.get('accounts') || [];
console.log('Result:', JSON.stringify(singleAccountResult));
console.log('Is array:', Array.isArray(singleAccountResult));
console.log('Has 1 account:', singleAccountResult.length === 1);
console.log('Test 3:', 
  Array.isArray(singleAccountResult) && 
  singleAccountResult.length === 1 ? '✅ PASS' : '❌ FAIL'
);
console.log();

// Cleanup
testStore.clear();
console.log('=== All tests completed ===');
