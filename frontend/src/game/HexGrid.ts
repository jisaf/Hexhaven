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
import { MovementHighlight } from './MovementHighlight';
import { LootTokenPool, type LootTokenData } from './LootTokenSprite';
import { type Axial, axialKey, screenToAxial, hexRangeReachable, axialToScreen } from './hex-utils';
import type { Monster, HexTile as SharedHexTile } from '../../../shared/types/entities';

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
  private tilesLayer!: PIXI.Container;
  private highlightsLayer!: PIXI.Container;
  private entitiesLayer!: PIXI.Container;
  private lootLayer!: PIXI.Container;

  // Tiles and entities
  private tiles!: Map<string, HexTile>;
  private characters!: Map<string, CharacterSprite>;
  private monsters!: Map<string, MonsterSprite>;
  private movementHighlight!: MovementHighlight;
  private lootTokenPool!: LootTokenPool;

  // State
  private selectedCharacterId: string | null = null;
  private selectedMonsterId: string | null = null;
  private options: HexGridOptions;
  private isDragging: boolean = false;

  // Viewport for pan/zoom (US3 - T133)
  private viewport!: Viewport;

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
    // World bounds: Use large enough space to accommodate any typical game board
    const worldWidth = 4000;
    const worldHeight = 4000;

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

    // Set zoom constraints (US3 - T134): 0.5x to 3x
    this.viewport
      .clampZoom({
        minScale: 0.5,
        maxScale: 3.0
      });

    // Don't set clamp here - we'll set it dynamically after board initialization
    // to match the actual map bounds

    // Center the viewport on the world origin
    this.viewport.moveCenter(0, 0);

    // Create layers
    this.placeholderLayer = new PIXI.Container();
    this.tilesLayer = new PIXI.Container();
    this.highlightsLayer = new PIXI.Container();
    this.lootLayer = new PIXI.Container();
    this.entitiesLayer = new PIXI.Container();

    this.viewport.addChild(this.placeholderLayer);
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
    this.viewport.eventMode = 'static';
    this.viewport.hitArea = new PIXI.Rectangle(0, 0, worldWidth, worldHeight);
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
    if (this.options.onHexClick) {
      this.options.onHexClick(hex);
    }
  }

  /**
   * Handle viewport click for creating new hexes or deselecting.
   * The 'clicked' event only fires if the viewport is not dragged.
   */
  private handleViewportClicked(event: ClickedEvent): void {
    if (this.options.onHexClick) {
      const hex = screenToAxial(event.world);
      this.options.onHexClick(hex);
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
   * Show attack highlights on specific hexes
   */
  public showAttackHighlights(hexes: Axial[]): void {
    this.movementHighlight.showAttackRange(hexes);
  }

  /**
   * Clear only attack highlights
   */
  public clearAttackHighlights(): void {
    this.movementHighlight.clearType('attack');
  }

  /**
   * Clear all highlights
   */
  public clearHighlights(): void {
    this.movementHighlight.clear();
  }

  /**
   * Highlight a single hex as the selected destination
   */
  public showSelectedHex(hex: Axial): void {
    this.movementHighlight.showSelected(hex);
  }

  /**
   * Clear the selected destination hex highlight
   */
  public clearSelectedHex(): void {
    this.movementHighlight.clearSelected();
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
    if (this.movementHighlight) {
      this.movementHighlight.clear();
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
  public drawPlaceholderGrid(width: number, height: number): void {
    this.placeholderLayer.removeChildren();
    const graphics = new PIXI.Graphics();
    graphics.lineStyle(1, 0x555555, 0.5);

    for (let r = 0; r < height; r++) {
      for (let q = 0; q < width; q++) {
        const hex = { q, r };
        const pos = axialToScreen(hex);
        this.drawHexagon(graphics, pos.x, pos.y, 48);
      }
    }
    this.placeholderLayer.addChild(graphics);
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

  public setBackgroundImage(imageUrl: string): void {
    const sprite = PIXI.Sprite.from(imageUrl);
    sprite.width = this.app.screen.width;
    sprite.height = this.app.screen.height;
    this.app.stage.addChildAt(sprite, 0);
  }

  public async exportToPng(): Promise<void> {
    // Set tiles to export mode (green)
    this.tiles.forEach(tile => tile.setExportMode(true));
    this.app.render();

    // Extract only the tiles layer, which has a transparent background
    const dataUrl = await this.app.renderer.extract.base64(this.tilesLayer);
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

    try {
      if (this.movementHighlight) {
        this.movementHighlight.destroy();
      }
    } catch (error) {
      console.error('Error destroying movement highlight:', error);
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
