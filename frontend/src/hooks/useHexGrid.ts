/**
 * useHexGrid Hook
 *
 * Manages HexGrid initialization, lifecycle, and resize handling.
 * Handles the async initialization of PixiJS and proper cleanup.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { HexGrid, type GameBoardData } from '../game/HexGrid';
import type { LootSpawnedPayload } from '../../../shared/types';
import type { Axial } from '../game/hex-utils';

interface UseHexGridOptions {
  onHexClick: (hex: Axial) => void;
  onCharacterSelect: (characterId: string) => void;
  onMonsterSelect: (monsterId: string) => void;
}

export function useHexGrid(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: UseHexGridOptions
) {
  const hexGridRef = useRef<HexGrid | null>(null);
  const [hexGridReady, setHexGridReady] = useState(false);
  const ackCallbackRef = useRef<((ack: boolean) => void) | null>(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Initialize hex grid
  useEffect(() => {
    console.log('=== HEX GRID INITIALIZATION EFFECT ===');
    console.log('containerRef.current:', containerRef.current ? 'EXISTS' : 'NULL');
    console.log('hexGridRef.current:', hexGridRef.current ? 'ALREADY INITIALIZED' : 'NULL');

    if (!containerRef.current || hexGridRef.current) {
      console.log('Skipping HexGrid init - already initialized or no container');
      return;
    }

    // Defer initialization to ensure the container has been sized by the browser
    const timeoutId = setTimeout(() => {
      if (!containerRef.current) {
        return;
      }

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      console.log('🎨 Container dimensions:', { width, height });

      // If dimensions are still 0, something is wrong with the layout
      if (width === 0 || height === 0) {
        console.error('❌ HexGrid container has zero dimensions. Aborting initialization.');
        return;
      }

      const hexGrid = new HexGrid(containerRef.current, {
        width,
        height,
        onHexClick: (...args) => optionsRef.current.onHexClick(...args),
        onCharacterSelect: (...args) => optionsRef.current.onCharacterSelect(...args),
        onMonsterSelect: (...args) => optionsRef.current.onMonsterSelect(...args),
      });
      console.log('🎨 HexGrid instance created, starting async initialization...');

      // Initialize the HexGrid asynchronously (PixiJS v8 requirement)
      const mounted = true;

      hexGrid.init().then(() => {
      console.log('✅ HexGrid.init() promise resolved!');
      if (mounted) {
        hexGridRef.current = hexGrid;
        setHexGridReady(true); // Signal that HexGrid is ready
        console.log('✅ HexGrid reference set! Ready to render game data.');
      } else {
        console.log('⚠️ Component unmounted before init completed');
      }
    }).catch((error) => {
      console.error('❌ Failed to initialize HexGrid:', error);
    });
    });

    // Handle resize
    const handleResize = () => {
      if (containerRef.current && hexGridRef.current) {
        hexGridRef.current.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);

      // Always destroy the hexGrid instance to prevent memory leaks
      if (hexGridRef.current) {
        try {
          hexGridRef.current.destroy();
        } catch (err) {
          console.error('Error destroying HexGrid:', err);
        }
      }

      // Clear the ref and state
      hexGridRef.current = null;
      setHexGridReady(false);
    };
  }, [containerRef]);

  // Initialize board with game data
  const initializeBoard = useCallback((boardData: GameBoardData, ackCallback?: (ack: boolean) => void) => {
    console.log('=== INITIALIZE BOARD CALLED ===');
    console.log('hexGridReady:', hexGridReady);
    console.log('hexGridRef.current:', hexGridRef.current ? 'EXISTS' : 'NULL');

    if (!hexGridReady || !hexGridRef.current) {
      console.log('⏳ HexGrid not ready yet - waiting for initialization');
      if (ackCallback) {
        ackCallbackRef.current = ackCallback;
      }
      return;
    }

    console.log('✅ HexGrid is ready - initializing board');
    console.log('🎮 Board data:', {
      tiles: boardData.tiles.length,
      characters: boardData.characters.length,
      monsters: boardData.monsters?.length || 0,
    });

    try {
      hexGridRef.current.initializeBoard(boardData);
      console.log('✅ Board initialized successfully!');

      // Send positive acknowledgment
      if (ackCallback) {
        ackCallback(true);
        console.log('✅ Sent positive acknowledgment to server');
      } else if (ackCallbackRef.current) {
        ackCallbackRef.current(true);
        console.log('✅ Sent positive acknowledgment to server');
        ackCallbackRef.current = null;
      }
    } catch (error) {
      console.error('❌ ERROR initializing board:', error);

      // Send negative acknowledgment
      const callback = ackCallback || ackCallbackRef.current;
      if (callback) {
        callback(false);
        console.log('❌ Sent negative acknowledgment to server');
        ackCallbackRef.current = null;
      }
    }
  }, [hexGridReady]);

  // Move character on the grid
  const moveCharacter = useCallback((characterId: string, toHex: Axial, movementPath?: Axial[]) => {
    if (hexGridRef.current) {
      hexGridRef.current.moveCharacter(characterId, toHex, movementPath);
      hexGridRef.current.deselectAll();
    }
  }, []);

  // Deselect all
  const deselectAll = useCallback(() => {
    if (hexGridRef.current) {
      hexGridRef.current.deselectAll();
    }
  }, []);

  const showMovementRange = useCallback((hexes: Axial[]) => {
    if (hexGridRef.current) {
      hexGridRef.current.showMovementRange(hexes);
    }
  }, []);

  const clearMovementRange = useCallback(() => {
    if (hexGridRef.current) {
      hexGridRef.current.clearMovementRange();
    }
  }, []);

  const setSelectedHex = useCallback((hex: Axial | null) => {
    if (hexGridRef.current) {
      hexGridRef.current.setSelectedHex(hex);
    }
  }, []);

  const showAttackRange = useCallback((hexes: Axial[]) => {
    if (hexGridRef.current) {
      hexGridRef.current.showAttackRange(hexes);
    }
  }, []);

  const clearAttackRange = useCallback(() => {
    if (hexGridRef.current) {
      hexGridRef.current.clearAttackRange();
    }
  }, []);

  /**
   * Update monster position on the hex grid
   *
   * This callback is invoked when a monster moves during their turn. It updates
   * both the monster's internal data and its visual sprite position. The sprite
   * is temporarily re-parented to force PIXI.js to recalculate its interactive
   * bounds, ensuring click detection works at the new location.
   *
   * @param monsterId - The unique identifier of the monster to move
   * @param newHex - The target hex coordinates in axial format
   */
  const updateMonsterPosition = useCallback((monsterId: string, newHex: Axial) => {
    if (hexGridRef.current) {
      const sprite = hexGridRef.current.getMonster(monsterId);
      if (sprite) {
        // Update monster data
        const monsterData = sprite.getMonster();
        const updatedMonster = { ...monsterData, currentHex: newHex };
        hexGridRef.current.updateMonster(monsterId, updatedMonster);

        // Update sprite position
        sprite.updatePosition(newHex);

        // Force PIXI to recalculate interactive bounds by re-parenting the sprite
        // This ensures hit detection works at the new location
        const parent = sprite.parent;
        if (parent) {
          const index = parent.getChildIndex(sprite);
          parent.removeChild(sprite);
          parent.addChildAt(sprite, index);
        }
      }
    }
  }, []);

  // Update character health
  const updateCharacterHealth = useCallback((characterId: string, health: number) => {
    if (hexGridRef.current) {
      hexGridRef.current.updateCharacter(characterId, { health });
    }
  }, []);

  // Update monster health
  const updateMonsterHealth = useCallback((monsterId: string, health: number) => {
    if (hexGridRef.current) {
      const monster = hexGridRef.current.getMonster(monsterId);
      if (monster) {
        const monsterData = monster.getMonster();
        const updatedMonster = { ...monsterData, health };
        hexGridRef.current.updateMonster(monsterId, updatedMonster);
      }
    }
  }, []);

  // Remove character from board
  const removeCharacter = useCallback((characterId: string) => {
    if (hexGridRef.current) {
      hexGridRef.current.removeCharacter(characterId);
    }
  }, []);

  // Remove monster from board
  const removeMonster = useCallback(async (monsterId: string) => {
    if (hexGridRef.current) {
      const monster = hexGridRef.current.getMonster(monsterId);
      if (monster) {
        await monster.animateDeath();
        hexGridRef.current.removeMonster(monsterId);
      }
    }
  }, []);

  const spawnLootToken = useCallback((lootData: LootSpawnedPayload) => {
    if (hexGridRef.current) {
      hexGridRef.current.spawnLootToken(lootData);
    }
  }, []);

  const collectLootToken = useCallback((tokenId: string) => {
    if (hexGridRef.current) {
      hexGridRef.current.collectLootToken(tokenId);
    }
  }, []);

  const getCharacter = useCallback((characterId: string) => {
    if (hexGridRef.current) {
      return hexGridRef.current.getCharacter(characterId);
    }
    return undefined;
  }, []);

  const isHexBlocked = useCallback((hex: Axial) => {
    if (hexGridRef.current) {
      return hexGridRef.current.isHexBlocked(hex);
    }
    return true; // Default to blocked if grid is not available
  }, []);

  return {
    hexGridRef,
    hexGridReady,
    initializeBoard,
    moveCharacter,
    deselectAll,
    showMovementRange,
    clearMovementRange,
    showAttackRange,
    clearAttackRange,
    updateMonsterPosition,
    updateCharacterHealth,
    updateMonsterHealth,
    removeCharacter,
    removeMonster,
    spawnLootToken,
    collectLootToken,
    getCharacter,
    isHexBlocked,
    setSelectedHex,
  };
}
