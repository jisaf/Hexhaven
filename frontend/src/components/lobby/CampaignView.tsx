/**
 * CampaignView Component (Issue #244, #342)
 *
 * Displays campaign details including:
 * - Campaign progress and stats
 * - Characters in campaign
 * - Campaign shop (Issue #326)
 * - Available scenarios
 * - Ability to start a game in the campaign
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { campaignService } from '../../services/campaign.service';
import { characterService } from '../../services/character.service';
import { CampaignShop } from '../shop';
import { CampaignInvitePanel } from '../CampaignInvitePanel';
import type {
  CampaignWithDetails,
  CampaignScenario,
  CampaignCharacter,
} from '../../services/campaign.service';
import type { CharacterResponse } from '../../types/character.types';
import styles from './CampaignView.module.css';

interface CampaignViewProps {
  campaignId: string;
  onBack: () => void;
  onStartGame: (scenarioId: string, campaignId: string, characterIds: string[]) => void;
}

export function CampaignView({ campaignId, onBack, onStartGame }: CampaignViewProps) {
  const { t } = useTranslation('lobby');
  const [campaign, setCampaign] = useState<CampaignWithDetails | null>(null);
  const [scenarios, setScenarios] = useState<CampaignScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);

  // Character management state
  const [showAddCharacter, setShowAddCharacter] = useState(false);
  const [availableCharacters, setAvailableCharacters] = useState<CharacterResponse[]>([]);
  const [loadingCharacters, setLoadingCharacters] = useState(false);
  const [addingCharacter, setAddingCharacter] = useState(false);

  // Tab state
  type CampaignTab = 'characters' | 'shop' | 'scenarios' | 'invites';
  const [activeTab, setActiveTab] = useState<CampaignTab>('characters');

  // Handle character gold update from shop transactions
  const handleCharacterGoldUpdate = useCallback((characterId: string, newGold: number) => {
    setCampaign((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        characters: prev.characters.map((char) =>
          char.id === characterId ? { ...char, gold: newGold } : char
        ),
      };
    });
  }, []);

  const fetchCampaignData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors on new request
      const [campaignData, scenariosData] = await Promise.all([
        campaignService.getCampaignDetails(campaignId),
        campaignService.getAvailableScenarios(campaignId),
      ]);
      setCampaign(campaignData);
      setScenarios(scenariosData);

      // Auto-select first available scenario
      const firstUnlocked = scenariosData.find((s) => s.isUnlocked && !s.isCompleted);
      if (firstUnlocked) {
        setSelectedScenario(firstUnlocked.scenarioId);
      }

      // Auto-select all non-retired characters
      const activeChars = campaignData.characters.filter((c) => !c.retired);
      setSelectedCharacters(activeChars.map((c) => c.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchCampaignData();
  }, [fetchCampaignData]);

  const handleToggleCharacter = (characterId: string) => {
    setSelectedCharacters((prev) =>
      prev.includes(characterId)
        ? prev.filter((id) => id !== characterId)
        : [...prev, characterId],
    );
  };

  // Fetch user's characters that are not in any campaign
  const fetchAvailableCharacters = async () => {
    try {
      setLoadingCharacters(true);
      setError(null); // Clear previous errors on new request
      const allCharacters = await characterService.listCharacters();
      // Filter out characters already in a campaign
      const available = allCharacters.filter((c) => !c.campaignId && !c.retired);
      setAvailableCharacters(available);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load characters');
    } finally {
      setLoadingCharacters(false);
    }
  };

  const handleShowAddCharacter = () => {
    setShowAddCharacter(true);
    fetchAvailableCharacters();
  };

  const handleAddCharacterToCampaign = async (characterId: string) => {
    try {
      setAddingCharacter(true);
      setError(null); // Clear previous errors on new request
      await campaignService.joinCampaign(campaignId, characterId);
      setShowAddCharacter(false);
      // Refresh campaign data
      await fetchCampaignData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add character');
    } finally {
      setAddingCharacter(false);
    }
  };

  const handleStartGame = () => {
    if (!selectedScenario || selectedCharacters.length === 0) return;
    onStartGame(selectedScenario, campaignId, selectedCharacters);
  };

  if (loading) {
    return (
      <div className={styles.campaignView}>
        <div className={styles.loading}>Loading campaign...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className={styles.campaignView}>
        <div className={styles.error}>Campaign not found</div>
        <button className={styles.backButton} onClick={onBack}>
          Back to Campaigns
        </button>
      </div>
    );
  }

  const activeCharacters = campaign.characters.filter((c) => !c.retired);
  const retiredCharacters = campaign.characters.filter((c) => c.retired);
  const canStartGame =
    selectedScenario !== null &&
    selectedCharacters.length > 0 &&
    !campaign.isCompleted;

  return (
    <div className={styles.campaignView}>
      <button className={styles.backButton} onClick={onBack}>
        &larr; {t('backToCampaigns', 'Back to Campaigns')}
      </button>

      {error && (
        <div className={styles.error} role="alert">
          {error}
          <button onClick={() => setError(null)} className={styles.dismissError}>
            Dismiss
          </button>
        </div>
      )}

      {/* Campaign Header */}
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <h1 className={styles.campaignName}>{campaign.name}</h1>
          {campaign.isCompleted && (
            <span className={styles.completedBadge}>
              {t('campaignCompleted', 'Completed')}
            </span>
          )}
        </div>
        {campaign.description && (
          <p className={styles.description}>{campaign.description}</p>
        )}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Prosperity</span>
            <span className={styles.statValue}>{campaign.prosperityLevel}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Reputation</span>
            <span className={styles.statValue}>{campaign.reputation}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Death Mode</span>
            <span className={styles.statValue}>
              {campaign.deathMode === 'healing' ? 'Healing' : 'Permadeath'}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Progress</span>
            <span className={styles.statValue}>
              {campaign.completedScenarios.length} scenarios completed
            </span>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      {!campaign.isCompleted && (
        <div className={styles.tabBar}>
          <button
            className={`${styles.tab} ${activeTab === 'characters' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('characters')}
          >
            Characters
            <span className={styles.tabBadge}>{activeCharacters.length}</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'shop' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('shop')}
            disabled={activeCharacters.length === 0}
          >
            Shop
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'scenarios' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('scenarios')}
          >
            Scenarios
            <span className={styles.tabBadge}>{scenarios.length}</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'invites' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('invites')}
          >
            Invites
          </button>
        </div>
      )}

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {/* Characters Tab */}
        {activeTab === 'characters' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                {t('characters', 'Characters')}
                <span className={styles.sectionCount}>
                  {activeCharacters.length} active
                  {retiredCharacters.length > 0 && `, ${retiredCharacters.length} retired`}
                </span>
              </h2>
              {!campaign.isCompleted && (
                <button
                  className={styles.addCharacterButton}
                  onClick={handleShowAddCharacter}
                >
                  + Add Character
                </button>
              )}
            </div>

            {/* Add Character Modal */}
            {showAddCharacter && (
              <div className={styles.addCharacterModal}>
                <div className={styles.modalHeader}>
                  <h3>Add Character to Campaign</h3>
                  <button
                    className={styles.closeButton}
                    onClick={() => setShowAddCharacter(false)}
                  >
                    ×
                  </button>
                </div>
                {loadingCharacters ? (
                  <p className={styles.loadingText}>Loading your characters...</p>
                ) : availableCharacters.length === 0 ? (
                  <p className={styles.noAvailableCharacters}>
                    No available characters. All your characters are either in campaigns or retired.
                    Create a new character first.
                  </p>
                ) : (
                  <div className={styles.availableCharactersList}>
                    {availableCharacters.map((char) => (
                      <div
                        key={char.id}
                        className={styles.availableCharacterCard}
                        onClick={() => !addingCharacter && handleAddCharacterToCampaign(char.id)}
                      >
                        <div className={styles.availableCharacterInfo}>
                          <span className={styles.availableCharacterName}>{char.name}</span>
                          <span className={styles.availableCharacterClass}>
                            {char.className} Lv.{char.level}
                          </span>
                        </div>
                        <button
                          className={styles.addButton}
                          disabled={addingCharacter}
                        >
                          {addingCharacter ? 'Adding...' : 'Add'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeCharacters.length === 0 ? (
              <p className={styles.noCharacters}>
                No characters in this campaign yet. Click "Add Character" to begin!
              </p>
            ) : (
              <div className={styles.charactersGrid}>
                {activeCharacters.map((character) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    selected={selectedCharacters.includes(character.id)}
                    onToggle={() => handleToggleCharacter(character.id)}
                    disabled={campaign.isCompleted}
                  />
                ))}
              </div>
            )}

            {retiredCharacters.length > 0 && (
              <div className={styles.retiredSection}>
                <h3 className={styles.retiredTitle}>Retired Characters</h3>
                <div className={styles.retiredList}>
                  {retiredCharacters.map((character) => (
                    <span key={character.id} className={styles.retiredCharacter}>
                      {character.name} ({character.className} Lv.{character.level})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shop Tab */}
        {activeTab === 'shop' && activeCharacters.length > 0 && (
          <CampaignShop
            campaignId={campaignId}
            characters={activeCharacters}
            onCharacterGoldUpdate={handleCharacterGoldUpdate}
          />
        )}

        {/* Scenarios Tab */}
        {activeTab === 'scenarios' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              {t('scenarios', 'Scenarios')}
            </h2>

            <div className={styles.scenariosList}>
              {scenarios.map((scenario) => (
                <div
                  key={scenario.scenarioId}
                  className={`${styles.scenarioCard} ${
                    scenario.isCompleted
                      ? styles.completed
                      : scenario.isUnlocked
                        ? styles.unlocked
                        : styles.locked
                  } ${selectedScenario === scenario.scenarioId ? styles.selected : ''}`}
                  onClick={() => {
                    if (scenario.isUnlocked && !scenario.isCompleted && !campaign.isCompleted) {
                      setSelectedScenario(scenario.scenarioId);
                    }
                  }}
                >
                  <div className={styles.scenarioHeader}>
                    <span className={styles.scenarioName}>{scenario.name}</span>
                    <span className={styles.scenarioStatus}>
                      {scenario.isCompleted
                        ? 'Completed'
                        : scenario.isUnlocked
                          ? 'Available'
                          : 'Locked'}
                    </span>
                  </div>
                  {scenario.description && (
                    <p className={styles.scenarioDescription}>{scenario.description}</p>
                  )}
                  {scenario.unlocksScenarios && scenario.unlocksScenarios.length > 0 && !scenario.isCompleted && (
                    <p className={styles.unlocks}>
                      Unlocks: {scenario.unlocksScenarios.length} scenario(s)
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Start Game Button */}
            <div className={styles.actions}>
              <button
                className={styles.startButton}
                onClick={handleStartGame}
                disabled={!canStartGame}
              >
                {selectedCharacters.length === 0
                  ? 'Select characters to play'
                  : !selectedScenario
                    ? 'Select a scenario'
                    : `Start Scenario with ${selectedCharacters.length} character(s)`}
              </button>
            </div>
          </div>
        )}

        {/* Invites Tab */}
        {activeTab === 'invites' && (
          <CampaignInvitePanel
            campaignId={campaignId}
            onSuccess={(message) => {
              // You can add toast notification here if desired
              console.log('Success:', message);
            }}
            onError={(message) => {
              setError(message);
            }}
          />
        )}
      </div>
    </div>
  );
}

// Character Card Sub-component
interface CharacterCardProps {
  character: CampaignCharacter;
  selected: boolean;
  onToggle: () => void;
  disabled: boolean;
}

function CharacterCard({ character, selected, onToggle, disabled }: CharacterCardProps) {
  return (
    <div
      className={`${styles.characterCard} ${selected ? styles.selected : ''} ${
        disabled ? styles.disabled : ''
      }`}
      onClick={() => !disabled && onToggle()}
    >
      <div className={styles.characterHeader}>
        <span className={styles.characterName}>{character.name}</span>
        <span className={styles.characterLevel}>Lv. {character.level}</span>
      </div>
      <div className={styles.characterClass}>{character.className}</div>
      <div className={styles.characterStats}>
        <span>XP: {character.experience}</span>
        <span>Gold: {character.gold}</span>
      </div>
      {!disabled && (
        <div className={styles.selectIndicator}>
          {selected ? 'Selected' : 'Click to select'}
        </div>
      )}
    </div>
  );
}
