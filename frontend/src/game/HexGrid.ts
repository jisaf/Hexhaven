
/**
 * HexGrid Component
 *
 * Main game board renderer using PixiJS. Supports both 'game' and 'design' modes.
 */

import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { HexTile, type HexTileData } from './HexTile';
import { CharacterSprite, type CharacterData } from './CharacterSprite';
import { MonsterSprite } from './MonsterSprite';
import { MovementHighlight } from './MovementHighlight';
import { type Axial, axialKey, screenToAxial, hexRangeReachable, axialToScreen, hexNeighbors } from './hex-utils';
import type { Monster } from '../../../shared/types/entities';

// ... (rest of the file is unchanged)
