/**
 * Standalone Hex Map Demo
 * Tests HexGrid rendering without WebSockets or game state
 */

import { useEffect, useRef } from 'react';
import { HexGrid, type GameBoardData } from '../game/HexGrid';
import type { CharacterData } from '../game/CharacterSprite';
import { type Monster, TerrainType, Condition, CharacterClass, type AbilityCard } from '../../../shared/types/entities';
import type { Character, TurnEntity } from '../../../shared/types/entities';
import { CardSelectionPanel } from '../components/CardSelectionPanel';

const mockCharacters: Character[] = [
  { id: 'brute-1', classType: CharacterClass.BRUTE, health: 10, maxHealth: 10, conditions: [Condition.POISON], playerId: 'player-1', currentHex: { q: 0, r: 0 }, experience: 0, level: 1, abilityDeck: [], hand: [], discardPile: [], lostPile: [], activeCards: null, isExhausted: false },
  { id: 'tinkerer-1', classType: CharacterClass.TINKERER, health: 8, maxHealth: 8, conditions: [], playerId: 'player-2', currentHex: { q: 1, r: 0 }, experience: 0, level: 1, abilityDeck: [], hand: [], discardPile: [], lostPile: [], activeCards: null, isExhausted: false },
];

const mockMonsters: Monster[] = [
  { id: 'bandit-1', monsterType: 'Bandit Guard', isElite: false, health: 5, maxHealth: 5, conditions: [], roomId: 'demo', currentHex: { q: 2, r: -1 }, movement: 2, attack: 2, range: 1, specialAbilities: [], isDead: false },
  { id: 'bandit-2', monsterType: 'Bandit Archer', isElite: true, health: 6, maxHealth: 6, conditions: [Condition.WOUND], roomId: 'demo', currentHex: { q: 3, r: -1 }, movement: 2, attack: 2, range: 3, specialAbilities: [], isDead: false },
];

const mockAbilityCards: AbilityCard[] = [
  // Simplified mock cards for layout testing
  { id: 'card-1', name: 'Trample', initiative: 72, topAction: { type: 'ATTACK', value: 3, range: 1, effects: [] }, bottomAction: { type: 'MOVE', value: 4, effects: [] } },
  { id: 'card-2', name: 'Eye for an Eye', initiative: 12, topAction: { type: 'ATTACK', value: 4, range: 1, effects: [] }, bottomAction: { type: 'HEAL', value: 2, effects: [] } },
  { id: 'card-3', name: 'Balanced Measure', initiative: 81, topAction: { type: 'MOVE', value: 2, effects: [] }, bottomAction: { type: 'ATTACK', value: 5, range: 1, effects: [] } },
  { id: 'card-4', name: 'Warding Click', initiative: 33, topAction: { type: 'HEAL', value: 3, effects: [] }, bottomAction: { type: 'MOVE', value: 3, effects: [] } },
  { id: 'card-5', name: 'Skewer', initiative: 55, topAction: { type: 'ATTACK', value: 2, range: 1, effects: [] }, bottomAction: { type: 'MOVE', value: 2, effects: [] } },
];

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

    hexGrid.init()
      .then(() => {
        console.log('HexMapDemo: HexGrid initialized successfully');
        hexGridRef.current = hexGrid;

        const testData: GameBoardData = {
          tiles: [
            { coordinates: { q: 0, r: 0 }, terrain: TerrainType.NORMAL, features: [], triggers: [], occupiedBy: null, hasLoot: false, hasTreasure: false },
            { coordinates: { q: 1, r: 0 }, terrain: TerrainType.NORMAL, features: [], triggers: [], occupiedBy: null, hasLoot: false, hasTreasure: false },
          ],
          characters: mockCharacters as CharacterData[],
          monsters: mockMonsters,
        };

        console.log('HexMapDemo: Initializing board with test data:', testData);
        hexGrid.initializeBoard(testData);
        console.log('HexMapDemo: Board initialized!');
      })
      .catch((error) => {
        console.error('HexMapDemo: Failed to initialize HexGrid:', error);
      });

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
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a1a', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '16px', background: '#2c2c2c', color: '#fff', borderBottom: '2px solid #333' }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>Hex Map Demo (Standalone)</h1>
        <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#888' }}>
          Testing HexGrid rendering without WebSockets or game state
        </p>
      </header>
      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }} />
      <CardSelectionPanel
        cards={mockAbilityCards}
        onCardSelect={() => {}}
        onClearSelection={() => {}}
        onConfirmSelection={() => {}}
        selectedTopAction={null}
        selectedBottomAction={null}
      />
    </div>
  );
}
