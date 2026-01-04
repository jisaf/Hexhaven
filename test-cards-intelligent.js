#!/usr/bin/env node
/**
 * Intelligent Card Testing with DOM Inspection
 * Uses multiple strategies to find and test cards reliably
 */

const { chromium } = require('playwright');
const fs = require('fs');

const TEST_URL = 'http://localhost:5173';
const RESULTS_FILE = '/home/ubuntu/hexhaven/CARDS_ALL_30_INTELLIGENT_TEST_RESULTS.json';

const results = {
  timestamp: new Date().toISOString(),
  testMode: 'intelligent-automated',
  testedCards: 0,
  passedCards: 0,
  failedCards: 0,
  partialCards: 0,
  cards: {},
  summary: {}
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
  { id: 10, name: 'Trap Setter', initiative: 32 },
  { id: 11, name: 'Earth Tremor', initiative: 35 },
  { id: 12, name: 'Phase Walk', initiative: 38 },
  { id: 13, name: 'Radiant Blessing', initiative: 40 },
  { id: 14, name: 'Ally Support', initiative: 42 },
  { id: 15, name: 'Shadow Strike', initiative: 45 },
  { id: 16, name: 'Self Heal', initiative: 48 },
  { id: 17, name: 'Stunning Blow', initiative: 50 },
  { id: 18, name: 'Teleport Strike', initiative: 52 },
  { id: 19, name: 'Toxic Blade', initiative: 55 },
  { id: 20, name: 'Line Attack', initiative: 58 },
  { id: 21, name: 'Confusing Strike', initiative: 60 },
  { id: 22, name: 'Cone Blast', initiative: 62 },
  { id: 23, name: 'Magnetic Pull', initiative: 65 },
  { id: 24, name: 'Discard Recovery', initiative: 68 },
  { id: 25, name: 'Empowering Aura', initiative: 70 },
  { id: 26, name: 'Round Bonus', initiative: 72 },
  { id: 27, name: 'Piercing Strike', initiative: 75 },
  { id: 28, name: 'Mystic Ally', initiative: 80 },
  { id: 29, name: 'Persistent Shield', initiative: 85 },
  { id: 30, name: 'Sweeping Attack', initiative: 90 }
];

async function findElementByText(page, selector, text) {
  try {
    const elements = await page.locator(selector).all();
    for (const el of elements) {
      const content = await el.textContent();
      if (content && content.includes(text)) {
        return el;
      }
    }
  } catch (e) {
    // Continue
  }
  return null;
}

async function runIntelligentTests() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║    HEXHAVEN INTELLIGENT CARD TESTING - ALL 30 CARDS            ║');
  console.log('║              Using Advanced DOM Inspection                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });

  try {
    console.log('Initializing: Navigating to ' + TEST_URL);
    await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ Page loaded\n');

    // Wait for game to be ready
    await page.waitForTimeout(2000);

    // Check if game is running
    let gameReady = false;
    try {
      await page.waitForSelector('canvas', { timeout: 3000 });
      gameReady = true;
      console.log('✅ Game board detected\n');
    } catch (e) {
      console.log('⚠️  Game board not detected, proceeding anyway\n');
    }

    console.log('Starting card testing phase...\n');

    for (const card of cards) {
      const cardResult = {
        id: card.id,
        name: card.name,
        initiative: card.initiative,
        status: 'UNKNOWN',
        handTabFound: false,
        cardFound: false,
        turnActionPanelVisible: false,
        activeTabFound: false,
        errors: []
      };

      try {
        // Step 1: Find and click Hand tab
        console.log(`Testing Card ${card.id}: ${card.name.padEnd(25)}`);

        const handTab = await findElementByText(page, 'button', 'Hand');
        if (handTab && await handTab.isVisible({ timeout: 300 }).catch(() => false)) {
          await handTab.click();
          await page.waitForTimeout(400);
          cardResult.handTabFound = true;
        }

        // Step 2: Find card in the hand
        if (cardResult.handTabFound) {
          const cardButton = await findElementByText(page, 'button', card.name);
          if (cardButton && await cardButton.isVisible({ timeout: 300 }).catch(() => false)) {
            await cardButton.click();
            await page.waitForTimeout(300);
            cardResult.cardFound = true;
          }
        }

        // Step 3: Try to find and click Recovery card
        if (cardResult.cardFound) {
          const recoveryButton = await findElementByText(page, 'button', 'Recovery');
          if (recoveryButton && await recoveryButton.isVisible({ timeout: 300 }).catch(() => false)) {
            await recoveryButton.click();
            await page.waitForTimeout(300);
          }
        }

        // Step 4: Close hand panel if button exists
        const closeBtn = await findElementByText(page, 'button', 'Close');
        if (closeBtn && await closeBtn.isVisible({ timeout: 300 }).catch(() => false)) {
          await closeBtn.click();
          await page.waitForTimeout(400);
        }

        // Step 5: Confirm selection
        const confirmBtn = await findElementByText(page, 'button', 'Confirm');
        if (confirmBtn && await confirmBtn.isVisible({ timeout: 300 }).catch(() => false)) {
          await confirmBtn.click();
          await page.waitForTimeout(2000);
        }

        // Step 6: Click Active tab
        const activeTab = await findElementByText(page, 'button', 'Active');
        if (activeTab && await activeTab.isVisible({ timeout: 300 }).catch(() => false)) {
          await activeTab.click();
          await page.waitForTimeout(500);
          cardResult.activeTabFound = true;

          // Check for TurnActionPanel
          try {
            await page.waitForSelector('[class*="action"], [class*="panel"], [data-testid*="action"]', { timeout: 1500 });
            cardResult.turnActionPanelVisible = true;
          } catch (e) {
            // Panel not visible
          }
        }

        // Step 7: Try to click an action button
        try {
          const actionButtons = page.locator('button[class*="action"], button[class*="Action"], [class*="action"] button').first();
          if (await actionButtons.isVisible({ timeout: 300 }).catch(() => false)) {
            await actionButtons.click();
            await page.waitForTimeout(800);
          }
        } catch (e) {
          // No action buttons found
        }

        // Step 8: End turn
        const endTurnBtn = await findElementByText(page, 'button', 'End Turn');
        if (endTurnBtn && await endTurnBtn.isVisible({ timeout: 300 }).catch(() => false)) {
          await endTurnBtn.click();
          await page.waitForTimeout(2000);
        }

        // Determine status
        if (cardResult.turnActionPanelVisible && cardResult.cardFound) {
          cardResult.status = 'PASS';
          results.passedCards++;
          console.log(`  ✅ PASS - Card found, TurnActionPanel visible`);
        } else if (cardResult.turnActionPanelVisible) {
          cardResult.status = 'PARTIAL';
          results.partialCards++;
          console.log(`  ⚠️  PARTIAL - Panel visible but card selection unclear`);
        } else if (cardResult.cardFound && cardResult.activeTabFound) {
          cardResult.status = 'PARTIAL';
          results.partialCards++;
          console.log(`  ⚠️  PARTIAL - Card found, Active tab accessible`);
        } else {
          cardResult.status = 'FAIL';
          results.failedCards++;
          const reasons = [];
          if (!cardResult.handTabFound) reasons.push('Hand tab not found');
          if (!cardResult.cardFound && cardResult.handTabFound) reasons.push('Card not found in hand');
          if (!cardResult.activeTabFound) reasons.push('Active tab not accessible');
          console.log(`  ❌ FAIL - ${reasons.join(', ')}`);
        }

      } catch (error) {
        cardResult.status = 'ERROR';
        cardResult.errors.push(error.message);
        results.failedCards++;
        console.log(`  ❌ ERROR - ${error.message}`);
      }

      results.cards[card.id] = cardResult;
      results.testedCards++;
    }

    // Print summary
    console.log('\n' + '═'.repeat(64));
    console.log('TESTING COMPLETE - FINAL SUMMARY');
    console.log('═'.repeat(64) + '\n');

    console.log(`Total Cards Tested:    ${results.testedCards}`);
    console.log(`✅ Passed:             ${results.passedCards}`);
    console.log(`⚠️  Partial:           ${results.partialCards}`);
    console.log(`❌ Failed:             ${results.failedCards}`);

    if (results.testedCards > 0) {
      console.log(`\nPass Rate:             ${Math.round(results.passedCards / results.testedCards * 100)}%`);
      console.log(`Partial Rate:          ${Math.round(results.partialCards / results.testedCards * 100)}%`);
      console.log(`Failure Rate:          ${Math.round(results.failedCards / results.testedCards * 100)}%\n`);
    }

    // Breakdown by card range
    let cards1_10 = { pass: 0, partial: 0, fail: 0 };
    let cards11_20 = { pass: 0, partial: 0, fail: 0 };
    let cards21_30 = { pass: 0, partial: 0, fail: 0 };

    for (const id in results.cards) {
      const result = results.cards[id];
      const range = id <= 10 ? cards1_10 : id <= 20 ? cards11_20 : cards21_30;
      if (result.status === 'PASS') range.pass++;
      else if (result.status === 'PARTIAL') range.partial++;
      else range.fail++;
    }

    console.log('Breakdown by Card Range:');
    console.log(`  Cards 1-10:   ✅ ${cards1_10.pass}/10 | ⚠️  ${cards1_10.partial}/10 | ❌ ${cards1_10.fail}/10`);
    console.log(`  Cards 11-20:  ✅ ${cards11_20.pass}/10 | ⚠️  ${cards11_20.partial}/10 | ❌ ${cards11_20.fail}/10`);
    console.log(`  Cards 21-30:  ✅ ${cards21_30.pass}/10 | ⚠️  ${cards21_30.partial}/10 | ❌ ${cards21_30.fail}/10\n`);

    // List any cards with issues
    const failedCardsList = Object.values(results.cards).filter(c => c.status === 'FAIL');
    if (failedCardsList.length > 0) {
      console.log('Cards That Failed:');
      failedCardsList.forEach(c => {
        const reasons = [];
        if (!c.handTabFound) reasons.push('Hand tab');
        if (!c.cardFound) reasons.push('Card not found');
        if (!c.activeTabFound) reasons.push('Active tab');
        if (!c.turnActionPanelVisible && c.activeTabFound) reasons.push('TurnActionPanel not visible');
        console.log(`  Card ${c.id}: ${c.name.padEnd(20)} (${reasons.join(', ')})`);
      });
      console.log('');
    }

    results.summary = {
      total: results.testedCards,
      passed: results.passedCards,
      partial: results.partialCards,
      failed: results.failedCards,
      range1_10: cards1_10,
      range11_20: cards11_20,
      range21_30: cards21_30
    };

  } catch (error) {
    console.error('Test execution error:', error);
  } finally {
    await browser.close();

    // Save results
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    console.log(`Results saved to: ${RESULTS_FILE}\n`);
  }
}

runIntelligentTests().catch(console.error);
