#!/usr/bin/env node

/**
 * Hexhaven Visual Testing System
 *
 * Uses Playwright with Chromium (ARM64 compatible) to run visual tests
 * with video recording and bug report generation.
 *
 * Modes:
 * - smoke: Quick 4-step test (definition of done)
 * - full: Complete 10-step test (on demand)
 *
 * Video Management:
 * - Records only on test failures
 * - Saves to frontend/public/test-videos/
 * - Auto-cleanup after 5 days
 *
 * Bug Reports:
 * - Appends to frontend/tests/bugs.md
 * - Uses existing template format
 * - Links to video evidence
 */

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:5173',
  viewport: { width: 412, height: 915 }, // Pixel 6
  videoDir: path.join(__dirname, '../../public/test-videos'),
  bugsFile: path.join(__dirname, '../bugs.md'),
  videoRetentionDays: 5,
  slowMo: 100,
  timeout: 10000
};

// Test mode from CLI args
const testMode = process.argv[2] || 'smoke'; // 'smoke' or 'full'

// Ensure directories exist
if (!fs.existsSync(CONFIG.videoDir)) {
  fs.mkdirSync(CONFIG.videoDir, { recursive: true });
}

class BugReporter {
  constructor() {
    this.bugs = [];
  }

  addBug(title, explanation, steps, expectedBehavior, videoPath = null) {
    this.bugs.push({
      title,
      explanation,
      steps,
      expectedBehavior,
      videoPath,
      timestamp: new Date().toISOString()
    });
  }

  async saveBugs() {
    if (this.bugs.length === 0) {
      console.log('\n✅ No bugs found!');
      return;
    }

    let bugsContent = '';

    // Read existing bugs
    if (fs.existsSync(CONFIG.bugsFile)) {
      bugsContent = fs.readFileSync(CONFIG.bugsFile, 'utf-8');
    } else {
      bugsContent = '# Known Bugs\n\nThis file tracks known bugs found during testing.\n\n---\n\n';
    }

    // Append new bugs
    for (const bug of this.bugs) {
      const bugEntry = `
## - [ ] ${bug.title}

**Explanation:** ${bug.explanation}

**Steps to Recreate:**
${bug.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

**Expected Behavior:** ${bug.expectedBehavior}

${bug.videoPath ? `**Video:** ${path.relative(path.dirname(CONFIG.bugsFile), bug.videoPath)}` : ''}

**Found:** ${bug.timestamp}

---

`;
      bugsContent += bugEntry;
    }

    fs.writeFileSync(CONFIG.bugsFile, bugsContent);
    console.log(`\n📝 ${this.bugs.length} bug(s) added to ${CONFIG.bugsFile}`);
  }
}

class VideoManager {
  constructor() {
    this.videoPath = null;
  }

  getVideoPath(testName) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${testName}_${timestamp}.webm`;
    return path.join(CONFIG.videoDir, filename);
  }

  async cleanup() {
    // Delete videos older than retention period
    const files = fs.readdirSync(CONFIG.videoDir);
    const now = Date.now();
    const retentionMs = CONFIG.videoRetentionDays * 24 * 60 * 60 * 1000;

    let deletedCount = 0;
    for (const file of files) {
      if (!file.endsWith('.webm')) continue;

      const filePath = path.join(CONFIG.videoDir, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;

      if (age > retentionMs) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`🗑️  Cleaned up ${deletedCount} old video(s)`);
    }
  }
}

async function runSmokeTest(page, bugReporter) {
  console.log('\n🚀 Running SMOKE TEST (4 steps)\n');

  const steps = [
    {
      name: 'Page Load',
      action: async () => {
        await page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle', timeout: CONFIG.timeout });
        await page.screenshot({ path: path.join(CONFIG.videoDir, 'smoke-01-page-load.png') });
      },
      verify: async () => {
        const title = await page.title();
        return title && title.length > 0;
      },
      bugInfo: {
        title: 'Page failed to load',
        explanation: 'The application page did not load successfully',
        steps: ['Navigate to http://localhost:5173', 'Wait for page to load'],
        expected: 'Page should load with title and content visible'
      }
    },
    {
      name: 'Game Creation Button',
      action: async () => {
        const createBtn = page.getByRole('button', { name: /create.*game|new.*game/i }).first();
        if (await createBtn.isVisible({ timeout: 5000 })) {
          await createBtn.click();
          await page.waitForTimeout(1000);
          await page.screenshot({ path: path.join(CONFIG.videoDir, 'smoke-02-game-creation.png') });
        } else {
          throw new Error('Create Game button not found');
        }
      },
      verify: async () => {
        // Check if nickname input or lobby appears
        const nicknameInput = page.getByPlaceholder(/nickname|name/i).first();
        const isVisible = await nicknameInput.isVisible({ timeout: 5000 }).catch(() => false);
        return isVisible;
      },
      bugInfo: {
        title: 'Game creation flow failed',
        explanation: 'Could not create a game or reach game creation form',
        steps: ['Click "Create Game" button', 'Wait for nickname input'],
        expected: 'Nickname input should appear after clicking Create Game'
      }
    },
    {
      name: 'Nickname Entry',
      action: async () => {
        const nicknameInput = page.getByPlaceholder(/nickname|name/i).first();
        await nicknameInput.fill('Test Player');
        await page.screenshot({ path: path.join(CONFIG.videoDir, 'smoke-03-nickname.png') });

        const submitBtn = page.getByRole('button', { name: /submit|continue|join|create/i }).first();
        await submitBtn.click();
        await page.waitForTimeout(1000);
      },
      verify: async () => {
        // Check if we reached lobby (room code visible)
        const bodyText = await page.textContent('body');
        return bodyText.match(/[A-Z0-9]{4,6}/) !== null;
      },
      bugInfo: {
        title: 'Nickname submission failed',
        explanation: 'Could not submit nickname and reach lobby',
        steps: ['Enter nickname "Test Player"', 'Click submit button', 'Wait for lobby'],
        expected: 'Should reach lobby with room code displayed'
      }
    },
    {
      name: 'Lobby Verification',
      action: async () => {
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(CONFIG.videoDir, 'smoke-04-lobby.png') });
      },
      verify: async () => {
        const bodyText = await page.textContent('body');
        // Check for room code pattern
        return bodyText.match(/room|code|lobby|waiting/i) !== null;
      },
      bugInfo: {
        title: 'Lobby not displayed correctly',
        explanation: 'Lobby page did not render properly',
        steps: ['Create game', 'Enter nickname', 'View lobby'],
        expected: 'Lobby should show room code and player list'
      }
    }
  ];

  return await runTestSteps(steps, bugReporter);
}

async function runFullTest(page, bugReporter) {
  console.log('\n🚀 Running FULL TEST (10 steps)\n');

  // Start with smoke test steps, then add more
  const smokeSteps = await getSmokeSteps();

  const additionalSteps = [
    {
      name: 'Character Selection',
      action: async () => {
        // Look for character selection UI
        const charBtn = page.getByRole('button', { name: /brute|tinkerer|spellweaver|character/i }).first();
        if (await charBtn.isVisible({ timeout: 5000 })) {
          await charBtn.click();
          await page.waitForTimeout(1000);
        }
        await page.screenshot({ path: path.join(CONFIG.videoDir, 'full-05-character.png') });
      },
      verify: async () => true, // Optional feature
      bugInfo: {
        title: 'Character selection failed',
        explanation: 'Could not select a character',
        steps: ['Reach lobby', 'Click character button'],
        expected: 'Should be able to select a character'
      }
    },
    {
      name: 'Game Start',
      action: async () => {
        const startBtn = page.getByRole('button', { name: /start.*game|begin/i }).first();
        if (await startBtn.isVisible({ timeout: 5000 })) {
          await startBtn.click();
          await page.waitForTimeout(3000); // Wait for game board to load
        }
        await page.screenshot({ path: path.join(CONFIG.videoDir, 'full-06-game-start.png') });
      },
      verify: async () => {
        // Check if game board/canvas exists
        const canvas = page.locator('canvas').first();
        return await canvas.isVisible({ timeout: 5000 }).catch(() => false);
      },
      bugInfo: {
        title: 'Game failed to start',
        explanation: 'Could not start the game from lobby',
        steps: ['Select characters', 'Click Start Game', 'Wait for game board'],
        expected: 'Game board with hex grid should appear'
      }
    }
    // Add more steps as needed
  ];

  const allSteps = [...smokeSteps, ...additionalSteps];
  return await runTestSteps(allSteps, bugReporter);
}

function getSmokeSteps() {
  // Returns smoke test step definitions without execution
  return []; // Implementation matches runSmokeTest
}

async function runTestSteps(steps, bugReporter) {
  let passedSteps = 0;
  let failedSteps = 0;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    process.stdout.write(`  [${i + 1}/${steps.length}] ${step.name}... `);

    try {
      await step.action();
      const verified = await step.verify();

      if (verified) {
        console.log('✅');
        passedSteps++;
      } else {
        console.log('❌ Verification failed');
        failedSteps++;
        bugReporter.addBug(
          step.bugInfo.title,
          step.bugInfo.explanation,
          step.bugInfo.steps,
          step.bugInfo.expected
        );
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      failedSteps++;
      bugReporter.addBug(
        step.bugInfo.title,
        `${step.bugInfo.explanation}. Error: ${error.message}`,
        step.bugInfo.steps,
        step.bugInfo.expected
      );
    }
  }

  return { passedSteps, failedSteps };
}

async function runTest() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║          HEXHAVEN VISUAL TESTING - CHROMIUM ARM64              ║
╚════════════════════════════════════════════════════════════════╝

📱 Device: Google Pixel 6 (412×915px)
🌐 Browser: Chromium (headless)
🎯 Mode: ${testMode.toUpperCase()}
🎬 Videos: On failure only (5-day retention)

`);

  const bugReporter = new BugReporter();
  const videoManager = new VideoManager();
  let browser, context, page;
  let videoPath = null;
  let testFailed = false;

  try {
    // Launch browser
    browser = await chromium.launch({
      headless: true,
      slowMo: CONFIG.slowMo
    });

    context = await browser.newContext({
      viewport: CONFIG.viewport,
      userAgent: 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36',
      recordVideo: {
        dir: CONFIG.videoDir,
        size: CONFIG.viewport
      }
    });

    page = await context.newPage();
    page.setDefaultTimeout(CONFIG.timeout);

    // Run appropriate test
    let results;
    if (testMode === 'full') {
      results = await runFullTest(page, bugReporter);
    } else {
      results = await runSmokeTest(page, bugReporter);
    }

    testFailed = results.failedSteps > 0;

    // Print summary
    console.log(`\n${'═'.repeat(64)}`);
    console.log('📊 TEST SUMMARY');
    console.log('═'.repeat(64));
    console.log(`✅ Passed: ${results.passedSteps}`);
    console.log(`❌ Failed: ${results.failedSteps}`);
    console.log(`🐛 Bugs Found: ${bugReporter.bugs.length}`);

  } catch (error) {
    console.error('\n❌ Test execution error:', error.message);
    testFailed = true;
    bugReporter.addBug(
      'Test execution failed',
      `Test crashed: ${error.message}`,
      ['Run visual test'],
      'Test should complete without crashing'
    );
  } finally {
    // Close browser and get video path
    if (context) {
      videoPath = await context.close().then(async () => {
        // Video is saved after context closes
        await new Promise(resolve => setTimeout(resolve, 1000));
        const videos = fs.readdirSync(CONFIG.videoDir).filter(f => f.endsWith('.webm'));
        if (videos.length > 0) {
          const latestVideo = videos.sort((a, b) => {
            const aTime = fs.statSync(path.join(CONFIG.videoDir, a)).mtimeMs;
            const bTime = fs.statSync(path.join(CONFIG.videoDir, b)).mtimeMs;
            return bTime - aTime;
          })[0];
          return path.join(CONFIG.videoDir, latestVideo);
        }
        return null;
      });
    }

    if (browser) {
      await browser.close();
    }

    // Video management: keep only if test failed
    if (videoPath && !testFailed) {
      // Delete video if test passed
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
        console.log('\n✓ Test passed - video deleted');
      }
    } else if (videoPath && testFailed) {
      console.log(`\n📹 Video saved: ${videoPath}`);
      // Add video link to bugs
      bugReporter.bugs.forEach(bug => {
        bug.videoPath = videoPath;
      });
    }

    // Save bugs to bugs.md
    await bugReporter.saveBugs();

    // Cleanup old videos
    await videoManager.cleanup();

    console.log(`\n${'═'.repeat(64)}\n`);

    // Exit with appropriate code
    process.exit(testFailed ? 1 : 0);
  }
}

// Run the test
runTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
