import { websocketService, type EventName } from './websocket.service';
import { roomSessionManager } from './room-session.service';
import type { GameStartedPayload, TurnEntity, LogMessage, LogMessagePart, CharacterMovedPayload, AttackResolvedPayload, MonsterActivatedPayload, AbilityCard, LootSpawnedPayload, RestEventPayload, TurnActionState, TurnStartedPayload, CardActionExecutedPayload, UseCardActionPayload } from '../../../shared/types';
import type { Character } from '../../../shared/types/entities';
import { getRange, type CardAction } from '../../../shared/types/modifiers';
import { hexRangeReachable, hexAttackRange } from '../game/hex-utils';
import type { Axial } from '../game/hex-utils';

// Helper to format modifier value into a string like "+1", "-2"
const formatModifier = (modifier: number | 'null' | 'x2'): string => {
  if (modifier === 'x2') {
    return ', x2 modifier';
  }
  if (modifier === 'null') {
    return ' (null modifier)';
  }
  if (typeof modifier === 'number') {
    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
  }
  return '';
};

// Helper to get color for a given effect
const getEffectColor = (effect: string) => {
  switch (effect.toLowerCase()) {
    case 'poison':
      return 'green';
    case 'wound':
      return 'orange';
    case 'stun':
      return 'lightblue';
    case 'immobilize':
    case 'disarm':
      return 'white';
    default:
      return 'lightgreen';
  }
};

/**
 * Check if a hex is blocked by terrain (cannot pass through)
 * In Gloomhaven, obstacles block movement entirely
 */
const isHexBlockedByTerrain = (hex: Axial, state: GameState): boolean => {
    if (!state.gameData) return true;
    const tile = state.gameData.mapLayout.find(t => t.coordinates.q === hex.q && t.coordinates.r === hex.r);
    if (!tile) return true;
    if (tile.terrain === 'obstacle') return true;
    return false;
}

/**
 * Check if a hex is blocked for player movement (terrain + monsters)
 * In Gloomhaven, monsters block player movement entirely (cannot pass through enemies)
 */
const isHexBlocked = (hex: Axial, state: GameState): boolean => {
    // First check terrain
    if (isHexBlockedByTerrain(hex, state)) return true;

    // Monsters block player movement (cannot move through enemies)
    if (!state.gameData) return true;
    if (state.gameData.monsters.some(m =>
      m.currentHex.q === hex.q && m.currentHex.r === hex.r && m.health > 0
    )) return true;

    return false;
}

/**
 * Check if a hex is occupied by an entity (character or monster)
 * In Gloomhaven, you can move through allies but cannot stop on occupied hexes
 */
const isHexOccupied = (hex: Axial, state: GameState): boolean => {
    if (!state.gameData) return false;

    // Check for characters
    if (state.gameData.characters.some(c => c.currentHex?.q === hex.q && c.currentHex?.r === hex.r)) return true;

    // Check for monsters (alive ones)
    if (state.gameData.monsters.some(m => m.currentHex.q === hex.q && m.currentHex.r === hex.r && m.health > 0)) return true;

    return false;
}

/**
 * Check if a character can stop on a hex (not blocked and not occupied)
 */
const canStopOnHex = (hex: Axial, state: GameState): boolean => {
    return !isHexBlocked(hex, state) && !isHexOccupied(hex, state);
}

const hasAttackTarget = (hex: Axial, state: GameState, attackerId: string): boolean => {
    if (!state.gameData) return false;

    // Can target monsters (alive ones only)
    if (state.gameData.monsters.some(m =>
      m.currentHex.q === hex.q &&
      m.currentHex.r === hex.r &&
      m.health > 0
    )) return true;

    // Can target other characters (for friendly fire or special abilities)
    // Exclude the attacker themselves
    if (state.gameData.characters.some(c =>
      c.id !== attackerId &&
      c.currentHex?.q === hex.q &&
      c.currentHex?.r === hex.r &&
      !c.isExhausted
    )) return true;

    return false;
}

// Per-character card selection tracking for multi-character support
interface CharacterCardSelection {
  topCardId: string | null;
  bottomCardId: string | null;
  initiativeCardId: string | null; // Issue #411: Which card determines initiative
}

interface GameState {
  // Core game data
  gameData: GameStartedPayload | null;

  // Campaign context (Issue #318)
  campaignId: string | null;

  // Turn management
  currentRound: number;
  turnOrder: TurnEntity[];
  currentTurnEntityId: string | null;
  isMyTurn: boolean;

  // Player state (multi-character support)
  myCharacterIds: string[]; // All controlled character IDs
  myUserCharacterIds: string[]; // Database character IDs for inventory API (Issue #205)
  activeCharacterIndex: number; // Which character is currently active (0-3)
  myCharacterId: string | null; // Backward compatibility - active character ID
  myUserCharacterId: string | null; // Database character ID for inventory API (Issue #205)
  abilityDeck: AbilityCard[]; // Master copy of ALL cards (never modified)
  abilityDecks: Map<string, AbilityCard[]>; // Per-character ability decks
  playerHand: AbilityCard[];
  selectedTopAction: AbilityCard | null;
  selectedBottomAction: AbilityCard | null;
  selectedInitiativeCardId: string | null; // Issue #411: Which card determines initiative
  characterCardSelections: Map<string, CharacterCardSelection>; // Per-character card selections

  // Movement state
  selectedCharacterId: string | null;
  selectedHex: Axial | null;
  currentMovementPoints: number;
  validMovementHexes: Axial[];

  // Combat state
  attackMode: boolean;
  attackableTargets: string[];
  validAttackHexes: Axial[];
  selectedAttackTarget: string | null;

  // UI state
  logs: LogMessage[];
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  showCardSelection: boolean;
  waitingForRoundStart: boolean;

  // Rest state
  restState: RestState | null;

  // Exhaustion state
  exhaustionState: ExhaustionState | null;

  // Issue #411: Card action selection during turn
  turnActionState: TurnActionState | null;
  selectedTurnCards: { card1: AbilityCard; card2: AbilityCard } | null;
  pendingAction: { cardId: string; position: 'top' | 'bottom' } | null;
  // Issue #411: Targeting mode for actions from cards (extensible for heal, summon, etc.)
  cardActionTargetingMode: 'move' | 'attack' | 'heal' | 'summon' | null;
  cardActionRange: number; // The range/value from the card action
  // Issue #411: Hex highlighting for heal and summon actions
  validHealHexes: Axial[];
  validSummonHexes: Axial[];
}

interface ExhaustionState {
  characterId: string;
  characterName: string;
  reason: 'damage' | 'insufficient_cards';
}

export interface RestState {
  stage: 'rest-started' | 'card-selected' | 'awaiting-decision' | 'long-selection' | 'complete' | 'error';
  characterId: string;
  restType: 'short' | 'long' | null;
  randomCardId: string | null;
  canReroll: boolean;
  currentHealth: number;
  errorMessage: string | null;
  // Long rest fields
  discardPileCards?: string[]; // Card IDs available to choose from for long rest
  selectedCardToLose?: string; // Card ID player selected to lose
}

interface VisualUpdateCallbacks {
  moveCharacter?: (characterId: string, toHex: Axial, movementPath?: Axial[]) => void;
  updateMonsterPosition?: (monsterId: string, newHex: Axial) => void;
  updateCharacterHealth?: (characterId: string, health: number) => void;
  updateMonsterHealth?: (monsterId: string, health: number) => void;
  removeMonster?: (monsterId: string) => void;
  spawnMonster?: (monsterData: { monsterId: string; monsterType: string; isElite: boolean; hex: Axial; health: number; maxHealth: number }) => void;
  spawnLootToken?: (lootData: LootSpawnedPayload) => void;
  collectLootToken?: (tokenId: string) => void;
}

/**
 * EVENT HANDLER PATTERN
 *
 * This service follows a consistent pattern for handling WebSocket events from the backend:
 *
 * 1. WebSocket Event Received
 *    - Event arrives via websocketService
 *    - Registered in setupWebSocketListeners()
 *
 * 2. Visual Update (Optional)
 *    - Call visualCallbacks for sprite/UI changes
 *    - Examples: moveCharacter, updateMonsterPosition, removeMonster, collectLootToken
 *    - These callbacks are registered by GameBoard component
 *    - They trigger PixiJS sprite animations/updates in HexGrid
 *
 * 3. State Update (Optional)
 *    - Modify this.state.gameData to keep local state in sync with backend
 *    - Examples: Update character position, health, monster list
 *
 * 4. Log Message (Optional)
 *    - Call this.addLog() with formatted message parts
 *    - Provides user feedback about game events
 *
 * 5. Emit State Update (Always)
 *    - Call this.emitStateUpdate() to notify all subscribers
 *    - Triggers React re-renders
 *
 * EXAMPLE:
 * ```typescript
 * private handleLootCollected(data: LootCollectedPayload): void {
 *   // 1. Event received (automatic)
 *
 *   // 2. Visual update - remove loot sprite
 *   this.visualCallbacks.collectLootToken?.(data.lootTokenId);
 *
 *   // 3. State update - (if needed, none for loot currently)
 *
 *   // 4. Log message - show who collected loot
 *   this.addLog([
 *     { text: characterName, color: 'lightblue' },
 *     { text: ' collected ' },
 *     { text: `${data.goldValue}`, color: 'gold' }
 *   ]);
 *
 *   // 5. Emit state update
 *   this.emitStateUpdate();
 * }
 * ```
 *
 * WHY NOT ABSTRACT?
 * - Each handler has unique business logic
 * - Log formatting varies (simple text vs complex multi-part)
 * - State updates are event-specific
 * - Some events need conditional visual updates
 * - Explicit code is more maintainable for game logic
 */
class GameStateManager {
  private state: GameState = {
    gameData: null,
    campaignId: null, // Issue #318 - Campaign context
    currentRound: 0,
    turnOrder: [],
    currentTurnEntityId: null,
    isMyTurn: false,
    myCharacterIds: [], // Multi-character support
    myUserCharacterIds: [], // Multi-character support
    activeCharacterIndex: 0, // Multi-character support
    myCharacterId: null,
    myUserCharacterId: null,
    abilityDeck: [],
    abilityDecks: new Map(), // Per-character ability decks
    playerHand: [],
    selectedTopAction: null,
    selectedBottomAction: null,
    selectedInitiativeCardId: null, // Issue #411: Initiative card selection
    characterCardSelections: new Map(), // Per-character card selections
    selectedCharacterId: null,
    selectedHex: null,
    currentMovementPoints: 0,
    validMovementHexes: [],
    attackMode: false,
    attackableTargets: [],
    validAttackHexes: [],
    selectedAttackTarget: null,
    logs: [],
    connectionStatus: 'connected',
    showCardSelection: false,
    waitingForRoundStart: false,
    restState: null,
    exhaustionState: null,
    // Issue #411: Card action selection during turn
    turnActionState: null,
    selectedTurnCards: null,
    pendingAction: null,
    cardActionTargetingMode: null,
    cardActionRange: 0,
    validHealHexes: [],
    validSummonHexes: [],
  };
  private subscribers: Set<(state: GameState) => void> = new Set();
  private visualCallbacks: VisualUpdateCallbacks = {};

  // Store bound handlers for proper cleanup (fixes HMR duplicate registration)
  // Handler type matches websocketService.on() callback signature
  private boundHandlers: Map<EventName, (data: unknown) => void> = new Map();
  private listenersSetup = false;

  constructor() {
    this.setupWebSocketListeners();
    // Check for stored game state from roomSessionManager
    // This handles the case where game_started event fired before GameStateManager was instantiated
    this.initializeFromStoredState();
  }

  /**
   * Cleanup handlers - call before module hot reload
   */
  public cleanup(): void {
    for (const [event, handler] of this.boundHandlers) {
      websocketService.off(event as EventName, handler);
    }
    this.boundHandlers.clear();
    this.listenersSetup = false;
  }

  /**
   * Initialize from stored game state if available
   * This handles the race condition where game_started fires during page navigation
   */
  private initializeFromStoredState(): void {
    const storedGameState = roomSessionManager.getStoredGameState();
    if (storedGameState && !this.state.gameData) {
      console.log('[GameStateManager] Initializing from stored game state');
      this.handleGameStarted(storedGameState);
    }
  }

  public registerVisualCallbacks(callbacks: VisualUpdateCallbacks): void {
    this.visualCallbacks = { ...this.visualCallbacks, ...callbacks };
  }

  private addLog(parts: LogMessagePart[]) {
    const newLog: LogMessage = {
      id: `${Date.now()}-${Math.random()}`,
      parts,
    };
    this.state.logs = [...this.state.logs, newLog].slice(-200);
    this.emitStateUpdate();
  }

  private setupWebSocketListeners(): void {
    // Prevent duplicate registration (fixes HMR issue)
    if (this.listenersSetup) {
      return;
    }

    // Helper to register and track handlers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const register = (event: EventName, handler: (data: any) => void) => {
      this.boundHandlers.set(event, handler as (data: unknown) => void);
      websocketService.on(event, handler);
    };

    register('game_started', this.handleGameStarted.bind(this));
    register('character_moved', this.handleCharacterMoved.bind(this));
    register('round_started', this.handleRoundStarted.bind(this));
    register('round_ended', this.handleRoundEnded.bind(this));
    register('turn_started', this.handleTurnStarted.bind(this));
    register('monster_activated', this.handleMonsterActivated.bind(this));
    register('attack_resolved', this.handleAttackResolved.bind(this));
    register('monster_died', this.handleMonsterDied.bind(this));
    register('loot_spawned', this.handleLootSpawned.bind(this));
    register('loot_collected', this.handleLootCollected.bind(this));
    register('rest-event', this.handleRestEvent.bind(this));
    register('narrative_monster_spawned', this.handleMonsterSpawned.bind(this));
    // Issue #411: Card action execution event
    register('card_action_executed', this.handleCardActionExecuted.bind(this));
    // Issue #411: Listen for errors from card actions
    register('error', (data: { code?: string; message: string }) => {
      console.error('[GameStateManager] WebSocket error:', data);
      if (data.code === 'USE_CARD_ACTION_FAILED') {
        this.addLog([
          { text: 'Action failed: ', color: 'red' },
          { text: data.message, color: 'orange' },
        ]);
        // Clear targeting mode on error
        this.state.cardActionTargetingMode = null;
        this.state.cardActionRange = 0;
        this.state.attackMode = false;
        this.state.validMovementHexes = [];
        this.state.validAttackHexes = [];
        this.state.validHealHexes = [];
        this.state.validSummonHexes = [];
        this.state.attackableTargets = [];
        this.emitStateUpdate();
      }
    });
    register('ws_connected', () => {
        this.state.connectionStatus = 'connected';
        this.emitStateUpdate();
    });
    register('ws_disconnected', () => {
        this.state.connectionStatus = 'disconnected';
        this.emitStateUpdate();
    });
    register('ws_reconnecting', () => {
        this.state.connectionStatus = 'reconnecting';
        this.emitStateUpdate();
    });
    // Issue #419: Reset waitingForRoundStart on reconnection to prevent stuck "waiting" state
    // This handles the case where the round_started event was missed during disconnection
    register('ws_reconnected', () => {
        this.state.connectionStatus = 'connected';
        // Reset waiting state - the backend will send round_ended or round_started
        // events on rejoin which will set the correct state
        this.state.waitingForRoundStart = false;
        console.log('[GameStateManager] WebSocket reconnected, reset waitingForRoundStart');
        this.emitStateUpdate();
    });

    this.listenersSetup = true;
  }

  private handleGameStarted(data: GameStartedPayload): void {
    this.addLog([{ text: `Scenario started: ${data.scenarioName}` }]);

    // Issue #318 - Extract campaign context from payload
    this.state.campaignId = data.campaignId || null;

    const playerUUID = websocketService.getPlayerUUID();
    if (!playerUUID) return;

    // Multi-character support: find ALL characters belonging to current player
    const myCharacters = data.characters.filter(char => char.playerId === playerUUID);
    this.state.myCharacterIds = myCharacters.map(c => c.id);
    this.state.myUserCharacterIds = myCharacters.map(c => c.userCharacterId || '').filter(id => id !== '');
    this.state.activeCharacterIndex = 0;

    // Initialize card selections and ability decks for ALL characters
    this.state.characterCardSelections = new Map();
    this.state.abilityDecks = new Map();

    // Process ALL characters to initialize their decks and selections
    myCharacters.forEach((char) => {
      const characterWithDeck = char as typeof char & {
        abilityDeck?: AbilityCard[];
        selectedCards?: { topCardId: string; bottomCardId: string; initiative: number };
      };

      // Initialize card selection tracking for this character
      this.state.characterCardSelections.set(char.id, {
        topCardId: characterWithDeck.selectedCards?.topCardId || null,
        bottomCardId: characterWithDeck.selectedCards?.bottomCardId || null,
        initiativeCardId: null, // Issue #411: Will be set when player chooses
      });

      // Store ability deck for this character
      if (characterWithDeck.abilityDeck && Array.isArray(characterWithDeck.abilityDeck)) {
        this.state.abilityDecks.set(char.id, characterWithDeck.abilityDeck);

        // Initialize hand for this character if empty (new game)
        if (!char.hand || char.hand.length === 0) {
          char.hand = characterWithDeck.abilityDeck.map(card => card.id);
          char.discardPile = [];
          char.lostPile = [];
        }
      }
    });

    const myCharacter = myCharacters[0]; // Use first character for backward compatibility
    if (myCharacter) {
      this.state.myCharacterId = myCharacter.id;
      this.state.myUserCharacterId = myCharacter.userCharacterId || null; // Database ID for inventory API
      const characterWithDeck = myCharacter as typeof myCharacter & {
        abilityDeck?: AbilityCard[];
        selectedCards?: { topCardId: string; bottomCardId: string; initiative: number };
        effectiveMovement?: number;
        effectiveAttack?: number;
        effectiveRange?: number;
        hasAttackedThisTurn?: boolean;
        movementUsedThisTurn?: number;
      };

      if (characterWithDeck.abilityDeck && Array.isArray(characterWithDeck.abilityDeck)) {
        // Store master copy of ALL cards (never modified) - backward compatibility
        this.state.abilityDeck = characterWithDeck.abilityDeck;

        // Check if character already has card piles (from backend during rejoin)
        // If not, initialize them (new game)
        if (!myCharacter.hand || myCharacter.hand.length === 0) {
          // New game - all cards start in hand
          const cardIds = characterWithDeck.abilityDeck.map(card => card.id);
          myCharacter.hand = cardIds;
          myCharacter.discardPile = [];
          myCharacter.lostPile = [];
          this.state.playerHand = characterWithDeck.abilityDeck;
        } else {
          // Rejoining game - use existing card piles from backend
          // Filter playerHand to only show cards currently in hand
          this.state.playerHand = characterWithDeck.abilityDeck.filter(card =>
            myCharacter.hand.includes(card.id)
          );
          console.log(`[GameStateManager] Rejoined game - playerHand filtered to ${this.state.playerHand.length} cards (hand: ${myCharacter.hand.length}, discard: ${myCharacter.discardPile?.length || 0}, lost: ${myCharacter.lostPile?.length || 0})`);
        }
      }

      // Restore selected cards if they exist (for game rejoin)
      if (characterWithDeck.selectedCards) {
        const { topCardId, bottomCardId } = characterWithDeck.selectedCards;

        // Find the selected cards in the ability deck
        if (this.state.playerHand.length > 0) {
          this.state.selectedTopAction = this.state.playerHand.find(card => card.id === topCardId) || null;
          this.state.selectedBottomAction = this.state.playerHand.find(card => card.id === bottomCardId) || null;
        }

        // Restore action state
        if (characterWithDeck.effectiveMovement !== undefined) {
          this.state.currentMovementPoints = characterWithDeck.effectiveMovement - (characterWithDeck.movementUsedThisTurn || 0);
        }

        // Don't show card selection if cards are already selected
        this.state.showCardSelection = false;

        console.log('[GameStateManager] Restored selected cards on rejoin:', {
          topCardId,
          bottomCardId,
          effectiveMovement: characterWithDeck.effectiveMovement,
          movementUsed: characterWithDeck.movementUsedThisTurn,
          movementRemaining: this.state.currentMovementPoints,
        });
      } else {
        // No cards selected yet - show card selection
        if (this.state.playerHand.length > 0) {
          this.state.showCardSelection = true;
        }
      }
    }

    this.state.gameData = data;
    // Use currentRound from payload if available (for rejoin), otherwise default to 1
    this.state.currentRound = data.currentRound || 1;

    // Restore game log from payload if available (for rejoin)
    if (data.gameLog && data.gameLog.length > 0) {
      this.state.logs = data.gameLog.map(entry => ({
        id: entry.id,
        parts: entry.parts as LogMessagePart[],
      }));
      console.log(`[GameStateManager] Restored ${data.gameLog.length} log entries from server`);
    }

    console.log(`[GameStateManager] Game started with ${myCharacters.length} characters for player (round ${this.state.currentRound})`);
    this.emitStateUpdate();
  }

  private handleCharacterMoved(data: CharacterMovedPayload): void {
    // Trigger visual update
    this.visualCallbacks.moveCharacter?.(data.characterId, data.toHex, data.movementPath);

    this.addLog([
      { text: data.characterName, color: 'lightblue' },
      { text: ` moved ` },
      { text: `${data.distance}`, color: 'blue' },
      { text: ` hexes.` }
    ]);

    if (this.state.gameData) {
        const char = this.state.gameData.characters.find(c => c.id === data.characterId);
        if (char) {
            char.currentHex = data.toHex;
        }
    }

    const movedDistance = data.movementPath.length > 0 ? data.movementPath.length - 1 : 0;
    const remainingMoves = this.state.currentMovementPoints - movedDistance;
    this.state.currentMovementPoints = remainingMoves;
    this.state.selectedHex = null; // Clear selected hex after move

    if (remainingMoves > 0) {
        this.state.validMovementHexes = hexRangeReachable(
            data.toHex,
            remainingMoves,
            (hex: Axial) => isHexBlocked(hex, this.state),
            (hex: Axial) => canStopOnHex(hex, this.state)
        );
    } else {
        this.state.validMovementHexes = [];
    }

    this.emitStateUpdate();
  }

  private handleRoundStarted(data: { roundNumber: number; turnOrder: TurnEntity[] }): void {
    this.state.turnOrder = data.turnOrder;
    this.state.currentRound = data.roundNumber;
    // Hide card selection panel and clear waiting state
    this.state.showCardSelection = false;
    this.state.waitingForRoundStart = false;
    this.addLog([{ text: `Round ${data.roundNumber} has started.` }]);
    this.emitStateUpdate();
  }

  private handleRoundEnded(data: { roundNumber: number }): void {
    console.log(`[GameStateManager] 📋 handleRoundEnded received: round=${data.roundNumber}`);
    // Update current round (important for rejoin to show correct round number)
    this.state.currentRound = data.roundNumber;
    this.addLog([{ text: `Round ${data.roundNumber} has ended. Select cards for next round.` }]);

    // Move played cards to discard pile for ALL controlled characters
    if (this.state.gameData) {
      for (const charId of this.state.myCharacterIds) {
        const character = this.state.gameData.characters.find(c => c.id === charId);
        const selection = this.state.characterCardSelections.get(charId);

        if (character && character.hand && character.discardPile && selection?.topCardId && selection?.bottomCardId) {
          const topCardId = selection.topCardId;
          const bottomCardId = selection.bottomCardId;

          // Remove played cards from hand pile
          character.hand = character.hand.filter(id => id !== topCardId && id !== bottomCardId);

          // Add played cards to discard pile
          character.discardPile.push(topCardId, bottomCardId);

          console.log(`[GameStateManager] Moved played cards to discard for ${charId}: ${topCardId}, ${bottomCardId}`);
        }
      }

      // Update playerHand for the currently active character
      const activeCharacter = this.state.gameData.characters.find(c => c.id === this.state.myCharacterId);
      if (activeCharacter) {
        const characterDeck = this.state.abilityDecks.get(this.state.myCharacterId!) || this.state.abilityDeck;
        this.state.playerHand = characterDeck.filter(card => activeCharacter.hand?.includes(card.id));
      }
    }

    // Clear all character card selections for new round
    this.state.characterCardSelections = new Map();
    for (const charId of this.state.myCharacterIds) {
      this.state.characterCardSelections.set(charId, {
        topCardId: null,
        bottomCardId: null,
        initiativeCardId: null,
      });
    }

    // Clear currently displayed selections
    this.state.selectedTopAction = null;
    this.state.selectedBottomAction = null;
    this.state.selectedInitiativeCardId = null; // Issue #411: Clear initiative selection

    // Reset to first character for card selection
    if (this.state.myCharacterIds.length > 0) {
      this.state.activeCharacterIndex = 0;
      this.state.myCharacterId = this.state.myCharacterIds[0];
      this.state.myUserCharacterId = this.state.myUserCharacterIds[0] || null;

      // Load first character's hand
      if (this.state.gameData) {
        const firstChar = this.state.gameData.characters.find(c => c.id === this.state.myCharacterId);
        if (firstChar) {
          const characterDeck = this.state.abilityDecks.get(this.state.myCharacterId!) || this.state.abilityDeck;
          this.state.playerHand = characterDeck.filter(card => firstChar.hand?.includes(card.id));
        }
      }
    }

    this.state.showCardSelection = true;
    this.state.waitingForRoundStart = false;
    console.log(`[GameStateManager] ✅ handleRoundEnded complete: showCardSelection=${this.state.showCardSelection}, currentRound=${this.state.currentRound}`);
    this.emitStateUpdate();
  }

  private handleTurnStarted(data: TurnStartedPayload): void {
    // Check if this turn belongs to ANY of the player's characters (multi-character support)
    const isMyCharacter = data.entityType === 'character' && this.state.myCharacterIds.includes(data.entityId);
    this.state.isMyTurn = isMyCharacter;
    this.state.currentTurnEntityId = data.entityId;

    // If it's one of our characters' turns, switch to that character
    if (isMyCharacter) {
      const charIndex = this.state.myCharacterIds.indexOf(data.entityId);
      if (charIndex !== -1 && charIndex !== this.state.activeCharacterIndex) {
        console.log(`[GameStateManager] Auto-switching to character ${charIndex} for their turn`);
        this.switchActiveCharacter(charIndex);
      }

      // Issue #411: Set turnActionState and selectedCards from turn_started payload
      if (data.turnActionState) {
        this.state.turnActionState = data.turnActionState;
        console.log(`[GameStateManager] Turn action state set:`, data.turnActionState);
      }
      if (data.selectedCards) {
        this.state.selectedTurnCards = data.selectedCards;
        console.log(`[GameStateManager] Selected turn cards set:`, data.selectedCards.card1.name, data.selectedCards.card2.name);
      }

      // Clear any pending action from previous turn
      this.state.pendingAction = null;
    } else {
      // Not my turn - clear turn action state
      this.state.turnActionState = null;
      this.state.selectedTurnCards = null;
      this.state.pendingAction = null;
    }

    const turnOrderEntry = this.state.turnOrder.find(t => t.entityId === data.entityId);
    const entityName = turnOrderEntry ? turnOrderEntry.name : (data.entityType === 'monster' ? 'Monster' : 'Character');

    if (isMyCharacter) {
      this.addLog([{ text: `${entityName}'s turn has started.`, color: 'gold' }]);
    } else {
      this.addLog([{ text: `${entityName}'s turn.` }]);
    }
    this.emitStateUpdate();
  }

  private handleMonsterActivated(data: MonsterActivatedPayload): void {
     const logParts: LogMessagePart[] = [{ text: data.monsterName, color: 'orange' }];

    // Movement
    if (data.movementDistance > 0) {
      logParts.push({ text: ' moved ' });
      logParts.push({ text: `${data.movementDistance}`, color: 'blue' });
      logParts.push({ text: ' hexes' });
      if (data.attack) {
        logParts.push({ text: ' and' });
      }
      // Trigger visual update for monster movement
      this.visualCallbacks.updateMonsterPosition?.(data.monsterId, data.movement);

      // Update game state monster position to maintain consistency
      // This ensures attack range calculations and targeting use the updated position
      if (this.state.gameData) {
        const monster = this.state.gameData.monsters.find(m => m.id === data.monsterId);
        if (monster) {
          monster.currentHex = data.movement;
        }
      }
    }

    // Attack
    if (data.attack) {
      const { targetId, baseDamage, damage, modifier, effects } = data.attack;

      if (modifier === 'null') {
        logParts.push({ text: "'s attack missed " });
        logParts.push({ text: data.focusTargetName, color: 'lightblue' });
        logParts.push({ text: formatModifier(modifier) });
      } else {
        logParts.push({ text: ' attacked ' });
        logParts.push({ text: data.focusTargetName, color: 'lightblue' });
        logParts.push({ text: ' for ' });
        logParts.push({ text: `${damage}`, color: 'red' });
        if (modifier === 'x2') {
          logParts.push({ text: ` (${baseDamage} base${formatModifier(modifier)})` });
        } else {
          logParts.push({ text: ` (${baseDamage}${formatModifier(modifier)})` });
        }

        if (effects.length > 0) {
          logParts.push({ text: ' and applied ' });
          effects.forEach((effect, i) => {
            logParts.push({ text: effect, color: getEffectColor(effect) });
            if (i < effects.length - 1) {
              logParts.push({ text: ' and ' });
            }
          });
        }
      }
      logParts.push({ text: '.' });

      if (this.state.gameData) {
        const targetCharacter = this.state.gameData.characters.find(c => c.id === targetId);
        if (targetCharacter) {
          const newHealth = Math.max(0, targetCharacter.health - damage);
          // Use immutable update for character health
          this.updateCharacter(targetId, { health: newHealth });
          // Trigger visual update for character health
          this.visualCallbacks.updateCharacterHealth?.(targetId, newHealth);
          console.log(`[GameStateManager] Updated character health to ${newHealth} after monster attack (took ${damage} damage)`);
        }
      }
    } else {
      logParts.push({ text: '.' });
    }
    this.addLog(logParts);
    this.emitStateUpdate();
  }

  private handleAttackResolved(data: AttackResolvedPayload): void {
    const logParts: LogMessagePart[] = [];
    logParts.push({ text: data.attackerName, color: 'lightblue' });

    if (data.modifier === 'null') {
      logParts.push({ text: "'s attack missed " });
      logParts.push({ text: data.targetName, color: 'orange' });
      logParts.push({ text: formatModifier(data.modifier) });
    } else {
      logParts.push({ text: ' attacked ' });
      logParts.push({ text: data.targetName, color: 'orange' });
      logParts.push({ text: ' for ' });
      logParts.push({ text: `${data.damage}`, color: 'red' });
      if (data.modifier === 'x2') {
        logParts.push({ text: ` (${data.baseDamage} base${formatModifier(data.modifier)})` });
      } else {
        logParts.push({ text: ` (${data.baseDamage}${formatModifier(data.modifier)})` });
      }

      if (data.effects.length > 0) {
        logParts.push({ text: ' and applied ' });
        data.effects.forEach((effect, i) => {
          logParts.push({ text: effect, color: getEffectColor(effect) });
          if (i < data.effects.length - 1) {
            logParts.push({ text: ' and ' });
          }
        });
      }
    }
    logParts.push({ text: '.' });
    this.addLog(logParts);

    // Update target health in state and trigger visual update
    if (this.state.gameData) {
      const isCharacter = this.state.gameData.characters.some(c => c.id === data.targetId);

      if (isCharacter) {
         // Use immutable update for character health
         this.updateCharacter(data.targetId, { health: data.targetHealth });
         this.visualCallbacks.updateCharacterHealth?.(data.targetId, data.targetHealth);
         console.log(`[GameStateManager] Updated character health to ${data.targetHealth} after attack`);
      } else {
         // TODO: Should also use immutable update for monsters
         const monster = this.state.gameData.monsters.find(m => m.id === data.targetId);
         if(monster) {
           monster.health = data.targetHealth;
           this.visualCallbacks.updateMonsterHealth?.(data.targetId, data.targetHealth);
         }
      }
    }
    this.emitStateUpdate();
  }

  private handleMonsterDied(data: { monsterId: string; killerId: string }): void {
    this.visualCallbacks.removeMonster?.(data.monsterId);
    if (this.state.gameData) {
      this.state.gameData.monsters = this.state.gameData.monsters.filter(m => m.id !== data.monsterId);
    }
    this.emitStateUpdate();
  }

  private handleMonsterSpawned(data: { monsterId: string; monsterType: string; isElite: boolean; hex: Axial; health: number; maxHealth: number; movement: number; attack: number; range: number }): void {
    console.log('[GameStateManager] Monster spawned:', data);

    // Build full monster object with required fields
    // roomId is not needed for frontend display, use empty string
    const newMonster = {
      id: data.monsterId,
      roomId: '',
      monsterType: data.monsterType,
      isElite: data.isElite,
      currentHex: data.hex,
      health: data.health,
      maxHealth: data.maxHealth,
      movement: data.movement,
      attack: data.attack,
      range: data.range,
      specialAbilities: [] as string[],
      conditions: [] as import('../../../shared/types/entities').Condition[],
      isDead: false,
    };

    // Trigger visual update to add monster sprite
    this.visualCallbacks.spawnMonster?.({
      monsterId: data.monsterId,
      monsterType: data.monsterType,
      isElite: data.isElite,
      hex: data.hex,
      health: data.health,
      maxHealth: data.maxHealth,
    });

    // Add monster to game state
    if (this.state.gameData) {
      this.state.gameData.monsters = [...this.state.gameData.monsters, newMonster];
    }

    // Log the spawn
    this.addLog([
      { text: 'A ' },
      { text: data.isElite ? 'elite ' : '', color: 'gold' },
      { text: data.monsterType, color: 'red' },
      { text: ' has appeared!' },
    ]);

    this.emitStateUpdate();
  }

  private handleLootSpawned(data: LootSpawnedPayload): void {
    this.visualCallbacks.spawnLootToken?.(data);
    this.addLog([{ text: 'Loot dropped!', color: 'gold' }]);
    this.emitStateUpdate();
  }

  private handleLootCollected(data: { playerId: string; lootTokenId: string; hexCoordinates: { q: number; r: number }; goldValue: number }): void {
    // Trigger visual update to remove loot sprite
    this.visualCallbacks.collectLootToken?.(data.lootTokenId);

    // Get player name for log
    const playerUUID = websocketService.getPlayerUUID();
    const isMyLoot = data.playerId === playerUUID;

    if (this.state.gameData) {
      const character = this.state.gameData.characters.find(c => c.playerId === data.playerId);
      const characterName = character?.classType || 'Unknown';

      if (isMyLoot) {
        this.addLog([
          { text: 'You', color: 'lightblue' },
          { text: ' collected ' },
          { text: `${data.goldValue}`, color: 'gold' },
          { text: ' gold!' }
        ]);
      } else {
        this.addLog([
          { text: characterName, color: 'lightblue' },
          { text: ' collected ' },
          { text: `${data.goldValue}`, color: 'gold' },
          { text: ' gold.' }
        ]);
      }
    }

    this.emitStateUpdate();
  }

  /**
   * Issue #411: Handle card action executed event from backend
   * Updates turnActionState with the executed action
   */
  private handleCardActionExecuted(data: CardActionExecutedPayload): void {
    console.log(`[GameStateManager] Card action executed:`, data);

    // Only update state if this is our character
    if (!this.state.myCharacterIds.includes(data.characterId)) {
      // Log for other players
      const character = this.state.gameData?.characters.find(c => c.id === data.characterId);
      const characterName = character?.classType || 'Character';
      this.addLog([
        { text: characterName, color: 'lightblue' },
        { text: ` used ` },
        { text: data.position, color: 'gold' },
        { text: ` action` },
      ]);
      this.emitStateUpdate();
      return;
    }

    // Update turnActionState to reflect the executed action
    if (this.state.turnActionState) {
      const executedAction = { cardId: data.cardId, position: data.position };

      if (!this.state.turnActionState.firstAction) {
        // This was the first action
        this.state.turnActionState = {
          ...this.state.turnActionState,
          firstAction: executedAction,
          // Recalculate available actions: only opposite section of other card
          availableActions: this.calculateAvailableActionsAfterFirst(executedAction),
        };
      } else if (!this.state.turnActionState.secondAction) {
        // This was the second action
        this.state.turnActionState = {
          ...this.state.turnActionState,
          secondAction: executedAction,
          availableActions: [], // No more actions available
        };
      }
    }

    // Clear pending action and targeting mode
    this.state.pendingAction = null;
    this.state.cardActionTargetingMode = null;
    this.state.cardActionRange = 0;

    // Log the action
    const card = this.state.selectedTurnCards?.card1.id === data.cardId
      ? this.state.selectedTurnCards?.card1
      : this.state.selectedTurnCards?.card2;
    const cardName = card?.name || 'Card';

    if (data.success) {
      this.addLog([
        { text: `Used ` },
        { text: cardName, color: 'lightblue' },
        { text: ` ${data.position} action (${data.actionType})` },
      ]);
    } else {
      this.addLog([
        { text: `Failed to use ` },
        { text: cardName, color: 'red' },
        { text: `: ${data.error || 'Unknown error'}` },
      ]);
    }

    this.emitStateUpdate();
  }

  /**
   * Issue #411: Calculate available actions after first action is used
   * Rules: Must use opposite section (top/bottom) of the other card
   */
  private calculateAvailableActionsAfterFirst(firstAction: { cardId: string; position: 'top' | 'bottom' }): Array<{ cardId: string; position: 'top' | 'bottom' }> {
    if (!this.state.selectedTurnCards) return [];

    const { card1, card2 } = this.state.selectedTurnCards;
    const otherCardId = firstAction.cardId === card1.id ? card2.id : card1.id;
    const oppositePosition = firstAction.position === 'top' ? 'bottom' : 'top';

    return [{ cardId: otherCardId, position: oppositePosition }];
  }

  private emitStateUpdate(): void {
    this.subscribers.forEach(callback => callback({ ...this.state }));
  }

  /**
   * Immutably update a character in gameData
   * Creates new objects to ensure React detects the change
   *
   * @param characterId - ID of character to update
   * @param updates - Partial character updates or update function
   * @returns Updated character or undefined if not found
   */
  private updateCharacter(
    characterId: string,
    updates: Partial<Character> | ((char: Character) => Partial<Character>)
  ): Character | undefined {
    if (!this.state.gameData) return undefined;

    const character = this.state.gameData.characters.find(c => c.id === characterId);
    if (!character) return undefined;

    // Apply updates (either object or function)
    const updatedFields = typeof updates === 'function' ? updates(character) : updates;
    // Explicitly type as Character - safe because we spread a full Character with Partial<Character>
    const updatedCharacter: Character = { ...character, ...updatedFields };

    // Create new gameData with updated character
    // Type assertion needed because Character has abilityDeck: string[] | AbilityCard[]
    // but GameStartedPayload expects abilityDeck: AbilityCard[] - at runtime they're AbilityCard[]
    this.state.gameData = {
      ...this.state.gameData,
      characters: this.state.gameData.characters.map(c =>
        c.id === characterId ? updatedCharacter : c
      ) as typeof this.state.gameData.characters,
    };

    return updatedCharacter;
  }

  public subscribe(callback: (state: GameState) => void): () => void {
    this.subscribers.add(callback);
    callback({ ...this.state }); // Immediately send the current state
    return () => this.subscribers.delete(callback);
  }

  public getState(): GameState {
    return { ...this.state };
  }

  //
  // ============== PUBLIC ACTIONS ==============
  //
  public selectCard(card: AbilityCard): void {
    if (!this.state.selectedTopAction) {
      this.state.selectedTopAction = card;
    } else if (!this.state.selectedBottomAction && card.id !== this.state.selectedTopAction.id) {
      this.state.selectedBottomAction = card;
    }

    // Update characterCardSelections for multi-character tracking
    if (this.state.myCharacterId) {
      const existingSelection = this.state.characterCardSelections.get(this.state.myCharacterId);
      this.state.characterCardSelections.set(this.state.myCharacterId, {
        topCardId: this.state.selectedTopAction?.id || null,
        bottomCardId: this.state.selectedBottomAction?.id || null,
        initiativeCardId: existingSelection?.initiativeCardId || null, // Preserve existing initiative selection
      });
    }

    this.emitStateUpdate();
  }

  /**
   * Issue #411: Set the initiative card for the current character
   * Called when player selects which card determines their turn order
   */
  public setInitiativeCard(cardId: string): void {
    this.state.selectedInitiativeCardId = cardId;

    // Update characterCardSelections for multi-character tracking
    if (this.state.myCharacterId) {
      const existingSelection = this.state.characterCardSelections.get(this.state.myCharacterId);
      this.state.characterCardSelections.set(this.state.myCharacterId, {
        topCardId: existingSelection?.topCardId || null,
        bottomCardId: existingSelection?.bottomCardId || null,
        initiativeCardId: cardId,
      });
    }

    this.emitStateUpdate();
  }

  public confirmCardSelection(): void {
    // Save current character's selections first
    if (this.state.myCharacterId && this.state.selectedTopAction && this.state.selectedBottomAction) {
      this.state.characterCardSelections.set(this.state.myCharacterId, {
        topCardId: this.state.selectedTopAction.id,
        bottomCardId: this.state.selectedBottomAction.id,
        initiativeCardId: this.state.selectedInitiativeCardId, // Issue #411: Save initiative selection
      });
    }

    // Check if all characters have selected cards (multi-character mode)
    if (this.state.myCharacterIds.length > 1) {
      if (!this.allCharactersHaveSelectedCards()) {
        // Not all characters have selected - find next character without selections
        for (let i = 0; i < this.state.myCharacterIds.length; i++) {
          const charId = this.state.myCharacterIds[i];
          const selection = this.state.characterCardSelections.get(charId);
          if (!selection || !selection.topCardId || !selection.bottomCardId) {
            this.switchActiveCharacter(i);
            this.addLog([{ text: `Select cards for next character (${i + 1}/${this.state.myCharacterIds.length})` }]);
            return;
          }
        }
      }
    }

    // All characters have selections - submit ALL card selections to server
    for (const charId of this.state.myCharacterIds) {
      const selection = this.state.characterCardSelections.get(charId);
      if (selection?.topCardId && selection?.bottomCardId) {
        // Issue #411: Include initiativeCardId in the payload
        websocketService.selectCards(
          selection.topCardId,
          selection.bottomCardId,
          charId,
          selection.initiativeCardId || undefined
        );
      }
    }

    this.addLog([
      { text: `Cards selected for ${this.state.myCharacterIds.length} character(s)` },
    ]);

    // Collapse card selection panel and wait for round to start
    this.state.showCardSelection = false;
    this.state.waitingForRoundStart = true;
    this.emitStateUpdate();
  }

  public clearCardSelection(): void {
    this.state.selectedTopAction = null;
    this.state.selectedBottomAction = null;
    this.state.selectedInitiativeCardId = null; // Issue #411: Clear initiative selection

    // Clear from characterCardSelections too
    if (this.state.myCharacterId) {
      this.state.characterCardSelections.set(this.state.myCharacterId, {
        topCardId: null,
        bottomCardId: null,
        initiativeCardId: null,
      });
    }

    this.emitStateUpdate();
  }

  public selectCharacter(characterId: string): void {
      if (!this.state.isMyTurn) return;

      this.state.selectedCharacterId = characterId;
      this.state.selectedHex = null;

      let moveValue = 0;
      if (this.state.selectedBottomAction?.bottomAction?.type === 'move') {
        moveValue = this.state.selectedBottomAction.bottomAction.value || 0;
      } else if (this.state.selectedTopAction?.topAction?.type === 'move') {
        moveValue = this.state.selectedTopAction.topAction.value || 0;
      }

      this.state.currentMovementPoints = moveValue;

      const character = this.state.gameData?.characters.find(c => c.id === characterId);
      if (character && character.currentHex && moveValue > 0) {
        this.state.validMovementHexes = hexRangeReachable(
          character.currentHex,
          moveValue,
          (hex: Axial) => isHexBlocked(hex, this.state),
          (hex: Axial) => canStopOnHex(hex, this.state)
        );
      } else {
        this.state.validMovementHexes = [];
      }

      this.emitStateUpdate();
  }

  public selectHex(hex: Axial): void {
      // Issue #411: Card action targeting mode takes priority
      if (this.state.cardActionTargetingMode === 'move' && this.state.isMyTurn) {
        console.log('[GameStateManager] Move targeting mode - hex selected:', hex);
        this.completeCardMoveAction({ q: hex.q, r: hex.r });
        return;
      }

      if (this.state.cardActionTargetingMode === 'attack' && this.state.isMyTurn) {
        // In attack targeting mode, check if clicking on a monster
        const monster = this.state.gameData?.monsters.find(m =>
          m.currentHex.q === hex.q && m.currentHex.r === hex.r && m.health > 0
        );
        if (monster) {
          console.log('[GameStateManager] Attack targeting mode - target selected:', monster.id);
          this.completeCardAttackAction(monster.id);
        }
        return;
      }

      if (this.state.cardActionTargetingMode === 'heal' && this.state.isMyTurn) {
        // In heal targeting mode, check if clicking on an ally
        const ally = this.state.gameData?.characters.find(c =>
          c.id !== this.state.myCharacterId &&
          c.currentHex?.q === hex.q &&
          c.currentHex?.r === hex.r &&
          !c.isExhausted
        );
        if (ally) {
          console.log('[GameStateManager] Heal targeting mode - target selected:', ally.id);
          this.completeCardHealAction(ally.id);
        }
        return;
      }

      if (this.state.cardActionTargetingMode === 'summon' && this.state.isMyTurn) {
        // In summon targeting mode, check if hex is empty and in range
        const isValidSummonHex = this.state.validSummonHexes.some(
          h => h.q === hex.q && h.r === hex.r
        );
        if (isValidSummonHex) {
          console.log('[GameStateManager] Summon targeting mode - hex selected:', hex);
          this.completeCardSummonAction({ q: hex.q, r: hex.r });
        }
        return;
      }

      if (!this.state.selectedCharacterId || !this.state.isMyTurn) return;

      // ATTACK MODE: Check if clicking on a valid attack target (legacy)
      if (this.state.attackMode) {
        if (!this.state.myCharacterId) {
          console.error('[GameStateManager] Cannot attack: no active character');
          return;
        }

        // Find monster at this hex
        const monster = this.state.gameData?.monsters.find(m =>
          m.currentHex.q === hex.q && m.currentHex.r === hex.r && m.health > 0
        );

        if (monster) {
          // Execute attack on monster
          websocketService.attackTarget(this.state.myCharacterId, monster.id);
          this.exitAttackMode();
          return;
        }

        // If no monster at this hex, ignore the click in attack mode
        return;
      }

      // MOVE MODE: Handle movement selection
      // TODO: validate hex is in validMovementHexes

      if (this.state.selectedHex && this.state.selectedHex.q === hex.q && this.state.selectedHex.r === hex.r) {
          // double-click to confirm move
          if (!this.state.myCharacterId) {
            console.error('[GameStateManager] Cannot move: no active character');
            return;
          }
          websocketService.moveCharacter(this.state.myCharacterId, hex);
          this.state.selectedHex = null;
          this.state.validMovementHexes = [];
      } else {
          this.state.selectedHex = hex;
      }
      this.emitStateUpdate();
  }

  public enterAttackMode(characterId: string, attackRange: number): void {
      if (!this.state.isMyTurn) return;

      this.state.attackMode = true;
      this.state.selectedCharacterId = characterId;
      this.state.selectedAttackTarget = null;

      // Clear movement state when entering attack mode
      this.state.selectedHex = null;
      this.state.validMovementHexes = [];

      const character = this.state.gameData?.characters.find(c => c.id === characterId);
      if (character && character.currentHex) {
        // Range 0 means melee (adjacent hexes only), treat as range 1 in hex distance
        // Range N (N > 0) means can attack any hex within N hexes distance
        const effectiveRange = attackRange === 0 ? 1 : attackRange;
        this.state.validAttackHexes = hexAttackRange(
          character.currentHex,
          effectiveRange,
          (hex: Axial) => hasAttackTarget(hex, this.state, characterId)
        );
      } else {
        this.state.validAttackHexes = [];
      }

      this.emitStateUpdate();
  }

  public exitAttackMode(): void {
      this.state.attackMode = false;
      this.state.validAttackHexes = [];
      this.state.selectedAttackTarget = null;
      this.emitStateUpdate();
  }

  public enterMoveMode(): void {
      if (!this.state.isMyTurn) return;

      // Exit attack mode if active
      if (this.state.attackMode) {
        this.exitAttackMode();
      }

      // Recalculate movement range if we have a selected character
      if (this.state.myCharacterId) {
        this.selectCharacter(this.state.myCharacterId);
      }
  }

  public getAttackAction(): { value: number; range: number } | null {
    // Check top action first, then bottom action for an attack
    if (this.state.selectedTopAction?.topAction?.type === 'attack') {
      return {
        value: this.state.selectedTopAction.topAction.value || 0,
        range: getRange(this.state.selectedTopAction.topAction.modifiers),
      };
    }
    if (this.state.selectedBottomAction?.bottomAction?.type === 'attack') {
      return {
        value: this.state.selectedBottomAction.bottomAction.value || 0,
        range: getRange(this.state.selectedBottomAction.bottomAction.modifiers),
      };
    }
    return null;
  }

  public getMoveAction(): { value: number } | null {
    // Check bottom action first (traditional), then top action
    if (this.state.selectedBottomAction?.bottomAction?.type === 'move') {
      return {
        value: this.state.selectedBottomAction.bottomAction.value || 0,
      };
    }
    if (this.state.selectedTopAction?.topAction?.type === 'move') {
      return {
        value: this.state.selectedTopAction.topAction.value || 0,
      };
    }
    return null;
  }

  // ============== ISSUE #411: CARD ACTION SELECTION ==============

  /**
   * Issue #411: Select a card action (sets pendingAction)
   * Called when player taps on a card action region
   */
  public selectCardAction(cardId: string, position: 'top' | 'bottom'): void {
    if (!this.state.isMyTurn || !this.state.turnActionState) {
      console.warn('[GameStateManager] Cannot select card action: not my turn or no turn action state');
      return;
    }

    // Check if this action is available
    const isAvailable = this.state.turnActionState.availableActions.some(
      (action) => action.cardId === cardId && action.position === position
    );

    if (!isAvailable) {
      console.warn('[GameStateManager] Cannot select card action: action not available');
      return;
    }

    // If already in targeting mode, clear it before selecting new action
    if (this.state.cardActionTargetingMode) {
      this.clearTargetingState();
    }

    // Get the card and action to determine type
    const card = this.state.selectedTurnCards?.card1.id === cardId
      ? this.state.selectedTurnCards?.card1
      : this.state.selectedTurnCards?.card2;

    if (!card) {
      console.warn('[GameStateManager] Cannot find card for action');
      return;
    }

    const action = position === 'top' ? card.topAction : card.bottomAction;
    if (!action) {
      console.warn('[GameStateManager] Card has no action at position:', position);
      return;
    }

    // Set pending action
    this.state.pendingAction = { cardId, position };

    // Determine if this action requires hex targeting
    // - move: always requires targeting
    // - attack: always requires targeting
    // - heal: requires targeting if range > 0 (ranged heal), self-heal doesn't
    // - summon: always requires targeting (placement)
    const requiresTargeting =
      action.type === 'move' ||
      action.type === 'attack' ||
      action.type === 'summon' ||
      (action.type === 'heal' && getRange(action.modifiers) > 0);

    if (requiresTargeting) {
      this.enterTargetingMode(action);
    } else {
      // For non-targeting actions (loot, self-heal, special, etc.),
      // wait for tap-again confirmation on the card
      this.emitStateUpdate();
    }
  }

  /**
   * Issue #411: Enter targeting mode for actions requiring hex selection
   * Extensible for move, attack, heal, summon, and future action types
   * Called immediately when selecting a targeting action - hex selection is the confirmation
   */
  private enterTargetingMode(action: CardAction): void {
    const character = this.state.gameData?.characters.find(c => c.id === this.state.myCharacterId);
    if (!character?.currentHex) {
      console.warn('[GameStateManager] Cannot find character position');
      // Clear pending action and notify user via log
      this.state.pendingAction = null;
      this.addLog([
        { text: 'Cannot target: character position unknown', color: 'red' },
      ]);
      this.emitStateUpdate();
      return;
    }

    // Build occupied hex set once for reuse
    const occupiedHexes = new Set<string>();
    this.state.gameData?.monsters.forEach(m => {
      if (m.health > 0 && m.currentHex) {
        occupiedHexes.add(`${m.currentHex.q},${m.currentHex.r}`);
      }
    });
    this.state.gameData?.characters.forEach(c => {
      if (c.currentHex) {
        occupiedHexes.add(`${c.currentHex.q},${c.currentHex.r}`);
      }
    });

    // Build ally positions for heal targeting (excludes self if needed)
    const allyPositions = new Set<string>();
    this.state.gameData?.characters.forEach(c => {
      if (c.id !== this.state.myCharacterId && c.currentHex && !c.isExhausted) {
        allyPositions.add(`${c.currentHex.q},${c.currentHex.r}`);
      }
    });

    // Build monster positions for attack targeting
    const monsterPositions = new Set<string>();
    this.state.gameData?.monsters.forEach(m => {
      if (m.health > 0 && m.currentHex) {
        monsterPositions.add(`${m.currentHex.q},${m.currentHex.r}`);
      }
    });

    switch (action.type) {
      case 'move': {
        // Move targeting: pathfinding, can't stop on occupied hexes
        const moveRange = action.value;
        this.state.cardActionTargetingMode = 'move';
        this.state.cardActionRange = moveRange;
        this.state.currentMovementPoints = moveRange;

        // For movement blocking, we need hexes with monsters (not allies - can pass through)
        const blockedByMonsters = (hex: { q: number; r: number }) =>
          monsterPositions.has(`${hex.q},${hex.r}`);

        this.state.validMovementHexes = hexRangeReachable(
          character.currentHex,
          moveRange,
          blockedByMonsters
        );
        this.state.selectedCharacterId = this.state.myCharacterId;
        this.emitStateUpdate();
        console.log('[GameStateManager] Entered move targeting mode, range:', moveRange, 'valid hexes:', this.state.validMovementHexes.length);
        break;
      }

      case 'attack': {
        // Attack targeting: distance-based, filter for enemy hexes
        const attackRange = getRange(action.modifiers) || 1;
        this.state.cardActionTargetingMode = 'attack';
        this.state.cardActionRange = attackRange;
        this.state.attackMode = true;

        const hasTarget = (hex: { q: number; r: number }) =>
          monsterPositions.has(`${hex.q},${hex.r}`);

        this.state.validAttackHexes = hexAttackRange(character.currentHex, attackRange, hasTarget);

        // Build list of attackable monster IDs for UI highlighting
        const attackableMonsters: string[] = [];
        this.state.gameData?.monsters.forEach(m => {
          if (m.health > 0 && m.currentHex) {
            const inRange = this.state.validAttackHexes.some(
              h => h.q === m.currentHex.q && h.r === m.currentHex.r
            );
            if (inRange) {
              attackableMonsters.push(m.id);
            }
          }
        });
        this.state.attackableTargets = attackableMonsters;
        this.state.selectedCharacterId = this.state.myCharacterId;
        this.emitStateUpdate();
        console.log('[GameStateManager] Entered attack targeting mode, range:', attackRange, 'targets:', attackableMonsters.length);
        break;
      }

      case 'heal': {
        // Heal targeting: distance-based, filter for ally hexes
        const healRange = getRange(action.modifiers);
        this.state.cardActionTargetingMode = 'heal';
        this.state.cardActionRange = healRange;

        const hasAlly = (hex: { q: number; r: number }) =>
          allyPositions.has(`${hex.q},${hex.r}`);

        this.state.validHealHexes = hexAttackRange(character.currentHex, healRange, hasAlly);
        this.state.selectedCharacterId = this.state.myCharacterId;
        this.emitStateUpdate();
        console.log('[GameStateManager] Entered heal targeting mode, range:', healRange, 'valid hexes:', this.state.validHealHexes.length);
        break;
      }

      case 'summon': {
        // Summon targeting: distance-based, filter for empty hexes
        const summonRange = getRange(action.modifiers) || 1; // Default range 1 if not specified
        this.state.cardActionTargetingMode = 'summon';
        this.state.cardActionRange = summonRange;

        const isEmptyHex = (hex: { q: number; r: number }) =>
          !occupiedHexes.has(`${hex.q},${hex.r}`);

        this.state.validSummonHexes = hexAttackRange(character.currentHex, summonRange, isEmptyHex);
        this.state.selectedCharacterId = this.state.myCharacterId;
        this.emitStateUpdate();
        console.log('[GameStateManager] Entered summon targeting mode, range:', summonRange, 'valid hexes:', this.state.validSummonHexes.length);
        break;
      }
    }
  }

  /**
   * Issue #411: Confirm the pending card action (tap-again for non-targeting actions)
   * For targeting actions, this is called with target when hex/monster is selected
   */
  public confirmCardAction(targetId?: string, targetHex?: { q: number; r: number }): void {
    if (!this.state.isMyTurn || !this.state.pendingAction || !this.state.myCharacterId) {
      console.warn('[GameStateManager] Cannot confirm card action: invalid state');
      return;
    }

    // Emit the action (with or without target)
    this.emitCardAction(targetId, targetHex);
  }

  /**
   * Issue #411: Internal method to emit the card action to backend
   */
  private emitCardAction(targetId?: string, targetHex?: { q: number; r: number }): void {
    if (!this.state.pendingAction || !this.state.myCharacterId) {
      console.warn('[GameStateManager] Cannot emit card action: missing pending action or character');
      return;
    }

    const payload: UseCardActionPayload = {
      characterId: this.state.myCharacterId,
      cardId: this.state.pendingAction.cardId,
      position: this.state.pendingAction.position,
      targetId,
      targetHex,
    };

    console.log('[GameStateManager] Emitting use_card_action:', payload);
    websocketService.emit('use_card_action', payload);

    // Clear targeting mode and all highlighting arrays
    this.clearTargetingState();

    // The pendingAction will be cleared when we receive card_action_executed
  }

  /**
   * Issue #411: Clear all targeting-related state
   * Centralized cleanup for targeting mode exit/cancel/error
   */
  private clearTargetingState(): void {
    this.state.cardActionTargetingMode = null;
    this.state.cardActionRange = 0;
    this.state.attackMode = false;
    this.state.validMovementHexes = [];
    this.state.validAttackHexes = [];
    this.state.validHealHexes = [];
    this.state.validSummonHexes = [];
    this.state.attackableTargets = [];
  }

  /**
   * Issue #411: Complete a move action with the selected hex
   */
  public completeCardMoveAction(targetHex: { q: number; r: number }): void {
    if (this.state.cardActionTargetingMode !== 'move' || !this.state.pendingAction) {
      console.warn('[GameStateManager] Not in move targeting mode');
      return;
    }
    this.emitCardAction(undefined, targetHex);
  }

  /**
   * Issue #411: Complete an attack action with the selected target
   */
  public completeCardAttackAction(targetId: string): void {
    if (this.state.cardActionTargetingMode !== 'attack' || !this.state.pendingAction) {
      console.warn('[GameStateManager] Not in attack targeting mode');
      return;
    }
    this.emitCardAction(targetId, undefined);
  }

  /**
   * Issue #411: Complete a heal action with the selected target
   */
  public completeCardHealAction(targetId: string): void {
    if (this.state.cardActionTargetingMode !== 'heal' || !this.state.pendingAction) {
      console.warn('[GameStateManager] Not in heal targeting mode');
      return;
    }
    this.emitCardAction(targetId, undefined);
  }

  /**
   * Issue #411: Complete a summon action with the selected hex
   */
  public completeCardSummonAction(targetHex: { q: number; r: number }): void {
    if (this.state.cardActionTargetingMode !== 'summon' || !this.state.pendingAction) {
      console.warn('[GameStateManager] Not in summon targeting mode');
      return;
    }
    this.emitCardAction(undefined, targetHex);
  }

  /**
   * Issue #411: Cancel targeting mode and clear pending action
   */
  public cancelCardActionTargeting(): void {
    this.clearTargetingState();
    this.state.pendingAction = null;
    this.emitStateUpdate();
  }

  /**
   * Issue #411: Cancel the pending card action selection
   */
  public cancelCardAction(): void {
    this.state.pendingAction = null;
    this.emitStateUpdate();
  }

  public selectAttackTarget(targetId: string): void {
      if (!this.state.attackMode || !this.state.isMyTurn) return;

      this.state.selectedAttackTarget = targetId;
      this.emitStateUpdate();
  }

  /**
   * Handle rest event from backend (event stream pattern)
   * Manages rest state transitions for short rest, long rest, and exhaustion
   */
  private handleRestEvent(data: RestEventPayload): void {
    console.log(`[GameStateManager] handleRestEvent received:`, data);

    const character = this.state.gameData?.characters.find(c => c.id === data.characterId);
    const characterName = character?.classType || 'Character';

    switch (data.type) {
      case 'rest-started':
        this.state.restState = {
          stage: 'rest-started',
          characterId: data.characterId,
          restType: data.restType ?? null,
          randomCardId: null,
          canReroll: false,
          currentHealth: 0,
          errorMessage: null,
          discardPileCards: undefined,
          selectedCardToLose: undefined,
        };
        this.addLog([
          { text: characterName, color: 'lightblue' },
          { text: ` initiated ${data.restType} rest` },
        ]);
        break;

      case 'long-selection':
        if (this.state.restState) {
          this.state.restState = {
            ...this.state.restState,
            stage: 'long-selection',
            discardPileCards: data.discardPileCards || [],
            currentHealth: data.currentHealth ?? this.state.restState.currentHealth,
          };
        }
        break;

      case 'card-selected':
        if (this.state.restState) {
          this.state.restState = {
            ...this.state.restState,
            stage: 'card-selected',
            randomCardId: data.randomCardId ?? null,
            canReroll: data.canReroll ?? false,
          };
        }
        this.addLog([
          { text: 'Random card selected for loss', color: 'orange' },
        ]);
        break;

      case 'awaiting-decision':
        if (this.state.restState) {
          this.state.restState = {
            ...this.state.restState,
            stage: 'awaiting-decision',
            currentHealth: data.currentHealth ?? this.state.restState.currentHealth,
          };
        }
        break;

      case 'damage-taken':
        this.updateCharacter(data.characterId, { health: data.currentHealth });
        console.log(`[GameStateManager] Updated character health to ${data.currentHealth} after damage`);

        this.addLog([
          { text: characterName, color: 'lightblue' },
          { text: ' took ', color: 'white' },
          { text: `${data.damage}`, color: 'red' },
          { text: ' damage from reroll', color: 'white' },
        ]);
        break;

      case 'rest-declared':
        // Long rest has been declared (initiative 99 set, round will start)
        // Actual rest actions (heal, move cards) happen at END of turn
        this.state.restState = null;
        this.state.showCardSelection = false;

        this.addLog([
          { text: characterName, color: 'lightblue' },
          { text: ' declared long rest (initiative 99)', color: 'white' },
        ]);
        break;

      case 'rest-complete': {
        this.state.restState = null;

        // Close card selection panel since rest has been declared
        this.state.showCardSelection = false;

        // Update character state using utility method
        const updatedCharacter = this.updateCharacter(data.characterId, (character) => {
          const updates: Partial<Character> = {};

          // Update card piles from backend response
          if (data.cardLost) {
            // Card was moved to lost pile
            const lostPile = character.lostPile || [];
            updates.lostPile = lostPile.includes(data.cardLost)
              ? lostPile
              : [...lostPile, data.cardLost];

            // Remove from discard pile and move to hand
            updates.discardPile = [];
            updates.hand = [
              ...(character.hand || []),
              ...character.discardPile.filter(id => id !== data.cardLost)
            ];

            // Rebuild playerHand from master abilityDeck using current hand IDs
            if (this.state.abilityDeck && this.state.abilityDeck.length > 0) {
              this.state.playerHand = this.state.abilityDeck.filter(card =>
                updates.hand!.includes(card.id)
              );

              console.log(`[GameStateManager] Rebuilt playerHand from abilityDeck: ${this.state.playerHand.length} cards available for selection (should match hand: ${updates.hand!.length})`);
            }

            console.log(`[GameStateManager] Updated card piles after rest: Hand=${updates.hand!.length}, Discard=${updates.discardPile.length}, Lost=${updates.lostPile.length}`);
          }

          // Update health
          if (data.healthHealed) {
            updates.health = character.health + data.healthHealed;
            console.log(`[GameStateManager] Updated character health to ${updates.health} after healing ${data.healthHealed} HP`);
          }

          return updates;
        });

        // Log healing if it occurred
        if (data.healthHealed && updatedCharacter) {
          this.addLog([
            { text: characterName, color: 'lightblue' },
            { text: ' healed ', color: 'white' },
            { text: `${data.healthHealed}`, color: 'green' },
            { text: ' HP from long rest', color: 'white' },
          ]);
        }

        this.addLog([
          { text: characterName, color: 'lightblue' },
          { text: ' completed rest' },
        ]);
        break;
      }

      case 'exhaustion':
        this.state.restState = null;

        // Update character exhaustion state
        this.updateCharacter(data.characterId, { isExhausted: true });

        // Set exhaustion state to show modal
        this.state.exhaustionState = {
          characterId: data.characterId,
          characterName,
          reason: data.reason || 'insufficient_cards',
        };

        this.addLog([
          { text: characterName, color: 'lightblue' },
          { text: ' is exhausted! ', color: 'red' },
          { text: `(${data.reason || 'unknown'})`, color: 'white' },
        ]);
        break;

      case 'error':
        if (this.state.restState) {
          this.state.restState = {
            ...this.state.restState,
            stage: 'error',
            errorMessage: data.message ?? null,
          };
        }
        this.addLog([
          { text: 'Rest error: ', color: 'red' },
          { text: data.message ?? 'Unknown error', color: 'white' },
        ]);
        break;
    }

    this.emitStateUpdate();
  }

  /**
   * Execute rest action (called by UI)
   */
  public executeRest(type: 'short' | 'long', cardToLose?: string): void {
    console.log(`[GameStateManager] executeRest called: type=${type}, cardToLose=${cardToLose}`);
    console.log(`[GameStateManager] myCharacterId:`, this.state.myCharacterId);

    if (!this.state.myCharacterId) {
      console.error('[GameStateManager] ❌ Cannot execute rest: myCharacterId is null');
      return;
    }

    console.log(`[GameStateManager] ✅ Emitting execute-rest event:`, {
      characterId: this.state.myCharacterId,
      type,
      cardToLose,
    });

    websocketService.emit('execute-rest', {
      characterId: this.state.myCharacterId,
      type,
      cardToLose,
    });

    console.log(`[GameStateManager] ✅ execute-rest event emitted successfully`);
  }

  /**
   * Handle rest action (accept or reroll)
   */
  public handleRestAction(action: 'accept' | 'reroll'): void {
    if (!this.state.myCharacterId || !this.state.restState) return;

    websocketService.emit('rest-action', {
      characterId: this.state.myCharacterId,
      action,
    });
  }

  /**
   * Confirm long rest card selection
   */
  public confirmLongRest(cardId: string): void {
    if (!this.state.myCharacterId || !this.state.restState) return;

    // Update local state to show selected card
    if (this.state.restState) {
      this.state.restState.selectedCardToLose = cardId;
      this.emitStateUpdate();
    }

    // Execute long rest with selected card
    this.executeRest('long', cardId);
  }

  /**
   * Acknowledge exhaustion and clear modal
   */
  public acknowledgeExhaustion(): void {
    this.state.exhaustionState = null;
    this.emitStateUpdate();
  }

  public endTurn(): void {
      if(this.state.isMyTurn) {
          websocketService.endTurn();
          this.addLog([{text: 'Turn ended.'}]);
          this.state.isMyTurn = false;
          this.emitStateUpdate();
      }
  }


  public reset(): void {
    this.state = {
        gameData: null,
        campaignId: null, // Issue #318 - Reset campaign context
        currentRound: 0,
        turnOrder: [],
        currentTurnEntityId: null,
        isMyTurn: false,
        myCharacterIds: [], // Multi-character support
        myUserCharacterIds: [], // Multi-character support
        activeCharacterIndex: 0, // Multi-character support
        myCharacterId: null,
        myUserCharacterId: null,
        playerHand: [],
        selectedTopAction: null,
        selectedBottomAction: null,
        selectedInitiativeCardId: null, // Issue #411: Initiative card selection
        characterCardSelections: new Map(), // Per-character card selections
        selectedCharacterId: null,
        selectedHex: null,
        currentMovementPoints: 0,
        validMovementHexes: [],
        attackMode: false,
        attackableTargets: [],
        validAttackHexes: [],
        selectedAttackTarget: null,
        logs: [],
        connectionStatus: 'connected',
        showCardSelection: false,
        waitingForRoundStart: false,
        restState: null,
        exhaustionState: null,
        abilityDeck: [],
        abilityDecks: new Map(), // Per-character ability decks
        // Issue #411: Card action selection during turn
        turnActionState: null,
        selectedTurnCards: null,
        pendingAction: null,
        cardActionTargetingMode: null,
        cardActionRange: 0,
        validHealHexes: [],
        validSummonHexes: [],
    };
    this.emitStateUpdate();
  }

  /**
   * Switch active character (multi-character support)
   * Saves current character's card selections and loads new character's hand/selections
   */
  public switchActiveCharacter(index: number): void {
    if (index < 0 || index >= this.state.myCharacterIds.length) {
      console.warn('[GameStateManager] Invalid character index:', index);
      return;
    }

    // Save current character's selections before switching
    const currentCharId = this.state.myCharacterId;
    if (currentCharId) {
      this.state.characterCardSelections.set(currentCharId, {
        topCardId: this.state.selectedTopAction?.id || null,
        bottomCardId: this.state.selectedBottomAction?.id || null,
        initiativeCardId: this.state.selectedInitiativeCardId, // Issue #411
      });
    }

    this.state.activeCharacterIndex = index;
    this.state.myCharacterId = this.state.myCharacterIds[index];
    this.state.myUserCharacterId = this.state.myUserCharacterIds[index] || null;

    // Load the new character's hand and selections
    if (this.state.gameData && this.state.myCharacterId) {
      const activeCharacter = this.state.gameData.characters.find(c => c.id === this.state.myCharacterId);
      if (activeCharacter) {
        // Get this character's ability deck
        const characterDeck = this.state.abilityDecks.get(this.state.myCharacterId) || this.state.abilityDeck;

        // Filter to cards currently in hand
        this.state.playerHand = characterDeck.filter(card => activeCharacter.hand?.includes(card.id));

        // Restore this character's card selections
        const savedSelections = this.state.characterCardSelections.get(this.state.myCharacterId);
        if (savedSelections) {
          this.state.selectedTopAction = savedSelections.topCardId
            ? characterDeck.find(card => card.id === savedSelections.topCardId) || null
            : null;
          this.state.selectedBottomAction = savedSelections.bottomCardId
            ? characterDeck.find(card => card.id === savedSelections.bottomCardId) || null
            : null;
          this.state.selectedInitiativeCardId = savedSelections.initiativeCardId; // Issue #411
        } else {
          this.state.selectedTopAction = null;
          this.state.selectedBottomAction = null;
          this.state.selectedInitiativeCardId = null; // Issue #411
        }
      }
    }

    this.emitStateUpdate();
    console.log(`[GameStateManager] Switched to character ${index}: ${this.state.myCharacterId}`);
  }

  /**
   * Check if all controlled characters have selected their cards
   */
  public allCharactersHaveSelectedCards(): boolean {
    for (const charId of this.state.myCharacterIds) {
      const selection = this.state.characterCardSelections.get(charId);
      if (!selection || !selection.topCardId || !selection.bottomCardId) {
        return false;
      }
    }
    return this.state.myCharacterIds.length > 0;
  }

  /**
   * Get count of characters that have selected cards
   */
  public getCharactersWithSelectionsCount(): number {
    let count = 0;
    for (const charId of this.state.myCharacterIds) {
      const selection = this.state.characterCardSelections.get(charId);
      if (selection?.topCardId && selection?.bottomCardId) {
        count++;
      }
    }
    return count;
  }
}

export const gameStateManager = new GameStateManager();

// Subscribe to room session changes to reset game state when switching rooms
roomSessionManager.subscribe((roomState) => {
  // Reset game state when room switches (status becomes 'disconnected' with no room code)
  // This happens SYNCHRONOUSLY when switchRoom() is called, before game_started event
  if (roomState.status === 'disconnected' && roomState.roomCode === null) {
    console.log('[GameStateManager] Room switched, resetting game state');
    gameStateManager.reset();
  }
});

// Vite HMR cleanup to prevent duplicate event handlers
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    gameStateManager.cleanup();
  });
}
