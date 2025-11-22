/**
 * useHexGrid Hook
 *
 * Manages HexGrid initialization, lifecycle, and resize handling.
 * Handles the async initialization of PixiJS and proper cleanup.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { HexGrid, type GameBoardData } from '../game/HexGrid';
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

  const { onHexClick, onCharacterSelect, onMonsterSelect } = options;

  // Initialize hex grid
  useEffect(() => {
    console.log('=== HEX GRID INITIALIZATION EFFECT ===');
    console.log('containerRef.current:', containerRef.current ? 'EXISTS' : 'NULL');
    console.log('hexGridRef.current:', hexGridRef.current ? 'ALREADY INITIALIZED' : 'NULL');

    if (!containerRef.current || hexGridRef.current) {
      console.log('Skipping HexGrid init - already initialized or no container');
      return;
    }

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    console.log('🎨 Container dimensions:', { width, height });

    const hexGrid = new HexGrid(containerRef.current, {
      width,
      height,
      onHexClick,
      onCharacterSelect,
      onMonsterSelect,
    });
    console.log('🎨 HexGrid instance created, starting async initialization...');

    // Initialize the HexGrid asynchronously (PixiJS v8 requirement)
    let mounted = true;
    let initCompleted = false;

    hexGrid.init().then(() => {
      console.log('✅ HexGrid.init() promise resolved!');
      initCompleted = true;
      if (mounted) {
        hexGridRef.current = hexGrid;
        setHexGridReady(true); // Signal that HexGrid is ready
        console.log('✅ HexGrid reference set! Ready to render game data.');
      } else {
        console.log('⚠️ Component unmounted before init completed');
      }
    }).catch((error) => {
      console.error('❌ Failed to initialize HexGrid:', error);
      initCompleted = true; // Mark as completed even on error
    });

    // Handle resize
    const handleResize = () => {
      if (containerRef.current && hexGridRef.current) {
        hexGridRef.current.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      mounted = false;
      window.removeEventListener('resize', handleResize);

      // Always destroy the hexGrid instance to prevent memory leaks
      if (hexGrid) {
        // Wait for init to complete before destroying
        if (initCompleted) {
          try {
            hexGrid.destroy();
          } catch (error) {
            console.error('Error destroying HexGrid:', error);
          }
        } else {
          // If init hasn't completed yet, wait for it then destroy
          hexGrid.init().then(() => {
            try {
              hexGrid.destroy();
            } catch (error) {
              console.error('Error destroying HexGrid after delayed init:', error);
            }
          }).catch(() => {
            // Init failed, nothing to destroy
          });
        }
      }

      // Clear the ref and state
      hexGridRef.current = null;
      setHexGridReady(false);
    };
  }, [containerRef, onHexClick, onCharacterSelect, onMonsterSelect]);

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
  const moveCharacter = useCallback((characterId: string, toHex: Axial) => {
    if (hexGridRef.current) {
      hexGridRef.current.moveCharacter(characterId, toHex);
      hexGridRef.current.deselectAll();
    }
  }, []);

  // Deselect all
  const deselectAll = useCallback(() => {
    if (hexGridRef.current) {
      hexGridRef.current.deselectAll();
    }
  }, []);

  return {
    hexGridRef,
    hexGridReady,
    initializeBoard,
    moveCharacter,
    deselectAll,
  };
}
