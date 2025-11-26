/**
 * Standalone Hex Map Demo
 * Tests HexGrid rendering without WebSockets or game state
 */

import { useEffect, useRef } from 'react';
import { HexGrid, type GameBoardData } from '../game/HexGrid';
import type { CharacterData } from '../game/CharacterSprite';
import { type Monster, TerrainType } from '../../../shared/types/entities.ts';

export function HexMapDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const hexGridRef = useRef<HexGrid | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!containerRef.current || isInitialized.current) {
      return;
    }
    isInitialized.current = true;

    console.log('HexMapDemo: Starting initialization');
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    console.log('HexMapDemo: Container dimensions:', { width, height });

    const hexGrid = new HexGrid(containerRef.current, {
      width,
      height,
      onHexClick: (hex) => console.log('Hex clicked:', hex),
      onCharacterSelect: (id) => console.log('Character selected:', id),
      onMonsterSelect: (id) => console.log('Monster selected:', id),
    });

    // Initialize HexGrid asynchronously
    hexGrid.init()
      .then(() => {
        console.log('HexMapDemo: HexGrid initialized successfully');
        hexGridRef.current = hexGrid;

        // Hardcoded test data
        const testData: GameBoardData = {
          tiles: [
            { coordinates: { q: 0, r: 0 }, terrain: TerrainType.NORMAL, features: [], triggers: [], occupiedBy: null, hasLoot: false, hasTreasure: false },
            { coordinates: { q: 1, r: 0 }, terrain: TerrainType.NORMAL, features: [], triggers: [], occupiedBy: null, hasLoot: false, hasTreasure: false },
            { coordinates: { q: 2, r: -1 }, terrain: TerrainType.NORMAL, features: [], triggers: [], occupiedBy: null, hasLoot: false, hasTreasure: false },
            { coordinates: { q: 3, r: -1 }, terrain: TerrainType.NORMAL, features: [], triggers: [], occupiedBy: null, hasLoot: false, hasTreasure: false },
            { coordinates: { q: 0, r: 1 }, terrain: TerrainType.NORMAL, features: [], triggers: [], occupiedBy: null, hasLoot: false, hasTreasure: false },
            { coordinates: { q: 1, r: 1 }, terrain: TerrainType.NORMAL, features: [], triggers: [], occupiedBy: null, hasLoot: false, hasTreasure: false },
            { coordinates: { q: 2, r: 0 }, terrain: TerrainType.OBSTACLE, features: [], triggers: [], occupiedBy: null, hasLoot: false, hasTreasure: false },
            { coordinates: { q: 3, r: 0 }, terrain: TerrainType.NORMAL, features: [], triggers: [], occupiedBy: null, hasLoot: false, hasTreasure: false },
            { coordinates: { q: 0, r: 2 }, terrain: TerrainType.NORMAL, features: [], triggers: [], occupiedBy: null, hasLoot: false, hasTreasure: false },
            { coordinates: { q: 1, r: 2 }, terrain: TerrainType.NORMAL, features: [], triggers: [], occupiedBy: null, hasLoot: false, hasTreasure: false },
            { coordinates: { q: 2, r: 1 }, terrain: TerrainType.NORMAL, features: [], triggers: [], occupiedBy: null, hasLoot: false, hasTreasure: false },
            { coordinates: { q: 3, r: 1 }, terrain: TerrainType.NORMAL, features: [], triggers: [], occupiedBy: null, hasLoot: false, hasTreasure: false },
            { coordinates: { q: 0, r: 3 }, terrain: TerrainType.NORMAL, features: [], triggers: [], occupiedBy: null, hasLoot: false, hasTreasure: false },
            { coordinates: { q: 1, r: 3 }, terrain: TerrainType.NORMAL, features: [], triggers: [], occupiedBy: null, hasLoot: false, hasTreasure: false },
            { coordinates: { q: 2, r: 2 }, terrain: TerrainType.NORMAL, features: [], triggers: [], occupiedBy: null, hasLoot: false, hasTreasure: false },
            { coordinates: { q: 3, r: 2 }, terrain: TerrainType.NORMAL, features: [], triggers: [], occupiedBy: null, hasLoot: false, hasTreasure: true },
          ],
          characters: [
            {
              id: 'demo-char-1',
              playerId: 'demo-player-1',
              classType: 'Brute',
              health: 10,
              maxHealth: 10,
              currentHex: { q: 0, r: 0 },
              conditions: [],
              isExhausted: false,
            },
          ] as CharacterData[],
          monsters: [
            {
              id: 'demo-monster-1',
              roomId: 'demo-room',
              monsterType: 'Bandit Guard',
              isElite: false,
              currentHex: { q: 2, r: -1 },
              health: 5,
              maxHealth: 5,
              movement: 2,
              attack: 2,
              range: 1,
              specialAbilities: [],
              conditions: [],
              isDead: false,
            },
            {
              id: 'demo-monster-2',
              roomId: 'demo-room',
              monsterType: 'Bandit Archer',
              isElite: false,
              currentHex: { q: 3, r: -1 },
              health: 4,
              maxHealth: 4,
              movement: 2,
              attack: 2,
              range: 3,
              specialAbilities: [],
              conditions: [],
              isDead: false,
            },
          ] as Monster[],
        };

        console.log('HexMapDemo: Initializing board with test data:', testData);
        hexGrid.initializeBoard(testData);
        console.log('HexMapDemo: Board initialized!');
      })
      .catch((error) => {
        console.error('HexMapDemo: Failed to initialize HexGrid:', error);
      });

    // Cleanup
    return () => {
      console.log('HexMapDemo: Cleaning up');
      if (hexGridRef.current) {
        try {
          hexGridRef.current.destroy();
        } catch (error) {
          console.error('HexMapDemo: Error destroying HexGrid:', error);
        }
      }
      hexGridRef.current = null;
    };
  }, []);

  return (
    <div style={{ width: 'vw', height: '100vh', background: '#1a1a1a', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '16px', background: '#2c2c2c', color: '#fff', borderBottom: '2px solid #333' }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>Hex Map Demo (Standalone)</h1>
        <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#888' }}>
          Testing HexGrid rendering without WebSockets or game state
        </p>
      </header>
      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }} />
    </div>
  );
}
