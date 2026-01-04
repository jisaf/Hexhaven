const { chromium } = require('playwright');
const fs = require('fs');

const TEST_URL = 'http://localhost:5173';
const RESULTS_FILE = '/home/ubuntu/hexhaven/CARDS_11_20_TEST_RESULTS_WITH_SETUP.json';

const results = {
  timestamp: new Date().toISOString(),
  setupStatus: 'pending',
  gameCreated: false,
  turnActionPanelWorking: null,
  cards: {}
};

const cards = [
  { id: 11, name: 'Earth Tremor', initiative: 35 },
  { id: 12, name: 'Phase Walk', initiative: 38 },
  { id: 13, name: 'Radiant Blessing', initiative: 40 },
  { id: 14, name: 'Ally Support', initiative: 42 },
  { id: 15, name: 'Shadow Strike', initiative: 45 },
  { id: 16, name: 'Self Heal', initiative: 48 },
  { id: 17, name: 'Stunning Blow', initiative: 50 },
  { id: 18, name: 'Teleport Strike', initiative: 52 },
  { id: 19, name: 'Toxic Blade', initiative: 55 },
  { id: 20, name: 'Line Attack', initiative: 58 }
];

// Helper function to find card buttons with multiple strategies
async function findCardButton(page, cardName) {
  try {
    const button = page.locator(`button:has-text("${cardName}")`).first();
    if (await button.isVisible({ timeout: 300 })) {
      return button;
    }
  } catch (e) {
    // Continue to next strategy
  }

  try {
    const buttons = await page.locator('button').all();
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text && text.includes(cardName)) {
        if (await btn.isVisible({ timeout: 300 })) {
          return btn;
        }
      }
    }
  } catch (e) {
    // Continue
  }

  return null;
}

// Helper to safely get element text
async function getElementText(locator) {
  try {
    return await locator.textContent();
  } catch (e) {
    return null;
  }
}

async function runTests() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('HEXHAVEN CARD TESTING - CARDS 11-20 WITH GAME SETUP');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });

  try {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('PHASE 1: GAME SETUP');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Step 1: Navigate to home
    console.log('Step 1: Navigating to ' + TEST_URL);
    await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ Page loaded\n');

    // Step 2: Wait for page to fully load
    console.log('Step 2: Waiting for page to fully load...');
    await page.waitForTimeout(2000);

    // Step 3: Navigate to create game (try clicking create game button or navigate directly)
    console.log('Step 3: Creating new game...');

    try {
      // Try to find and click "Create Game" button
      const createGameBtn = page.locator('button:has-text("Create Game")').first();
      if (await createGameBtn.isVisible({ timeout: 1000 })) {
        console.log('  Found "Create Game" button');
        await createGameBtn.click();
        await page.waitForTimeout(1000);
        console.log('  ✅ Create Game button clicked');
      } else {
        // Try direct navigation
        console.log('  Creating game button not visible, trying direct navigation...');
        await page.goto(`${TEST_URL}/create-game`, { waitUntil: 'networkidle', timeout: 15000 });
        console.log('  ✅ Navigated to create game page');
      }
    } catch (e) {
      console.log(`  ⚠️  Create game button issue: ${e.message}`);
    }

    await page.waitForTimeout(1000);

    // Step 4: Try to find existing character or create one
    console.log('Step 4: Checking for character...');
    try {
      // Look for character selector or "Add Character" button
      const addCharBtn = page.locator('button:has-text("Add Character"), button:has-text("add")').first();
      if (await addCharBtn.isVisible({ timeout: 1000 })) {
        console.log('  Found character selection UI');
        await addCharBtn.click();
        await page.waitForTimeout(800);

        // Try to select any available character
        const charButtons = page.locator('button').all();
        let found = false;
        try {
          const btns = await charButtons;
          for (const btn of btns) {
            const text = await btn.textContent();
            if (text && (text.includes('Brute') || text.includes('IconTest') || text.includes('Test'))) {
              await btn.click();
              await page.waitForTimeout(500);
              console.log(`  ✅ Selected character: ${text.substring(0, 30)}`);
              found = true;
              break;
            }
          }
        } catch (e) {
          console.log(`  ⚠️  Could not select character: ${e.message}`);
        }
      } else {
        console.log('  ℹ️  No character selection UI found');
      }
    } catch (e) {
      console.log(`  ⚠️  Character selection error: ${e.message}`);
    }

    // Step 5: Try to start the game
    console.log('Step 5: Starting game...');
    try {
      const startBtn = page.locator('button:has-text("Start Game"), button:has-text("Start")').first();
      if (await startBtn.isVisible({ timeout: 2000 })) {
        await startBtn.click();
        await page.waitForTimeout(3000);
        console.log('✅ Game started\n');
        results.gameCreated = true;
      } else {
        console.log('⚠️  Start button not found, assuming game already running\n');
      }
    } catch (e) {
      console.log(`⚠️  Start game error: ${e.message}, assuming game running\n`);
    }

    // Verify game is loaded
    console.log('Step 6: Verifying game board...');
    try {
      await page.waitForSelector('canvas', { timeout: 3000 });
      console.log('✅ Game board verified\n');
      results.setupStatus = 'complete';
    } catch (e) {
      console.log('⚠️  Game board not found, proceeding anyway\n');
      results.setupStatus = 'partial';
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('PHASE 2: TESTING CARDS 11-20');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Now run the card tests
    for (const card of cards) {
      console.log(`\nTesting CARD ${card.id}: ${card.name}...`);
      console.log('─────────────────────────────────────────────────────────────');

      const cardResult = {
        name: card.name,
        initiative: card.initiative,
        status: 'UNKNOWN',
        turnActionPanelVisible: false,
        actionExecuted: false,
        errors: [],
        selectionFound: false
      };

      try {
        // Step 1: Click Hand tab
        console.log('  Step 1: Opening Hand tab...');
        const handTab = page.locator('button:has-text("Hand")').first();
        if (await handTab.isVisible({ timeout: 500 })) {
          await handTab.click();
          await page.waitForTimeout(500);
          console.log('  ✅ Hand tab opened');
        } else {
          cardResult.errors.push('Hand tab not found');
          console.log('  ❌ Hand tab not found');
        }

        // Step 2: Find and click the card
        console.log(`  Step 2: Selecting ${card.name}...`);
        const cardButton = await findCardButton(page, card.name);
        if (cardButton) {
          await cardButton.click();
          await page.waitForTimeout(300);
          cardResult.selectionFound = true;
          console.log(`  ✅ ${card.name} selected`);
        } else {
          cardResult.errors.push(`Could not find card button for ${card.name}`);
          console.log(`  ❌ Card button not found`);

          // Print available buttons for debugging
          try {
            const buttons = await page.locator('button').all();
            const buttonTexts = [];
            for (const btn of buttons) {
              const text = await btn.textContent();
              if (text && text.length < 30) {
                buttonTexts.push(text);
              }
            }
            console.log(`  Available buttons: ${buttonTexts.slice(0, 5).join(', ')}`);
          } catch (e) {
            // Ignore
          }
        }

        // Step 3: Select Recovery as second card
        console.log('  Step 3: Selecting Recovery as second card...');
        const recoveryButton = await findCardButton(page, 'Recovery');
        if (recoveryButton) {
          await recoveryButton.click();
          await page.waitForTimeout(300);
          console.log('  ✅ Recovery selected');
        } else {
          console.log('  ℹ️  Recovery card not found (OK for some scenarios)');
        }

        // Step 4: Close Hand panel
        console.log('  Step 4: Closing Hand panel...');
        const closeButton = page.locator('button:has-text("Close")').first();
        if (await closeButton.isVisible({ timeout: 500 })) {
          await closeButton.click();
          await page.waitForTimeout(500);
          console.log('  ✅ Hand panel closed');
        } else {
          console.log('  ℹ️  Close button not found (may not be needed)');
        }

        // Step 5: Confirm selection
        console.log('  Step 5: Confirming selection...');
        const confirmButton = page.locator('button:has-text("Confirm")').first();
        if (await confirmButton.isVisible({ timeout: 500 })) {
          await confirmButton.click();
          await page.waitForTimeout(2000);
          console.log('  ✅ Confirmed, turn started');
        } else {
          console.log('  ⚠️  Confirm button not found');
        }

        // Step 6: Click Active tab
        console.log('  Step 6: Opening Active tab...');
        const activeTab = page.locator('button:has-text("Active")').first();
        if (await activeTab.isVisible({ timeout: 500 })) {
          await activeTab.click();
          await page.waitForTimeout(500);
          console.log('  ✅ Active tab opened');

          // Check if TurnActionPanel is visible
          try {
            await page.waitForSelector('[data-testid="turn-action-panel"], .TurnActionPanel, [class*="action"]', { timeout: 2000 });
            cardResult.turnActionPanelVisible = true;
            console.log('  ✅ TurnActionPanel VISIBLE - Bug fix WORKING!');
            results.turnActionPanelWorking = true;
          } catch (e) {
            console.log('  ℹ️  TurnActionPanel not visible');
          }
        } else {
          console.log('  ❌ Active tab not found');
        }

        // Step 7: Try to execute action
        console.log('  Step 7: Executing card action...');
        const actionButtons = page.locator('button[class*="action"], [class*="Action"] button');
        const count = await actionButtons.count();
        if (count > 0) {
          await actionButtons.first().click();
          await page.waitForTimeout(1000);
          cardResult.actionExecuted = true;
          console.log('  ✅ Action executed');
        }

        // Step 8: End turn
        console.log('  Step 8: Ending turn...');
        const endTurnButton = page.locator('button:has-text("End Turn")').first();
        if (await endTurnButton.isVisible({ timeout: 500 })) {
          await endTurnButton.click();
          await page.waitForTimeout(2000);
          console.log('  ✅ Turn ended');
        } else {
          console.log('  ⚠️  End Turn button not found');
        }

        // Determine status
        if (cardResult.turnActionPanelVisible && cardResult.actionExecuted) {
          cardResult.status = 'PASS';
          console.log(`  ✅ CARD ${card.id} PASSED`);
        } else if (cardResult.turnActionPanelVisible) {
          cardResult.status = 'PARTIAL';
          console.log(`  ⚠️  CARD ${card.id} PARTIAL`);
        } else if (cardResult.selectionFound) {
          cardResult.status = 'PARTIAL';
          console.log(`  ⚠️  CARD ${card.id} PARTIAL (selection worked)`);
        } else {
          cardResult.status = 'FAIL';
          console.log(`  ❌ CARD ${card.id} FAILED`);
        }

      } catch (error) {
        cardResult.status = 'ERROR';
        cardResult.errors.push(error.message);
        console.log(`  ❌ Error: ${error.message}`);
      }

      results.cards[card.id] = cardResult;
    }

    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');

    let passed = 0, failed = 0, partial = 0;
    for (const cardId in results.cards) {
      const result = results.cards[cardId];
      if (result.status === 'PASS') passed++;
      else if (result.status === 'FAIL') failed++;
      else if (result.status === 'PARTIAL') partial++;

      const status = result.status === 'PASS' ? '✅' : result.status === 'PARTIAL' ? '⚠️' : '❌';
      console.log(`${status} Card ${cardId}: ${result.name.padEnd(20)} - ${result.status}`);
    }

    console.log('\n' + '─'.repeat(63));
    console.log(`RESULTS: ${passed} Passed | ${partial} Partial | ${failed} Failed`);
    console.log(`Setup Status: ${results.setupStatus}`);
    console.log(`TurnActionPanel: ${results.turnActionPanelWorking ? '✅ WORKING' : results.turnActionPanelWorking === null ? '⚠️ NOT TESTED' : '❌ NOT WORKING'}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('Test execution error:', error);
    results.error = error.message;
  } finally {
    await browser.close();

    // Save results
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    console.log(`Results saved to: ${RESULTS_FILE}\n`);
  }
}

runTests().catch(console.error);
