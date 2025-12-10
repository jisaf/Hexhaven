/**
 * Scenario Designer Page
 *
 * Full-page scenario creation tool with:
 * - Persistent sidebar with all controls
 * - Hex grid for map creation
 * - Background image support with transforms
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HexGrid } from '../game/HexGrid';
import {
  type AxialCoordinates,
  type HexTile,
  TerrainType,
  HexFeatureType,
  TriggerType,
  type MonsterType,
  type MonsterGroup,
  type Monster,
} from '../../../shared/types/entities.ts';
import { Sidebar } from '../components/ScenarioDesigner/Sidebar';
import { usePrevious } from '../hooks/usePrevious';
import { getApiUrl } from '../config/api';
import styles from './ScenarioDesigner.module.css';

// Background transform state (Issue #191)
interface BackgroundState {
  imageUrl: string | null;
  opacity: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  isUploading: boolean;
  fileName: string | null;
}

interface ScenarioState {
  name: string;
  difficulty: number;
  objective: string;
  activeHexes: Map<string, HexTile>;
  playerStartPositions: Record<number, AxialCoordinates[]>;
  monsterGroups: MonsterGroup[];
}

const SIDEBAR_WIDTH_EXPANDED = 320;
const SIDEBAR_WIDTH_COLLAPSED = 60;

const ScenarioDesigner: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarWidth = sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  const [scenarioState, setScenarioState] = useState<ScenarioState>(() => {
    const savedState = localStorage.getItem('scenarioDesignerState');
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      return {
        name: parsedState.name || '',
        difficulty: parsedState.difficulty || 1,
        objective: parsedState.objective || '',
        activeHexes: new Map(parsedState.activeHexes || []),
        playerStartPositions: parsedState.playerStartPositions || { 1: [], 2: [], 3: [], 4: [] },
        monsterGroups: parsedState.monsterGroups || [],
      };
    }
    return {
      name: '',
      difficulty: 1,
      objective: '',
      activeHexes: new Map(),
      playerStartPositions: { 1: [], 2: [], 3: [], 4: [] },
      monsterGroups: [],
    };
  });
  const [selectedHex, setSelectedHex] = useState<AxialCoordinates | null>(null);
  const [monsterTypes, setMonsterTypes] = useState<MonsterType[]>([]);
  const [selectedPlayerCount, setSelectedPlayerCount] = useState<number>(2);
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HexGrid | null>(null);

  // Background state (Issue #191)
  const [backgroundState, setBackgroundState] = useState<BackgroundState>(() => {
    const savedBg = localStorage.getItem('scenarioDesignerBackground');
    if (savedBg) {
      const parsed = JSON.parse(savedBg);
      return {
        imageUrl: parsed.imageUrl || null,
        opacity: parsed.opacity ?? 1,
        offsetX: parsed.offsetX ?? 0,
        offsetY: parsed.offsetY ?? 0,
        scale: parsed.scale ?? 1,
        isUploading: false,
        fileName: parsed.fileName || null,
      };
    }
    return {
      imageUrl: null,
      opacity: 1,
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      isUploading: false,
      fileName: null,
    };
  });
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [backgroundEditMode, setBackgroundEditMode] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<Array<{ id: string; name: string; difficulty: number }>>([]);
  const [pendingBackgroundFile, setPendingBackgroundFile] = useState<File | null>(null);

  // Handler for toggling background edit mode
  const handleBackgroundEditModeChange = useCallback(
    (editMode: boolean) => {
      setBackgroundEditMode(editMode);
      if (gridRef.current) {
        gridRef.current.setBackgroundInteractive(editMode);
      }
    },
    []
  );

  const handleReset = useCallback(() => {
    setScenarioState({
      name: '',
      difficulty: 1,
      objective: '',
      activeHexes: new Map(),
      playerStartPositions: { 1: [], 2: [], 3: [], 4: [] },
      monsterGroups: [],
    });
    setBackgroundState({
      imageUrl: null,
      opacity: 1,
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      isUploading: false,
      fileName: null,
    });
    setScenarioId(null);
    setSelectedHex(null);
    setPendingBackgroundFile(null);
    if (gridRef.current) {
      gridRef.current.clearBoard();
      gridRef.current.removeBackgroundImage();
    }
  }, []);

  const handleHexClick = useCallback((hex: AxialCoordinates) => {
    const key = `${hex.q},${hex.r}`;
    setScenarioState((prevState) => {
      const newActiveHexes = new Map(prevState.activeHexes);
      if (newActiveHexes.has(key)) {
        setSelectedHex(hex);
        return prevState;
      } else {
        const newTile: HexTile = {
          coordinates: hex,
          terrain: 'normal' as TerrainType,
          features: [],
          triggers: [],
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: false,
        };
        newActiveHexes.set(key, newTile);
        setSelectedHex(hex);
        return { ...prevState, activeHexes: newActiveHexes };
      }
    });
  }, []);

  const handleScenarioChange = useCallback((updates: Partial<ScenarioState>) => {
    setScenarioState((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleDeleteHex = useCallback(() => {
    if (selectedHex) {
      const key = `${selectedHex.q},${selectedHex.r}`;
      const newActiveHexes = new Map(scenarioState.activeHexes);
      if (newActiveHexes.has(key)) {
        newActiveHexes.delete(key);
      }

      const newMonsterGroups = [...scenarioState.monsterGroups];
      newMonsterGroups.forEach((group) => {
        group.spawnPoints = group.spawnPoints.filter(
          (p) => p.q !== selectedHex.q || p.r !== selectedHex.r
        );
        group.count = group.spawnPoints.length;
      });

      setScenarioState({
        ...scenarioState,
        activeHexes: newActiveHexes,
        monsterGroups: newMonsterGroups.filter((g) => g.count > 0),
      });
      setSelectedHex(null);
    }
  }, [selectedHex, scenarioState]);

  const handleTerrainChange = useCallback(
    (terrain: TerrainType) => {
      if (selectedHex) {
        const key = `${selectedHex.q},${selectedHex.r}`;
        setScenarioState((prevState) => {
          const newActiveHexes = new Map(prevState.activeHexes);
          const hex = newActiveHexes.get(key);
          if (hex) {
            newActiveHexes.set(key, { ...hex, terrain });
          }
          return { ...prevState, activeHexes: newActiveHexes };
        });
      }
    },
    [selectedHex]
  );

  const handleAddFeature = useCallback(
    (type: HexFeatureType) => {
      if (selectedHex && type) {
        const key = `${selectedHex.q},${selectedHex.r}`;
        setScenarioState((prevState) => {
          const newActiveHexes = new Map(prevState.activeHexes);
          const hex = newActiveHexes.get(key);
          if (hex) {
            const newFeature = {
              type,
              isOpen: type === HexFeatureType.DOOR ? false : undefined,
            };
            const newFeatures = [...(hex.features || []), newFeature];
            newActiveHexes.set(key, { ...hex, features: newFeatures });
          }
          return { ...prevState, activeHexes: newActiveHexes };
        });
      }
    },
    [selectedHex]
  );

  const handleRemoveFeature = useCallback(
    (index: number) => {
      if (selectedHex) {
        const key = `${selectedHex.q},${selectedHex.r}`;
        setScenarioState((prevState) => {
          const newActiveHexes = new Map(prevState.activeHexes);
          const hex = newActiveHexes.get(key);
          if (hex && hex.features) {
            const newFeatures = hex.features.filter((_, i) => i !== index);
            newActiveHexes.set(key, { ...hex, features: newFeatures });
          }
          return { ...prevState, activeHexes: newActiveHexes };
        });
      }
    },
    [selectedHex]
  );

  const handleToggleDoor = useCallback(
    (index: number) => {
      if (selectedHex) {
        const key = `${selectedHex.q},${selectedHex.r}`;
        setScenarioState((prevState) => {
          const newActiveHexes = new Map(prevState.activeHexes);
          const hex = newActiveHexes.get(key);
          if (hex && hex.features && hex.features[index].type === HexFeatureType.DOOR) {
            const newFeatures = [...hex.features];
            newFeatures[index] = { ...newFeatures[index], isOpen: !newFeatures[index].isOpen };
            newActiveHexes.set(key, { ...hex, features: newFeatures });
          }
          return { ...prevState, activeHexes: newActiveHexes };
        });
      }
    },
    [selectedHex]
  );

  const handleToggleLoot = useCallback(() => {
    if (selectedHex) {
      const key = `${selectedHex.q},${selectedHex.r}`;
      setScenarioState((prevState) => {
        const newActiveHexes = new Map(prevState.activeHexes);
        const hex = newActiveHexes.get(key);
        if (hex) {
          newActiveHexes.set(key, { ...hex, hasLoot: !hex.hasLoot });
        }
        return { ...prevState, activeHexes: newActiveHexes };
      });
    }
  }, [selectedHex]);

  const handleToggleTreasure = useCallback(() => {
    if (selectedHex) {
      const key = `${selectedHex.q},${selectedHex.r}`;
      setScenarioState((prevState) => {
        const newActiveHexes = new Map(prevState.activeHexes);
        const hex = newActiveHexes.get(key);
        if (hex) {
          newActiveHexes.set(key, { ...hex, hasTreasure: !hex.hasTreasure });
        }
        return { ...prevState, activeHexes: newActiveHexes };
      });
    }
  }, [selectedHex]);

  const handleAddMonster = useCallback(
    (monsterIdentifier: string) => {
      if (selectedHex && monsterIdentifier) {
        const [type, isEliteStr] = monsterIdentifier.split('-');
        const isElite = isEliteStr === 'true';
        const newMonsterGroups = [...scenarioState.monsterGroups];
        let group = newMonsterGroups.find((g) => g.type === type && g.isElite === isElite);
        if (!group) {
          group = { type, isElite, count: 0, spawnPoints: [] };
          newMonsterGroups.push(group);
        }
        group.spawnPoints.push(selectedHex);
        group.count = group.spawnPoints.length;
        setScenarioState({ ...scenarioState, monsterGroups: newMonsterGroups });
      }
    },
    [selectedHex, scenarioState]
  );

  const handleTogglePlayerStart = useCallback(() => {
    if (selectedHex) {
      setScenarioState((prevState) => {
        const newPlayerStartPositions = { ...prevState.playerStartPositions };
        // Ensure the array exists for this player count (handles legacy scenarios)
        const positions = [...(newPlayerStartPositions[selectedPlayerCount] || [])];
        const index = positions.findIndex(
          (p) => p.q === selectedHex.q && p.r === selectedHex.r
        );
        if (index > -1) {
          positions.splice(index, 1);
        } else {
          positions.push(selectedHex);
        }
        newPlayerStartPositions[selectedPlayerCount] = positions;
        return { ...prevState, playerStartPositions: newPlayerStartPositions };
      });
    }
  }, [selectedHex, selectedPlayerCount]);

  const handleToggleTrigger = useCallback(() => {
    if (selectedHex) {
      const key = `${selectedHex.q},${selectedHex.r}`;
      setScenarioState((prevState) => {
        const newActiveHexes = new Map(prevState.activeHexes);
        const hex = newActiveHexes.get(key);
        if (hex) {
          const newTriggers = [...(hex.triggers || [])];
          const triggerIndex = newTriggers.findIndex((t) => t.type === TriggerType.ON_ENTER);
          if (triggerIndex > -1) {
            newTriggers.splice(triggerIndex, 1);
          } else {
            newTriggers.push({ type: TriggerType.ON_ENTER });
          }
          newActiveHexes.set(key, { ...hex, triggers: newTriggers });
        }
        return { ...prevState, activeHexes: newActiveHexes };
      });
    }
  }, [selectedHex]);

  // Fetch saved scenarios for the load dropdown
  const fetchSavedScenarios = useCallback(async () => {
    try {
      const response = await fetch(`${getApiUrl()}/scenarios`);
      if (response.ok) {
        const data = await response.json();
        setSavedScenarios(
          data.scenarios?.map((s: { id: string; name: string; difficulty: number }) => ({
            id: s.id,
            name: s.name,
            difficulty: s.difficulty,
          })) || []
        );
      }
    } catch (error) {
      console.error('Error fetching scenarios:', error);
    }
  }, []);

  useEffect(() => {
    fetchSavedScenarios();
  }, [fetchSavedScenarios]);

  const handleSaveToServer = useCallback(async () => {
    if (!scenarioState.name) {
      alert('Please enter a name for the scenario.');
      return;
    }

    // Don't include blob URLs in the save - they'll be uploaded separately
    const backgroundUrlToSave = backgroundState.imageUrl?.startsWith('blob:')
      ? null
      : backgroundState.imageUrl;

    const scenarioData = {
      name: scenarioState.name,
      difficulty: scenarioState.difficulty,
      objectivePrimary: scenarioState.objective,
      mapLayout: Array.from(scenarioState.activeHexes.values()),
      monsterGroups: scenarioState.monsterGroups,
      playerStartPositions: scenarioState.playerStartPositions,
      backgroundImageUrl: backgroundUrlToSave,
      backgroundOpacity: backgroundState.opacity,
      backgroundOffsetX: backgroundState.offsetX,
      backgroundOffsetY: backgroundState.offsetY,
      backgroundScale: backgroundState.scale,
    };

    try {
      const url = scenarioId ? `${getApiUrl()}/scenarios/${scenarioId}` : `${getApiUrl()}/scenarios`;
      const method = scenarioId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scenarioData),
      });

      if (response.ok) {
        const data = await response.json();
        const savedScenarioId = data.scenario?.id || scenarioId;
        let backgroundUploadFailed = false;

        if (savedScenarioId) {
          setScenarioId(savedScenarioId);

          // Upload pending background file if exists
          if (pendingBackgroundFile) {
            try {
              const formData = new FormData();
              formData.append('image', pendingBackgroundFile);

              const bgResponse = await fetch(`${getApiUrl()}/scenarios/${savedScenarioId}/background`, {
                method: 'POST',
                body: formData,
              });

              if (bgResponse.ok) {
                const bgData = await bgResponse.json();
                setBackgroundState((prev) => ({
                  ...prev,
                  imageUrl: bgData.url,
                }));
                setPendingBackgroundFile(null);

                // Update scenario with the uploaded background URL
                await fetch(`${getApiUrl()}/scenarios/${savedScenarioId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ backgroundImageUrl: bgData.url }),
                });
              } else {
                backgroundUploadFailed = true;
                const errorData = await bgResponse.json().catch(() => ({}));
                const errorMsg = errorData.message || errorData.error?.message || `HTTP ${bgResponse.status}`;
                console.error('Failed to upload background image:', errorMsg, bgResponse.status);
              }
            } catch (bgError) {
              backgroundUploadFailed = true;
              console.error('Error uploading background:', bgError);
            }
          }
        }

        // Refresh the saved scenarios list
        fetchSavedScenarios();
        if (backgroundUploadFailed) {
          alert('Scenario saved, but background image upload failed. You can try uploading the background again by editing the scenario.');
        } else {
          alert('Scenario saved successfully!');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        // Server returns { error: { message: ... } } structure
        const errorMessage = errorData.error?.message || errorData.message || 'Unknown error';
        alert(`Failed to save scenario: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error saving scenario:', error);
      alert('An error occurred while saving the scenario.');
    }
  }, [scenarioState, backgroundState, scenarioId, fetchSavedScenarios, pendingBackgroundFile]);

  const handleExportToPng = useCallback(() => {
    if (gridRef.current) {
      gridRef.current.exportToPng();
    }
  }, []);

  // Background handlers
  const handleBackgroundUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files || !event.target.files[0]) return;

      const file = event.target.files[0];
      const fileName = file.name;

      if (!scenarioId) {
        // Store the file for upload when saving the scenario
        setPendingBackgroundFile(file);
        const blobUrl = URL.createObjectURL(file);
        // Just update state - the effect watching backgroundState.imageUrl will load it
        setBackgroundState((prev) => ({
          ...prev,
          imageUrl: blobUrl,
          fileName,
        }));
        return;
      }

      setBackgroundState((prev) => ({ ...prev, isUploading: true }));

      try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(`${getApiUrl()}/scenarios/${scenarioId}/background`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          // Just update state - the effect watching backgroundState.imageUrl will load it
          setBackgroundState((prev) => ({
            ...prev,
            imageUrl: data.url,
            fileName,
            isUploading: false,
          }));
        } else {
          const errorData = await response.json().catch(() => ({}));
          // Server returns { error: { message: ... } } structure
          const errorMessage = errorData.error?.message || errorData.message || 'Unknown error';
          alert(`Failed to upload background: ${errorMessage}`);
          setBackgroundState((prev) => ({ ...prev, isUploading: false }));
        }
      } catch (error) {
        console.error('Error uploading background:', error);
        alert('An error occurred while uploading the background image.');
        setBackgroundState((prev) => ({ ...prev, isUploading: false }));
      }
    },
    [scenarioId, backgroundState]
  );

  const handleBackgroundOpacityChange = useCallback(
    (value: number) => {
      const opacity = value / 100;
      setBackgroundState((prev) => ({ ...prev, opacity }));
      if (gridRef.current) {
        gridRef.current.setBackgroundTransform(
          opacity,
          backgroundState.offsetX,
          backgroundState.offsetY,
          backgroundState.scale
        );
      }
    },
    [backgroundState]
  );

  // Callback when background is dragged or zoomed via gestures
  const handleBackgroundTransformChange = useCallback(
    (offsetX: number, offsetY: number, scale: number) => {
      setBackgroundState((prev) => ({ ...prev, offsetX, offsetY, scale }));
    },
    []
  );

  const handleRemoveBackground = useCallback(async () => {
    if (scenarioId) {
      try {
        await fetch(`${getApiUrl()}/scenarios/${scenarioId}/background`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Error removing background from server:', error);
      }
    }

    setBackgroundState({
      imageUrl: null,
      opacity: 1,
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      isUploading: false,
      fileName: null,
    });

    if (gridRef.current) {
      gridRef.current.removeBackgroundImage();
    }
  }, [scenarioId]);

  // Store sidebarWidth in a ref so we can access it without causing re-initialization
  const sidebarWidthRef = useRef(sidebarWidth);
  sidebarWidthRef.current = sidebarWidth;

  // Initialize HexGrid (only once)
  useEffect(() => {
    if (pixiContainerRef.current) {
      const grid = new HexGrid(pixiContainerRef.current, {
        width: window.innerWidth - sidebarWidthRef.current,
        height: window.innerHeight,
        onHexClick: handleHexClick,
        onBackgroundTransformChange: handleBackgroundTransformChange,
      });
      grid.init().then(() => {
        grid.drawPlaceholderGrid(50, 50);
        gridRef.current = grid;
      });
    }

    return () => {
      gridRef.current?.destroy();
    };
  }, [handleHexClick, handleBackgroundTransformChange]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (gridRef.current) {
        gridRef.current.resize(window.innerWidth - sidebarWidthRef.current, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle sidebar collapse/expand
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.resize(window.innerWidth - sidebarWidth, window.innerHeight);
    }
  }, [sidebarWidth]);

  const prevActiveHexes = usePrevious(scenarioState.activeHexes);

  // Update hex grid when tiles change
  useEffect(() => {
    const grid = gridRef.current;
    if (grid && prevActiveHexes) {
      const currentKeys = new Set(scenarioState.activeHexes.keys());
      const prevKeys = new Set(prevActiveHexes.keys());

      for (const key of currentKeys) {
        if (
          !prevKeys.has(key) ||
          scenarioState.activeHexes.get(key) !== prevActiveHexes.get(key)
        ) {
          grid.addOrUpdateTile(scenarioState.activeHexes.get(key)!);
        }
      }

      for (const key of prevKeys) {
        if (!currentKeys.has(key)) {
          const [q, r] = key.split(',').map(Number);
          grid.removeTile({ q, r });
        }
      }
    } else if (grid) {
      grid.initializeBoard({
        tiles: Array.from(scenarioState.activeHexes.values()),
        characters: [],
        monsters: [],
      });
    }
  }, [scenarioState.activeHexes, prevActiveHexes]);

  // Update monsters on the grid when monsterGroups change
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    // Clear existing monsters
    grid.clearMonsters();

    // Convert monster groups to Monster objects for display
    scenarioState.monsterGroups.forEach((group, groupIndex) => {
      group.spawnPoints.forEach((spawnPoint, spawnIndex) => {
        const monster: Monster = {
          id: `designer-${group.type}-${group.isElite ? 'elite' : 'normal'}-${groupIndex}-${spawnIndex}`,
          roomId: 'designer',
          monsterType: group.type,
          isElite: group.isElite,
          health: 10, // Placeholder for display
          maxHealth: 10,
          movement: 2,
          attack: 2,
          range: 1,
          currentHex: spawnPoint,
          specialAbilities: [],
          conditions: [],
          isDead: false,
        };
        grid.addMonster(monster);
      });
    });
  }, [scenarioState.monsterGroups]);

  // Fetch monster types
  useEffect(() => {
    fetch(`${getApiUrl()}/monsters`)
      .then((res) => res.json())
      .then((data) => {
        setMonsterTypes(data.monsterTypes);
      });
  }, []);

  // Load a scenario by ID
  const handleLoadScenario = useCallback(async (loadScenarioId: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/scenarios/${loadScenarioId}`);
      if (!response.ok) {
        throw new Error('Failed to load scenario');
      }
      const data = await response.json();
      const scenario = data.scenario;

      // Update scenario state
      const activeHexes = new Map<string, HexTile>();
      if (scenario.mapLayout) {
        scenario.mapLayout.forEach((tile: HexTile) => {
          const key = `${tile.coordinates.q},${tile.coordinates.r}`;
          activeHexes.set(key, tile);
        });
      }

      setScenarioState({
        name: scenario.name || '',
        difficulty: scenario.difficulty || 1,
        objective: scenario.objectivePrimary || '',
        activeHexes,
        playerStartPositions: scenario.playerStartPositions || { 1: [], 2: [], 3: [], 4: [] },
        monsterGroups: scenario.monsterGroups || [],
      });

      // Update background state
      setBackgroundState({
        imageUrl: scenario.backgroundImageUrl || null,
        opacity: scenario.backgroundOpacity ?? 1,
        offsetX: scenario.backgroundOffsetX ?? 0,
        offsetY: scenario.backgroundOffsetY ?? 0,
        scale: scenario.backgroundScale ?? 1,
        isUploading: false,
        fileName: null,
      });

      setScenarioId(loadScenarioId);
      setSelectedHex(null);
      setPendingBackgroundFile(null);

      // Update the hex grid (background will be loaded via useEffect watching backgroundState)
      if (gridRef.current) {
        gridRef.current.clearBoard();
        gridRef.current.initializeBoard({
          tiles: Array.from(activeHexes.values()),
          characters: [],
          monsters: [],
        });
      }
    } catch (error) {
      console.error('Error loading scenario:', error);
      alert('Failed to load scenario.');
    }
  }, []);

  // Duplicate the current scenario
  const handleDuplicateScenario = useCallback(async () => {
    if (!scenarioId) {
      alert('Please save the scenario first before duplicating.');
      return;
    }

    // Create a copy with a new name
    const newName = `${scenarioState.name} (Copy)`;
    setScenarioState((prev) => ({ ...prev, name: newName }));
    setScenarioId(null); // Clear the ID so next save creates a new scenario

    alert(`Scenario duplicated as "${newName}". Click Save to create the new copy.`);
  }, [scenarioId, scenarioState.name]);

  // Save state to localStorage
  useEffect(() => {
    const scenarioStateToSave = {
      ...scenarioState,
      activeHexes: Array.from(scenarioState.activeHexes.entries()),
    };
    localStorage.setItem('scenarioDesignerState', JSON.stringify(scenarioStateToSave));
  }, [scenarioState]);

  useEffect(() => {
    const bgToSave = {
      imageUrl: backgroundState.imageUrl,
      opacity: backgroundState.opacity,
      offsetX: backgroundState.offsetX,
      offsetY: backgroundState.offsetY,
      scale: backgroundState.scale,
      fileName: backgroundState.fileName,
    };
    localStorage.setItem('scenarioDesignerBackground', JSON.stringify(bgToSave));
  }, [backgroundState]);

  // Load background when URL changes
  const prevBackgroundUrl = usePrevious(backgroundState.imageUrl);
  useEffect(() => {
    const loadBackground = async () => {
      if (!gridRef.current) return;

      // If URL changed, load the new background
      if (backgroundState.imageUrl && backgroundState.imageUrl !== prevBackgroundUrl) {
        await gridRef.current.setBackgroundImage(
          backgroundState.imageUrl,
          backgroundState.opacity,
          backgroundState.offsetX,
          backgroundState.offsetY,
          backgroundState.scale
        );
        // Re-apply the current interactive state after loading
        gridRef.current.setBackgroundInteractive(backgroundEditMode);
      } else if (!backgroundState.imageUrl && prevBackgroundUrl) {
        // If URL was cleared, remove background
        gridRef.current.removeBackgroundImage();
      }
    };
    loadBackground();
  }, [backgroundState.imageUrl, prevBackgroundUrl, backgroundEditMode]);

  // Update opacity via transform when it changes (without reloading image)
  useEffect(() => {
    if (gridRef.current && backgroundState.imageUrl && !backgroundState.imageUrl.startsWith('blob:')) {
      gridRef.current.setBackgroundTransform(
        backgroundState.opacity,
        backgroundState.offsetX,
        backgroundState.offsetY,
        backgroundState.scale
      );
    }
  }, [backgroundState.opacity]);

  return (
    <div className={styles.container}>
      <Sidebar
        scenarioState={scenarioState}
        backgroundState={backgroundState}
        selectedHex={selectedHex}
        selectedPlayerCount={selectedPlayerCount}
        monsterTypes={monsterTypes}
        backgroundEditMode={backgroundEditMode}
        savedScenarios={savedScenarios}
        currentScenarioId={scenarioId}
        onScenarioChange={handleScenarioChange}
        onBackgroundUpload={handleBackgroundUpload}
        onBackgroundOpacityChange={handleBackgroundOpacityChange}
        onBackgroundEditModeChange={handleBackgroundEditModeChange}
        onRemoveBackground={handleRemoveBackground}
        onDeleteHex={handleDeleteHex}
        onTerrainChange={handleTerrainChange}
        onAddFeature={handleAddFeature}
        onRemoveFeature={handleRemoveFeature}
        onToggleDoor={handleToggleDoor}
        onToggleLoot={handleToggleLoot}
        onToggleTreasure={handleToggleTreasure}
        onAddMonster={handleAddMonster}
        onTogglePlayerStart={handleTogglePlayerStart}
        onToggleTrigger={handleToggleTrigger}
        onPlayerCountChange={setSelectedPlayerCount}
        onExportToPng={handleExportToPng}
        onSaveToServer={handleSaveToServer}
        onLoadScenario={handleLoadScenario}
        onDuplicateScenario={handleDuplicateScenario}
        onReset={handleReset}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div
        className={styles.canvasContainer}
        style={{ marginLeft: sidebarWidth, width: `calc(100vw - ${sidebarWidth}px)` }}
        data-testid="pixi-container"
        ref={pixiContainerRef}
      />
    </div>
  );
};

export default ScenarioDesigner;
