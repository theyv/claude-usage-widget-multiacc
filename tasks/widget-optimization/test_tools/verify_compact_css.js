// CSS verification test - reads CSS file directly without browser
// Faster verification method mentioned in context.md

const fs = require('fs');
const path = require('path');

const CSS_FILE_PATH = path.join(__dirname, '../../../src/renderer/styles.css');

function verifyCompactCSS() {
    console.log('Starting CSS verification for ultra-compact usage rows...\n');
    
    const results = {
        passed: [],
        failed: []
    };

    try {
        const cssContent = fs.readFileSync(CSS_FILE_PATH, 'utf8');
        
        // AC1: Verify usage-section height < 28px
        const usageSectionMatch = cssContent.match(/\.usage-section\s*{[^}]*height:\s*(\d+)px/);
        if (usageSectionMatch) {
            const height = parseInt(usageSectionMatch[1]);
            if (height < 28) {
                console.log(`✅ AC1: .usage-section height = ${height}px (< 28px)`);
                results.passed.push('usage-section height < 28px');
            } else {
                console.log(`❌ AC1: .usage-section height = ${height}px (expected < 28px)`);
                results.failed.push(`usage-section height = ${height}px (expected < 28px)`);
            }
        } else {
            console.log(`❌ AC1: Could not find .usage-section height in CSS`);
            results.failed.push('Could not find .usage-section height in CSS');
        }

        // AC2: Verify progress bar height = 4px
        const progressBarMatch = cssContent.match(/\.progress-bar\s*{[^}]*height:\s*(\d+)px/);
        if (progressBarMatch) {
            const height = parseInt(progressBarMatch[1]);
            if (height === 4) {
                console.log(`✅ AC2: .progress-bar height = ${height}px`);
                results.passed.push('progress-bar height = 4px');
            } else {
                console.log(`❌ AC2: .progress-bar height = ${height}px (expected 4px)`);
                results.failed.push(`progress-bar height = ${height}px (expected 4px)`);
            }
        } else {
            console.log(`❌ AC2: Could not find .progress-bar height in CSS`);
            results.failed.push('Could not find .progress-bar height in CSS');
        }

        // AC3: Verify labels and timers are aligned efficiently
        // Check grid layout for alignment
        const usageSectionGridMatch = cssContent.match(/\.usage-section\s*{[^}]*display:\s*grid/);
        if (usageSectionGridMatch) {
            console.log(`✅ AC3a: .usage-section uses grid layout for alignment`);
            results.passed.push('usage-section uses grid layout');
        } else {
            console.log(`❌ AC3a: .usage-section does not use grid layout`);
            results.failed.push('usage-section does not use grid layout');
        }

        // Check timer container gap is efficient
        const timerContainerGapMatch = cssContent.match(/\.timer-container\s*{[^}]*gap:\s*(\d+)px/);
        if (timerContainerGapMatch) {
            const gap = parseInt(timerContainerGapMatch[1]);
            if (gap <= 8) {
                console.log(`✅ AC3b: .timer-container gap = ${gap}px (efficient)`);
                results.passed.push('timer-container gap is efficient');
            } else {
                console.log(`⚠️  AC3b: .timer-container gap = ${gap}px (could be more efficient)`);
            }
        } else {
            console.log(`❌ AC3b: Could not find .timer-container gap in CSS`);
            results.failed.push('Could not find .timer-container gap in CSS');
        }

        // Check font sizes are compact
        const labelFontSizeMatch = cssContent.match(/\.usage-label\s*{[^}]*font-size:\s*(\d+)px/);
        if (labelFontSizeMatch) {
            const fontSize = parseInt(labelFontSizeMatch[1]);
            if (fontSize <= 10) {
                console.log(`✅ AC3c: .usage-label font-size = ${fontSize}px (compact)`);
                results.passed.push('usage-label font-size is compact');
            } else {
                console.log(`⚠️  AC3c: .usage-label font-size = ${fontSize}px (could be more compact)`);
            }
        }

        const percentageFontSizeMatch = cssContent.match(/\.usage-percentage\s*{[^}]*font-size:\s*(\d+)px/);
        if (percentageFontSizeMatch) {
            const fontSize = parseInt(percentageFontSizeMatch[1]);
            if (fontSize <= 10) {
                console.log(`✅ AC3d: .usage-percentage font-size = ${fontSize}px (compact)`);
                results.passed.push('usage-percentage font-size is compact');
            } else {
                console.log(`⚠️  AC3d: .usage-percentage font-size = ${fontSize}px (could be more compact)`);
            }
        }

        const timerTextFontSizeMatch = cssContent.match(/\.timer-text\s*{[^}]*font-size:\s*(\d+)px/);
        if (timerTextFontSizeMatch) {
            const fontSize = parseInt(timerTextFontSizeMatch[1]);
            if (fontSize <= 10) {
                console.log(`✅ AC3e: .timer-text font-size = ${fontSize}px (compact)`);
                results.passed.push('timer-text font-size is compact');
            } else {
                console.log(`⚠️  AC3e: .timer-text font-size = ${fontSize}px (could be more compact)`);
            }
        }

        // AC4: Verify SVG timer sizes in app.js
        const appJsPath = path.join(__dirname, '../../../src/renderer/app.js');
        const appJsContent = fs.readFileSync(appJsPath, 'utf8');
        
        // Use global regex to find all SVG width/height attributes
        const svgRegex = /width="(\d+)"\s+height="(\d+)"/g;
        const svgMatches = [];
        let match;
        while ((match = svgRegex.exec(appJsContent)) !== null) {
            svgMatches.push(match);
        }
        
        const svgSize20x20 = svgMatches.filter(m => m[1] === '20' && m[2] === '20');
        
        if (svgSize20x20.length >= 3) {
            console.log(`✅ AC4: SVG timer sizes are 20x20 (${svgSize20x20.length} instances found)`);
            results.passed.push('SVG timer sizes are 20x20');
        } else {
            const foundSizes = svgMatches.map(m => `${m[1]}x${m[2]}`).join(', ');
            console.log(`❌ AC4: SVG timer sizes - expected 20x20, found: ${foundSizes}`);
            results.failed.push(`SVG timer sizes are not 20x20 (found: ${foundSizes})`);
        }

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
    try {
        const results = verifyCompactCSS();
        process.exit(results.failed.length === 0 ? 0 : 1);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

module.exports = { verifyCompactCSS };
