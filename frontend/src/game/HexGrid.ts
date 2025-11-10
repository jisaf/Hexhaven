/**
 * HexGrid Component
 *
 * Main game board renderer using PixiJS.
 * Manages:
 * - Hex tiles rendering
 * - Character sprites
 * - Monster sprites
 * - Movement highlighting
 * - User interactions (tap, pan, zoom)
 * - Camera viewport
 */

import * as PIXI from 'pixi.js';
import { HexTile, type HexTileData } from './HexTile';
import { CharacterSprite, type CharacterData } from './CharacterSprite';
import { MonsterSprite } from './MonsterSprite';
import { MovementHighlight } from './MovementHighlight';
import { LootTokenPool, type LootTokenData } from './LootTokenSprite';
import { type Axial, axialKey, screenToAxial, hexRangeReachable, axialToScreen } from './hex-utils';
import type { Monster } from '../../../shared/types/entities';

export interface HexGridOptions {
  width: number;
  height: number;
  onHexClick?: (hex: Axial) => void;
  onCharacterSelect?: (characterId: string) => void;
  onMonsterSelect?: (monsterId: string) => void;
  onLootTokenClick?: (tokenId: string) => void;
}

export interface GameBoardData {
  tiles: HexTileData[];
  characters: CharacterData[];
  monsters?: Monster[];
}

export class HexGrid {
  private app: PIXI.Application;
  private container: HTMLElement;

  // Layers
  private tilesLayer: PIXI.Container;
  private highlightsLayer: PIXI.Container;
  private entitiesLayer: PIXI.Container;
  private lootLayer: PIXI.Container;

  // Tiles and entities
  private tiles: Map<string, HexTile>;
  private characters: Map<string, CharacterSprite>;
  private monsters: Map<string, MonsterSprite>;
  private movementHighlight: MovementHighlight;
  private lootTokenPool: LootTokenPool;

  // State
  private selectedCharacterId: string | null = null;
  private selectedMonsterId: string | null = null;
  private options: HexGridOptions;

  // Viewport for pan/zoom (to be added with pixi-viewport in US3)
  private viewport: PIXI.Container;

  constructor(container: HTMLElement, options: HexGridOptions) {
    this.container = container;
    this.options = options;

    // Initialize PixiJS application
    this.app = new PIXI.Application({
      width: options.width,
      height: options.height,
      backgroundColor: 0x2C2C2C,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });

    container.appendChild(this.app.view as HTMLCanvasElement);

    // Create viewport (simple container for now, will add pixi-viewport in US3)
    this.viewport = new PIXI.Container();
    this.app.stage.addChild(this.viewport);

    // Center the viewport
    this.viewport.position.set(options.width / 2, options.height / 2);

    // Create layers
    this.tilesLayer = new PIXI.Container();
    this.highlightsLayer = new PIXI.Container();
    this.lootLayer = new PIXI.Container();
    this.entitiesLayer = new PIXI.Container();

    this.viewport.addChild(this.tilesLayer);
    this.viewport.addChild(this.highlightsLayer);
    this.viewport.addChild(this.lootLayer);
    this.viewport.addChild(this.entitiesLayer);

    // Initialize collections
    this.tiles = new Map();
    this.characters = new Map();
    this.monsters = new Map();
    this.movementHighlight = new MovementHighlight(this.highlightsLayer);
    this.lootTokenPool = new LootTokenPool(this.lootLayer);

    // Setup background click handler
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = new PIXI.Rectangle(0, 0, options.width, options.height);
    this.app.stage.on('pointerdown', this.handleBackgroundClick.bind(this));
  }

  /**
   * Initialize the game board with tiles and entities
   */
  public initializeBoard(data: GameBoardData): void {
    this.clearBoard();

    // Create tiles
    for (const tileData of data.tiles) {
      const tile = new HexTile(tileData, {
        interactive: true,
        onClick: this.handleHexClick.bind(this)
      });

      const key = axialKey(tileData.coordinates);
      this.tiles.set(key, tile);
      this.tilesLayer.addChild(tile);
    }

    // Create character sprites
    for (const characterData of data.characters) {
      this.addCharacter(characterData);
    }

    // Create monster sprites (User Story 2 - T114)
    if (data.monsters) {
      for (const monsterData of data.monsters) {
        this.addMonster(monsterData);
      }
    }
  }

  /**
   * Add a character to the board
   */
  public addCharacter(data: CharacterData): void {
    const sprite = new CharacterSprite(data, {
      interactive: true,
      onSelect: this.handleCharacterSelect.bind(this)
    });

    this.characters.set(data.id, sprite);
    this.entitiesLayer.addChild(sprite);
  }

  /**
   * Remove a character from the board
   */
  public removeCharacter(characterId: string): void {
    const sprite = this.characters.get(characterId);

    if (sprite) {
      this.entitiesLayer.removeChild(sprite);
      sprite.destroy();
      this.characters.delete(characterId);
    }
  }

  /**
   * Update character data
   */
  public updateCharacter(characterId: string, data: Partial<CharacterData>): void {
    const sprite = this.characters.get(characterId);

    if (sprite) {
      sprite.updateData(data);
    }
  }

  /**
   * Move character to a new hex (with animation)
   */
  public async moveCharacter(characterId: string, targetHex: Axial): Promise<void> {
    const sprite = this.characters.get(characterId);

    if (sprite) {
      await sprite.animateMoveTo(targetHex);
    }
  }

  /**
   * Add a monster to the board (User Story 2 - T114)
   */
  public addMonster(monster: Monster): void {
    const sprite = new MonsterSprite(monster);

    // Enable interaction for targeting
    sprite.eventMode = 'static';
    sprite.cursor = 'pointer';
    sprite.on('pointerdown', () => this.handleMonsterSelect(monster.id));

    this.monsters.set(monster.id, sprite);
    this.entitiesLayer.addChild(sprite);
  }

  /**
   * Remove a monster from the board (User Story 2 - T114)
   */
  public removeMonster(monsterId: string): void {
    const sprite = this.monsters.get(monsterId);

    if (sprite) {
      this.entitiesLayer.removeChild(sprite);
      sprite.destroy();
      this.monsters.delete(monsterId);
    }
  }

  /**
   * Update monster data (User Story 2 - T114)
   */
  public updateMonster(monsterId: string, monster: Monster): void {
    const sprite = this.monsters.get(monsterId);

    if (sprite) {
      sprite.updateMonster(monster);
    }
  }

  /**
   * Get a monster sprite (User Story 2 - T114)
   */
  public getMonster(monsterId: string): MonsterSprite | undefined {
    return this.monsters.get(monsterId);
  }

  /**
   * Handle character selection
   */
  private handleCharacterSelect(characterId: string): void {
    // Deselect previous character
    if (this.selectedCharacterId) {
      const prevSprite = this.characters.get(this.selectedCharacterId);
      if (prevSprite) {
        prevSprite.setSelected(false);
      }
    }

    // Select new character
    this.selectedCharacterId = characterId;
    const sprite = this.characters.get(characterId);

    if (sprite) {
      sprite.setSelected(true);

      // Show movement range
      const data = sprite.getData();
      const movementRange = 3; // TODO: Get from character's ability card

      // Calculate reachable hexes (respecting obstacles)
      const reachableHexes = hexRangeReachable(
        data.currentHex,
        movementRange,
        (hex) => this.isHexBlocked(hex)
      );

      this.movementHighlight.showMovementRange(reachableHexes);
    }

    // Notify parent component
    if (this.options.onCharacterSelect) {
      this.options.onCharacterSelect(characterId);
    }
  }

  /**
   * Handle monster selection (User Story 2 - T114)
   */
  private handleMonsterSelect(monsterId: string): void {
    // Deselect previous monster
    if (this.selectedMonsterId) {
      const prevSprite = this.monsters.get(this.selectedMonsterId);
      if (prevSprite) {
        prevSprite.setSelected(false);
      }
    }

    // Select new monster
    this.selectedMonsterId = monsterId;
    const sprite = this.monsters.get(monsterId);

    if (sprite) {
      sprite.setSelected(true);
    }

    // Notify parent component
    if (this.options.onMonsterSelect) {
      this.options.onMonsterSelect(monsterId);
    }
  }

  /**
   * Handle hex click (for movement)
   */
  private handleHexClick(hex: Axial): void {
    if (this.selectedCharacterId) {
      // Check if hex is in movement range
      // For now, just notify parent - actual validation happens on server
      if (this.options.onHexClick) {
        this.options.onHexClick(hex);
      }
    }
  }

  /**
   * Handle background click (deselect)
   */
  private handleBackgroundClick(event: PIXI.FederatedPointerEvent): void {
    // Only deselect if clicking on stage (not on entities or tiles)
    if (event.target === this.app.stage) {
      this.deselectAll();
    }
  }

  /**
   * Deselect all characters and monsters (User Story 2 - T114)
   */
  public deselectAll(): void {
    if (this.selectedCharacterId) {
      const sprite = this.characters.get(this.selectedCharacterId);
      if (sprite) {
        sprite.setSelected(false);
      }

      this.selectedCharacterId = null;
      this.movementHighlight.clear();
    }

    if (this.selectedMonsterId) {
      const sprite = this.monsters.get(this.selectedMonsterId);
      if (sprite) {
        sprite.setSelected(false);
      }

      this.selectedMonsterId = null;
    }
  }

  /**
   * Check if a hex is blocked (obstacle or occupied)
   */
  private isHexBlocked(hex: Axial): boolean {
    const key = axialKey(hex);
    const tile = this.tiles.get(key);

    if (!tile) {
      return true; // Out of bounds
    }

    if (tile.terrain === 'obstacle') {
      return true;
    }

    // Check if occupied by character
    for (const character of this.characters.values()) {
      const data = character.getData();
      if (data.currentHex.q === hex.q && data.currentHex.r === hex.r) {
        return true;
      }
    }

    // Check if occupied by monster (User Story 2 - T114)
    for (const monster of this.monsters.values()) {
      const monsterData = monster.getMonster();
      if (monsterData.currentHex.q === hex.q && monsterData.currentHex.r === hex.r) {
        return true;
      }
    }

    return false;
  }

  /**
   * Highlight specific hexes (for abilities, range checks, etc.)
   */
  public highlightHexes(hexes: Axial[], color: number, alpha: number): void {
    this.movementHighlight.showMovementRange(hexes, color, alpha);
  }

  /**
   * Clear all highlights
   */
  public clearHighlights(): void {
    this.movementHighlight.clear();
  }

  /**
   * Update tile data
   */
  public updateTile(hex: Axial, data: Partial<HexTileData>): void {
    const key = axialKey(hex);
    const tile = this.tiles.get(key);

    if (tile) {
      tile.updateData(data);
    }
  }

  /**
   * Get screen position for a hex
   */
  public getHexAtScreenPosition(x: number, y: number): Axial {
    // Convert screen coordinates to viewport-relative coordinates
    const localPoint = this.viewport.toLocal(new PIXI.Point(x, y));

    // Convert to hex coordinates
    return screenToAxial(localPoint);
  }

  /**
   * Clear the entire board (User Story 2 - T114)
   */
  public clearBoard(): void {
    // Clear tiles
    for (const tile of this.tiles.values()) {
      this.tilesLayer.removeChild(tile);
      tile.destroy();
    }
    this.tiles.clear();

    // Clear characters
    for (const character of this.characters.values()) {
      this.entitiesLayer.removeChild(character);
      character.destroy();
    }
    this.characters.clear();

    // Clear monsters (User Story 2 - T114)
    for (const monster of this.monsters.values()) {
      this.entitiesLayer.removeChild(monster);
      monster.destroy();
    }
    this.monsters.clear();

    // Clear loot tokens (User Story 2 - T123)
    this.lootTokenPool.clear();

    // Clear highlights
    this.movementHighlight.clear();

    this.selectedCharacterId = null;
    this.selectedMonsterId = null;
  }

  /**
   * Resize the canvas
   */
  public resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
    this.viewport.position.set(width / 2, height / 2);
  }

  /**
   * Get the PixiJS application (for advanced usage)
   */
  public getApp(): PIXI.Application {
    return this.app;
  }

  /**
   * Spawn loot token on the board (US2 - T123)
   */
  public spawnLootToken(lootData: LootTokenData): void {
    const screenPos = axialToScreen(lootData.coordinates);
    const token = this.lootTokenPool.addToken(lootData, new PIXI.Point(screenPos.x, screenPos.y));

    // Attach click handler if callback is provided
    if (this.options.onLootTokenClick) {
      token.on('pointerdown', () => {
        if (this.options.onLootTokenClick && !token.collected) {
          this.options.onLootTokenClick(token.id);
        }
      });
    }
  }

  /**
   * Collect loot token with animation (US2 - T123)
   */
  public async collectLootToken(tokenId: string): Promise<void> {
    await this.lootTokenPool.collectToken(tokenId);
  }

  /**
   * Highlight collectible loot tokens (US2 - T123)
   */
  public highlightCollectibleLoot(characterPosition: Axial): void {
    this.lootTokenPool.highlightCollectibleTokens(characterPosition, 1);
  }

  /**
   * Clear loot highlights (US2 - T123)
   */
  public clearLootHighlights(): void {
    this.lootTokenPool.clearHighlights();
  }

  /**
   * Destroy and cleanup
   */
  public destroy(): void {
    this.clearBoard();
    this.movementHighlight.destroy();
    this.lootTokenPool.destroy();
    this.app.destroy(true, { children: true, texture: true });
    this.container.removeChild(this.app.view as HTMLCanvasElement);
  }
}
