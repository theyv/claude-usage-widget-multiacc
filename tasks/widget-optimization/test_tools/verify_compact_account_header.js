/**
 * Verify US-004: Compact Account Header Design
 * 
 * This script verifies:
 * 1. .account-header has reduced padding and font-size
 * 2. .account-nickname has reduced font-size
 * 3. .expired-badge fits in compact header
 */

const puppeteer = require('puppeteer');

async function verifyCompactAccountHeader() {
    console.log('Starting verification for US-004: Compact Account Header Design...\n');

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--start-maximized']
    });

    try {
        const page = await browser.newPage();
        
        // Navigate to the app (assuming it's running locally)
        await page.goto('file:///' + __dirname + '/../../src/renderer/index.html', {
            waitUntil: 'networkidle0'
        });

        // Wait for the page to load
        await page.waitForTimeout(1000);

        console.log('=== Verification Results ===\n');

        // AC1: Verify .account-header has reduced padding and font-size
        console.log('AC1: Verify .account-header has reduced height and padding');
        const headerStyles = await page.evaluate(() => {
            const header = document.querySelector('.account-header');
            if (!header) return null;
            const computed = window.getComputedStyle(header);
            return {
                paddingTop: computed.paddingTop,
                paddingBottom: computed.paddingBottom,
                fontSize: computed.fontSize,
                height: computed.height
            };
        });

        if (headerStyles) {
            console.log(`  Padding Top: ${headerStyles.paddingTop}`);
            console.log(`  Padding Bottom: ${headerStyles.paddingBottom}`);
            console.log(`  Font Size: ${headerStyles.fontSize}`);
            console.log(`  Height: ${headerStyles.height}`);
            
            const paddingTop = parseFloat(headerStyles.paddingTop);
            const paddingBottom = parseFloat(headerStyles.paddingBottom);
            const fontSize = parseFloat(headerStyles.fontSize);
            
            const paddingReduced = paddingTop <= 3 && paddingBottom <= 3;
            const fontSizeReduced = fontSize <= 11;
            
            console.log(`  Padding Reduced (≤3px): ${paddingReduced ? '✅ PASS' : '❌ FAIL'}`);
            console.log(`  Font Size Reduced (≤11px): ${fontSizeReduced ? '✅ PASS' : '❌ FAIL'}`);
        } else {
            console.log('  ❌ FAIL: .account-header not found');
        }

        // AC2: Verify .account-nickname has reduced font-size
        console.log('\nAC2: Verify .account-nickname has decreased font size');
        const nicknameStyles = await page.evaluate(() => {
            const nickname = document.querySelector('.account-nickname');
            if (!nickname) return null;
            const computed = window.getComputedStyle(nickname);
            return {
                fontSize: computed.fontSize
            };
        });

        if (nicknameStyles) {
            console.log(`  Font Size: ${nicknameStyles.fontSize}`);
            const fontSize = parseFloat(nicknameStyles.fontSize);
            const fontSizeReduced = fontSize <= 10;
            console.log(`  Font Size Reduced (≤10px): ${fontSizeReduced ? '✅ PASS' : '❌ FAIL'}`);
        } else {
            console.log('  ❌ FAIL: .account-nickname not found');
        }

        // AC3: Verify .expired-badge fits in compact header
        console.log('\nAC3: Verify Expired badge fits in compact header');
        const badgeStyles = await page.evaluate(() => {
            const badge = document.querySelector('.expired-badge');
            if (!badge) return null;
            const computed = window.getComputedStyle(badge);
            return {
                paddingTop: computed.paddingTop,
                paddingBottom: computed.paddingBottom,
                paddingLeft: computed.paddingLeft,
                paddingRight: computed.paddingRight,
                fontSize: computed.fontSize,
                borderRadius: computed.borderRadius
            };
        });

        if (badgeStyles) {
            console.log(`  Padding Top/Bottom: ${badgeStyles.paddingTop} / ${badgeStyles.paddingBottom}`);
            console.log(`  Padding Left/Right: ${badgeStyles.paddingLeft} / ${badgeStyles.paddingRight}`);
            console.log(`  Font Size: ${badgeStyles.fontSize}`);
            console.log(`  Border Radius: ${badgeStyles.borderRadius}`);
            
            const paddingTop = parseFloat(badgeStyles.paddingTop);
            const paddingBottom = parseFloat(badgeStyles.paddingBottom);
            const paddingLeft = parseFloat(badgeStyles.paddingLeft);
            const paddingRight = parseFloat(badgeStyles.paddingRight);
            const fontSize = parseFloat(badgeStyles.fontSize);
            
            const paddingCompact = paddingTop <= 1 && paddingBottom <= 1 && paddingLeft <= 6 && paddingRight <= 6;
            const fontSizeCompact = fontSize <= 8;
            
            console.log(`  Padding Compact: ${paddingCompact ? '✅ PASS' : '❌ FAIL'}`);
            console.log(`  Font Size Compact (≤8px): ${fontSizeCompact ? '✅ PASS' : '❌ FAIL'}`);
        } else {
            console.log('  ⏭️ SKIPPED: .expired-badge not found (may not be present in current state)');
        }

        console.log('\n=== Verification Complete ===');
        
    } catch (error) {
        console.error('Error during verification:', error);
    } finally {
        await browser.close();
    }
}

verifyCompactAccountHeader().catch(console.error);
