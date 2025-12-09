/**
 * Multiplayer Test Helpers
 *
 * Provides utilities for multiplayer game testing:
 * - Create N-player games
 * - Synchronize actions across players
 * - Manage multiple browser contexts
 * - Clear player sessions
 * - Coordinate turn-taking
 *
 * Part of Phase 3 - Test Helper Modules
 */

import { Page, BrowserContext } from '@playwright/test';
import { LandingPage } from '../pages/LandingPage';
import { LobbyPage } from '../pages/LobbyPage';
import { CharacterSelectionPage, type CharacterClass } from '../pages/CharacterSelectionPage';

/**
 * Player session data
 */
export interface PlayerSession {
  page: Page;
  nickname: string;
  index: number;
  isHost: boolean;
}

/**
 * Multiplayer game session
 */
export interface MultiplayerGameSession {
  players: PlayerSession[];
  roomCode: string;
  hostPage: Page;
}

/**
 * Create a multiplayer game with N players
 * Returns array of player pages and room code
 */
export async function createMultiplayerGame(
  context: BrowserContext,
  playerCount: number,
  options?: {
    hostNickname?: string;
    playerNicknamePrefix?: string;
  }
): Promise<MultiplayerGameSession> {
  const hostNickname = options?.hostNickname || 'Host';
  const playerPrefix = options?.playerNicknamePrefix || 'Player';

  console.log(`[multiplayer] Creating ${playerCount}-player game...`);

  const players: PlayerSession[] = [];

  // Host creates game
  const hostPage = await context.newPage();
  const landingPage = new LandingPage(hostPage);
  const lobbyPage = new LobbyPage(hostPage);

  await landingPage.navigate();
  await landingPage.clickCreateGame();
  await lobbyPage.enterNickname(hostNickname);

  const roomCode = await lobbyPage.getRoomCode();

  players.push({
    page: hostPage,
    nickname: hostNickname,
    index: 0,
    isHost: true,
  });

  console.log(`[multiplayer] Host created room: ${roomCode}`);

  // Add additional players
  for (let i = 1; i < playerCount; i++) {
    const playerPage = await context.newPage();
    const nickname = `${playerPrefix}${i + 1}`;

    // Clear localStorage for independent session
    await playerPage.evaluate(() => {
      localStorage.clear();
    });

    const playerLanding = new LandingPage(playerPage);
    const playerLobby = new LobbyPage(playerPage);

    await playerLanding.navigate();
    await playerLanding.clickJoinGame();
    await playerLobby.joinRoom(roomCode, nickname);

    players.push({
      page: playerPage,
      nickname,
      index: i,
      isHost: false,
    });

    console.log(`[multiplayer] Player ${i + 1} joined: ${nickname}`);
  }

  // Wait for all players to be in lobby
  await lobbyPage.waitForPlayerCount(playerCount);

  console.log(`[multiplayer] All ${playerCount} players in lobby`);

  return {
    players,
    roomCode,
    hostPage,
  };
}

/**
 * Setup characters for all players
 * Each player selects specified or random character
 */
export async function setupCharactersForAll(
  session: MultiplayerGameSession,
  characterClasses?: (CharacterClass | 'random')[]
): Promise<CharacterClass[]> {
  console.log('[multiplayer] Setting up characters for all players...');

  const selectedCharacters: CharacterClass[] = [];
  const disabledCharacters: CharacterClass[] = [];

  for (let i = 0; i < session.players.length; i++) {
    const player = session.players[i];
    const charSelect = new CharacterSelectionPage(player.page);

    await charSelect.waitForCharacterSelection();

    let selectedChar: CharacterClass;

    if (characterClasses && characterClasses[i] && characterClasses[i] !== 'random') {
      // Use specified character
      selectedChar = characterClasses[i] as CharacterClass;
      await charSelect.selectCharacter(selectedChar);
    } else {
      // Select random available character
      selectedChar = await charSelect.selectRandomAvailable();
    }

    selectedCharacters.push(selectedChar);
    disabledCharacters.push(selectedChar);

    console.log(`[multiplayer] ${player.nickname} selected: ${selectedChar}`);
  }

  console.log('[multiplayer] All characters selected');
  return selectedCharacters;
}

/**
 * Start game from host's perspective
 * Waits for all players to be ready
 */
export async function startMultiplayerGame(
  session: MultiplayerGameSession
): Promise<void> {
  console.log('[multiplayer] Starting game...');

  const lobby = new LobbyPage(session.hostPage);

  // Wait for start button to be enabled
  await lobby.waitForStartGameEnabled();

  // Start game
  await lobby.startGame();

  console.log('[multiplayer] Game started');
}

/**
 * Synchronize action across multiple players
 * Executes action function for each player in parallel
 */
export async function synchronizedAction(
  players: PlayerSession[],
  action: (player: PlayerSession) => Promise<void>
): Promise<void> {
  console.log(`[multiplayer] Executing synchronized action for ${players.length} players...`);

  await Promise.all(
    players.map(async (player) => {
      try {
        await action(player);
      } catch (error) {
        console.error(`[multiplayer] Error for ${player.nickname}:`, error);
        throw error;
      }
    })
  );

  console.log('[multiplayer] Synchronized action complete');
}

/**
 * Synchronize action with sequential execution
 * Executes actions one by one in order
 */
export async function sequentialAction(
  players: PlayerSession[],
  action: (player: PlayerSession, index: number) => Promise<void>
): Promise<void> {
  console.log(`[multiplayer] Executing sequential action for ${players.length} players...`);

  for (let i = 0; i < players.length; i++) {
    try {
      await action(players[i], i);
    } catch (error) {
      console.error(`[multiplayer] Error for ${players[i].nickname}:`, error);
      throw error;
    }
  }

  console.log('[multiplayer] Sequential action complete');
}

/**
 * Clear all player sessions
 * Resets localStorage for all players
 */
export async function clearAllSessions(players: PlayerSession[]): Promise<void> {
  console.log('[multiplayer] Clearing all player sessions...');

  await Promise.all(
    players.map((player) =>
      player.page.evaluate(() => localStorage.clear())
    )
  );

  console.log('[multiplayer] All sessions cleared');
}

/**
 * Get player by nickname
 */
export function getPlayerByNickname(
  session: MultiplayerGameSession,
  nickname: string
): PlayerSession | undefined {
  return session.players.find((p) => p.nickname === nickname);
}

/**
 * Get player by index
 */
export function getPlayerByIndex(
  session: MultiplayerGameSession,
  index: number
): PlayerSession | undefined {
  return session.players[index];
}

/**
 * Get non-host players
 */
export function getNonHostPlayers(
  session: MultiplayerGameSession
): PlayerSession[] {
  return session.players.filter((p) => !p.isHost);
}

/**
 * Close all player pages except host
 */
export async function closeNonHostPlayers(
  session: MultiplayerGameSession
): Promise<void> {
  console.log('[multiplayer] Closing non-host players...');

  const nonHostPlayers = getNonHostPlayers(session);

  await Promise.all(
    nonHostPlayers.map((player) => player.page.close())
  );

  console.log(`[multiplayer] Closed ${nonHostPlayers.length} non-host players`);
}

/**
 * Wait for all players to reach specific page
 */
export async function waitForAllPlayersOnPage(
  players: PlayerSession[],
  urlPattern: string | RegExp,
  timeout: number = 30000
): Promise<void> {
  console.log('[multiplayer] Waiting for all players to reach page...');

  await Promise.all(
    players.map((player) =>
      player.page.waitForURL(urlPattern, { timeout })
    )
  );

  console.log('[multiplayer] All players on target page');
}

/**
 * Take screenshots of all players
 */
export async function screenshotAllPlayers(
  players: PlayerSession[],
  prefix: string
): Promise<void> {
  console.log(`[multiplayer] Taking screenshots: ${prefix}`);

  await Promise.all(
    players.map((player, index) =>
      player.page.screenshot({
        path: `public/test-videos/${prefix}-${player.nickname}-${index}.png`,
        fullPage: true,
      })
    )
  );

  console.log('[multiplayer] Screenshots saved');
}

/**
 * Verify all players see same room code
 */
export async function verifyAllPlayersInSameRoom(
  session: MultiplayerGameSession
): Promise<void> {
  console.log('[multiplayer] Verifying all players in same room...');

  const roomCodes: string[] = [];

  for (const player of session.players) {
    const lobby = new LobbyPage(player.page);
    const code = await lobby.getRoomCode();
    roomCodes.push(code);
  }

  // Check all codes match
  const firstCode = roomCodes[0];
  const allMatch = roomCodes.every((code) => code === firstCode);

  if (!allMatch) {
    throw new Error(
      `Room codes don't match! ${roomCodes.join(', ')}`
    );
  }

  console.log(`[multiplayer] All players in room: ${firstCode}`);
}

/**
 * Verify all players see same player count
 */
export async function verifyAllPlayersSeeEachOther(
  session: MultiplayerGameSession
): Promise<void> {
  console.log('[multiplayer] Verifying all players see each other...');

  const expectedCount = session.players.length;

  for (const player of session.players) {
    const lobby = new LobbyPage(player.page);
    const count = await lobby.getPlayerCount();

    if (count !== expectedCount) {
      throw new Error(
        `${player.nickname} sees ${count} players, expected ${expectedCount}`
      );
    }
  }

  console.log(`[multiplayer] All players see ${expectedCount} players`);
}

/**
 * Simulate player disconnect/reconnect
 */
export async function simulateDisconnect(
  player: PlayerSession,
  duration: number = 3000
): Promise<void> {
  console.log(`[multiplayer] Simulating disconnect for ${player.nickname}...`);

  // Set offline
  await player.page.context().setOffline(true);

  // Wait specified duration
  await player.page.waitForTimeout(duration);

  // Restore connection
  await player.page.context().setOffline(false);

  console.log(`[multiplayer] ${player.nickname} reconnected`);
}

/**
 * Create 2-player game (common scenario)
 */
export async function createTwoPlayerGame(
  context: BrowserContext,
  options?: {
    player1Name?: string;
    player2Name?: string;
  }
): Promise<MultiplayerGameSession> {
  return await createMultiplayerGame(context, 2, {
    hostNickname: options?.player1Name || 'Player1',
    playerNicknamePrefix: options?.player2Name?.replace(/\d+$/, '') || 'Player',
  });
}

/**
 * Create 4-player game (maximum capacity)
 */
export async function createFourPlayerGame(
  context: BrowserContext
): Promise<MultiplayerGameSession> {
  return await createMultiplayerGame(context, 4);
}
