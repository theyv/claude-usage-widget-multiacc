/**
 * Test tool to verify slim global styles (US-003)
 * 
 * This script uses Puppeteer to verify that:
 * - AC1: .widget-container has reduced border width
 * - AC2: Base font sizes are decreased
 * - AC3: Title bar spacing is tightened
 * 
 * Usage: node verify_slim_styles.js
 */

const puppeteer = require('puppeteer');

async function verifySlimStyles() {
  console.log('🔍 Verifying slim global styles...\n');
  
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    // Navigate to the app (assuming it's running on localhost or file://)
    // For Electron apps, we might need to adjust this
    await page.goto('file://' + __dirname + '/../../../src/renderer/index.html');
    
    // Wait for the page to load
    await page.waitForSelector('.widget-container', { timeout: 5000 });
    
    const results = {
      passed: [],
      failed: []
    };
    
    // AC1: Verify .widget-container border width is reduced
    console.log('📋 AC1: Checking .widget-container border width...');
    const containerBorder = await page.$eval('.widget-container', el => {
      const style = window.getComputedStyle(el);
      return {
        borderWidth: style.borderWidth,
        borderStyle: style.borderStyle
      };
    });
    
    // Border should be 0px (removed) or very thin
    const borderValue = parseInt(containerBorder.borderWidth);
    if (borderValue <= 0) {
      console.log('  ✅ PASS: Border width reduced to', containerBorder.borderWidth);
      results.passed.push('AC1: .widget-container border width reduced');
    } else {
      console.log('  ❌ FAIL: Border width is', containerBorder.borderWidth, '(expected: 0px)');
      results.failed.push('AC1: .widget-container border width not reduced');
    }
    
    // AC2: Verify base font sizes are decreased
    console.log('\n📋 AC2: Checking base font sizes...');
    
    const titleFontSize = await page.$eval('.title', el => {
      return parseInt(window.getComputedStyle(el).fontSize);
    });
    const expectedTitleFontSize = 12; // Reduced from 14px
    if (titleFontSize <= expectedTitleFontSize) {
      console.log(`  ✅ PASS: .title font size is ${titleFontSize}px (≤ ${expectedTitleFontSize}px)`);
      results.passed.push('AC2: .title font size decreased');
    } else {
      console.log(`  ❌ FAIL: .title font size is ${titleFontSize}px (> ${expectedTitleFontSize}px)`);
      results.failed.push('AC2: .title font size not decreased');
    }
    
    const usageLabelFontSize = await page.$eval('.usage-label', el => {
      return parseInt(window.getComputedStyle(el).fontSize);
    });
    const expectedUsageLabelFontSize = 10; // Reduced from 11px
    if (usageLabelFontSize <= expectedUsageLabelFontSize) {
      console.log(`  ✅ PASS: .usage-label font size is ${usageLabelFontSize}px (≤ ${expectedUsageLabelFontSize}px)`);
      results.passed.push('AC2: .usage-label font size decreased');
    } else {
      console.log(`  ❌ FAIL: .usage-label font size is ${usageLabelFontSize}px (> ${expectedUsageLabelFontSize}px)`);
      results.failed.push('AC2: .usage-label font size not decreased');
    }
    
    const timerTextFontSize = await page.$eval('.timer-text', el => {
      return parseInt(window.getComputedStyle(el).fontSize);
    });
    const expectedTimerTextFontSize = 11; // Reduced from 13px
    if (timerTextFontSize <= expectedTimerTextFontSize) {
      console.log(`  ✅ PASS: .timer-text font size is ${timerTextFontSize}px (≤ ${expectedTimerTextFontSize}px)`);
      results.passed.push('AC2: .timer-text font size decreased');
    } else {
      console.log(`  ❌ FAIL: .timer-text font size is ${timerTextFontSize}px (> ${expectedTimerTextFontSize}px)`);
      results.failed.push('AC2: .timer-text font size not decreased');
    }
    
    const accountHeaderFontSize = await page.$eval('.account-header', el => {
      return parseInt(window.getComputedStyle(el).fontSize);
    });
    const expectedAccountHeaderFontSize = 12; // Reduced from 14px
    if (accountHeaderFontSize <= expectedAccountHeaderFontSize) {
      console.log(`  ✅ PASS: .account-header font size is ${accountHeaderFontSize}px (≤ ${expectedAccountHeaderFontSize}px)`);
      results.passed.push('AC2: .account-header font size decreased');
    } else {
      console.log(`  ❌ FAIL: .account-header font size is ${accountHeaderFontSize}px (> ${expectedAccountHeaderFontSize}px)`);
      results.failed.push('AC2: .account-header font size not decreased');
    }
    
    // AC3: Verify title bar spacing is tightened
    console.log('\n📋 AC3: Checking title bar spacing...');
    const titleBarStyles = await page.$eval('.title-bar', el => {
      const style = window.getComputedStyle(el);
      return {
        height: parseInt(style.height),
        paddingTop: parseInt(style.paddingTop),
        paddingBottom: parseInt(style.paddingBottom),
        paddingLeft: parseInt(style.paddingLeft)
      };
    });
    
    const expectedTitleBarHeight = 28; // Reduced from 36px
    if (titleBarStyles.height <= expectedTitleBarHeight) {
      console.log(`  ✅ PASS: .title-bar height is ${titleBarStyles.height}px (≤ ${expectedTitleBarHeight}px)`);
      results.passed.push('AC3: .title-bar height reduced');
    } else {
      console.log(`  ❌ FAIL: .title-bar height is ${titleBarStyles.height}px (> ${expectedTitleBarHeight}px)`);
      results.failed.push('AC3: .title-bar height not reduced');
    }
    
    const expectedTitleBarPadding = 4; // Reduced from 8px
    if (titleBarStyles.paddingTop <= expectedTitleBarPadding && 
        titleBarStyles.paddingBottom <= expectedTitleBarPadding &&
        titleBarStyles.paddingLeft <= expectedTitleBarPadding) {
      console.log(`  ✅ PASS: .title-bar padding is ${titleBarStyles.paddingTop}px ${titleBarStyles.paddingBottom}px ${titleBarStyles.paddingLeft}px (≤ ${expectedTitleBarPadding}px)`);
      results.passed.push('AC3: .title-bar padding reduced');
    } else {
      console.log(`  ❌ FAIL: .title-bar padding is ${titleBarStyles.paddingTop}px ${titleBarStyles.paddingBottom}px ${titleBarStyles.paddingLeft}px (> ${expectedTitleBarPadding}px)`);
      results.failed.push('AC3: .title-bar padding not reduced');
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${results.passed.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    
    if (results.failed.length > 0) {
      console.log('\n❌ FAILED:');
      results.failed.forEach(f => console.log(`  - ${f}`));
    }
    
    if (results.passed.length > 0) {
      console.log('\n✅ PASSED:');
      results.passed.forEach(p => console.log(`  - ${p}`));
    }
    
    // Exit with appropriate code
    process.exit(results.failed.length > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run verification
verifySlimStyles().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
