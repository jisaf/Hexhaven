import { websocketService } from './websocket.service';
import { roomSessionManager } from './room-session.service';
import type { GameStartedPayload, TurnEntity, LogMessage, LogMessagePart, CharacterMovedPayload, AttackResolvedPayload, MonsterActivatedPayload, AbilityCard, LootSpawnedPayload } from '../../../shared/types';
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

const isHexBlocked = (hex: Axial, state: GameState): boolean => {
    if (!state.gameData) return true;
    const tile = state.gameData.mapLayout.find(t => t.coordinates.q === hex.q && t.coordinates.r === hex.r);
    if (!tile) return true;
    if (tile.terrain === 'obstacle') return true;

    // check for characters
    if (state.gameData.characters.some(c => c.currentHex?.q === hex.q && c.currentHex?.r === hex.r)) return true;

    // check for monsters
    if (state.gameData.monsters.some(m => m.currentHex.q === hex.q && m.currentHex.r === hex.r)) return true;

    return false;
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

interface GameState {
  // Core game data
  gameData: GameStartedPayload | null;

  // Turn management
  currentRound: number;
  turnOrder: TurnEntity[];
  currentTurnEntityId: string | null;
  isMyTurn: boolean;

  // Player state
  myCharacterId: string | null;
  playerHand: AbilityCard[];
  selectedTopAction: AbilityCard | null;
  selectedBottomAction: AbilityCard | null;

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
}

interface VisualUpdateCallbacks {
  moveCharacter?: (characterId: string, toHex: Axial, movementPath?: Axial[]) => void;
  updateMonsterPosition?: (monsterId: string, newHex: Axial) => void;
  updateCharacterHealth?: (characterId: string, health: number) => void;
  updateMonsterHealth?: (monsterId: string, health: number) => void;
  removeMonster?: (monsterId: string) => void;
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
    currentRound: 0,
    turnOrder: [],
    currentTurnEntityId: null,
    isMyTurn: false,
    myCharacterId: null,
    playerHand: [],
    selectedTopAction: null,
    selectedBottomAction: null,
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
  };
  private subscribers: Set<(state: GameState) => void> = new Set();
  private visualCallbacks: VisualUpdateCallbacks = {};

  constructor() {
    this.setupWebSocketListeners();
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
    websocketService.on('game_started', this.handleGameStarted.bind(this));
    websocketService.on('character_moved', this.handleCharacterMoved.bind(this));
    websocketService.on('round_started', this.handleRoundStarted.bind(this));
    websocketService.on('round_ended', this.handleRoundEnded.bind(this));
    websocketService.on('turn_started', this.handleTurnStarted.bind(this));
    websocketService.on('monster_activated', this.handleMonsterActivated.bind(this));
    websocketService.on('attack_resolved', this.handleAttackResolved.bind(this));
    websocketService.on('monster_died', this.handleMonsterDied.bind(this));
    websocketService.on('loot_spawned', this.handleLootSpawned.bind(this));
    websocketService.on('loot_collected', this.handleLootCollected.bind(this));
    websocketService.on('ws_connected', () => {
        this.state.connectionStatus = 'connected';
        this.emitStateUpdate();
    });
    websocketService.on('ws_disconnected', () => {
        this.state.connectionStatus = 'disconnected';
        this.emitStateUpdate();
    });
    websocketService.on('ws_reconnecting', () => {
        this.state.connectionStatus = 'reconnecting';
        this.emitStateUpdate();
    });
  }

  private handleGameStarted(data: GameStartedPayload): void {
    this.addLog([{ text: `Scenario started: ${data.scenarioName}` }]);

    const playerUUID = websocketService.getPlayerUUID();
    if (!playerUUID) return;

    const myCharacter = data.characters.find(char => char.playerId === playerUUID);
    if (myCharacter) {
      this.state.myCharacterId = myCharacter.id;
      const characterWithDeck = myCharacter as typeof myCharacter & { abilityDeck?: AbilityCard[] };
      if (characterWithDeck.abilityDeck && Array.isArray(characterWithDeck.abilityDeck)) {
        this.state.playerHand = characterWithDeck.abilityDeck;
      }
    }

    this.state.gameData = data;
    this.state.currentRound = 1;
    if (this.state.playerHand.length > 0) {
        this.state.showCardSelection = true;
    }
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
            (hex: Axial) => isHexBlocked(hex, this.state)
        );
    } else {
        this.state.validMovementHexes = [];
    }

    this.emitStateUpdate();
  }

  private handleRoundStarted(data: { roundNumber: number; turnOrder: TurnEntity[] }): void {
    this.state.turnOrder = data.turnOrder;
    this.state.currentRound = data.roundNumber;
    this.addLog([{ text: `Round ${data.roundNumber} has started.` }]);
    this.emitStateUpdate();
  }

  private handleRoundEnded(data: { roundNumber: number }): void {
    this.addLog([{ text: `Round ${data.roundNumber} has ended. Select cards for next round.` }]);
    // Clear previously selected cards so players can select new ones for next round
    this.state.selectedTopAction = null;
    this.state.selectedBottomAction = null;
    this.state.showCardSelection = true;
    this.emitStateUpdate();
  }

    private handleTurnStarted(data: { turnIndex: number; entityId: string; entityType: 'character' | 'monster' }): void {
    const myTurn = data.entityType === 'character' && data.entityId === this.state.myCharacterId;
    this.state.isMyTurn = myTurn;
    this.state.currentTurnEntityId = data.entityId;

    const turnOrderEntry = this.state.turnOrder.find(t => t.entityId === data.entityId);
    const entityName = turnOrderEntry ? turnOrderEntry.name : (data.entityType === 'monster' ? 'Monster' : 'Character');

    if (myTurn) {
      this.addLog([{ text: 'Your turn has started.', color: 'gold' }]);
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
          targetCharacter.health = newHealth;
          // Trigger visual update for character health
          this.visualCallbacks.updateCharacterHealth?.(targetId, newHealth);
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
         const char = this.state.gameData.characters.find(c => c.id === data.targetId);
         if(char) {
           char.health = data.targetHealth;
           this.visualCallbacks.updateCharacterHealth?.(data.targetId, data.targetHealth);
         }
      } else {
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
      const characterName = character?.characterClass || 'Unknown';

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


  private emitStateUpdate(): void {
    this.subscribers.forEach(callback => callback({ ...this.state }));
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
    this.emitStateUpdate();
  }

  public confirmCardSelection(): void {
    if (this.state.selectedTopAction && this.state.selectedBottomAction) {
      websocketService.selectCards(this.state.selectedTopAction.id, this.state.selectedBottomAction.id);
      this.addLog([
          { text: 'Cards selected: '},
          { text: this.state.selectedTopAction.name, color: 'white' },
          { text: ' and ' },
          { text: this.state.selectedBottomAction.name, color: 'white' }
      ]);
      this.state.showCardSelection = false;
      this.emitStateUpdate();
    }
  }

  public clearCardSelection(): void {
    this.state.selectedTopAction = null;
    this.state.selectedBottomAction = null;
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
          (hex: Axial) => isHexBlocked(hex, this.state)
        );
      } else {
        this.state.validMovementHexes = [];
      }

      this.emitStateUpdate();
  }

  public selectHex(hex: Axial): void {
      if (!this.state.selectedCharacterId || !this.state.isMyTurn) return;

      // ATTACK MODE: Check if clicking on a valid attack target
      if (this.state.attackMode) {
        // Find monster at this hex
        const monster = this.state.gameData?.monsters.find(m =>
          m.currentHex.q === hex.q && m.currentHex.r === hex.r && m.health > 0
        );

        if (monster) {
          // Execute attack on monster
          websocketService.attackTarget(monster.id);
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
          websocketService.moveCharacter(hex);
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
        range: this.state.selectedTopAction.topAction.range ?? 0,
      };
    }
    if (this.state.selectedBottomAction?.bottomAction?.type === 'attack') {
      return {
        value: this.state.selectedBottomAction.bottomAction.value || 0,
        range: this.state.selectedBottomAction.bottomAction.range ?? 0,
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

  public selectAttackTarget(targetId: string): void {
      if (!this.state.attackMode || !this.state.isMyTurn) return;

      this.state.selectedAttackTarget = targetId;
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
        currentRound: 0,
        turnOrder: [],
        currentTurnEntityId: null,
        isMyTurn: false,
        myCharacterId: null,
        playerHand: [],
        selectedTopAction: null,
        selectedBottomAction: null,
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
    };
    this.emitStateUpdate();
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
