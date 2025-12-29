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
import { Viewport } from 'pixi-viewport';
import { HexTile, type HexTileData } from './HexTile';
import { CharacterSprite, type CharacterData } from './CharacterSprite';
import { MonsterSprite } from './MonsterSprite';
import { HighlightManager } from './HighlightManager';
import { LootTokenPool, type LootTokenData } from './LootTokenSprite';
import { type Axial, axialKey, screenToAxial, axialToScreen, HEX_SIZE } from './hex-utils';

// Fixed world size in pixels (square 1024x1024)
export const WORLD_PIXEL_SIZE = 1024;
import type { Monster, HexTile as SharedHexTile, LootSpawnedPayload } from '../../../shared/types';

export interface HexGridOptions {
  width: number;
  height: number;
  onHexClick?: (hex: Axial) => void;
  onCharacterSelect?: (characterId: string) => void;
  onMonsterSelect?: (monsterId: string) => void;
  onLootTokenClick?: (tokenId: string) => void;
}

export interface GameBoardData {
  tiles: SharedHexTile[];
  characters: CharacterData[];
  monsters?: Monster[];
}

interface ClickedEvent {
  screen: PIXI.Point;
  world: PIXI.Point;
  viewport: Viewport;
}

export class HexGrid {
  private app!: PIXI.Application;
  private container: HTMLElement;

  // Layers
  private placeholderLayer!: PIXI.Container;
  private borderLayer!: PIXI.Container;
  private tilesLayer!: PIXI.Container;
  private highlightsLayer!: PIXI.Container;
  private entitiesLayer!: PIXI.Container;
  private lootLayer!: PIXI.Container;

  // Tiles and entities
  private tiles!: Map<string, HexTile>;
  private characters!: Map<string, CharacterSprite>;
  private monsters!: Map<string, MonsterSprite>;
  private highlightManager!: HighlightManager;
  private lootTokenPool!: LootTokenPool;

  // State
  private selectedCharacterId: string | null = null;
  private selectedMonsterId: string | null = null;
  private options: HexGridOptions;
  private isDragging: boolean = false;

  // Viewport for pan/zoom (US3 - T133)
  private viewport!: Viewport;

  // Background image (Issue #191)
  private backgroundSprite: PIXI.Sprite | null = null;
  private backgroundLayer!: PIXI.Container;

  constructor(container: HTMLElement, options: HexGridOptions) {
    this.container = container;
    this.options = options;
  }

  /**
   * Initialize the PixiJS application (async for PixiJS v8)
   */
  public async init(): Promise<void> {
    // Initialize PixiJS application (PixiJS v8 async pattern)
    this.app = new PIXI.Application();
    await this.app.init({
      width: this.options.width,
      height: this.options.height,
      backgroundColor: 0x2C2C2C,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });

    this.container.appendChild(this.app.canvas);

    // Create viewport with pan/zoom/pinch support (US3 - T133-T135)
    // Use fixed 1024x1024 pixel world bounds with extra padding for panning
    const worldPadding = HEX_SIZE * 2; // Extra padding around the world
    const viewportBounds = {
      minX: -HEX_SIZE - worldPadding,
      minY: -HEX_SIZE - worldPadding,
      maxX: -HEX_SIZE + WORLD_PIXEL_SIZE + worldPadding,
      maxY: -HEX_SIZE + WORLD_PIXEL_SIZE + worldPadding
    };
    const worldWidth = viewportBounds.maxX - viewportBounds.minX;
    const worldHeight = viewportBounds.maxY - viewportBounds.minY;
    const worldCenterX = (viewportBounds.minX + viewportBounds.maxX) / 2;
    const worldCenterY = (viewportBounds.minY + viewportBounds.maxY) / 2;

    this.viewport = new Viewport({
      screenWidth: this.options.width,
      screenHeight: this.options.height,
      worldWidth,
      worldHeight,
      events: this.app.renderer.events
    });

    this.app.stage.addChild(this.viewport);

    // Configure pan gesture with momentum (US3 - T135)
    this.viewport
      .drag({
        wheel: false, // Don't use wheel for panning, use it for zooming
        mouseButtons: 'left'
      })
      .decelerate({
        friction: 0.88, // Momentum friction (higher = more inertia)
        bounce: 0.5,    // Bounce when hitting boundaries
        minSpeed: 0.01  // Minimum speed before stopping
      });

    // Configure pinch-zoom for touch devices (US3 - T134)
    this.viewport
      .pinch({
        noDrag: false,  // Allow simultaneous pan while pinching
        percent: 2      // Pinch sensitivity
      });

    // Configure wheel zoom for desktop (US3 - T134)
    this.viewport
      .wheel({
        smooth: 3,      // Smoothing factor for wheel zoom
        percent: 0.1,   // Zoom sensitivity
        reverse: false  // Standard zoom direction (wheel up = zoom in)
      });

    // Set zoom constraints (US3 - T134): 0.1x to 3x (allow zooming out far to find the map)
    this.viewport
      .clampZoom({
        minScale: 0.1,
        maxScale: 3.0
      });

    // Clamp viewport to the 1024x1024 world bounds - prevents losing the map when panning
    this.viewport.clamp({
      left: viewportBounds.minX,
      right: viewportBounds.maxX,
      top: viewportBounds.minY,
      bottom: viewportBounds.maxY,
      underflow: 'center'  // Center the world when zoomed out beyond bounds
    });

    // Center the viewport on the 1024x1024 world
    this.viewport.moveCenter(worldCenterX, worldCenterY);

    // Preload SVG avatar assets
    const avatarAssets = [
      '/avatars/characters/brute.svg',
      '/avatars/characters/tinkerer.svg',
      '/avatars/characters/spellweaver.svg',
      '/avatars/characters/scoundrel.svg',
      '/avatars/characters/cragheart.svg',
      '/avatars/characters/mindthief.svg',
      '/avatars/monsters/monster-normal.svg',
      '/avatars/monsters/monster-elite.svg',
    ];

    await Promise.all(avatarAssets.map(path => PIXI.Assets.load(path)));

    // Create layers (order matters: background first, entities last)
    this.backgroundLayer = new PIXI.Container(); // Issue #191 - Background image layer
    this.borderLayer = new PIXI.Container(); // Gold border around world
    this.placeholderLayer = new PIXI.Container();
    this.tilesLayer = new PIXI.Container();
    this.highlightsLayer = new PIXI.Container();
    this.lootLayer = new PIXI.Container();
    this.entitiesLayer = new PIXI.Container();

    this.viewport.addChild(this.backgroundLayer); // Background behind everything
    this.viewport.addChild(this.borderLayer); // Border above background
    this.viewport.addChild(this.placeholderLayer);
    this.viewport.addChild(this.tilesLayer);
    this.viewport.addChild(this.highlightsLayer);
    this.viewport.addChild(this.lootLayer);
    this.viewport.addChild(this.entitiesLayer);

    // Draw the fixed world boundary with gold border
    this.drawWorldBorder();

    // Initialize collections
    this.tiles = new Map();
    this.characters = new Map();
    this.monsters = new Map();
    this.highlightManager = new HighlightManager(this.tiles);
    this.lootTokenPool = new LootTokenPool(this.lootLayer);

    // Setup background click handler
    // Hit area covers the full 20x20 world bounds
    const worldBounds = this.getWorldBounds();
    this.viewport.eventMode = 'static';
    this.viewport.hitArea = new PIXI.Rectangle(
      worldBounds.minX,
      worldBounds.minY,
      worldBounds.width,
      worldBounds.height
    );
    this.viewport.on('clicked', this.handleViewportClicked.bind(this));
    this.viewport.on('drag-start', () => this.isDragging = true);
    this.viewport.on('drag-end', () => this.isDragging = false);
  }

  /**
   * Initialize the game board with tiles and entities
   */
  private createTile(tileData: SharedHexTile): HexTile {
    return new HexTile(tileData, {
      interactive: true,
      onClick: (e: PIXI.FederatedPointerEvent, hex: Axial) => {
        if (this.isDragging) return;
        e.stopPropagation();
        this.handleHexClick(hex);
      }
    });
  }

  /**
   * Initialize the game board with tiles and entities
   */
  public initializeBoard(data: GameBoardData): void {
    this.clearBoard();

    // Create tiles
    for (const tileData of data.tiles) {
      const tile = this.createTile(tileData);
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

    // Center and zoom the map to fit the new layout
    this.fitAndCenterMap();
  }

  /**
   * Add a character to the board
   */
  public addCharacter(data: CharacterData): void {
    const sprite = new CharacterSprite(data, {
      interactive: true,
      onSelect: this.handleCharacterSelect.bind(this)
    });

    // Set character's position on the grid
    const pos = axialToScreen(data.currentHex);
    sprite.position.set(pos.x, pos.y);

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
  public async moveCharacter(characterId: string, targetHex: Axial, movementPath?: Axial[]): Promise<void> {
    const sprite = this.characters.get(characterId);

    if (sprite) {
      const path = movementPath && movementPath.length > 0 ? movementPath : [targetHex];
      await sprite.animateMoveTo(path);
      // Update character's internal data with new position
      sprite.updateData({ currentHex: targetHex });
    }
  }

  /**
   * Add a monster to the board (User Story 2 - T114)
   */
  public addMonster(monster: Monster): void {
    const sprite = new MonsterSprite(monster);

    // Set monster's position on the grid
    const pos = axialToScreen(monster.currentHex);
    sprite.position.set(pos.x, pos.y);

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
   * Clear all monsters from the board
   */
  public clearMonsters(): void {
    for (const monster of this.monsters.values()) {
      this.entitiesLayer?.removeChild(monster);
      monster.destroy();
    }
    this.monsters.clear();
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

  public getCharacter(characterId: string): CharacterSprite | undefined {
    return this.characters.get(characterId);
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
    if (this.options.onHexClick) {
      this.options.onHexClick(hex);
    }
  }

  /**
   * Handle viewport click for creating new hexes or deselecting.
   * The 'clicked' event only fires if the viewport is not dragged.
   * Only allows hex placement within the fixed world bounds.
   */
  private handleViewportClicked(event: ClickedEvent): void {
    if (this.options.onHexClick) {
      const hex = screenToAxial(event.world);
      // Only allow hex placement within world bounds
      if (this.isWithinWorldBounds(hex)) {
        this.options.onHexClick(hex);
      }
    }

    this.deselectAll();
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
      this.highlightManager.clearAll();
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
  public isHexBlocked(hex: Axial): boolean {
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
   * Highlight hexes to show the valid movement range.
   */
  public showMovementRange(hexes: Axial[]): void {
    this.highlightManager.showMovementRange(hexes);
  }

  /**
   * Clear all movement highlights.
   */
  public clearMovementRange(): void {
    this.highlightManager.clearMovementRange();
  }

  /**
   * Set the selected hex for highlighting.
   */
  public setSelectedHex(hex: Axial | null): void {
    this.highlightManager.setSelectedHex(hex);
  }

  /**
   * Show attack range highlights (red hexes).
   */
  public showAttackRange(hexes: Axial[]): void {
    this.highlightManager.showAttackRange(hexes);
  }

  /**
   * Clear all attack highlights.
   */
  public clearAttackRange(): void {
    this.highlightManager.clearAttackRange();
  }

  /**
   * Show summon placement range highlights (purple hexes).
   */
  public showSummonPlacementRange(hexes: Axial[]): void {
    this.highlightManager.showSummonPlacementRange(hexes);
  }

  /**
   * Clear all summon placement highlights.
   */
  public clearSummonPlacementRange(): void {
    this.highlightManager.clearSummonPlacementRange();
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
   * Add or update a single tile on the board without a full redraw
   */
  public addOrUpdateTile(tileData: SharedHexTile): void {
    const key = axialKey(tileData.coordinates);
    let tile = this.tiles.get(key);

    if (tile) {
      tile.updateData(tileData);
    } else {
      tile = this.createTile(tileData);
      this.tiles.set(key, tile);
      this.tilesLayer.addChild(tile);
    }
  }

  /**
   * Remove a single tile from the board
   */
  public removeTile(hex: Axial): void {
    const key = axialKey(hex);
    const tile = this.tiles.get(key);

    if (tile) {
      this.tilesLayer.removeChild(tile);
      tile.destroy();
      this.tiles.delete(key);
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
    // Only clear if initialized
    if (!this.tiles) return;

    // Clear tiles
    for (const tile of this.tiles.values()) {
      this.tilesLayer?.removeChild(tile);
      tile.destroy();
    }
    this.tiles.clear();

    // Clear characters
    if (this.characters) {
      for (const character of this.characters.values()) {
        this.entitiesLayer?.removeChild(character);
        character.destroy();
      }
      this.characters.clear();
    }

    // Clear monsters (User Story 2 - T114)
    if (this.monsters) {
      for (const monster of this.monsters.values()) {
        this.entitiesLayer?.removeChild(monster);
        monster.destroy();
      }
      this.monsters.clear();
    }

    // Clear loot tokens (User Story 2 - T123)
    if (this.lootTokenPool) {
      this.lootTokenPool.clear();
    }

    // Clear highlights
    if (this.highlightManager) {
      this.highlightManager.clearAll();
    }

    this.selectedCharacterId = null;
    this.selectedMonsterId = null;
  }

  /**
   * Resize the canvas (US3 - T133)
   */
  public resize(width: number, height: number): void {
    // Update renderer and viewport dimensions
    this.app.renderer.resize(width, height);
    this.viewport.resize(width, height);

    // Recalculate and apply the optimal zoom and center for the new size
    this.fitAndCenterMap();
  }

  /**
   * Encapsulated logic to fit and center the map within the viewport.
   * This ensures the map is always framed correctly on initial load and resize.
   */
  private fitAndCenterMap(): void {
    // If layers haven't been created or there are no tiles, exit.
    if (!this.tilesLayer || this.tiles.size === 0) {
      return;
    }

    // Force a synchronous render to ensure bounds are up-to-date before measuring.
    this.app.renderer.render(this.app.stage);

    // Get the collective bounds of all tiles.
    const bounds = this.tilesLayer.getBounds();

    if (bounds.width > 0 && bounds.height > 0) {
      // Calculate the geometric center of the map.
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;

      // Determine the optimal zoom level to fit the map with a margin.
      const boundsRect = new PIXI.Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);
      const zoom = this.getOptimalZoom(boundsRect);

      // Apply the new center and zoom to the viewport.
      this.viewport.moveCenter(centerX, centerY);
      this.viewport.setZoom(zoom, true); // Animate the transition for a smoother user experience.
    }
  }

  /**
   * Get the PixiJS application (for advanced usage)
   */
  public getApp(): PIXI.Application {
    return this.app;
  }

  /**
   * Get the map of all current tiles
   */
  public getTiles(): Map<string, HexTile> {
    return this.tiles;
  }

  /**
   * Get current viewport state (for orientation preservation - US3 - T141)
   */
  public getViewportState(): { scale: number; x: number; y: number } {
    return {
      scale: this.viewport.scale.x,
      x: this.viewport.center.x,
      y: this.viewport.center.y
    };
  }

  /**
   * Set viewport state (for orientation preservation - US3 - T141)
   */
  public setViewportState(state: { scale: number; x: number; y: number }): void {
    this.viewport.setZoom(state.scale, true);
    this.viewport.moveCenter(state.x, state.y);
  }

  /**
   * Zoom to a specific level (US3 - T134)
   */
  public zoomTo(scale: number, animate: boolean = true): void {
    this.viewport.setZoom(scale, animate);
  }

  /**
   * Pan to a specific hex (US3 - T135)
   */
  public panToHex(hex: Axial, animate: boolean = true): void {
    const screenPos = axialToScreen(hex);
    this.viewport.moveCenter(screenPos.x, screenPos.y);

    if (!animate) {
      this.viewport.emit('moved-end', this.viewport);
    }
  }

  /**
   * Calculate optimal zoom to fit the grid in the viewport
   */
  private getOptimalZoom(gridBounds: PIXI.Rectangle): number {
    if (gridBounds.width === 0 || gridBounds.height === 0) {
      return 1;
    }

    const screenWidth = this.options.width;
    const screenHeight = this.options.height;
    const margin = 0.8; // 20% margin for comfortable spacing on mobile

    const scaleX = (screenWidth / gridBounds.width) * margin;
    const scaleY = (screenHeight / gridBounds.height) * margin;

    return Math.min(scaleX, scaleY);
  }

  /**
   * Reset viewport to default view (US3 - T133)
   */
  public resetViewport(): void {
    this.viewport.setZoom(1, true);
    this.viewport.moveCenter(0, 0);
  }

  /**
   * Spawn loot token on the board (US2 - T123)
   */
  public spawnLootToken(lootData: LootSpawnedPayload): void {
    const tokenData: LootTokenData = {
      ...lootData,
      isCollected: false,
    };
    const screenPos = axialToScreen(lootData.coordinates);
    const token = this.lootTokenPool.addToken(tokenData, new PIXI.Point(screenPos.x, screenPos.y));

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
   * Draw placeholder grid within world bounds
   * Always draws hexes within the 1024x1024 pixel rectangle
   */
  public drawPlaceholderGrid(): void {
    this.placeholderLayer.removeChildren();
    const graphics = new PIXI.Graphics();
    const bounds = this.getWorldBounds();

    // Calculate generous ranges for hex iteration
    // Due to the offset nature of axial coordinates, we need to iterate over
    // more coordinates than strictly necessary and filter by screen position
    const maxR = Math.ceil(WORLD_PIXEL_SIZE / (1.5 * HEX_SIZE)) + 2; // ~16 rows
    const maxQ = Math.ceil(WORLD_PIXEL_SIZE / (Math.sqrt(3) * HEX_SIZE)) + maxR; // accounts for offset

    // Draw placeholder hexes whose centers fall within the rectangular bounds
    for (let r = -2; r <= maxR; r++) {
      for (let q = -maxR; q <= maxQ; q++) {
        const hex = { q, r };
        const pos = axialToScreen(hex);

        // Only draw hexes whose center is within the rectangular pixel bounds
        if (pos.x >= bounds.minX - HEX_SIZE && pos.x <= bounds.maxX + HEX_SIZE &&
            pos.y >= bounds.minY - HEX_SIZE && pos.y <= bounds.maxY + HEX_SIZE) {
          this.drawHexagon(graphics, pos.x, pos.y, 48);
        }
      }
    }
    graphics.stroke({ width: 1, color: 0x555555, alpha: 0.5 });
    this.placeholderLayer.addChild(graphics);
  }

  /**
   * Draw a gold border around the fixed 1024x1024 pixel world boundary
   */
  private drawWorldBorder(): void {
    this.borderLayer.removeChildren();

    // Fixed rectangular world bounds (1024x1024 pixels)
    const bounds = this.getWorldBounds();

    // Draw the gold border using PixiJS v8 API
    const graphics = new PIXI.Graphics();

    // Draw outer gold border (thick)
    graphics.rect(bounds.minX, bounds.minY, bounds.width, bounds.height);
    graphics.stroke({ width: 4, color: 0xFFD700, alpha: 1 });

    // Draw inner decorative border (thinner, slightly darker gold)
    graphics.rect(bounds.minX + 6, bounds.minY + 6, bounds.width - 12, bounds.height - 12);
    graphics.stroke({ width: 2, color: 0xDAA520, alpha: 0.8 });

    // Add corner decorations (small filled circles at corners)
    const cornerRadius = 8;
    graphics.circle(bounds.minX, bounds.minY, cornerRadius);
    graphics.circle(bounds.maxX, bounds.minY, cornerRadius);
    graphics.circle(bounds.minX, bounds.maxY, cornerRadius);
    graphics.circle(bounds.maxX, bounds.maxY, cornerRadius);
    graphics.fill({ color: 0xFFD700, alpha: 1 });

    this.borderLayer.addChild(graphics);

    console.log('[HexGrid] World border drawn:', {
      bounds,
      pixelSize: WORLD_PIXEL_SIZE
    });
  }

  /**
   * Get the world bounds (fixed 1024x1024 pixel square)
   */
  public getWorldBounds(): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
    // World starts at origin (0,0) and extends WORLD_PIXEL_SIZE in both directions
    const minX = -HEX_SIZE; // Small padding for hex at (0,0)
    const minY = -HEX_SIZE;
    const maxX = minX + WORLD_PIXEL_SIZE;
    const maxY = minY + WORLD_PIXEL_SIZE;

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: WORLD_PIXEL_SIZE,
      height: WORLD_PIXEL_SIZE
    };
  }

  /**
   * Check if a hex coordinate is within the fixed world bounds (screen-space rectangle)
   */
  public isWithinWorldBounds(hex: Axial): boolean {
    const screenPos = axialToScreen(hex);
    const bounds = this.getWorldBounds();

    // Check if hex center is within the rectangular bounds
    return screenPos.x >= bounds.minX && screenPos.x <= bounds.maxX &&
           screenPos.y >= bounds.minY && screenPos.y <= bounds.maxY;
  }

  private drawHexagon(graphic: PIXI.Graphics, x: number, y: number, size: number): void {
    const angles = [30, 90, 150, 210, 270, 330];
    const points: Array<{ x: number; y: number }> = [];

    for (const angle of angles) {
      const rad = (Math.PI / 180) * angle;
      points.push({
        x: x + size * Math.cos(rad),
        y: y + size * Math.sin(rad)
      });
    }

    graphic.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      graphic.lineTo(points[i].x, points[i].y);
    }

    graphic.closePath();
  }

  /**
   * Set the background image for the map (Issue #191)
   * Automatically scales and positions the image to fit edge-to-edge within the 20x20 world bounds.
   * A 1:1 ratio image will align properly with the hex grid.
   *
   * @param imageUrl URL of the background image
   * @param opacity Opacity value between 0 and 1 (default: 1)
   */
  public async setBackgroundImage(
    imageUrl: string,
    opacity: number = 1
  ): Promise<void> {
    // Remove existing background if present
    this.removeBackgroundImage();

    try {
      // Use Image element for all URLs - more reliable than Assets.load()
      const texture = await new Promise<PIXI.Texture>((resolve, reject) => {
        const img = new Image();
        // Only set crossOrigin for external URLs - same-origin URLs don't need it
        // and setting it can cause CORS issues if server doesn't send CORS headers
        const isExternalUrl = imageUrl.startsWith('http://') || imageUrl.startsWith('https://');
        if (isExternalUrl) {
          img.crossOrigin = 'anonymous';
        }
        img.onload = () => {
          try {
            const tex = PIXI.Texture.from(img);
            resolve(tex);
          } catch (err) {
            reject(new Error(`Failed to create texture: ${err}`));
          }
        };
        img.onerror = (event) => {
          // Log the actual error event for debugging
          console.error('[HexGrid] Image load error event:', event);
          reject(new Error(`Failed to load image: ${imageUrl}`));
        };
        img.src = imageUrl;
      });

      // Create sprite from texture
      this.backgroundSprite = new PIXI.Sprite(texture);

      // Get the world bounds for the 20x20 grid
      const worldBounds = this.getWorldBounds();

      // Calculate scale to fit the image edge-to-edge in the world bounds
      const scaleX = worldBounds.width / texture.width;
      const scaleY = worldBounds.height / texture.height;
      // Use uniform scaling to maintain aspect ratio - use the larger scale to cover the area
      const scale = Math.max(scaleX, scaleY);

      // Position at top-left of world bounds, centered if aspect ratios differ
      const scaledWidth = texture.width * scale;
      const scaledHeight = texture.height * scale;
      const offsetX = worldBounds.minX + (worldBounds.width - scaledWidth) / 2;
      const offsetY = worldBounds.minY + (worldBounds.height - scaledHeight) / 2;

      // Apply transforms
      this.backgroundSprite.alpha = Math.max(0, Math.min(1, opacity));
      this.backgroundSprite.position.set(offsetX, offsetY);
      this.backgroundSprite.scale.set(scale, scale);

      // Background is non-interactive (clicks pass through to hex tiles)
      this.backgroundSprite.eventMode = 'none';
      this.backgroundSprite.cursor = 'default';

      console.log('[HexGrid] Background loaded and auto-fitted:', {
        imageUrl,
        textureSize: { width: texture.width, height: texture.height },
        worldBounds,
        calculatedScale: scale,
        position: { x: offsetX, y: offsetY },
        opacity,
      });

      // Add to background layer (behind hex tiles)
      this.backgroundLayer.addChild(this.backgroundSprite);

      // Update tile opacity to make them semi-transparent over background
      this.updateTileOpacity();
    } catch (error) {
      console.error('[HexGrid] Failed to load background image:', error);
      throw error; // Re-throw so callers know it failed
    }
  }

  /**
   * Update background opacity without changing position/scale (Issue #191)
   * @param opacity Opacity value between 0 and 1
   */
  public setBackgroundOpacity(opacity: number): void {
    if (!this.backgroundSprite) return;
    this.backgroundSprite.alpha = Math.max(0, Math.min(1, opacity));
  }

  /**
   * Remove the background image (Issue #191)
   */
  public removeBackgroundImage(): void {
    if (this.backgroundSprite) {
      this.backgroundLayer.removeChild(this.backgroundSprite);
      this.backgroundSprite.destroy();
      this.backgroundSprite = null;

      // Restore full opacity to tiles when background is removed
      this.updateTileOpacity();
    }
  }

  /**
   * Update all tile opacities based on background presence (Issue #191)
   * Tiles become semi-transparent when a background is present
   */
  private updateTileOpacity(): void {
    const hasBackground = this.hasBackgroundImage();
    this.tiles.forEach((tile) => {
      tile.setBackgroundMode(hasBackground);
    });
  }

  /**
   * Check if a background image is currently set (Issue #191)
   */
  public hasBackgroundImage(): boolean {
    return this.backgroundSprite !== null;
  }

  /**
   * Get the current background opacity (Issue #191)
   * Returns null if no background image is set
   */
  public getBackgroundOpacity(): number | null {
    if (!this.backgroundSprite) return null;
    return this.backgroundSprite.alpha;
  }

  public async exportToPng(): Promise<void> {
    // Set tiles to export mode (green)
    this.tiles.forEach(tile => tile.setExportMode(true));
    this.app.render();

    // Get world bounds (1024x1024 pixels)
    const bounds = this.getWorldBounds();

    // Create a frame rectangle matching the exact world bounds
    // This ensures the exported image is exactly 1024x1024 pixels
    const frame = new PIXI.Rectangle(bounds.minX, bounds.minY, bounds.width, bounds.height);

    // Extract only the tiles layer within the world bounds
    // Resolution 1 ensures we get exactly WORLD_PIXEL_SIZE x WORLD_PIXEL_SIZE pixels
    const dataUrl = await this.app.renderer.extract.base64({
      target: this.tilesLayer,
      frame,
      resolution: 1
    });

    const link = document.createElement('a');
    link.download = 'scenario-map.png';
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revert tiles to their normal appearance
    this.tiles.forEach(tile => tile.setExportMode(false));
    this.app.render();
  }


  public destroy(): void {
    // Only destroy if app was initialized
    if (!this.app) return;

    try {
      this.clearBoard();
    } catch (error) {
      console.error('Error clearing board:', error);
    }

    // Clean up background image (Issue #191)
    try {
      this.removeBackgroundImage();
    } catch (error) {
      console.error('Error removing background image:', error);
    }

    try {
      if (this.highlightManager) {
        this.highlightManager.destroy();
      }
    } catch (error) {
      console.error('Error destroying highlight manager:', error);
    }

    try {
      if (this.lootTokenPool) {
        this.lootTokenPool.destroy();
      }
    } catch (error) {
      console.error('Error destroying loot token pool:', error);
    }

    try {
      // Safely remove canvas if it exists in the container
      if (this.app && this.app.canvas && this.container && this.container.contains(this.app.canvas)) {
        this.container.removeChild(this.app.canvas);
      }
    } catch (error) {
      console.error('Error removing canvas:', error);
    }

    try {
      if (this.app) {
        this.app.destroy(true, { children: true, texture: true });
      }
    } catch (error) {
      console.error('Error destroying PixiJS app:', error);
    }

    // Prevent double-destroy by nulling the app reference
    // @ts-expect-error - we're deliberately setting this to null for safety
    this.app = null;
  }
}
