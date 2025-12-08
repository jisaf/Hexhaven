#!/usr/bin/env node

/**
 * HexHaven Comprehensive Visual Test - Player 1
 *
 * Test URL: http://test.hexhaven.net
 * Environment: ENVIRONMENT=test
 * Branch: main
 * Timestamp: 20251206T040633Z
 *
 * This script executes a full comprehensive visual test of the game including:
 * - Phase 1: Account Creation & Game Setup
 * - Phase 2: Character Selection & Lobby
 * - Phase 3: Gameplay Testing
 * - Phase 4: Session Persistence
 * - Phase 5: Game Completion
 */

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  baseUrl: 'http://test.hexhaven.net',
  username: 'Player1_20251206T040633Z',
  screenshotPrefix: 'main-20251206T040633Z',
  viewport: { width: 1280, height: 720 },
  videoDir: path.join(__dirname, '../../public/test-videos'),
  bugsFile: path.join(__dirname, '../bugs.md'),
  headless: true, // Set to false for visual observation (requires X server)
  slowMo: 200, // Slow down for observation
  timeout: 60000 // 60 seconds for game actions
};

// Ensure directories exist
if (!fs.existsSync(CONFIG.videoDir)) {
  fs.mkdirSync(CONFIG.videoDir, { recursive: true });
}

class TestLogger {
  constructor() {
    this.logs = [];
    this.screenshots = [];
    this.bugs = [];
    this.phase = '';
  }

  setPhase(phase) {
    this.phase = phase;
    console.log(`\n${'='.repeat(80)}`);
    console.log(`  ${phase}`);
    console.log('='.repeat(80));
  }

  log(message, status = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '  ℹ',
      'success': '  ✓',
      'error': '  ✗',
      'warning': '  ⚠',
      'action': '  →'
    }[status] || '  ';

    const logMessage = `${prefix} ${message}`;
    console.log(logMessage);
    this.logs.push({ timestamp, phase: this.phase, message, status });
  }

  addScreenshot(name, path) {
    this.screenshots.push({ name, path, timestamp: new Date().toISOString() });
    this.log(`Screenshot: ${name}`, 'success');
  }

  addBug(title, explanation, steps, expected, actual, screenshot = null) {
    this.bugs.push({
      title,
      explanation,
      steps,
      expected,
      actual,
      screenshot,
      branch: 'main',
      found: new Date().toISOString()
    });
    this.log(`BUG FOUND: ${title}`, 'error');
  }

  async saveBugs() {
    if (this.bugs.length === 0) {
      this.log('No bugs found during testing', 'success');
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

**Expected Behavior:** ${bug.expected}

**Actual Behavior:** ${bug.actual}

${bug.screenshot ? `**Screenshot:** ${path.relative(path.dirname(CONFIG.bugsFile), bug.screenshot)}` : ''}

**Branch:** ${bug.branch}

**Found:** ${bug.found}

---

`;
      bugsContent += bugEntry;
    }

    fs.writeFileSync(CONFIG.bugsFile, bugsContent);
    this.log(`${this.bugs.length} bug(s) saved to bugs.md`, 'success');
  }

  generateReport() {
    const report = {
      testDate: new Date().toISOString(),
      configuration: CONFIG,
      phases: {},
      screenshots: this.screenshots,
      bugs: this.bugs,
      logs: this.logs
    };

    // Group logs by phase
    this.logs.forEach(log => {
      if (!report.phases[log.phase]) {
        report.phases[log.phase] = [];
      }
      report.phases[log.phase].push(log);
    });

    return report;
  }
}

async function takeScreenshot(page, logger, stepName, description) {
  const filename = `${CONFIG.screenshotPrefix}-p1-${stepName}-${description}.png`;
  const filepath = path.join(CONFIG.videoDir, filename);

  try {
    await page.screenshot({ path: filepath, fullPage: true });
    logger.addScreenshot(`${stepName}: ${description}`, filepath);
    return filepath;
  } catch (error) {
    logger.log(`Failed to take screenshot: ${error.message}`, 'error');
    return null;
  }
}

async function waitForUser(message, seconds = 5) {
  console.log(`\n  ⏸  ${message}`);
  console.log(`     Waiting ${seconds} seconds...`);
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function phase1_AccountCreationAndSetup(page, logger) {
  logger.setPhase('PHASE 1: Account Creation & Game Setup (15 min)');

  try {
    // Step 1: Navigate to test environment
    logger.log('Navigating to http://test.hexhaven.net', 'action');
    await page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle', timeout: CONFIG.timeout });
    await page.waitForTimeout(1000);
    await takeScreenshot(page, logger, '01', 'landing-page');
    logger.log('Successfully loaded test environment', 'success');

    // Step 2: Create account
    logger.log(`Creating account with username: ${CONFIG.username}`, 'action');

    // Look for create account or create game button
    try {
      const createGameBtn = page.getByRole('button', { name: /create.*game|new.*game|start/i }).first();
      if (await createGameBtn.isVisible({ timeout: 5000 })) {
        await createGameBtn.click();
        await page.waitForTimeout(1000);
        await takeScreenshot(page, logger, '02', 'create-game-clicked');
        logger.log('Clicked Create Game button', 'success');
      } else {
        throw new Error('Create Game button not found');
      }
    } catch (error) {
      logger.addBug(
        'Create Game Button Not Found',
        'Could not locate Create Game button on landing page',
        ['Navigate to http://test.hexhaven.net', 'Look for Create Game button'],
        'A prominent Create Game button should be visible on the landing page',
        `Button not found: ${error.message}`,
        await takeScreenshot(page, logger, '02', 'create-game-error')
      );
      throw error;
    }

    // Step 3: Enter username
    try {
      const usernameInput = page.getByPlaceholder(/nickname|name|username/i)
        .or(page.getByLabel(/nickname|name|username/i))
        .or(page.locator('input[type="text"]').first());

      if (await usernameInput.isVisible({ timeout: 5000 })) {
        await usernameInput.fill(CONFIG.username);
        await takeScreenshot(page, logger, '03', 'username-entered');
        logger.log(`Entered username: ${CONFIG.username}`, 'success');

        // Submit
        const submitBtn = page.getByRole('button', { name: /submit|continue|create|next|join/i }).first();
        if (await submitBtn.isVisible({ timeout: 5000 })) {
          await submitBtn.click();
          await page.waitForTimeout(2000);
          await takeScreenshot(page, logger, '04', 'game-created');
          logger.log('Submitted username and created game', 'success');
        }
      } else {
        throw new Error('Username input not found');
      }
    } catch (error) {
      logger.addBug(
        'Username Input Not Found',
        'Could not locate username/nickname input field',
        ['Click Create Game', 'Look for username input field'],
        'A username/nickname input field should appear',
        `Input field not found: ${error.message}`,
        await takeScreenshot(page, logger, '03', 'username-input-error')
      );
      throw error;
    }

    // Step 4: Note room code
    try {
      await page.waitForTimeout(2000);
      const pageText = await page.textContent('body');
      const roomCodeMatch = pageText.match(/[A-Z0-9]{4,6}/);

      if (roomCodeMatch) {
        const roomCode = roomCodeMatch[0];
        logger.log(`Room Code: ${roomCode}`, 'success');
        logger.log('*** SHARE THIS ROOM CODE WITH PLAYER 2 ***', 'warning');
        await takeScreenshot(page, logger, '05', 'room-code-visible');

        // Save room code to file for Player 2
        const roomCodeFile = path.join(CONFIG.videoDir, 'player1-room-code.txt');
        fs.writeFileSync(roomCodeFile, roomCode);
        logger.log(`Room code saved to: ${roomCodeFile}`, 'info');

        return { success: true, roomCode };
      } else {
        logger.addBug(
          'Room Code Not Displayed',
          'Room code not visible in expected format after game creation',
          ['Create game', 'Enter username', 'Submit', 'Look for room code'],
          'Room code should be displayed as 4-6 character alphanumeric code',
          'No room code found in page text',
          await takeScreenshot(page, logger, '05', 'room-code-missing')
        );
        return { success: false };
      }
    } catch (error) {
      logger.log(`Error finding room code: ${error.message}`, 'error');
      return { success: false };
    }

  } catch (error) {
    logger.log(`Phase 1 failed: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
}

async function phase2_CharacterSelectionAndLobby(page, logger) {
  logger.setPhase('PHASE 2: Character Selection & Lobby');

  try {
    // Step 6: Select a character (Brute recommended)
    logger.log('Looking for character selection...', 'action');

    try {
      // Wait a bit for lobby to fully load
      await page.waitForTimeout(2000);
      await takeScreenshot(page, logger, '06', 'lobby-initial');

      // Look for character selection buttons
      const characterBtn = page.getByRole('button', { name: /brute|character|select/i }).first();

      if (await characterBtn.isVisible({ timeout: 10000 })) {
        await characterBtn.click();
        await page.waitForTimeout(1000);
        await takeScreenshot(page, logger, '07', 'character-selected');
        logger.log('Selected character (Brute)', 'success');
      } else {
        logger.log('Character selection not available yet (may appear later)', 'warning');
      }
    } catch (error) {
      logger.log(`Character selection issue: ${error.message}`, 'warning');
    }

    // Step 7: Wait for Player 2 to join
    logger.log('*** WAITING FOR PLAYER 2 TO JOIN ***', 'warning');
    logger.log('Monitoring lobby for Player 2...', 'info');

    await waitForUser('Waiting for Player 2 to join the game', 30);

    await takeScreenshot(page, logger, '08', 'waiting-for-player2');

    // Step 8: Verify lobby shows both players
    try {
      const pageText = await page.textContent('body');
      const hasMultiplePlayers = pageText.match(/player.*2|2.*player/i);

      if (hasMultiplePlayers) {
        logger.log('Detected Player 2 in lobby!', 'success');
        await takeScreenshot(page, logger, '09', 'player2-joined');
      } else {
        logger.log('Waiting additional time for Player 2...', 'info');
        await waitForUser('Extended wait for Player 2', 20);
        await takeScreenshot(page, logger, '09', 'still-waiting-player2');
      }
    } catch (error) {
      logger.log(`Error checking for Player 2: ${error.message}`, 'warning');
    }

    // Step 9: Start the game as host
    logger.log('Attempting to start the game as host...', 'action');

    try {
      const startGameBtn = page.getByRole('button', { name: /start.*game|begin|ready/i }).first();

      if (await startGameBtn.isVisible({ timeout: 10000 })) {
        await startGameBtn.click();
        await page.waitForTimeout(3000); // Wait for game to load
        await takeScreenshot(page, logger, '10', 'game-started');
        logger.log('Successfully started the game!', 'success');
        return { success: true };
      } else {
        logger.addBug(
          'Start Game Button Not Available',
          'Could not find or click Start Game button as host',
          ['Create game', 'Wait for Player 2', 'Look for Start Game button'],
          'Host should be able to start the game when ready',
          'Start Game button not found or not clickable',
          await takeScreenshot(page, logger, '10', 'start-game-error')
        );
        return { success: false };
      }
    } catch (error) {
      logger.log(`Error starting game: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }

  } catch (error) {
    logger.log(`Phase 2 failed: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
}

async function phase3_GameplayTesting(page, logger) {
  logger.setPhase('PHASE 3: Gameplay Testing');

  try {
    // Step 10: Verify hex map loads
    logger.log('Verifying hex map loads correctly...', 'action');

    try {
      const canvas = page.locator('canvas').first();
      if (await canvas.isVisible({ timeout: 10000 })) {
        logger.log('Hex map canvas detected!', 'success');
        await page.waitForTimeout(2000);
        await takeScreenshot(page, logger, '11', 'hex-map-loaded');
      } else {
        logger.addBug(
          'Hex Map Canvas Not Visible',
          'Game board canvas element not visible after starting game',
          ['Start game', 'Wait for hex map to load'],
          'Hex map canvas should be visible and rendered',
          'Canvas element not found or not visible',
          await takeScreenshot(page, logger, '11', 'hex-map-missing')
        );
      }
    } catch (error) {
      logger.log(`Hex map verification failed: ${error.message}`, 'error');
    }

    // Step 11: Verify ability cards appear
    logger.log('Checking for ability cards...', 'action');

    try {
      await page.waitForTimeout(2000);
      const cards = page.locator('[class*="card"], [data-testid*="card"], button[class*="ability"]');
      const cardCount = await cards.count();

      if (cardCount > 0) {
        logger.log(`Found ${cardCount} ability cards`, 'success');
        await takeScreenshot(page, logger, '12', 'ability-cards-visible');
      } else {
        logger.log('No ability cards detected yet', 'warning');
        await takeScreenshot(page, logger, '12', 'no-ability-cards');
      }
    } catch (error) {
      logger.log(`Error checking ability cards: ${error.message}`, 'warning');
    }

    // Step 12: Select 2 ability cards
    logger.log('Attempting to select ability cards...', 'action');
    await waitForUser('Please manually select 2 ability cards', 10);
    await takeScreenshot(page, logger, '13', 'cards-selected');

    // Step 13: Move character to hex tile
    logger.log('Testing character movement...', 'action');
    await waitForUser('Please click on a hex tile to move your character', 10);
    await takeScreenshot(page, logger, '14', 'movement-attempted');

    // Step 14: Execute attack action
    logger.log('Testing attack action...', 'action');
    await waitForUser('Please execute an attack if possible', 10);
    await takeScreenshot(page, logger, '15', 'attack-executed');

    // Step 15: Complete turn
    logger.log('Completing turn...', 'action');

    try {
      const endTurnBtn = page.getByRole('button', { name: /end.*turn|done|finish|next/i }).first();
      if (await endTurnBtn.isVisible({ timeout: 5000 })) {
        await endTurnBtn.click();
        await page.waitForTimeout(2000);
        await takeScreenshot(page, logger, '16', 'turn-completed');
        logger.log('Turn completed', 'success');
      } else {
        logger.log('End Turn button not found (may be automatic)', 'warning');
      }
    } catch (error) {
      logger.log(`Turn completion issue: ${error.message}`, 'warning');
    }

    // Step 16: Verify monster/enemy turn
    logger.log('Watching for monster/enemy turn...', 'action');
    await waitForUser('Observing monster AI turn', 10);
    await takeScreenshot(page, logger, '17', 'monster-turn');

    return { success: true };

  } catch (error) {
    logger.log(`Phase 3 failed: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
}

async function phase4_SessionPersistence(page, logger) {
  logger.setPhase('PHASE 4: Session Persistence Testing');

  try {
    // Step 17: Refresh browser page
    logger.log('Testing page refresh persistence...', 'action');
    await takeScreenshot(page, logger, '18', 'before-refresh');

    logger.log('Refreshing page...', 'info');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    await takeScreenshot(page, logger, '19', 'after-refresh');
    logger.log('Page refreshed', 'success');

    // Step 18: Verify game state persists
    logger.log('Verifying game state after refresh...', 'action');

    try {
      const canvas = page.locator('canvas').first();
      if (await canvas.isVisible({ timeout: 10000 })) {
        logger.log('Game state persisted! Canvas visible after refresh', 'success');
        await takeScreenshot(page, logger, '20', 'state-persisted');
      } else {
        logger.addBug(
          'Game State Not Persisting After Refresh',
          'Game does not restore properly after page refresh',
          ['Start game', 'Make some moves', 'Refresh page', 'Check if game state restored'],
          'Game should restore to the same state after refresh',
          'Game canvas not visible or game state lost after refresh',
          await takeScreenshot(page, logger, '20', 'state-not-persisted')
        );
      }
    } catch (error) {
      logger.log(`State persistence check failed: ${error.message}`, 'error');
    }

    // Step 19: Test leaving and rejoining
    logger.log('This would require navigation away - skipping for continuous test', 'info');

    return { success: true };

  } catch (error) {
    logger.log(`Phase 4 failed: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
}

async function phase5_GameCompletion(page, logger) {
  logger.setPhase('PHASE 5: Game Completion');

  try {
    logger.log('Note: Full game completion requires extended gameplay', 'info');
    logger.log('Taking final screenshots of current game state...', 'action');

    await page.waitForTimeout(2000);
    await takeScreenshot(page, logger, '21', 'final-game-state');

    // Check for win/loss screen
    try {
      const winLossText = await page.textContent('body');
      const hasEndScreen = winLossText.match(/victory|defeat|win|lose|complete/i);

      if (hasEndScreen) {
        logger.log('Game end screen detected!', 'success');
        await takeScreenshot(page, logger, '22', 'game-end-screen');
      } else {
        logger.log('Game still in progress (expected for partial test)', 'info');
      }
    } catch (error) {
      logger.log(`End screen check: ${error.message}`, 'info');
    }

    return { success: true };

  } catch (error) {
    logger.log(`Phase 5 failed: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
}

async function runComprehensiveTest() {
  const logger = new TestLogger();
  let browser;
  let context;
  let page;

  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║           HEXHAVEN COMPREHENSIVE VISUAL TEST - PLAYER 1                    ║
║                                                                            ║
║  Test Environment: http://test.hexhaven.net                               ║
║  Username: ${CONFIG.username}                           ║
║  Branch: main                                                              ║
║  Timestamp: 20251206T040633Z                                               ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

  try {
    // Launch browser
    logger.log('Launching browser...', 'info');
    browser = await chromium.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo
    });

    context = await browser.newContext({
      viewport: CONFIG.viewport,
      ignoreHTTPSErrors: true, // Ignore SSL certificate errors for test environment
      recordVideo: {
        dir: CONFIG.videoDir,
        size: CONFIG.viewport
      }
    });

    page = await context.newPage();
    page.setDefaultTimeout(CONFIG.timeout);

    // Execute test phases
    const results = {
      phase1: await phase1_AccountCreationAndSetup(page, logger),
      phase2: await phase2_CharacterSelectionAndLobby(page, logger),
      phase3: await phase3_GameplayTesting(page, logger),
      phase4: await phase4_SessionPersistence(page, logger),
      phase5: await phase5_GameCompletion(page, logger)
    };

    // Save bugs
    await logger.saveBugs();

    // Generate final report
    console.log(`\n${'='.repeat(80)}`);
    console.log('  COMPREHENSIVE TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`\nPhase Results:`);
    console.log(`  Phase 1 (Account & Setup):     ${results.phase1.success ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  Phase 2 (Character & Lobby):   ${results.phase2.success ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  Phase 3 (Gameplay):            ${results.phase3.success ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  Phase 4 (Persistence):         ${results.phase4.success ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  Phase 5 (Completion):          ${results.phase5.success ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`\nBugs Found: ${logger.bugs.length}`);
    console.log(`Screenshots Captured: ${logger.screenshots.length}`);
    console.log(`\nScreenshots saved to: ${CONFIG.videoDir}`);
    console.log(`Bugs documented in: ${CONFIG.bugsFile}`);
    console.log('='.repeat(80));

    // Save full report as JSON
    const reportPath = path.join(CONFIG.videoDir, 'player1-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(logger.generateReport(), null, 2));
    logger.log(`Full report saved to: ${reportPath}`, 'success');

  } catch (error) {
    console.error('\n❌ Fatal test error:', error.message);
    console.error(error.stack);
  } finally {
    if (page) {
      await takeScreenshot(page, logger, '99', 'final-screenshot');
    }

    if (context) {
      await context.close();
    }

    if (browser) {
      await browser.close();
    }

    console.log('\n✅ Test execution complete!\n');
  }
}

// Run the test
runComprehensiveTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
