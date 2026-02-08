/**
 * Verify US-004: Compact Account Header Design (CSS Direct Verification)
 * 
 * This script verifies the CSS file directly:
 * 1. .account-header has reduced padding and font-size
 * 2. .account-nickname has reduced font-size
 * 3. .expired-badge fits in compact header
 */

const fs = require('fs');
const path = require('path');

function verifyCompactAccountHeader() {
    console.log('Starting verification for US-004: Compact Account Header Design...\n');

    const cssPath = path.join(__dirname, '../../../src/renderer/styles.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    console.log('=== Verification Results ===\n');

    // AC1: Verify .account-header has reduced padding and font-size
    console.log('AC1: Verify .account-header has reduced height and padding');
    
    const headerMatch = cssContent.match(/\.account-header\s*{([^}]+)}/);
    if (headerMatch) {
        const headerContent = headerMatch[1];
        
        const paddingMatch = headerContent.match(/padding:\s*([^;]+);/);
        const fontSizeMatch = headerContent.match(/font-size:\s*([^;]+);/);
        
        console.log(`  Padding: ${paddingMatch ? paddingMatch[1] : 'NOT FOUND'}`);
        console.log(`  Font Size: ${fontSizeMatch ? fontSizeMatch[1] : 'NOT FOUND'}`);
        
        const paddingReduced = paddingMatch && paddingMatch[1].includes('3px 0');
        const fontSizeReduced = fontSizeMatch && fontSizeMatch[1].includes('11px');
        
        console.log(`  Padding Reduced (3px 0): ${paddingReduced ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`  Font Size Reduced (11px): ${fontSizeReduced ? '✅ PASS' : '❌ FAIL'}`);
        
        const ac1Pass = paddingReduced && fontSizeReduced;
        console.log(`  AC1 Overall: ${ac1Pass ? '✅ PASS' : '❌ FAIL'}`);
    } else {
        console.log('  ❌ FAIL: .account-header not found in CSS');
    }

    // AC2: Verify .account-nickname has reduced font-size
    console.log('\nAC2: Verify .account-nickname has decreased font size');
    
    const nicknameMatch = cssContent.match(/\.account-nickname\s*{([^}]+)}/);
    if (nicknameMatch) {
        const nicknameContent = nicknameMatch[1];
        
        const fontSizeMatch = nicknameContent.match(/font-size:\s*([^;]+);/);
        
        console.log(`  Font Size: ${fontSizeMatch ? fontSizeMatch[1] : 'NOT FOUND'}`);
        
        const fontSizeReduced = fontSizeMatch && fontSizeMatch[1].includes('10px');
        
        console.log(`  Font Size Reduced (10px): ${fontSizeReduced ? '✅ PASS' : '❌ FAIL'}`);
        
        const ac2Pass = fontSizeReduced;
        console.log(`  AC2 Overall: ${ac2Pass ? '✅ PASS' : '❌ FAIL'}`);
    } else {
        console.log('  ❌ FAIL: .account-nickname not found in CSS');
    }

    // AC3: Verify .expired-badge fits in compact header
    console.log('\nAC3: Verify Expired badge fits in compact header');
    
    const badgeMatch = cssContent.match(/\.expired-badge\s*{([^}]+)}/);
    if (badgeMatch) {
        const badgeContent = badgeMatch[1];
        
        const paddingMatch = badgeContent.match(/padding:\s*([^;]+);/);
        const fontSizeMatch = badgeContent.match(/font-size:\s*([^;]+);/);
        const borderRadiusMatch = badgeContent.match(/border-radius:\s*([^;]+);/);
        
        console.log(`  Padding: ${paddingMatch ? paddingMatch[1] : 'NOT FOUND'}`);
        console.log(`  Font Size: ${fontSizeMatch ? fontSizeMatch[1] : 'NOT FOUND'}`);
        console.log(`  Border Radius: ${borderRadiusMatch ? borderRadiusMatch[1] : 'NOT FOUND'}`);
        
        const paddingCompact = paddingMatch && paddingMatch[1].includes('1px 6px');
        const fontSizeCompact = fontSizeMatch && fontSizeMatch[1].includes('8px');
        const borderRadiusCompact = borderRadiusMatch && borderRadiusMatch[1].includes('3px');
        
        console.log(`  Padding Compact (1px 6px): ${paddingCompact ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`  Font Size Compact (8px): ${fontSizeCompact ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`  Border Radius Compact (3px): ${borderRadiusCompact ? '✅ PASS' : '❌ FAIL'}`);
        
        const ac3Pass = paddingCompact && fontSizeCompact && borderRadiusCompact;
        console.log(`  AC3 Overall: ${ac3Pass ? '✅ PASS' : '❌ FAIL'}`);
    } else {
        console.log('  ⏭️ SKIPPED: .expired-badge not found in CSS');
    }

    console.log('\n=== Verification Complete ===');
}

verifyCompactAccountHeader();
