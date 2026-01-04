#!/usr/bin/env node
/**
 * Manual Interactive Testing for All 30 Hexhaven Cards
 * This script opens a browser and guides through manual testing of all 30 cards
 * with automatic documentation of results
 */

const { chromium } = require('playwright');
const fs = require('fs');
const readline = require('readline');

const TEST_URL = 'http://localhost:5173';
const RESULTS_FILE = '/home/ubuntu/hexhaven/CARDS_ALL_30_MANUAL_TEST_RESULTS.json';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

const results = {
  timestamp: new Date().toISOString(),
  testMode: 'manual-interactive',
  testedCards: 0,
  passedCards: 0,
  failedCards: 0,
  partialCards: 0,
  cards: {}
};

const cards = [
  { id: 1, name: 'Basic Strike', initiative: 10, topAction: 'attack 3', bottomAction: 'move 3', modifiers: ['xp 1'] },
  { id: 2, name: 'Multi-Target', initiative: 12, topAction: 'attack 2 + range 3 + target 2', bottomAction: 'move 3', modifiers: ['range', 'target'] },
  { id: 3, name: 'Healing Touch', initiative: 15, topAction: 'heal 4 + range 2', bottomAction: 'loot 2', modifiers: ['range'] },
  { id: 4, name: 'Recovery', initiative: 18, topAction: 'special + recover 2 + lost', bottomAction: 'heal 3', modifiers: ['recover', 'lost'] },
  { id: 5, name: 'Fire Blast', initiative: 20, topAction: 'attack 3 + range 3 + generate fire', bottomAction: 'move 2 + consume fire', modifiers: ['range', 'infuse', 'consume'] },
  { id: 6, name: 'Mind Control', initiative: 22, topAction: 'special + range 3 + lost + xp 2', bottomAction: 'move 3', modifiers: ['range', 'lost', 'xp'] },
  { id: 7, name: 'Ice Shield', initiative: 25, topAction: 'special + generate ice + shield 2', bottomAction: 'attack 2 + consume ice', modifiers: ['infuse', 'shield', 'consume'] },
  { id: 8, name: 'Augmented Power', initiative: 28, topAction: 'text + persistent +2 attack', bottomAction: 'attack 2', modifiers: ['persistent'] },
  { id: 9, name: 'Wind Rush', initiative: 30, topAction: 'attack 2 + generate air + push 2', bottomAction: 'move 4 + jump', modifiers: ['infuse', 'push', 'jump'] },
  { id: 10, name: 'Trap Setter', initiative: 32, topAction: 'attack 2', bottomAction: 'special + range 2', modifiers: ['range'] },
  { id: 11, name: 'Earth Tremor', initiative: 35, topAction: 'attack 2 + generate earth + aoe burst 1 + immobilize', bottomAction: 'special', modifiers: ['infuse', 'aoe', 'condition'] },
  { id: 12, name: 'Phase Walk', initiative: 38, topAction: 'attack 3', bottomAction: 'move 4 + jump', modifiers: ['jump'] },
  { id: 13, name: 'Radiant Blessing', initiative: 40, topAction: 'heal 3 + generate light + range 3', bottomAction: 'special + bless', modifiers: ['infuse', 'range', 'condition'] },
  { id: 14, name: 'Ally Support', initiative: 42, topAction: 'heal 3 + range 3', bottomAction: 'move 3', modifiers: ['range'] },
  { id: 15, name: 'Shadow Strike', initiative: 45, topAction: 'attack 4 + generate dark + curse', bottomAction: 'special + invisible', modifiers: ['infuse', 'condition'] },
  { id: 16, name: 'Self Heal', initiative: 48, topAction: 'heal 5', bottomAction: 'attack 2', modifiers: [] },
  { id: 17, name: 'Stunning Blow', initiative: 50, topAction: 'attack 3 + stun + lost + xp 2', bottomAction: 'move 3', modifiers: ['condition', 'lost', 'xp'] },
  { id: 18, name: 'Teleport Strike', initiative: 52, topAction: 'attack 4 + lost', bottomAction: 'move 3 + teleport 3', modifiers: ['lost', 'teleport'] },
  { id: 19, name: 'Toxic Blade', initiative: 55, topAction: 'attack 2 + poison + wound', bottomAction: 'move 4', modifiers: ['condition'] },
  { id: 20, name: 'Line Attack', initiative: 58, topAction: 'attack 2 + aoe line 3', bottomAction: 'move 3', modifiers: ['aoe'] },
  { id: 21, name: 'Confusing Strike', initiative: 60, topAction: 'attack 2 + muddle + disarm', bottomAction: 'move 3', modifiers: ['condition'] },
  { id: 22, name: 'Cone Blast', initiative: 62, topAction: 'attack 2 + aoe cone 2', bottomAction: 'move 2', modifiers: ['aoe'] },
  { id: 23, name: 'Magnetic Pull', initiative: 65, topAction: 'attack 2 + range 4 + pull 3', bottomAction: 'move 2 + push 1', modifiers: ['range', 'pull', 'push'] },
  { id: 24, name: 'Discard Recovery', initiative: 68, topAction: 'attack 3', bottomAction: 'special + discard 1 + recover 1', modifiers: ['discard', 'recover'] },
  { id: 25, name: 'Empowering Aura', initiative: 70, topAction: 'special + strengthen + range 2', bottomAction: 'heal 2', modifiers: ['condition', 'range'] },
  { id: 26, name: 'Round Bonus', initiative: 72, topAction: 'special + shield 2 + round', bottomAction: 'move 3', modifiers: ['shield', 'round'] },
  { id: 27, name: 'Piercing Strike', initiative: 75, topAction: 'attack 3 + pierce 2', bottomAction: 'move 3', modifiers: ['pierce'] },
  { id: 28, name: 'Mystic Ally', initiative: 80, topAction: 'summon Spirit Guardian + lost + xp 2', bottomAction: 'move 3', modifiers: ['summon', 'lost', 'xp'] },
  { id: 29, name: 'Persistent Shield', initiative: 85, topAction: 'special + shield 1 + persistent', bottomAction: 'special + retaliate 2 + persistent', modifiers: ['shield', 'persistent', 'retaliate'] },
  { id: 30, name: 'Sweeping Attack', initiative: 90, topAction: 'attack 2 + target 3', bottomAction: 'move 2', modifiers: ['target'] }
];

async function runManualTests() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║       HEXHAVEN MANUAL CARD TESTING - ALL 30 CARDS              ║');
  console.log('║                  2026-01-03 13:10 UTC                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });

  try {
    console.log('Step 1: Navigate to http://localhost:5173');
    console.log('  → A browser window should open with the game');
    console.log('  → Please register/login if needed\n');

    await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: 30000 });

    console.log('Step 2: Create a new game');
    console.log('  → Click "Create Game" button');
    console.log('  → Select any character (e.g., "Brute")');
    console.log('  → Click "Start Game"\n');

    let proceed = await question('Press Enter once the game is loaded and you can see cards... ');

    // Check if game is actually loaded
    try {
      await page.waitForSelector('canvas, [class*="hand"], [class*="card"], button:has-text("Hand")', { timeout: 5000 });
      console.log('\n✅ Game detected, starting card tests...\n');
    } catch (e) {
      console.log('\n⚠️  Game not fully detected, but proceeding...\n');
    }

    // Test each card
    for (const card of cards) {
      console.log(`\n${'═'.repeat(64)}`);
      console.log(`CARD ${card.id}: ${card.name} (Initiative ${card.initiative})`);
      console.log(`${'═'.repeat(64)}`);
      console.log(`Top Action: ${card.topAction}`);
      console.log(`Bottom Action: ${card.bottomAction}`);
      console.log(`Modifiers: ${card.modifiers.join(', ') || 'None'}`);
      console.log('\nTesting Steps:');
      console.log('  1. Click "Hand" tab');
      console.log(`  2. Click "${card.name}" card`);
      console.log('  3. Click "Recovery" (pair card)');
      console.log('  4. Close Hand panel');
      console.log('  5. Click "Confirm"');
      console.log('  6. Click "Active" tab - you should see your cards');
      console.log('  7. Click a card action button');
      console.log('  8. If targeting appears, click a target hex');
      console.log('  9. Watch for action result (damage/heal/move on screen)');
      console.log('  10. Click "End Turn" when done\n');

      const cardResult = {
        id: card.id,
        name: card.name,
        topAction: card.topAction,
        bottomAction: card.bottomAction,
        modifiers: card.modifiers,
        turnActionPanelVisible: null,
        actionExecuted: null,
        status: 'UNKNOWN',
        notes: ''
      };

      // Ask user for results
      let panelVisible = await question('  ➜ Did TurnActionPanel appear in Active tab? (y/n/unsure): ');
      cardResult.turnActionPanelVisible = panelVisible.toLowerCase() === 'y';

      let actionWorked = await question('  ➜ Did the card action execute? (y/n/partial): ');
      cardResult.actionExecuted = actionWorked.toLowerCase() === 'y';

      let notes = await question('  ➜ Any issues or notes? (press Enter to skip): ');
      cardResult.notes = notes || '';

      // Determine status
      if (cardResult.turnActionPanelVisible && cardResult.actionExecuted) {
        cardResult.status = 'PASS';
        results.passedCards++;
        console.log('  ✅ CARD PASSED\n');
      } else if (cardResult.turnActionPanelVisible && !cardResult.actionExecuted) {
        cardResult.status = 'PARTIAL';
        results.partialCards++;
        console.log('  ⚠️  CARD PARTIAL (panel appeared but action may not have executed)\n');
      } else if (actionWorked.toLowerCase() === 'partial') {
        cardResult.status = 'PARTIAL';
        results.partialCards++;
        console.log('  ⚠️  CARD PARTIAL\n');
      } else {
        cardResult.status = 'FAIL';
        results.failedCards++;
        console.log('  ❌ CARD FAILED\n');
      }

      results.cards[card.id] = cardResult;
      results.testedCards++;

      // Offer to skip to next card set
      if (card.id % 10 === 0 && card.id < 30) {
        console.log(`\n✅ Completed cards 1-${card.id} (${Math.round(card.id/30*100)}%)`);
        let continueTest = await question('\nContinue to next batch? (y/n): ');
        if (continueTest.toLowerCase() !== 'y') {
          console.log('\n⚠️  Testing paused by user');
          break;
        }
        console.log('\nCreating new game session for next batch...');
        // Could add game reload logic here if needed
      }
    }

    // Print summary
    console.log('\n' + '═'.repeat(64));
    console.log('TESTING COMPLETE - SUMMARY');
    console.log('═'.repeat(64) + '\n');

    console.log(`Total Cards Tested: ${results.testedCards}`);
    console.log(`✅ Passed: ${results.passedCards}`);
    console.log(`⚠️  Partial: ${results.partialCards}`);
    console.log(`❌ Failed: ${results.failedCards}`);
    console.log(`Pass Rate: ${results.testedCards > 0 ? Math.round(results.passedCards / results.testedCards * 100) : 0}%\n`);

    // Show breakdown by card range
    let cards1_10Pass = 0, cards11_20Pass = 0, cards21_30Pass = 0;
    for (const id in results.cards) {
      const result = results.cards[id];
      if (result.status === 'PASS') {
        if (id <= 10) cards1_10Pass++;
        else if (id <= 20) cards11_20Pass++;
        else cards21_30Pass++;
      }
    }

    console.log('Breakdown by Card Range:');
    console.log(`  Cards 1-10: ${cards1_10Pass}/10 passed`);
    console.log(`  Cards 11-20: ${cards11_20Pass}/10 passed`);
    console.log(`  Cards 21-30: ${cards21_30Pass}/10 passed\n`);

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // Keep browser open for reference
    console.log('\n' + '═'.repeat(64));
    console.log('Browser will stay open for your reference.');
    console.log('Close it when done, or press Ctrl+C to quit.\n');

    // Save results
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    console.log(`Results saved to: ${RESULTS_FILE}\n`);

    // Wait for user to close browser
    await new Promise(() => {
      // Keep process alive
    });
  }
}

runManualTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
