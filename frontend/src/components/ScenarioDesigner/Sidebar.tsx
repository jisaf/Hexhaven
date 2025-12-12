/**
 * Sidebar Component for Scenario Designer
 *
 * A collapsible sidebar on the left side containing:
 * - Brand logo linking to home
 * - Scenario Settings (name, difficulty, objective)
 * - Background Image controls (upload, transform)
 * - Hex Editor (terrain, features, monsters, etc.)
 * - Action buttons (Export, Save)
 */

import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Sidebar.module.css';
import {
  type AxialCoordinates,
  type HexTile,
  TerrainType,
  HexFeatureType,
  TriggerType,
  type MonsterType,
} from '../../../../shared/types/entities';

// Background state (simplified - auto-fits to 20x20 world)
interface BackgroundState {
  imageUrl: string | null;
  opacity: number;
  isUploading: boolean;
  fileName: string | null;
}

// Save status for visual feedback
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface ScenarioState {
  name: string;
  difficulty: number;
  objective: string;
  activeHexes: Map<string, HexTile>;
  playerStartPositions: Record<number, AxialCoordinates[]>;
  monsterGroups: Array<{
    type: string;
    isElite: boolean;
    count: number;
    spawnPoints: AxialCoordinates[];
  }>;
}

interface SavedScenario {
  id: string;
  name: string;
  difficulty: number;
}

interface SidebarProps {
  scenarioState: ScenarioState;
  backgroundState: BackgroundState;
  transformSaveStatus?: SaveStatus;
  selectedHex: AxialCoordinates | null;
  selectedPlayerCount: number;
  monsterTypes: MonsterType[];
  savedScenarios: SavedScenario[];
  currentScenarioId: string | null;
  onScenarioChange: (updates: Partial<ScenarioState>) => void;
  onBackgroundUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBackgroundOpacityChange: (value: number) => void;
  onRemoveBackground: () => void;
  onDeleteHex: () => void;
  onTerrainChange: (terrain: TerrainType) => void;
  onAddFeature: (type: HexFeatureType) => void;
  onRemoveFeature: (index: number) => void;
  onToggleDoor: (index: number) => void;
  onToggleLoot: () => void;
  onToggleTreasure: () => void;
  onAddMonster: (monsterIdentifier: string) => void;
  onTogglePlayerStart: () => void;
  onToggleTrigger: () => void;
  onPlayerCountChange: (count: number) => void;
  onExportToPng: () => void;
  onSaveToServer: () => void;
  onLoadScenario: (scenarioId: string) => void;
  onDuplicateScenario: () => void;
  onReset: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  scenarioState,
  backgroundState,
  transformSaveStatus = 'idle',
  selectedHex,
  selectedPlayerCount,
  monsterTypes,
  savedScenarios,
  currentScenarioId,
  onScenarioChange,
  onBackgroundUpload,
  onBackgroundOpacityChange,
  onRemoveBackground,
  onDeleteHex,
  onTerrainChange,
  onAddFeature,
  onRemoveFeature,
  onToggleDoor,
  onToggleLoot,
  onToggleTreasure,
  onAddMonster,
  onTogglePlayerStart,
  onToggleTrigger,
  onPlayerCountChange,
  onExportToPng,
  onSaveToServer,
  onLoadScenario,
  onDuplicateScenario,
  onReset,
  onCollapsedChange,
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const selectedHexData = selectedHex
    ? scenarioState.activeHexes.get(`${selectedHex.q},${selectedHex.r}`)
    : null;

  const toggleCollapsed = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapsedChange?.(newCollapsed);
  };

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      {/* Toggle Tab */}
      <button
        className={styles.toggleTab}
        onClick={toggleCollapsed}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? '>' : '<'}
      </button>

      {/* Brand Header */}
      <div className={styles.brandHeader}>
        <h1
          className={styles.brand}
          onClick={() => navigate('/')}
          title="Go to Home"
        >
          {isCollapsed ? 'H' : 'Hexhaven'}
        </h1>
        {!isCollapsed && (
          <span className={styles.subtitle}>Scenario Designer</span>
        )}
      </div>

      {!isCollapsed && (
        <>
          {/* Action Buttons */}
          <div className={styles.header}>
            <div className={styles.headerActions}>
              <select
                className={styles.select}
                value={currentScenarioId || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    onLoadScenario(e.target.value);
                  }
                }}
                title="Load Scenario"
              >
                <option value="">Load...</option>
                {savedScenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.name} (Diff: {scenario.difficulty})
                  </option>
                ))}
              </select>
              <button
                className={styles.actionButton}
                onClick={onDuplicateScenario}
                disabled={!currentScenarioId}
                title="Duplicate current scenario"
              >
                Duplicate
              </button>
            </div>
            <div className={styles.headerActions} style={{ marginTop: '8px' }}>
              <button className={styles.actionButton} onClick={onExportToPng} title="Export as PNG">
                Export
              </button>
              <button className={styles.actionButtonPrimary} onClick={onSaveToServer} title="Save to Server">
                Save
              </button>
            </div>
          </div>

          <div className={styles.content}>
            {/* Scenario Settings Section */}
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Scenario Settings</h3>
              <div className={styles.field}>
                <label className={styles.label}>Name</label>
                <input
                  type="text"
                  className={styles.input}
                  value={scenarioState.name}
                  onChange={(e) => onScenarioChange({ name: e.target.value })}
                  placeholder="Enter scenario name"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Difficulty</label>
                <input
                  type="number"
                  className={styles.input}
                  min="1"
                  max="5"
                  value={scenarioState.difficulty}
                  onChange={(e) => onScenarioChange({ difficulty: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Objective</label>
                <input
                  type="text"
                  className={styles.input}
                  value={scenarioState.objective}
                  onChange={(e) => onScenarioChange({ objective: e.target.value })}
                  placeholder="Primary objective"
                />
              </div>
            </section>

            {/* Background Image Section */}
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Background Image</h3>
              <p className={styles.hint} style={{ marginBottom: '8px' }}>
                Image auto-fits to 12×14 hex world (~1024×1024px). Use 1:1 ratio for best alignment.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                onChange={onBackgroundUpload}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <div className={styles.fieldRow}>
                <button
                  className={styles.actionButton}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={backgroundState.isUploading}
                >
                  {backgroundState.isUploading ? 'Uploading...' : 'Choose Image'}
                </button>
                {backgroundState.imageUrl && (
                  <button className={styles.dangerButton} onClick={onRemoveBackground}>
                    Remove
                  </button>
                )}
              </div>
              {backgroundState.fileName && (
                <div className={styles.fileName}>{backgroundState.fileName}</div>
              )}

              {backgroundState.imageUrl && (
                <div className={styles.sliderGroup}>
                  <div className={styles.sliderField}>
                    <label className={styles.sliderLabel}>Opacity</label>
                    <input
                      type="range"
                      className={styles.slider}
                      min="0"
                      max="100"
                      value={backgroundState.opacity * 100}
                      onChange={(e) => onBackgroundOpacityChange(parseInt(e.target.value))}
                    />
                    <span className={styles.sliderValue}>{Math.round(backgroundState.opacity * 100)}%</span>
                  </div>
                  {/* Save status indicator for auto-saved opacity */}
                  {transformSaveStatus !== 'idle' && (
                    <div
                      className={`${styles.saveStatus} ${styles[transformSaveStatus]}`}
                    >
                      {transformSaveStatus === 'saving' && 'Saving...'}
                      {transformSaveStatus === 'saved' && 'Saved'}
                      {transformSaveStatus === 'error' && 'Save failed'}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Hex Editor Section */}
            {selectedHex && selectedHexData && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  Hex Editor ({selectedHex.q}, {selectedHex.r})
                </h3>

                <button className={styles.dangerButton} onClick={onDeleteHex} style={{ marginBottom: '12px' }}>
                  Delete Hex
                </button>

                {/* Terrain */}
                <div className={styles.field}>
                  <label className={styles.label}>Terrain</label>
                  <select
                    className={styles.select}
                    value={selectedHexData.terrain}
                    onChange={(e) => onTerrainChange(e.target.value as TerrainType)}
                  >
                    {Object.values(TerrainType).map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Features */}
                <div className={styles.field}>
                  <label className={styles.label}>Features</label>
                  {selectedHexData.features && selectedHexData.features.length > 0 && (
                    <ul className={styles.featureList}>
                      {selectedHexData.features.map((feature, index) => (
                        <li key={index} className={styles.featureItem}>
                          <span>{feature.type}</span>
                          <div className={styles.featureActions}>
                            {feature.type === HexFeatureType.DOOR && (
                              <label className={styles.checkboxLabel}>
                                <input
                                  type="checkbox"
                                  checked={feature.isOpen}
                                  onChange={() => onToggleDoor(index)}
                                />
                                Open
                              </label>
                            )}
                            <button
                              className={styles.smallButton}
                              onClick={() => onRemoveFeature(index)}
                            >
                              ×
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <select
                    className={styles.select}
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        onAddFeature(e.target.value as HexFeatureType);
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">+ Add Feature</option>
                    {Object.values(HexFeatureType).map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Loot & Treasure */}
                <div className={styles.field}>
                  <label className={styles.label}>Loot & Treasure</label>
                  <div className={styles.checkboxGroup}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={selectedHexData.hasLoot}
                        onChange={onToggleLoot}
                      />
                      Has Loot
                    </label>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={selectedHexData.hasTreasure}
                        onChange={onToggleTreasure}
                      />
                      Has Treasure
                    </label>
                  </div>
                </div>

                {/* Monsters */}
                <div className={styles.field}>
                  <label className={styles.label}>Monsters</label>
                  <select
                    className={styles.select}
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        onAddMonster(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">+ Add Monster</option>
                    {monsterTypes.map((monster, index) => (
                      <option key={index} value={`${monster.type}-${monster.isElite}`}>
                        {monster.type} ({monster.isElite ? 'Elite' : 'Normal'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Player Start & Triggers */}
                <div className={styles.field}>
                  <label className={styles.label}>Player Start Position</label>
                  <div className={styles.playerCountGroup}>
                    {[1, 2, 3, 4].map((count) => (
                      <label key={count} className={styles.radioLabel}>
                        <input
                          type="radio"
                          name="playerCount"
                          checked={selectedPlayerCount === count}
                          onChange={() => onPlayerCountChange(count)}
                        />
                        {count}P
                      </label>
                    ))}
                  </div>
                  <div className={styles.checkboxGroup}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={scenarioState.playerStartPositions[selectedPlayerCount]?.some(
                          (p) => p.q === selectedHex.q && p.r === selectedHex.r
                        )}
                        onChange={onTogglePlayerStart}
                      />
                      Start Position ({selectedPlayerCount}P)
                    </label>
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Triggers</label>
                  <div className={styles.checkboxGroup}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={selectedHexData.triggers?.some((t) => t.type === TriggerType.ON_ENTER)}
                        onChange={onToggleTrigger}
                      />
                      OnEnter Trigger
                    </label>
                  </div>
                </div>
              </section>
            )}

            {/* Instructions when no hex selected */}
            {!selectedHex && (
              <section className={styles.section}>
                <div className={styles.instructions}>
                  <p>Click on the grid to add a hex tile.</p>
                  <p>Click on an existing hex to edit it.</p>
                </div>
              </section>
            )}
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <button className={styles.resetButton} onClick={onReset}>
              Reset All
            </button>
          </div>
        </>
      )}
    </aside>
  );
};

export default Sidebar;
