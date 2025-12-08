/**
 * Game Actions - High-Level Game Flow Helpers
 *
 * Provides complete game flow functions combining multiple page interactions:
 * - Complete turn execution
 * - Character setup
 * - Card selection flows
 * - Attack and movement
 * - Wait for all players
 *
 * Part of Phase 3 - Test Helper Modules
 */

import { Page } from '@playwright/test';
import { GameBoardPage } from '../pages/GameBoardPage';
import { CardSelectionPage } from '../pages/CardSelectionPage';
import { LobbyPage } from '../pages/LobbyPage';
import { CharacterSelectionPage, type CharacterClass } from '../pages/CharacterSelectionPage';

/**
 * Complete a full turn: select cards, perform actions, end turn
 * One-stop function for standard turn flow
 */
export async function completeTurn(
  page: Page,
  options: {
    topCardIndex: number;
    bottomCardIndex: number;
    movePosition?: { x: number; y: number };
    attackPosition?: { x: number; y: number };
    skipEndTurn?: boolean;
  }
): Promise<void> {
  const cardPage = new CardSelectionPage(page);
  const boardPage = new GameBoardPage(page);

  console.log('[game-actions] Starting turn...');

  // Select cards
  await cardPage.selectTwoCardsAndConfirm(
    options.topCardIndex,
    options.bottomCardIndex
  );

  // Wait for board to load
  await boardPage.waitForGameBoard();

  // Perform movement if specified
  if (options.movePosition) {
    console.log(`[game-actions] Moving to (${options.movePosition.x}, ${options.movePosition.y})`);
    await boardPage.clickHexTile(options.movePosition.x, options.movePosition.y);
  }

  // Perform attack if specified
  if (options.attackPosition) {
    console.log(`[game-actions] Attacking (${options.attackPosition.x}, ${options.attackPosition.y})`);
    await boardPage.clickHexTile(options.attackPosition.x, options.attackPosition.y);
  }

  // End turn unless skipped
  if (!options.skipEndTurn) {
    console.log('[game-actions] Ending turn');
    await boardPage.endTurn();
  }

  console.log('[game-actions] Turn complete');
}

/**
 * Wait for all players to select cards
 * Monitors game state for ready status
 */
export async function waitForAllPlayersReady(
  page: Page,
  playerCount: number,
  timeout: number = 30000
): Promise<void> {
  console.log(`[game-actions] Waiting for ${playerCount} players to be ready...`);

  await page.waitForFunction(
    (count) => {
      const state = (window as any).gameStateManager?.getState();
      if (!state || !state.players) return false;

      const readyPlayers = state.players.filter((p: any) => p.cardsSelected);
      return readyPlayers.length === count;
    },
    playerCount,
    { timeout }
  );

  console.log('[game-actions] All players ready');
}

/**
 * Get initiative order from game state
 * Returns array of player IDs in turn order
 */
export async function getInitiativeOrder(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const state = (window as any).gameStateManager?.getState();
    if (!state || !state.turnOrder) return [];

    return state.turnOrder.map((entry: any) => entry.playerId);
  });
}

/**
 * Get current active player ID
 */
export async function getCurrentPlayer(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    const state = (window as any).gameStateManager?.getState();
    return state?.currentPlayerId || null;
  });
}

/**
 * Check if it's specific player's turn
 */
export async function isPlayerTurn(page: Page, playerId: string): Promise<boolean> {
  const currentPlayer = await getCurrentPlayer(page);
  return currentPlayer === playerId;
}

/**
 * Wait for specific player's turn
 */
export async function waitForPlayerTurn(
  page: Page,
  playerId: string,
  timeout: number = 30000
): Promise<void> {
  console.log(`[game-actions] Waiting for player ${playerId}'s turn...`);

  await page.waitForFunction(
    (targetPlayerId) => {
      const state = (window as any).gameStateManager?.getState();
      return state?.currentPlayerId === targetPlayerId;
    },
    playerId,
    { timeout }
  );

  console.log(`[game-actions] Player ${playerId}'s turn started`);
}

/**
 * Setup character in lobby
 * Combines character selection with readiness check
 */
export async function setupCharacter(
  page: Page,
  characterClass: CharacterClass,
  options?: { waitForReady?: boolean }
): Promise<void> {
  const charSelect = new CharacterSelectionPage(page);

  console.log(`[game-actions] Setting up character: ${characterClass}`);

  await charSelect.waitForCharacterSelection();
  await charSelect.selectCharacter(characterClass);

  if (options?.waitForReady) {
    const lobby = new LobbyPage(page);
    await lobby.waitForStartGameEnabled();
  }

  console.log(`[game-actions] Character setup complete: ${characterClass}`);
}

/**
 * Quick character setup for tests
 * Selects first available character
 */
export async function quickSetupCharacter(page: Page): Promise<CharacterClass> {
  const charSelect = new CharacterSelectionPage(page);

  await charSelect.waitForCharacterSelection();
  const selectedChar = await charSelect.selectFirstAvailable();

  console.log(`[game-actions] Quick setup: ${selectedChar}`);
  return selectedChar;
}

/**
 * Get character position on board
 * Returns {q, r} coordinates
 */
export async function getCharacterPosition(
  page: Page,
  characterId: string
): Promise<{ q: number; r: number } | null> {
  return await page.evaluate((charId) => {
    const state = (window as any).gameStateManager?.getState();
    if (!state || !state.gameData) return null;

    const character = state.gameData.characters.find((c: any) => c.id === charId);
    return character ? { q: character.q, r: character.r } : null;
  }, characterId);
}

/**
 * Get monster position on board
 */
export async function getMonsterPosition(
  page: Page,
  monsterId: string
): Promise<{ q: number; r: number } | null> {
  return await page.evaluate((monId) => {
    const state = (window as any).gameStateManager?.getState();
    if (!state || !state.gameData) return null;

    const monster = state.gameData.monsters.find((m: any) => m.id === monId);
    return monster ? { q: monster.q, r: monster.r } : null;
  }, monsterId);
}

/**
 * Get character health
 */
export async function getCharacterHealth(
  page: Page,
  characterId: string
): Promise<number | null> {
  return await page.evaluate((charId) => {
    const state = (window as any).gameStateManager?.getState();
    if (!state || !state.gameData) return null;

    const character = state.gameData.characters.find((c: any) => c.id === charId);
    return character?.currentHealth ?? null;
  }, characterId);
}

/**
 * Get monster health
 */
export async function getMonsterHealth(
  page: Page,
  monsterId: string
): Promise<number | null> {
  return await page.evaluate((monId) => {
    const state = (window as any).gameStateManager?.getState();
    if (!state || !state.gameData) return null;

    const monster = state.gameData.monsters.find((m: any) => m.id === monId);
    return monster?.currentHealth ?? null;
  }, monsterId);
}

/**
 * Get all characters on board
 */
export async function getAllCharacters(page: Page): Promise<any[]> {
  return await page.evaluate(() => {
    const state = (window as any).gameStateManager?.getState();
    return state?.gameData?.characters || [];
  });
}

/**
 * Get all monsters on board
 */
export async function getAllMonsters(page: Page): Promise<any[]> {
  return await page.evaluate(() => {
    const state = (window as any).gameStateManager?.getState();
    return state?.gameData?.monsters || [];
  });
}

/**
 * Count alive monsters
 */
export async function countAliveMonsters(page: Page): Promise<number> {
  const monsters = await getAllMonsters(page);
  return monsters.filter((m) => m.currentHealth > 0).length;
}

/**
 * Count alive characters
 */
export async function countAliveCharacters(page: Page): Promise<number> {
  const characters = await getAllCharacters(page);
  return characters.filter((c) => c.currentHealth > 0).length;
}

/**
 * Check if scenario is complete
 */
export async function isScenarioComplete(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const state = (window as any).gameStateManager?.getState();
    return state?.scenarioComplete === true;
  });
}

/**
 * Wait for scenario to complete
 */
export async function waitForScenarioComplete(
  page: Page,
  timeout: number = 60000
): Promise<void> {
  console.log('[game-actions] Waiting for scenario to complete...');

  await page.waitForFunction(
    () => {
      const state = (window as any).gameStateManager?.getState();
      return state?.scenarioComplete === true;
    },
    { timeout }
  );

  console.log('[game-actions] Scenario complete!');
}

/**
 * Play N turns automatically
 * Fast-forwards through gameplay for testing
 */
export async function playNTurns(
  page: Page,
  turnCount: number,
  options?: {
    cardIndices?: [number, number];
    skipActions?: boolean;
  }
): Promise<void> {
  const cardIndices = options?.cardIndices || [0, 1];

  console.log(`[game-actions] Playing ${turnCount} turns...`);

  for (let i = 0; i < turnCount; i++) {
    console.log(`[game-actions] Turn ${i + 1}/${turnCount}`);

    await completeTurn(page, {
      topCardIndex: cardIndices[0],
      bottomCardIndex: cardIndices[1],
      skipEndTurn: false,
    });

    // Wait a moment between turns
    await page.waitForTimeout(1000);
  }

  console.log(`[game-actions] Completed ${turnCount} turns`);
}

/**
 * Get available movement hexes
 */
export async function getAvailableMovementHexes(page: Page): Promise<any[]> {
  return await page.evaluate(() => {
    const state = (window as any).gameStateManager?.getState();
    return state?.validMovementHexes || [];
  });
}

/**
 * Get available attack hexes
 */
export async function getAvailableAttackHexes(page: Page): Promise<any[]> {
  return await page.evaluate(() => {
    const state = (window as any).gameStateManager?.getState();
    return state?.validAttackHexes || [];
  });
}

/**
 * Check if in attack mode
 */
export async function isInAttackMode(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const state = (window as any).gameStateManager?.getState();
    return state?.attackMode === true;
  });
}

/**
 * Get selected hex coordinates
 */
export async function getSelectedHex(page: Page): Promise<{ q: number; r: number } | null> {
  return await page.evaluate(() => {
    const state = (window as any).gameStateManager?.getState();
    return state?.selectedHex || null;
  });
}

/**
 * Wait for monster AI turn to complete
 * Waits for all monster actions to finish
 */
export async function waitForMonsterAIComplete(
  page: Page,
  timeout: number = 15000
): Promise<void> {
  console.log('[game-actions] Waiting for monster AI...');

  // Wait for turn to change back to player
  const board = new GameBoardPage(page);

  // Wait a moment for AI to start
  await page.waitForTimeout(2000);

  // Wait for network activity to settle
  await page.waitForLoadState('networkidle', { timeout });

  console.log('[game-actions] Monster AI complete');
}
