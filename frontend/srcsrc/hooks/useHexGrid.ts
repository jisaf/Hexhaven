
/**
 * useHexGrid Hook
 *
 * Manages HexGrid initialization, lifecycle, and resize handling.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { HexGrid, type GameBoardData, type HexGridOptions } from 'game/HexGrid';
import type { Axial } from 'game/hex-utils';
import type { HexTileData } from 'game/HexTile';

// ... (rest of the file is unchanged)
