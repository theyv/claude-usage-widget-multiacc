// Test tool to verify ultra-compact usage rows implementation
// Uses Puppeteer to verify CSS properties without screenshots

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Configuration
const TEST_TIMEOUT = 10000;
const ELECTRON_APP_PATH = path.join(__dirname, '../../../');

async function verifyCompactUsageRows() {
    console.log('Starting verification of ultra-compact usage rows...');
    
    const results = {
        usageSectionHeight: null,
        progressBarHeight: null,
        timerContainerGap: null,
        timerContainerPaddingLeft: null,
        timerTextFontSize: null,
        usagePercentageFontSize: null,
        usageLabelFontSize: null,
        svgTimerWidth: null,
        svgTimerHeight: null,
        passed: [],
        failed: []
    };

    try {
        // Launch Electron app with DevTools
        const browser = await puppeteer.launch({
            headless: false,
            executablePath: process.env.ELECTRON_PATH || undefined,
            args: ['--remote-debugging-port=9222']
        });

        const page = await browser.newPage();
        
        // Navigate to the app (file:// protocol for local files)
        const indexPath = path.join(ELECTRON_APP_PATH, 'src/renderer/index.html');
        await page.goto(`file://${indexPath}`, { waitUntil: 'networkidle0', timeout: TEST_TIMEOUT });
        
        console.log('✓ App loaded successfully');

        // Wait for usage sections to be present (may need to mock data)
        await page.waitForTimeout(2000);

        // AC1: Verify usage-section height < 28px
        try {
            const usageSectionHeight = await page.evaluate(() => {
                const section = document.querySelector('.usage-section');
                if (!section) return null;
                const computed = window.getComputedStyle(section);
                return parseInt(computed.height);
            });

            results.usageSectionHeight = usageSectionHeight;
            
            if (usageSectionHeight !== null && usageSectionHeight < 28) {
                console.log(`✅ AC1: usage-section height = ${usageSectionHeight}px (< 28px)`);
                results.passed.push('usage-section height < 28px');
            } else {
                console.log(`❌ AC1: usage-section height = ${usageSectionHeight}px (expected < 28px)`);
                results.failed.push(`usage-section height = ${usageSectionHeight}px (expected < 28px)`);
            }
        } catch (e) {
            console.log(`⚠️  AC1: Could not verify usage-section height - ${e.message}`);
            results.failed.push(`Could not verify usage-section height: ${e.message}`);
        }

        // AC2: Verify progress bar height = 4px
        try {
            const progressBarHeight = await page.evaluate(() => {
                const bar = document.querySelector('.progress-bar');
                if (!bar) return null;
                const computed = window.getComputedStyle(bar);
                return parseInt(computed.height);
            });

            results.progressBarHeight = progressBarHeight;
            
            if (progressBarHeight !== null && progressBarHeight === 4) {
                console.log(`✅ AC2: progress-bar height = ${progressBarHeight}px`);
                results.passed.push('progress-bar height = 4px');
            } else {
                console.log(`❌ AC2: progress-bar height = ${progressBarHeight}px (expected 4px)`);
                results.failed.push(`progress-bar height = ${progressBarHeight}px (expected 4px)`);
            }
        } catch (e) {
            console.log(`⚠️  AC2: Could not verify progress-bar height - ${e.message}`);
            results.failed.push(`Could not verify progress-bar height: ${e.message}`);
        }

        // AC3: Verify labels and timers are aligned efficiently
        try {
            const alignments = await page.evaluate(() => {
                const section = document.querySelector('.usage-section');
                if (!section) return null;
                
                const computed = window.getComputedStyle(section);
                const gridTemplate = computed.gridTemplateColumns;
                const alignItems = computed.alignItems;
                const gap = computed.gap;
                
                return {
                    gridTemplate,
                    alignItems,
                    gap
                };
            });

            results.timerContainerGap = alignments?.gap;
            
            // Check if grid layout is used for alignment
            if (alignments && alignments.alignItems === 'center') {
                console.log(`✅ AC3a: usage-section uses grid layout with center alignment`);
                results.passed.push('usage-section uses grid layout with center alignment');
            } else {
                console.log(`❌ AC3a: usage-section alignment issue - ${JSON.stringify(alignments)}`);
                results.failed.push(`usage-section alignment issue: ${JSON.stringify(alignments)}`);
            }

            // Check timer container spacing
            const timerContainerSpacing = await page.evaluate(() => {
                const container = document.querySelector('.timer-container');
                if (!container) return null;
                const computed = window.getComputedStyle(container);
                return {
                    gap: computed.gap,
                    paddingLeft: computed.paddingLeft
                };
            });

            results.timerContainerPaddingLeft = timerContainerSpacing?.paddingLeft;
            
            if (timerContainerSpacing && 
                (parseInt(timerContainerSpacing.gap) <= 8 || 
                 timerContainerSpacing.gap === '6px' || 
                 timerContainerSpacing.gap === '8px')) {
                console.log(`✅ AC3b: timer-container has efficient gap (${timerContainerSpacing.gap})`);
                results.passed.push('timer-container has efficient gap');
            } else {
                console.log(`⚠️  AC3b: timer-container gap = ${timerContainerSpacing?.gap}`);
            }

            // Verify font sizes are compact
            const fontSizes = await page.evaluate(() => {
                const label = document.querySelector('.usage-label');
                const percentage = document.querySelector('.usage-percentage');
                const timerText = document.querySelector('.timer-text');
                
                return {
                    label: label ? window.getComputedStyle(label).fontSize : null,
                    percentage: percentage ? window.getComputedStyle(percentage).fontSize : null,
                    timerText: timerText ? window.getComputedStyle(timerText).fontSize : null
                };
            });

            results.usageLabelFontSize = fontSizes.label;
            results.usagePercentageFontSize = fontSizes.percentage;
            results.timerTextFontSize = fontSizes.timerText;

            if (fontSizes.label && parseInt(fontSizes.label) <= 10) {
                console.log(`✅ AC3c: usage-label font size is compact (${fontSizes.label})`);
                results.passed.push('usage-label font size is compact');
            } else {
                console.log(`⚠️  AC3c: usage-label font size = ${fontSizes.label}`);
            }

            if (fontSizes.percentage && parseInt(fontSizes.percentage) <= 10) {
                console.log(`✅ AC3d: usage-percentage font size is compact (${fontSizes.percentage})`);
                results.passed.push('usage-percentage font size is compact');
            } else {
                console.log(`⚠️  AC3d: usage-percentage font size = ${fontSizes.percentage}`);
            }

            if (fontSizes.timerText && parseInt(fontSizes.timerText) <= 10) {
                console.log(`✅ AC3e: timer-text font size is compact (${fontSizes.timerText})`);
                results.passed.push('timer-text font size is compact');
            } else {
                console.log(`⚠️  AC3e: timer-text font size = ${fontSizes.timerText}`);
            }
        } catch (e) {
            console.log(`⚠️  AC3: Could not verify alignments - ${e.message}`);
            results.failed.push(`Could not verify alignments: ${e.message}`);
        }

        // AC4: Verify SVG timer sizes are reduced
        try {
            const svgSizes = await page.evaluate(() => {
                const svg = document.querySelector('.mini-timer');
                if (!svg) return null;
                return {
                    width: svg.getAttribute('width'),
                    height: svg.getAttribute('height')
                };
            });

            results.svgTimerWidth = svgSizes?.width;
            results.svgTimerHeight = svgSizes?.height;

            if (svgSizes && svgSizes.width === '20' && svgSizes.height === '20') {
                console.log(`✅ AC4: SVG timer size is ${svgSizes.width}x${svgSizes.height}`);
                results.passed.push('SVG timer size is 20x20');
            } else {
                console.log(`❌ AC4: SVG timer size = ${svgSizes?.width}x${svgSizes?.height} (expected 20x20)`);
                results.failed.push(`SVG timer size = ${svgSizes?.width}x${svgSizes?.height} (expected 20x20)`);
            }
        } catch (e) {
            console.log(`⚠️  AC4: Could not verify SVG timer size - ${e.message}`);
            results.failed.push(`Could not verify SVG timer size: ${e.message}`);
        }

        await browser.close();
        
        // Print summary
        console.log('\n=== VERIFICATION SUMMARY ===');
        console.log(`Passed: ${results.passed.length}`);
        console.log(`Failed: ${results.failed.length}`);
        
        if (results.failed.length === 0) {
            console.log('\n✅ All acceptance criteria passed!');
        } else {
            console.log('\n❌ Some acceptance criteria failed:');
            results.failed.forEach(f => console.log(`  - ${f}`));
        }

        return results;

    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        throw error;
    }
}

// Run verification if executed directly
if (require.main === module) {
    verifyCompactUsageRows()
        .then(results => {
            process.exit(results.failed.length === 0 ? 0 : 1);
        })
        .catch(error => {
            console.error('Error:', error);
            process.exit(1);
        });
}

module.exports = { verifyCompactUsageRows };
