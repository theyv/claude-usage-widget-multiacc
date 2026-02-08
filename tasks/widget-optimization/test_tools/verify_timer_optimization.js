// Verification script for US-006: Space-Optimized Timers
// Uses CSS file reading to verify changes (faster than browser startup)

const fs = require('fs');
const path = require('path');

async function verifyTimerOptimization() {
    console.log('Starting timer optimization verification...\n');
    
    const cssPath = path.join(__dirname, '../../../src/renderer/styles.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    
    let allPassed = true;
    
    // AC1: Verify .timer-text font size is reduced to 9px
    console.log('AC1: Checking .timer-text font size...');
    const timerTextMatch = cssContent.match(/\.timer-text\s*{[^}]*font-size:\s*(\d+px)/);
    if (timerTextMatch && timerTextMatch[1] === '9px') {
        console.log('  ✅ PASS: .timer-text font-size is 9px');
    } else {
        const actualSize = timerTextMatch ? timerTextMatch[1] : 'not found';
        console.log(`  ❌ FAIL: .timer-text font-size is ${actualSize}, expected 9px`);
        allPassed = false;
    }
    
    // AC2: Verify mini-timer SVG size is reduced to 16x16
    console.log('\nAC2: Checking mini-timer SVG dimensions in app.js...');
    const appJsPath = path.join(__dirname, '../../../src/renderer/app.js');
    const appJsContent = fs.readFileSync(appJsPath, 'utf8');
    
    const svgMatches = appJsContent.matchAll(/width="16" height="16"/g);
    if (svgMatches && svgMatches.length > 0) {
        const allCorrect = svgMatches.every(m => m[1] === '16' && m[2] === '16');
        if (allCorrect) {
            console.log(`  ✅ PASS: All ${svgMatches.length} mini-timer SVGs are 16x16`);
        } else {
            console.log('  ❌ FAIL: Mini-timer SVGs have incorrect dimensions:');
            svgMatches.forEach((m, i) => {
                console.log(`    SVG ${i}: ${m[1]}x${m[2]} (expected 16x16)`);
            });
            allPassed = false;
        }
    } else {
        console.log('  ❌ FAIL: No mini-timer SVGs found in app.js');
        allPassed = false;
    }
    
    // AC3: Verify timer-container padding is tightened
    console.log('\nAC3: Checking .timer-container padding...');
    const containerMatch = cssContent.match(/\.timer-container\s*{[^}]*gap:\s*(\d+px)[^}]*padding-left:\s*(\d+px)/);
    if (containerMatch) {
        const gapCorrect = containerMatch[1] === '4px';
        const paddingLeftCorrect = containerMatch[2] === '2px';
        
        if (gapCorrect && paddingLeftCorrect) {
            console.log(`  ✅ PASS: .timer-container gap is 4px and padding-left is 2px`);
        } else {
            console.log(`  ❌ FAIL: .timer-container padding incorrect:`);
            console.log(`    gap: ${containerMatch[1]} (expected 4px)`);
            console.log(`    padding-left: ${containerMatch[2]} (expected 2px)`);
            allPassed = false;
        }
    } else {
        console.log('  ❌ FAIL: .timer-container styles not found in CSS');
        allPassed = false;
    }
    
    console.log('\n' + '='.repeat(50));
    if (allPassed) {
        console.log('✅ ALL ACCEPTANCE CRITERIA PASSED');
        process.exit(0);
    } else {
        console.log('❌ SOME ACCEPTANCE CRITERIA FAILED');
        process.exit(1);
    }
}

verifyTimerOptimization().catch(error => {
    console.error('Error during verification:', error);
    process.exit(1);
});
