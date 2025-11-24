
import React, { useState, useEffect, useRef } from 'react';
import { HexGrid } from '../game/HexGrid';
import { AxialCoordinates, HexTile, TerrainType, HexFeatureType, TriggerType, MonsterType } from '../../../shared/types/entities';
import { FlyoutPanel } from '../components/ScenarioDesigner/FlyoutPanel';

const ScenarioDesigner: React.FC = () => {
  const [activeHexes, setActiveHexes] = useState<Map<string, HexTile>>(new Map());
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedHex, setSelectedHex] = useState<AxialCoordinates | null>(null);
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioDifficulty, setScenarioDifficulty] = useState(1);
  const [scenarioObjective, setScenarioObjective] = useState('');
  const [monsterTypes, setMonsterTypes] = useState<MonsterType[]>([]);
  const [playerStartPositions, setPlayerStartPositions] = useState<Record<number, AxialCoordinates[]>>({ 2: [], 3: [], 4: [] });
  const [monsterGroups, setMonsterGroups] = useState<any[]>([]);
  const [selectedPlayerCount, setSelectedPlayerCount] = useState<number>(2);
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HexGrid | null>(null);

  const handleHexClick = (hex: AxialCoordinates) => {
    const key = `${hex.q},${hex.r}`;
    const newActiveHexes = new Map(activeHexes);

    if (newActiveHexes.has(key)) {
      setSelectedHex(hex);
      setIsPanelOpen(true);
    } else {
      const newTile: HexTile = {
        coordinates: hex,
        terrain: 'normal',
        features: [],
        triggers: [],
        occupiedBy: null,
        hasLoot: false,
        hasTreasure: false,
      };
      newActiveHexes.set(key, newTile);
      setActiveHexes(newActiveHexes);
    }
  };

  const handleDeleteHex = () => {
    if (selectedHex) {
      const key = `${selectedHex.q},${selectedHex.r}`;
      const newActiveHexes = new Map(activeHexes);
      if (newActiveHexes.has(key)) {
        newActiveHexes.delete(key);
        setActiveHexes(newActiveHexes);
      }

      const newMonsterGroups = [...monsterGroups];
      newMonsterGroups.forEach(group => {
        group.spawnPoints = group.spawnPoints.filter(p => p.q !== selectedHex.q || p.r !== selectedHex.r);
        group.count = group.spawnPoints.length;
      });
      setMonsterGroups(newMonsterGroups.filter(g => g.count > 0));

      setIsPanelOpen(false);
      setSelectedHex(null);
    }
  };

  const handleAddMonster = (monsterIdentifier: string) => {
    if (selectedHex && monsterIdentifier) {
      const [type, isEliteStr] = monsterIdentifier.split('-');
      const isElite = isEliteStr === 'true';
      const newMonsterGroups = [...monsterGroups];
      let group = newMonsterGroups.find(g => g.type === type && g.isElite === isElite);
      if (!group) {
        group = { type, isElite, count: 0, spawnPoints: [] };
        newMonsterGroups.push(group);
      }
      group.spawnPoints.push(selectedHex);
      group.count = group.spawnPoints.length;
      setMonsterGroups(newMonsterGroups);
    }
  };

  const handleAddFeature = (type: HexFeatureType) => {
    if (selectedHex && type) {
      const key = `${selectedHex.q},${selectedHex.r}`;
      const newActiveHexes = new Map(activeHexes);
      const hex = newActiveHexes.get(key);
      if (hex) {
        const newFeature = { type, isOpen: type === HexFeatureType.DOOR ? false : undefined };
        hex.features.push(newFeature);
        setActiveHexes(new Map(newActiveHexes));
      }
    }
  };

  const handleRemoveFeature = (index: number) => {
    if (selectedHex) {
      const key = `${selectedHex.q},${selectedHex.r}`;
      const newActiveHexes = new Map(activeHexes);
      const hex = newActiveHexes.get(key);
      if (hex) {
        hex.features.splice(index, 1);
        setActiveHexes(new Map(newActiveHexes));
      }
    }
  };

  const handleToggleDoor = (index: number) => {
    if (selectedHex) {
      const key = `${selectedHex.q},${selectedHex.r}`;
      const newActiveHexes = new Map(activeHexes);
      const hex = newActiveHexes.get(key);
      if (hex && hex.features[index].type === HexFeatureType.DOOR) {
        hex.features[index].isOpen = !hex.features[index].isOpen;
        setActiveHexes(new Map(newActiveHexes));
      }
    }
  };

  const handleToggleTrigger = () => {
    if (selectedHex) {
      const key = `${selectedHex.q},${selectedHex.r}`;
      const newActiveHexes = new Map(activeHexes);
      const hex = newActiveHexes.get(key);
      if (hex) {
        const triggerIndex = hex.triggers.findIndex(t => t.type === TriggerType.ON_ENTER);
        if (triggerIndex > -1) {
          hex.triggers.splice(triggerIndex, 1);
        } else {
          hex.triggers.push({ type: TriggerType.ON_ENTER });
        }
        setActiveHexes(new Map(newActiveHexes));
      }
    }
  };

  const handleTogglePlayerStart = () => {
    if (selectedHex) {
      const newPlayerStartPositions = { ...playerStartPositions };
      const positions = newPlayerStartPositions[selectedPlayerCount];
      const index = positions.findIndex(p => p.q === selectedHex.q && p.r === selectedHex.r);
      if (index > -1) {
        positions.splice(index, 1);
      } else {
        positions.push(selectedHex);
      }
      setPlayerStartPositions(newPlayerStartPositions);
    }
  };

  const handleTerrainChange = (terrain: TerrainType) => {
    if (selectedHex) {
      const key = `${selectedHex.q},${selectedHex.r}`;
      const newActiveHexes = new Map(activeHexes);
      const hex = newActiveHexes.get(key);
      if (hex) {
        hex.terrain = terrain;
        setActiveHexes(newActiveHexes);
      }
    }
  };

  const handleToggleLoot = () => {
    if (selectedHex) {
      const key = `${selectedHex.q},${selectedHex.r}`;
      const newActiveHexes = new Map(activeHexes);
      const hex = newActiveHexes.get(key);
      if (hex) {
        hex.hasLoot = !hex.hasLoot;
        setActiveHexes(newActiveHexes);
      }
    }
  };

  const handleToggleTreasure = () => {
    if (selectedHex) {
      const key = `${selectedHex.q},${selectedHex.r}`;
      const newActiveHexes = new Map(activeHexes);
      const hex = newActiveHexes.get(key);
      if (hex) {
        hex.hasTreasure = !hex.hasTreasure;
        setActiveHexes(newActiveHexes);
      }
    }
  };

  const handleSaveToServer = async () => {
    if (!scenarioName) {
      alert('Please enter a name for the scenario.');
      return;
    }

    const scenarioData = {
      name: scenarioName,
      difficulty: scenarioDifficulty,
      objectivePrimary: scenarioObjective,
      mapLayout: Array.from(activeHexes.values()),
      monsterGroups: monsterGroups,
      playerStartPositions: playerStartPositions,
    };

    try {
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scenarioData),
      });

      if (response.ok) {
        alert('Scenario saved successfully!');
      } else {
        alert('Failed to save scenario.');
      }
    } catch (error) {
      console.error('Error saving scenario:', error);
      alert('An error occurred while saving the scenario.');
    }
  };

  const handleExportToPng = () => {
    if (gridRef.current) {
      gridRef.current.exportToPng();
    }
  };

  const handleBackgroundImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0] && gridRef.current) {
      const imageUrl = URL.createObjectURL(event.target.files[0]);
      gridRef.current.setBackgroundImage(imageUrl);
    }
  };

  useEffect(() => {
    if (pixiContainerRef.current) {
      const grid = new HexGrid(pixiContainerRef.current, {
        width: window.innerWidth,
        height: window.innerHeight,
        onHexClick: handleHexClick,
      });
      grid.init().then(() => {
        grid.drawPlaceholderGrid(50, 50);
        gridRef.current = grid;
      });
    }

    return () => {
      gridRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.initializeBoard({
        tiles: Array.from(activeHexes.values()),
        characters: [],
        monsters: [],
      });
    }
  }, [activeHexes]);

  useEffect(() => {
    fetch('/api/monsters')
      .then((res) => res.json())
      .then((data) => {
        setMonsterTypes(data.monsterTypes);
      });

    const savedState = localStorage.getItem('scenarioDesignerState');
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      setScenarioName(parsedState.name || '');
      setScenarioDifficulty(parsedState.difficulty || 1);
      setScenarioObjective(parsedState.objective || '');
      setActiveHexes(new Map(parsedState.activeHexes || []));
      setPlayerStartPositions(parsedState.playerStartPositions || []);
    }
  }, []);

  useEffect(() => {
    const scenarioState = {
      name: scenarioName,
      difficulty: scenarioDifficulty,
      objective: scenarioObjective,
      activeHexes: Array.from(activeHexes.entries()),
      playerStartPositions,
    };
    localStorage.setItem('scenarioDesignerState', JSON.stringify(scenarioState));
  }, [scenarioName, scenarioDifficulty, scenarioObjective, activeHexes, playerStartPositions]);

  return (
    <div>
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1001, display: 'flex', gap: '10px' }}>
        <input type="file" onChange={handleBackgroundImageUpload} accept="image/*" />
        <button onClick={handleExportToPng}>Export as PNG</button>
        <button onClick={handleSaveToServer}>Save to Server</button>
      </div>
      <h1>Scenario Designer</h1>
      <FlyoutPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)}>
        <h2>Scenario Settings</h2>
        <label>
          Name:
          <input type="text" value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} />
        </label>
        <label>
          Difficulty:
          <input type="number" min="1" max="5" value={scenarioDifficulty} onChange={(e) => setScenarioDifficulty(parseInt(e.target.value))} />
        </label>
        <label>
          Objective:
          <input type="text" value={scenarioObjective} onChange={(e) => setScenarioObjective(e.target.value)} />
        </label>
        <hr />
        {selectedHex && (
          <div>
            <h3>Editing Hex ({selectedHex.q}, {selectedHex.r})</h3>
            <button onClick={handleDeleteHex}>Delete Hex</button>
            <div>
              <h4>Terrain</h4>
              <select value={activeHexes.get(`${selectedHex.q},${selectedHex.r}`)?.terrain} onChange={(e) => handleTerrainChange(e.target.value as TerrainType)}>
                {Object.values(TerrainType).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <h4>Features</h4>
              <ul>
                {activeHexes.get(`${selectedHex.q},${selectedHex.r}`)?.features.map((feature, index) => (
                  <li key={index}>
                    {feature.type}
                    <button onClick={() => handleRemoveFeature(index)}>Remove</button>
                    {feature.type === HexFeatureType.DOOR && (
                      <label>
                        <input
                          type="checkbox"
                          checked={feature.isOpen}
                          onChange={() => handleToggleDoor(index)}
                        />
                        Is Open
                      </label>
                    )}
                  </li>
                ))}
              </ul>
              <select onChange={(e) => handleAddFeature(e.target.value as HexFeatureType)}>
                <option value="">Add Feature</option>
                {Object.values(HexFeatureType).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <h4>Loot & Treasure</h4>
              <label>
                <input
                  type="checkbox"
                  checked={activeHexes.get(`${selectedHex.q},${selectedHex.r}`)?.hasLoot}
                  onChange={handleToggleLoot}
                />
                Has Loot
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={activeHexes.get(`${selectedHex.q},${selectedHex.r}`)?.hasTreasure}
                  onChange={handleToggleTreasure}
                />
                Has Treasure
              </label>
            </div>
            <div>
              <h4>Monsters</h4>
              <select onChange={(e) => handleAddMonster(e.target.value)}>
                <option value="">Add Monster</option>
                {monsterTypes.map((monster, index) => (
                  <option key={index} value={`${monster.type}-${monster.isElite}`}>{monster.type} ({monster.isElite ? 'Elite' : 'Normal'})</option>
                ))}
              </select>
            </div>
            <div>
              <h4>Flags</h4>
              <div>
                Player Count:
                <label><input type="radio" name="playerCount" value="2" checked={selectedPlayerCount === 2} onChange={() => setSelectedPlayerCount(2)} /> 2</label>
                <label><input type="radio" name="playerCount" value="3" checked={selectedPlayerCount === 3} onChange={() => setSelectedPlayerCount(3)} /> 3</label>
                <label><input type="radio" name="playerCount" value="4" checked={selectedPlayerCount === 4} onChange={() => setSelectedPlayerCount(4)} /> 4</label>
              </div>
              <label>
                <input
                  type="checkbox"
                  checked={playerStartPositions[selectedPlayerCount].some(p => p.q === selectedHex.q && p.r === selectedHex.r)}
                  onChange={handleTogglePlayerStart}
                />
                Player Start Position
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={activeHexes.get(`${selectedHex.q},${selectedHex.r}`)?.triggers.some(t => t.type === TriggerType.ON_ENTER)}
                  onChange={handleToggleTrigger}
                />
                onEnter Trigger
              </label>
            </div>
          </div>
        )}
      </FlyoutPanel>
      <div data-testid="pixi-container" ref={pixiContainerRef} style={{ width: '100vw', height: '100vh' }} />
    </div>
  );
};

export default ScenarioDesigner;
