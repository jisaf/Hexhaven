const { chromium } = require('playwright');
const fs = require('fs');

const TEST_URL = 'http://localhost:5173';
const RESULTS_FILE = '/home/ubuntu/hexhaven/CARDS_1_10_TEST_RESULTS.json';

const results = {
  timestamp: new Date().toISOString(),
  turnActionPanelWorking: null,
  cards: {}
};

const cards = [
  { id: 1, name: 'Basic Strike', initiative: 10 },
  { id: 2, name: 'Multi-Target', initiative: 12 },
  { id: 3, name: 'Healing Touch', initiative: 15 },
  { id: 4, name: 'Recovery', initiative: 18 },
  { id: 5, name: 'Fire Blast', initiative: 20 },
  { id: 6, name: 'Mind Control', initiative: 22 },
  { id: 7, name: 'Ice Shield', initiative: 25 },
  { id: 8, name: 'Augmented Power', initiative: 28 },
  { id: 9, name: 'Wind Rush', initiative: 30 },
  { id: 10, name: 'Trap Setter', initiative: 32 }
];

async function runTests() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('HEXHAVEN CARD TESTING - CARDS 1-10');
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
      // Try to find game board elements
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
      // This would require interactive login - skip if not already in game
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
    console.log('TESTING CARDS 1-10');
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
        errors: []
      };

      try {
        // Step 1: Click Hand tab
        console.log('  Step 1: Opening Hand tab...');
        const handTab = page.locator('button:has-text("Hand")').first();
        if (await handTab.isVisible()) {
          await handTab.click();
          await page.waitForTimeout(500);
          console.log('  ✅ Hand tab opened');
        }

        // Step 2: Find and click the card
        console.log(`  Step 2: Selecting ${card.name}...`);
        const cardButton = page.locator(`button:has-text("${card.name}")`).first();
        if (await cardButton.isVisible()) {
          await cardButton.click();
          await page.waitForTimeout(300);
          console.log(`  ✅ ${card.name} selected`);
        } else {
          cardResult.errors.push(`Could not find card button for ${card.name}`);
          console.log(`  ❌ Card button not found`);
        }

        // Step 3: Select Recovery as second card
        console.log('  Step 3: Selecting Recovery as second card...');
        const recoveryButton = page.locator('button:has-text("Recovery")').first();
        if (await recoveryButton.isVisible()) {
          await recoveryButton.click();
          await page.waitForTimeout(300);
          console.log('  ✅ Recovery selected');
        }

        // Step 4: Close Hand panel
        console.log('  Step 4: Closing Hand panel...');
        const closeButton = page.locator('button:has-text("Close")').first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
          await page.waitForTimeout(500);
          console.log('  ✅ Hand panel closed');
        }

        // Step 5: Confirm selection
        console.log('  Step 5: Confirming selection...');
        const confirmButton = page.locator('button:has-text("Confirm")').first();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          await page.waitForTimeout(2000);
          console.log('  ✅ Confirmed, turn started');
        }

        // Step 6: Click Active tab
        console.log('  Step 6: Opening Active tab...');
        const activeTab = page.locator('button:has-text("Active")').first();
        if (await activeTab.isVisible()) {
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
        if (await endTurnButton.isVisible()) {
          await endTurnButton.click();
          await page.waitForTimeout(2000);
          console.log('  ✅ Turn ended');
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
