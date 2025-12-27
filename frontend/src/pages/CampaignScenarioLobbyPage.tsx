/**
 * Campaign Scenario Lobby Page Component (Issue #317)
 *
 * Pre-game lobby for campaign scenarios:
 * - Shows campaign context (gold, reputation, prosperity)
 * - Shows selected scenario details
 * - Shows selected characters
 * - Creates room with campaign context and navigates to room lobby
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { campaignService } from '../services/campaign.service';
import { roomSessionManager } from '../services/room-session.service';
import { websocketService } from '../services/websocket.service';
import { useRoomSession } from '../hooks/useRoomSession';
import { getDisplayName } from '../utils/storage';
import type { CampaignWithDetails, CampaignScenario } from '../services/campaign.service';
import styles from './CampaignScenarioLobbyPage.module.css';

export const CampaignScenarioLobbyPage: React.FC = () => {
  const { campaignId, scenarioId } = useParams<{ campaignId: string; scenarioId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'lobby']);
  const sessionState = useRoomSession();

  // State
  const [campaign, setCampaign] = useState<CampaignWithDetails | null>(null);
  const [scenario, setScenario] = useState<CampaignScenario | null>(null);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  // Track pending auto-start for campaign mode (skip room lobby)
  const pendingAutoStart = useRef<{ characterIds: string[]; scenarioId: string } | null>(null);

  // Fetch campaign and scenario data
  const fetchData = useCallback(async () => {
    if (!campaignId || !scenarioId) return;

    try {
      setLoading(true);
      const [campaignData, scenariosData] = await Promise.all([
        campaignService.getCampaignDetails(campaignId),
        campaignService.getAvailableScenarios(campaignId),
      ]);
      setCampaign(campaignData);

      // Find the selected scenario
      const selectedScenario = scenariosData.find(s => s.scenarioId === scenarioId);
      if (selectedScenario) {
        setScenario(selectedScenario);
      } else {
        setError('Scenario not found');
      }

      // Load selected characters from URL query params (passed by CampaignDashboardPage)
      const charactersParam = searchParams.get('characters');
      if (charactersParam) {
        const characterIds = charactersParam.split(',').filter(Boolean);
        setSelectedCharacterIds(characterIds);
      } else {
        // Default to all non-retired characters
        const activeChars = campaignData.characters.filter(c => !c.retired);
        const defaultIds = activeChars.map(c => c.id);
        setSelectedCharacterIds(defaultIds);

        // Update URL with default selection so refresh preserves it
        if (defaultIds.length > 0) {
          setSearchParams(
            { characters: defaultIds.join(',') },
            { replace: true }
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign data');
    } finally {
      setLoading(false);
    }
  }, [campaignId, scenarioId, searchParams, setSearchParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-start game when room is connected (skip room lobby for campaign mode)
  useEffect(() => {
    if (sessionState.connectionStatus === 'connected' && sessionState.roomCode && pendingAutoStart.current) {
      const { characterIds, scenarioId: autoStartScenarioId } = pendingAutoStart.current;
      pendingAutoStart.current = null; // Clear to prevent re-triggering

      // Auto-select each character
      characterIds.forEach((charId) => {
        websocketService.selectCharacter(charId, 'add');
      });

      // Select the scenario and start the game
      websocketService.selectScenario(autoStartScenarioId);

      // Small delay to ensure character selection is processed before starting
      setTimeout(() => {
        websocketService.startGame(autoStartScenarioId);
      }, 100);
    }
  }, [sessionState.connectionStatus, sessionState.roomCode]);

  // Navigate to game once it's actually started (game_started event received)
  useEffect(() => {
    if (sessionState.isGameActive && sessionState.roomCode && isCreatingRoom) {
      navigate(`/rooms/${sessionState.roomCode}/play`);
    }
  }, [sessionState.isGameActive, sessionState.roomCode, isCreatingRoom, navigate]);

  // Handle session errors - use microtask to avoid synchronous setState in effect
  useEffect(() => {
    if (sessionState.error) {
      queueMicrotask(() => {
        setError(sessionState.error?.message ?? 'Connection error');
        setIsCreatingRoom(false);
      });
    }
  }, [sessionState.error]);

  // Start game - create room with campaign context and auto-start (skip room lobby)
  const handleStartGame = async () => {
    if (!campaign || !scenario || selectedCharacterIds.length === 0) return;

    const displayName = getDisplayName();
    if (!displayName) {
      setError('Please set a nickname first');
      return;
    }

    setIsCreatingRoom(true);
    setError(null);

    // Set pending auto-start so we skip the room lobby
    pendingAutoStart.current = {
      characterIds: selectedCharacterIds,
      scenarioId: scenario.scenarioId,
    };

    try {
      await roomSessionManager.createRoom(displayName, {
        campaignId: campaign.id,
        scenarioId: scenario.scenarioId,
      });
      // Auto-start happens via useEffect when room is connected
    } catch (err) {
      pendingAutoStart.current = null; // Clear on error
      setError(err instanceof Error ? err.message : 'Failed to create room');
      setIsCreatingRoom(false);
    }
  };

  // Toggle character selection - also updates URL to preserve state on refresh
  const handleToggleCharacter = (characterId: string) => {
    setSelectedCharacterIds(prev => {
      const newSelection = prev.includes(characterId)
        ? prev.filter(id => id !== characterId)
        : [...prev, characterId];

      // Update URL params to persist selection across refresh
      const newParams = new URLSearchParams(searchParams);
      if (newSelection.length > 0) {
        newParams.set('characters', newSelection.join(','));
      } else {
        newParams.delete('characters');
      }
      setSearchParams(newParams, { replace: true });

      return newSelection;
    });
  };

  // Navigate back
  const handleBack = () => {
    navigate(`/campaigns/${campaignId}`);
  };

  if (loading) {
    return (
      <div className={styles.scenarioLobbyContainer}>
        <div className={styles.scenarioLobbyContent}>
          <div className={styles.loadingState}>
            <p>{t('common:loading', 'Loading...')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!campaign || !scenario) {
    return (
      <div className={styles.scenarioLobbyContainer}>
        <div className={styles.scenarioLobbyContent}>
          <div className={styles.errorState}>
            <h2>{t('lobby:notFound', 'Not Found')}</h2>
            <p>{error || 'Campaign or scenario not found'}</p>
            <button className={styles.backButton} onClick={() => navigate('/campaigns')}>
              {t('lobby:backToCampaigns', 'Back to Campaigns')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeCharacters = campaign.characters.filter(c => !c.retired);
  const canStartGame = selectedCharacterIds.length > 0;

  return (
    <div className={styles.scenarioLobbyContainer}>
      <div className={styles.scenarioLobbyContent}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.backButton} onClick={handleBack}>
            ← {t('lobby:backToCampaign', 'Back to Campaign')}
          </button>
          <h1 className={styles.title}>{scenario.name}</h1>
        </div>

        {/* Error Banner */}
        {error && (
          <div className={styles.errorBanner}>
            {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Campaign Context */}
        <div className={styles.campaignContext}>
          <h2 className={styles.sectionTitle}>{campaign.name}</h2>
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
              <span className={styles.statLabel}>Party Gold</span>
              <span className={styles.statValue}>
                {campaign.characters.reduce((sum, c) => sum + c.gold, 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Scenario Info */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('lobby:scenario', 'Scenario')}</h2>
          <div className={styles.scenarioInfo}>
            {scenario.description && (
              <p className={styles.scenarioDescription}>{scenario.description}</p>
            )}
            {scenario.unlocksScenarios && scenario.unlocksScenarios.length > 0 && (
              <p className={styles.unlockInfo}>
                Completing this scenario unlocks {scenario.unlocksScenarios.length} new scenario(s)
              </p>
            )}
          </div>
        </div>

        {/* Character Selection */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {t('lobby:selectCharacters', 'Select Characters')}
            <span className={styles.selectionCount}>
              {selectedCharacterIds.length} / {activeCharacters.length} selected
            </span>
          </h2>
          <div className={styles.charactersGrid}>
            {activeCharacters.map(character => (
              <div
                key={character.id}
                className={`${styles.characterCard} ${
                  selectedCharacterIds.includes(character.id) ? styles.selected : ''
                }`}
                onClick={() => handleToggleCharacter(character.id)}
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
              </div>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <div className={styles.actionSection}>
          <button
            className={styles.startButton}
            onClick={handleStartGame}
            disabled={!canStartGame || isCreatingRoom}
          >
            {isCreatingRoom
              ? t('lobby:creating', 'Creating...')
              : selectedCharacterIds.length === 0
                ? t('lobby:selectCharactersToStart', 'Select characters to start')
                : t('lobby:startScenario', 'Start Scenario')
            }
          </button>
        </div>
      </div>
    </div>
  );
};
