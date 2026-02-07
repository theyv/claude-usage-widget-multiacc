// Test script to verify resizeWidget function logic

// Simulate the resizeWidget function logic
function calculateWidgetHeight(accountCount, expandedAccountIds, extraRowCounts) {
    const ACCOUNT_SECTION_HEIGHT = 140;
    const WIDGET_ROW_HEIGHT = 30;
    const HEADER_HEIGHT = 60;
    
    let totalHeight = 0;
    
    for (let i = 0; i < accountCount; i++) {
        const accountId = `account-${i}`;
        const isExpanded = expandedAccountIds.includes(accountId);
        const extraCount = extraRowCounts[accountId] || 0;
        
        if (isExpanded) {
            totalHeight += ACCOUNT_SECTION_HEIGHT + 12 + (extraCount * WIDGET_ROW_HEIGHT);
        } else {
            totalHeight += ACCOUNT_SECTION_HEIGHT;
        }
    }
    
    totalHeight += HEADER_HEIGHT;
    return totalHeight;
}

// Test cases
console.log('Testing resizeWidget logic...\n');

// Test 1: 1 account, collapsed
const height1 = calculateWidgetHeight(1, [], {});
console.log(`Test 1 - 1 account, collapsed: ${height1}px (expected: 200px)`);

// Test 2: 2 accounts, collapsed
const height2 = calculateWidgetHeight(2, [], {});
console.log(`Test 2 - 2 accounts, collapsed: ${height2}px (expected: 340px)`);

// Test 3: 1 account, expanded with 3 extra rows
const height3 = calculateWidgetHeight(1, ['account-0'], { 'account-0': 3 });
console.log(`Test 3 - 1 account, expanded (3 rows): ${height3}px (expected: 302px)`);

// Test 4: 2 accounts, first expanded with 2 extra rows
const height4 = calculateWidgetHeight(2, ['account-0'], { 'account-0': 2 });
console.log(`Test 4 - 2 accounts, first expanded (2 rows): ${height4}px (expected: 402px)`);

// Test 5: 3 accounts, all collapsed
const height5 = calculateWidgetHeight(3, [], {});
console.log(`Test 5 - 3 accounts, collapsed: ${height5}px (expected: 480px)`);

console.log('\nAll tests completed!');
