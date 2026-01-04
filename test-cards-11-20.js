const { chromium } = require('playwright');
const fs = require('fs');

const TEST_URL = 'http://localhost:5173';
const RESULTS_FILE = '/home/ubuntu/hexhaven/CARDS_11_20_TEST_RESULTS.json';

const results = {
  timestamp: new Date().toISOString(),
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

// Multiple selector strategies for finding card buttons
async function findCardButton(page, cardName) {
  // Strategy 1: Text content (was problematic)
  try {
    const button = page.locator(`button:has-text("${cardName}")`).first();
    if (await button.isVisible({ timeout: 500 })) {
      return button;
    }
  } catch (e) {
    // Strategy 1 failed, continue
  }

  // Strategy 2: Find all buttons and filter by text content
  try {
    const buttons = await page.locator('button').all();
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text && text.includes(cardName)) {
        if (await btn.isVisible({ timeout: 500 })) {
          return btn;
        }
      }
    }
  } catch (e) {
    // Strategy 2 failed, continue
  }

  // Strategy 3: Look for data-testid with card name
  try {
    const button = page.locator(`[data-testid*="${cardName.toLowerCase().replace(/\s+/g, '-')}"]`).first();
    if (await button.isVisible({ timeout: 500 })) {
      return button;
    }
  } catch (e) {
    // Strategy 3 failed, continue
  }

  // Strategy 4: Find button containing partial match
  try {
    const buttons = await page.locator('button').all();
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text && text.includes(cardName.substring(0, 3))) {
        if (await btn.isVisible({ timeout: 500 })) {
          return btn;
        }
      }
    }
  } catch (e) {
    // All strategies failed
  }

  return null;
}

async function runTests() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('HEXHAVEN CARD TESTING - CARDS 11-20');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });

  try {
    console.log('Step 1: Navigating to ' + TEST_URL);
    await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ Page loaded\n');

    // Check if already logged in by looking for game elements
    console.log('Step 2: Checking login status...');
    await page.waitForTimeout(2000);

    let gameStarted = false;
    try {
      const gameBoard = await page.locator('canvas').first();
      if (gameBoard) {
        gameStarted = true;
        console.log('✅ Game already started, skipping login\n');
      }
    } catch (e) {
      console.log('Game not found, attempting login\n');
    }

    if (!gameStarted) {
      console.log('Step 3: Game setup needed...');
      console.log('⚠️  Game not in progress. Aborting test.\n');
      console.log('Please manually:');
      console.log('1. Navigate to http://localhost:5173');
      console.log('2. Login/Register');
      console.log('3. Create character and game');
      console.log('4. Start game in Sparring Arena\n');
      await browser.close();
      return;
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('TESTING CARDS 11-20');
    console.log('═══════════════════════════════════════════════════════════════\n');

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
        selectionStrategy: null
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

        // Step 2: Find and click the card using improved strategy
        console.log(`  Step 2: Selecting ${card.name}...`);
        const cardButton = await findCardButton(page, card.name);
        if (cardButton) {
          await cardButton.click();
          await page.waitForTimeout(300);
          cardResult.selectionStrategy = 'found';
          console.log(`  ✅ ${card.name} selected`);
        } else {
          cardResult.errors.push(`Could not find card button for ${card.name}`);
          cardResult.selectionStrategy = 'not_found';
          console.log(`  ❌ Card button not found`);
        }

        // Step 3: Select Recovery as second card (fallback strategy)
        console.log('  Step 3: Selecting Recovery as second card...');
        const recoveryButton = await findCardButton(page, 'Recovery');
        if (recoveryButton) {
          await recoveryButton.click();
          await page.waitForTimeout(300);
          console.log('  ✅ Recovery selected');
        } else {
          cardResult.errors.push('Could not find Recovery card');
          console.log('  ❌ Recovery not found');
        }

        // Step 4: Close Hand panel
        console.log('  Step 4: Closing Hand panel...');
        const closeButton = page.locator('button:has-text("Close")').first();
        if (await closeButton.isVisible({ timeout: 500 })) {
          await closeButton.click();
          await page.waitForTimeout(500);
          console.log('  ✅ Hand panel closed');
        } else {
          cardResult.errors.push('Close button not found');
          console.log('  ❌ Close button not found');
        }

        // Step 5: Confirm selection
        console.log('  Step 5: Confirming selection...');
        const confirmButton = page.locator('button:has-text("Confirm")').first();
        if (await confirmButton.isVisible({ timeout: 500 })) {
          await confirmButton.click();
          await page.waitForTimeout(2000);
          console.log('  ✅ Confirmed, turn started');
        } else {
          cardResult.errors.push('Confirm button not found');
          console.log('  ❌ Confirm button not found');
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
            cardResult.errors.push('TurnActionPanel not visible');
            console.log('  ❌ TurnActionPanel not visible');
          }
        } else {
          cardResult.errors.push('Active tab not found');
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
        } else {
          console.log('  ℹ️  No action buttons found (may not have targeting)');
        }

        // Step 8: End turn
        console.log('  Step 8: Ending turn...');
        const endTurnButton = page.locator('button:has-text("End Turn")').first();
        if (await endTurnButton.isVisible({ timeout: 500 })) {
          await endTurnButton.click();
          await page.waitForTimeout(2000);
          console.log('  ✅ Turn ended');
        } else {
          cardResult.errors.push('End Turn button not found');
          console.log('  ❌ End Turn button not found');
        }

        // Determine status
        if (cardResult.turnActionPanelVisible && cardResult.actionExecuted) {
          cardResult.status = 'PASS';
          console.log(`  ✅ CARD ${card.id} PASSED`);
        } else if (cardResult.turnActionPanelVisible) {
          cardResult.status = 'PARTIAL';
          console.log(`  ⚠️  CARD ${card.id} PARTIAL`);
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

      console.log(`Card ${cardId}: ${result.name.padEnd(20)} - ${result.status}`);
    }

    console.log('\n' + '─'.repeat(63));
    console.log(`RESULTS: ${passed} Passed | ${failed} Failed | ${partial} Partial`);
    console.log(`TurnActionPanel: ${results.turnActionPanelWorking ? '✅ WORKING' : '❌ NOT WORKING'}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('Test execution error:', error);
  } finally {
    await browser.close();

    // Save results
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    console.log(`Results saved to: ${RESULTS_FILE}\n`);
  }
}

runTests().catch(console.error);
