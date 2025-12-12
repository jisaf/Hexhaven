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
import { debounce } from '../utils/responsive';
// offlineQueueService removed - images are now uploaded immediately
import styles from './ScenarioDesigner.module.css';

// Save status for visual feedback
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Background state (Issue #191) - simplified, auto-fits to 20x20 world
interface BackgroundState {
  imageUrl: string | null;
  opacity: number;
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
  // Track if initial background has been loaded to handle initial load vs URL change
  const initialBackgroundLoadedRef = useRef(false);
  // Track if initial board has been rendered (for handling reload with localStorage state)
  const initialBoardRenderedRef = useRef(false);

  // Background state (Issue #191) - simplified, auto-fits to 20x20 world
  const [backgroundState, setBackgroundState] = useState<BackgroundState>(() => {
    const savedBg = localStorage.getItem('scenarioDesignerBackground');
    if (savedBg) {
      const parsed = JSON.parse(savedBg);
      return {
        imageUrl: parsed.imageUrl || null,
        opacity: parsed.opacity ?? 1,
        isUploading: false,
        fileName: parsed.fileName || null,
      };
    }
    return {
      imageUrl: null,
      opacity: 1,
      isUploading: false,
      fileName: null,
    };
  });
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [savedScenarios, setSavedScenarios] = useState<Array<{ id: string; name: string; difficulty: number }>>([]);
  // Note: pendingBackgroundFile state removed - images are now uploaded immediately
  const [transformSaveStatus, setTransformSaveStatus] = useState<SaveStatus>('idle');
  const [gridReady, setGridReady] = useState(false);

  // Debounced save for background opacity (Issue #191)
  const saveBackgroundOpacity = useRef(
    debounce(
      async (id: string, opacity: number) => {
        setTransformSaveStatus('saving');
        try {
          const response = await fetch(`${getApiUrl()}/scenarios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ backgroundOpacity: opacity }),
          });

          if (response.ok) {
            setTransformSaveStatus('saved');
            setTimeout(() => setTransformSaveStatus('idle'), 2000);
          } else {
            setTransformSaveStatus('error');
            setTimeout(() => setTransformSaveStatus('idle'), 3000);
          }
        } catch (error) {
          console.error('Failed to save background opacity:', error);
          setTransformSaveStatus('error');
          setTimeout(() => setTransformSaveStatus('idle'), 3000);
        }
      },
      500
    )
  ).current;

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
      isUploading: false,
      fileName: null,
    });
    setScenarioId(null);
    setSelectedHex(null);
    // Reset background and board loaded flags
    initialBackgroundLoadedRef.current = false;
    initialBoardRenderedRef.current = false;
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
      if (!response.ok) {
        console.error('Failed to fetch scenarios:', response.status);
        return;
      }
      const data = await response.json();
      if (data.scenarios && Array.isArray(data.scenarios)) {
        setSavedScenarios(
          data.scenarios.map((s: { id: string; name: string; difficulty: number }) => ({
            id: s.id,
            name: s.name,
            difficulty: s.difficulty,
          }))
        );
      } else {
        console.error('Invalid scenarios data:', data);
        setSavedScenarios([]);
      }
    } catch (error) {
      console.error('Error fetching scenarios:', error);
      setSavedScenarios([]);
    }
  }, []);

  useEffect(() => {
    fetchSavedScenarios();
  }, [fetchSavedScenarios]);

  const handleSaveToServer = useCallback(async () => {
    console.log('[handleSaveToServer] Starting save');
    console.log('[handleSaveToServer] backgroundState.imageUrl:', backgroundState.imageUrl);

    if (!scenarioState.name) {
      alert('Please enter a name for the scenario.');
      return;
    }

    // With immediate uploads, backgroundImageUrl is always a server URL (or null)
    // Warn if somehow we have a blob URL (should not happen with new architecture)
    if (backgroundState.imageUrl?.startsWith('blob:')) {
      console.warn('[handleSaveToServer] Blob URL detected - image may not persist. This is unexpected with immediate uploads.');
    }

    const scenarioData = {
      name: scenarioState.name,
      difficulty: scenarioState.difficulty,
      objectivePrimary: scenarioState.objective,
      mapLayout: Array.from(scenarioState.activeHexes.values()),
      monsterGroups: scenarioState.monsterGroups,
      playerStartPositions: scenarioState.playerStartPositions,
      backgroundImageUrl: backgroundState.imageUrl,
      backgroundOpacity: backgroundState.opacity,
    };

    try {
      const url = scenarioId ? `${getApiUrl()}/scenarios/${scenarioId}` : `${getApiUrl()}/scenarios`;
      const method = scenarioId ? 'PUT' : 'POST';
      console.log('[handleSaveToServer] Saving scenario, method:', method, 'url:', url);

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
        console.log('[handleSaveToServer] Scenario saved, id:', savedScenarioId, 'backgroundImageUrl:', scenarioData.backgroundImageUrl);

        if (savedScenarioId) {
          setScenarioId(savedScenarioId);
        }

        // Refresh the saved scenarios list
        fetchSavedScenarios();
        alert('Scenario saved successfully!');
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
  }, [scenarioState, backgroundState, scenarioId, fetchSavedScenarios]);

  const handleExportToPng = useCallback(() => {
    if (gridRef.current) {
      gridRef.current.exportToPng();
    }
  }, []);

  // Background handlers
  // Always upload immediately - no blob URLs, no pending files
  const handleBackgroundUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files || !event.target.files[0]) return;

      const file = event.target.files[0];
      const fileName = file.name;
      console.log('[handleBackgroundUpload] Called with file:', fileName, 'scenarioId:', scenarioId);

      setBackgroundState((prev) => ({ ...prev, isUploading: true }));

      try {
        const formData = new FormData();
        formData.append('image', file);

        // Use standalone endpoint if no scenarioId, otherwise use scenario-specific endpoint
        const uploadUrl = scenarioId
          ? `${getApiUrl()}/scenarios/${scenarioId}/background`
          : `${getApiUrl()}/scenarios/backgrounds`;

        console.log('[handleBackgroundUpload] Uploading to:', uploadUrl);

        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          console.log('[handleBackgroundUpload] Upload SUCCESS, url:', data.url);
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
          console.error('[handleBackgroundUpload] Upload FAILED:', errorMessage);
          alert(`Failed to upload background: ${errorMessage}`);
          setBackgroundState((prev) => ({ ...prev, isUploading: false }));
        }
      } catch (error) {
        console.error('Error uploading background:', error);

        // If offline, show local preview and warn user
        if (!navigator.onLine) {
          const blobUrl = URL.createObjectURL(file);
          setBackgroundState((prev) => ({
            ...prev,
            imageUrl: blobUrl,
            fileName,
            isUploading: false,
          }));
          alert('You are offline. Please upload the image again when you reconnect.');
          return;
        }

        alert('An error occurred while uploading the background image.');
        setBackgroundState((prev) => ({ ...prev, isUploading: false }));
      }
    },
    [scenarioId]
  );

  const handleBackgroundOpacityChange = useCallback(
    (value: number) => {
      const opacity = value / 100;
      setBackgroundState((prev) => ({ ...prev, opacity }));

      // Apply to grid
      if (gridRef.current) {
        gridRef.current.setBackgroundOpacity(opacity);
      }

      // Auto-save if editing an existing scenario
      if (scenarioId) {
        saveBackgroundOpacity(scenarioId, opacity);
      }
    },
    [scenarioId, saveBackgroundOpacity]
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

  // Store callbacks in refs to avoid re-initializing HexGrid when they change
  const handleHexClickRef = useRef(handleHexClick);
  handleHexClickRef.current = handleHexClick;

  // Initialize HexGrid (only once on mount)
  useEffect(() => {
    if (pixiContainerRef.current) {
      const grid = new HexGrid(pixiContainerRef.current, {
        width: window.innerWidth - sidebarWidthRef.current,
        height: window.innerHeight,
        onHexClick: (hex) => handleHexClickRef.current(hex),
      });
      grid.init().then(() => {
        grid.drawPlaceholderGrid();
        gridRef.current = grid;
        setGridReady(true);
        console.log('[ScenarioDesigner] HexGrid initialized and ready');
      });
    }

    return () => {
      gridRef.current?.destroy();
      gridRef.current = null;
      setGridReady(false);
    };
  }, []); // No dependencies - initialize only once on mount

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

  // Update hex grid when tiles change or grid becomes ready
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || !gridReady) return;

    // If this is the first time the grid is ready with existing data, do a full init
    // This handles page reload where localStorage has hex data but grid wasn't ready yet
    if (!initialBoardRenderedRef.current && scenarioState.activeHexes.size > 0) {
      console.log('[ScenarioDesigner] Initial board render with', scenarioState.activeHexes.size, 'hexes');
      grid.initializeBoard({
        tiles: Array.from(scenarioState.activeHexes.values()),
        characters: [],
        monsters: [],
      });
      initialBoardRenderedRef.current = true;
      return;
    }

    // Mark board as rendered even if there are no hexes
    initialBoardRenderedRef.current = true;

    // Incremental updates for subsequent changes
    if (prevActiveHexes) {
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
    }
  }, [scenarioState.activeHexes, prevActiveHexes, gridReady]);

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
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.monsterTypes && Array.isArray(data.monsterTypes)) {
          setMonsterTypes(data.monsterTypes);
        } else {
          console.error('Invalid monster types data:', data);
        }
      })
      .catch((error) => {
        console.error('Failed to fetch monster types:', error);
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

      // Update background state (simplified - auto-fits to world)
      setBackgroundState({
        imageUrl: scenario.backgroundImageUrl || null,
        opacity: scenario.backgroundOpacity ?? 1,
        isUploading: false,
        fileName: null,
      });

      setScenarioId(loadScenarioId);
      setSelectedHex(null);

      // Reset background loaded flag so the effect will reload it even if URL is same
      initialBackgroundLoadedRef.current = false;

      // Update the hex grid
      if (gridRef.current) {
        // Remove existing background before loading new scenario
        gridRef.current.removeBackgroundImage();
        gridRef.current.clearBoard();
        gridRef.current.initializeBoard({
          tiles: Array.from(activeHexes.values()),
          characters: [],
          monsters: [],
        });
        // Mark board as rendered so the effect won't re-initialize
        initialBoardRenderedRef.current = true;
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
      fileName: backgroundState.fileName,
    };
    localStorage.setItem('scenarioDesignerBackground', JSON.stringify(bgToSave));
  }, [backgroundState]);

  // Load background when URL changes or grid becomes ready
  const prevBackgroundUrl = usePrevious(backgroundState.imageUrl);

  useEffect(() => {
    const loadBackground = async () => {
      // Wait for grid to be ready
      if (!gridReady || !gridRef.current) {
        console.log('[ScenarioDesigner] Grid not ready, skipping background load');
        return;
      }

      // Load background if:
      // 1. URL changed (normal case)
      // 2. Grid just became ready and we have a URL but haven't loaded yet (initial load)
      const urlChanged = backgroundState.imageUrl !== prevBackgroundUrl;
      const needsInitialLoad = backgroundState.imageUrl && !initialBackgroundLoadedRef.current;

      if (backgroundState.imageUrl && (urlChanged || needsInitialLoad)) {
        console.log('[ScenarioDesigner] Loading background image (auto-fits to 20x20 world):', backgroundState.imageUrl);
        try {
          // Background auto-fits to 20x20 world bounds
          await gridRef.current.setBackgroundImage(
            backgroundState.imageUrl,
            backgroundState.opacity
          );
          initialBackgroundLoadedRef.current = true;
          console.log('[ScenarioDesigner] Background image loaded successfully');
        } catch (error) {
          console.error('[ScenarioDesigner] Failed to load background image:', error);
        }
      } else if (!backgroundState.imageUrl && prevBackgroundUrl) {
        // If URL was cleared, remove background
        gridRef.current.removeBackgroundImage();
        initialBackgroundLoadedRef.current = false;
      }
    };
    loadBackground();
  }, [backgroundState.imageUrl, prevBackgroundUrl, gridReady, backgroundState.opacity]);

  return (
    <div className={styles.container}>
      <Sidebar
        scenarioState={scenarioState}
        backgroundState={backgroundState}
        transformSaveStatus={transformSaveStatus}
        selectedHex={selectedHex}
        selectedPlayerCount={selectedPlayerCount}
        monsterTypes={monsterTypes}
        savedScenarios={savedScenarios}
        currentScenarioId={scenarioId}
        onScenarioChange={handleScenarioChange}
        onBackgroundUpload={handleBackgroundUpload}
        onBackgroundOpacityChange={handleBackgroundOpacityChange}
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
