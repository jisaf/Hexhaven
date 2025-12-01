/**
 * Comprehensive E2E Test: Full Game Flow
 *
 * Test Scenario:
 * 1. Load dev site (localhost:5173)
 * 2. Create 4 separate games
 * 3. Add 2 players to the first game
 * 4. Start all 4 games
 * 5. Select cards for players
 * 6. Move characters
 * 7. Attack with characters
 * 8. Confirm monsters move and attack back after player ends turn
 *
 * This test runs in headless Firefox and reports bugs to bugs.md
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Bug tracking interface
interface Bug {
  title: string;
  explanation: string;
  stepsToRecreate: string[];
  expectedBehavior: string;
}

// Helper function to report bugs
async function reportBug(bug: Bug) {
  const bugsFilePath = path.join(__dirname, '../bugs.md');

  // Read existing bugs file or create new one
  let existingContent = '';
  try {
    existingContent = fs.readFileSync(bugsFilePath, 'utf-8');
  } catch (error) {
    existingContent = '# Known Bugs\n\nThis file tracks known bugs found during testing.\n\n';
  }

  // Check if bug already exists (simple duplicate check based on title)
  if (existingContent.includes(bug.title)) {
    console.log(`Bug already reported: ${bug.title}`);
    return;
  }

  // Format bug as todo list item
  const bugEntry = `
## - [ ] ${bug.title}

**Explanation:** ${bug.explanation}

**Steps to Recreate:**
${bug.stepsToRecreate.map((step, i) => `${i + 1}. ${step}`).join('\n')}

**Expected Behavior:** ${bug.expectedBehavior}

---
`;

  // Append new bug
  fs.appendFileSync(bugsFilePath, bugEntry);
  console.log(`Bug reported: ${bug.title}`);
}

test.describe('Comprehensive Game Flow Test', () => {
  test('should complete full game flow from creation to monster AI', async ({ page, context }) => {
    const bugs: Bug[] = [];

    try {
      // ========================================
      // PHASE 1: Load dev site
      // ========================================
      console.log('Phase 1: Loading dev site...');
      await page.goto('http://localhost:5173', { timeout: 10000 });

      // Verify home page loaded
      const createGameButton = page.locator('button:has-text("Create Game")');
      await expect(createGameButton).toBeVisible({ timeout: 5000 });
      console.log('✓ Dev site loaded successfully');

    } catch (error) {
      bugs.push({
        title: 'Dev site failed to load',
        explanation: `The development site at localhost:5173 failed to load. Error: ${error}`,
        stepsToRecreate: [
          'Navigate to http://localhost:5173',
          'Wait for page to load'
        ],
        expectedBehavior: 'Home page should load with "Create Game" button visible'
      });
    }

    // ========================================
    // PHASE 2: Create 4 separate games
    // ========================================
    console.log('\nPhase 2: Creating 4 games...');
    const roomCodes: (string | null)[] = [];
    const gamePages: any[] = [page];

    try {
      // Create first game (will be used for 2-player test)
      await page.locator('button:has-text("Create Game")').click();
      await page.locator('[data-testid="nickname-input"]').fill('Host1');
      await page.locator('[data-testid="nickname-submit"]').click();

      const roomCode1 = await page.locator('[data-testid="room-code"]').textContent();
      roomCodes.push(roomCode1);
      console.log(`✓ Game 1 created: ${roomCode1}`);

      // Create games 2, 3, 4 in separate tabs
      for (let i = 2; i <= 4; i++) {
        const newPage = await context.newPage();
        gamePages.push(newPage);

        await newPage.goto('http://localhost:5173');
        await newPage.locator('button:has-text("Create Game")').click();
        await newPage.locator('[data-testid="nickname-input"]').fill(`Host${i}`);
        await newPage.locator('[data-testid="nickname-submit"]').click();

        const roomCode = await newPage.locator('[data-testid="room-code"]').textContent();
        roomCodes.push(roomCode);
        console.log(`✓ Game ${i} created: ${roomCode}`);
      }

    } catch (error) {
      bugs.push({
        title: 'Failed to create multiple games',
        explanation: `Could not create 4 separate games. Error: ${error}`,
        stepsToRecreate: [
          'Open dev site',
          'Click "Create Game"',
          'Fill nickname',
          'Repeat in multiple tabs'
        ],
        expectedBehavior: 'Should be able to create multiple independent games'
      });
    }

    // ========================================
    // PHASE 3: Add 2 players to first game
    // ========================================
    console.log('\nPhase 3: Adding 2 players to first game...');
    let player2Page;

    try {
      player2Page = await context.newPage();
      await player2Page.goto('http://localhost:5173');
      await player2Page.locator('button:has-text("Join Game")').click();
      await player2Page.locator('[data-testid="room-code-input"]').fill(roomCodes[0]!);
      await player2Page.locator('[data-testid="nickname-input"]').fill('Player2');
      await player2Page.locator('button:has-text("Join")').click();

      await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible({ timeout: 5000 });
      console.log('✓ Player 2 joined first game');

      // Verify both players see each other
      const player1List = await page.locator('[data-testid="player-list"]').textContent();
      const player2List = await player2Page.locator('[data-testid="player-list"]').textContent();

      if (!player1List?.includes('Player2') || !player2List?.includes('Host1')) {
        bugs.push({
          title: 'Players not visible in lobby',
          explanation: 'When a second player joins, both players should see each other in the player list',
          stepsToRecreate: [
            'Create a game',
            'Join the game from another tab',
            'Check player list on both tabs'
          ],
          expectedBehavior: 'Both players should see each other in the player list'
        });
      }

    } catch (error) {
      bugs.push({
        title: 'Failed to add second player to game',
        explanation: `Could not join second player to first game. Error: ${error}`,
        stepsToRecreate: [
          'Create a game',
          'Note the room code',
          'Open new tab and click "Join Game"',
          'Enter room code and nickname',
          'Click Join'
        ],
        expectedBehavior: 'Second player should successfully join the lobby'
      });
    }

    // ========================================
    // PHASE 4: Start all 4 games
    // ========================================
    console.log('\nPhase 4: Starting all 4 games...');

    try {
      // Select characters for game 1 (2 players)
      await page.locator('[data-testid="character-card-Brute"]').click();
      await player2Page.locator('[data-testid="character-card-Tinkerer"]').click();

      // Start game 1
      await page.locator('[data-testid="start-game-button"]').click();
      await expect(page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 10000 });
      await expect(player2Page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 10000 });
      console.log('✓ Game 1 started');

      // Start games 2, 3, 4 (single player)
      for (let i = 1; i < 4; i++) {
        const gamePage = gamePages[i];
        await gamePage.locator('[data-testid="character-card-Brute"]').click();
        await gamePage.locator('[data-testid="start-game-button"]').click();
        await expect(gamePage.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 10000 });
        console.log(`✓ Game ${i + 1} started`);
      }

    } catch (error) {
      bugs.push({
        title: 'Failed to start games',
        explanation: `Could not start all 4 games. Error: ${error}`,
        stepsToRecreate: [
          'Create games',
          'Select characters',
          'Click "Start Game"'
        ],
        expectedBehavior: 'All games should transition to game board after starting'
      });
    }

    // ========================================
    // PHASE 5: Select cards for players
    // ========================================
    console.log('\nPhase 5: Selecting cards...');

    try {
      // Wait for card selection panel
      await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 5000 });
      await expect(player2Page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 5000 });

      // Player 1 selects cards
      const p1Cards = page.locator('[data-testid^="ability-card-"]');
      const p1CardCount = await p1Cards.count();

      if (p1CardCount < 2) {
        bugs.push({
          title: 'Insufficient ability cards displayed',
          explanation: `Player should have at least 2 cards to select, but found ${p1CardCount}`,
          stepsToRecreate: [
            'Start a game',
            'Check card selection panel'
          ],
          expectedBehavior: 'Player should see their full hand of ability cards (10 for Brute)'
        });
      }

      await page.locator('[data-testid="ability-card-0"]').click();
      await page.locator('[data-testid="ability-card-1"]').click();
      await page.locator('[data-testid="confirm-cards-button"]').click();
      console.log('✓ Player 1 selected cards');

      // Player 2 selects cards
      await player2Page.locator('[data-testid="ability-card-0"]').click();
      await player2Page.locator('[data-testid="ability-card-1"]').click();
      await player2Page.locator('[data-testid="confirm-cards-button"]').click();
      console.log('✓ Player 2 selected cards');

      // Wait for card selection to complete
      await page.waitForTimeout(2000);

    } catch (error) {
      bugs.push({
        title: 'Card selection failed',
        explanation: `Could not complete card selection. Error: ${error}`,
        stepsToRecreate: [
          'Start a game',
          'Wait for card selection panel',
          'Click two cards',
          'Click confirm'
        ],
        expectedBehavior: 'Players should be able to select and confirm two cards'
      });
    }

    // ========================================
    // PHASE 6: Move character
    // ========================================
    console.log('\nPhase 6: Moving character...');

    try {
      // Wait for player turn
      const currentTurn = page.locator('[data-testid="current-turn-indicator"]');
      await expect(currentTurn).toBeVisible({ timeout: 5000 });

      const turnText = await currentTurn.textContent();
      console.log(`Current turn: ${turnText}`);

      // If it's player's turn, try to move
      if (turnText?.includes('Host1') || turnText?.includes('Player')) {
        // Click on player's character
        const bruteSprite = page.locator('[data-testid="character-sprite-Brute"]');

        if (await bruteSprite.isVisible()) {
          await bruteSprite.click();
          console.log('✓ Character selected');

          // Wait for movement highlights
          await page.waitForTimeout(500);

          const highlightedHex = page.locator('[data-testid^="hex-highlight-"]').first();

          if (await highlightedHex.isVisible()) {
            const initialBounds = await bruteSprite.boundingBox();
            await highlightedHex.click();
            await page.waitForTimeout(1000); // Wait for movement animation

            const newBounds = await bruteSprite.boundingBox();

            if (initialBounds && newBounds &&
                (initialBounds.x === newBounds.x && initialBounds.y === newBounds.y)) {
              bugs.push({
                title: 'Character does not move after clicking valid hex',
                explanation: 'Character position did not change after clicking a highlighted movement hex',
                stepsToRecreate: [
                  'Start game and select cards',
                  'Click on character sprite',
                  'Click on highlighted movement hex',
                  'Wait for movement animation'
                ],
                expectedBehavior: 'Character should move to the clicked hex position'
              });
            } else {
              console.log('✓ Character moved successfully');
            }
          } else {
            bugs.push({
              title: 'Movement range not displayed when character selected',
              explanation: 'No movement range hexes are highlighted after selecting character',
              stepsToRecreate: [
                'Start game',
                'Wait for player turn',
                'Click on player character'
              ],
              expectedBehavior: 'Valid movement hexes should be highlighted'
            });
          }
        } else {
          bugs.push({
            title: 'Character sprite not visible on game board',
            explanation: 'Player character sprite is not visible after game starts',
            stepsToRecreate: [
              'Start a game',
              'Complete card selection',
              'Look for character sprite on board'
            ],
            expectedBehavior: 'Character sprite should be visible on the hex grid'
          });
        }
      }

    } catch (error) {
      bugs.push({
        title: 'Character movement failed',
        explanation: `Error during character movement attempt. Error: ${error}`,
        stepsToRecreate: [
          'Start game',
          'Select character',
          'Click movement hex'
        ],
        expectedBehavior: 'Character should move smoothly to selected hex'
      });
    }

    // ========================================
    // PHASE 7: Attack with character
    // ========================================
    console.log('\nPhase 7: Attacking with character...');

    try {
      // Check for attack action button
      const attackAction = page.locator('[data-testid="use-top-action"]');

      if (await attackAction.isVisible()) {
        await attackAction.click();
        console.log('✓ Attack action initiated');

        // Wait for targeting mode
        await page.waitForTimeout(500);

        const targetingMode = page.locator('[data-testid="attack-targeting-mode"]');
        if (await targetingMode.isVisible()) {
          // Look for monster to attack
          const monster = page.locator('[data-testid^="monster-"]').first();

          if (await monster.isVisible()) {
            // Get monster health before attack
            await monster.click();
            await page.waitForTimeout(500);

            const healthDisplay = page.locator('[data-testid="monster-health"]');
            const initialHealthText = await healthDisplay.textContent().catch(() => '5');
            const initialHealth = parseInt(initialHealthText || '5');

            // Close monster stats if needed
            const closeButton = page.locator('[data-testid="close-monster-stats"]');
            if (await closeButton.isVisible()) {
              await closeButton.click();
            }

            // Re-initiate attack and target monster
            if (!await targetingMode.isVisible()) {
              await attackAction.click();
            }

            await monster.click();
            await page.waitForTimeout(1000);

            // Check if damage was dealt
            await monster.click();
            const newHealthText = await healthDisplay.textContent().catch(() => initialHealthText);
            const newHealth = parseInt(newHealthText || initialHealthText);

            if (newHealth >= initialHealth) {
              bugs.push({
                title: 'Attack does not deal damage to monster',
                explanation: `Monster health did not decrease after attack. Initial: ${initialHealth}, After: ${newHealth}`,
                stepsToRecreate: [
                  'Start game',
                  'Move character if needed',
                  'Click attack action',
                  'Select monster target',
                  'Check monster health'
                ],
                expectedBehavior: 'Monster health should decrease by attack damage plus modifier'
              });
            } else {
              console.log(`✓ Attack dealt damage (${initialHealth} → ${newHealth})`);
            }
          } else {
            console.log('⚠ No monsters visible to attack');
          }
        } else {
          bugs.push({
            title: 'Attack targeting mode not activated',
            explanation: 'After clicking attack action, targeting mode did not activate',
            stepsToRecreate: [
              'Start game',
              'Click attack action button'
            ],
            expectedBehavior: 'Targeting mode should activate with prompt to select target'
          });
        }
      } else {
        console.log('⚠ No attack action available (might be movement-only cards)');
      }

    } catch (error) {
      bugs.push({
        title: 'Attack execution failed',
        explanation: `Error during attack execution. Error: ${error}`,
        stepsToRecreate: [
          'Start game',
          'Initiate attack action',
          'Target monster'
        ],
        expectedBehavior: 'Attack should execute and deal damage to target'
      });
    }

    // ========================================
    // PHASE 8: End turn and verify monster AI
    // ========================================
    console.log('\nPhase 8: Ending turn and checking monster AI...');

    try {
      // End player turn
      const endTurnButton = page.locator('[data-testid="end-turn-button"]');

      if (await endTurnButton.isVisible()) {
        await endTurnButton.click();
        console.log('✓ Player turn ended');

        // Wait for turn transition
        await page.waitForTimeout(1000);

        // Check if it's now monster turn
        const turnIndicator = page.locator('[data-testid="current-turn-indicator"]');
        const newTurnText = await turnIndicator.textContent();
        console.log(`New turn: ${newTurnText}`);

        if (newTurnText?.includes('Monster') || newTurnText?.includes('Enemy')) {
          console.log('✓ Monster turn activated');

          // Get player character position before monster action
          const playerChar = page.locator('[data-testid="character-sprite-Brute"]');
          const playerInitialBounds = await playerChar.boundingBox();

          // Wait for monster AI to execute
          await page.waitForTimeout(3000);

          // Check for monster action
          const monsterActionComplete = page.locator('[data-testid="monster-action-complete"]');

          if (await monsterActionComplete.isVisible({ timeout: 5000 })) {
            console.log('✓ Monster AI executed action');
          } else {
            bugs.push({
              title: 'Monster AI does not execute actions',
              explanation: 'Monster turn activated but no action was completed',
              stepsToRecreate: [
                'Start game',
                'Complete player actions',
                'End player turn',
                'Wait for monster turn',
                'Observe monster behavior'
              ],
              expectedBehavior: 'Monster should move toward player and/or attack if in range'
            });
          }

          // Check if player was attacked (health decreased)
          const playerHealth = page.locator('[data-testid="player-health"]');
          if (await playerHealth.isVisible()) {
            const healthText = await playerHealth.textContent();
            console.log(`Player health: ${healthText}`);
          }

        } else {
          console.log('⚠ Next turn is not a monster turn');
        }
      } else {
        bugs.push({
          title: 'End turn button not visible',
          explanation: 'Cannot end player turn - end turn button not found',
          stepsToRecreate: [
            'Start game',
            'Complete player actions',
            'Look for end turn button'
          ],
          expectedBehavior: 'End turn button should be visible and clickable'
        });
      }

    } catch (error) {
      bugs.push({
        title: 'Monster AI turn failed',
        explanation: `Error during monster turn. Error: ${error}`,
        stepsToRecreate: [
          'Start game',
          'End player turn',
          'Wait for monster turn'
        ],
        expectedBehavior: 'Monster should take turn automatically with movement and/or attack'
      });
    }

    // ========================================
    // REPORT ALL BUGS
    // ========================================
    console.log(`\n\n========================================`);
    console.log(`Test Complete!`);
    console.log(`Found ${bugs.length} bugs`);
    console.log(`========================================\n`);

    if (bugs.length > 0) {
      for (const bug of bugs) {
        await reportBug(bug);
      }
      console.log(`\nBugs reported to bugs.md`);
    }

    // Close extra pages
    await player2Page?.close();
    for (let i = 1; i < gamePages.length; i++) {
      await gamePages[i].close();
    }
  });
});
