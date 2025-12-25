/**
 * Create Game Page Component (Issue #311)
 *
 * Standalone game creation page with:
 * - Character selection (required before room creation)
 * - Nickname input (for anonymous users)
 * - Scenario selection
 * - Solo game option
 * - Creates room with characterIds and navigates to Room Lobby
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CharacterSelect, type CharacterClass } from '../components/CharacterSelect';
import { UserCharacterSelect } from '../components/UserCharacterSelect';
import type { CharacterResponse } from '../types/character.types';
import { ScenarioSelectionPanel } from '../components/ScenarioSelectionPanel';
import { roomSessionManager } from '../services/room-session.service';
import { useRoomSession } from '../hooks/useRoomSession';
import {
  getDisplayName,
  isUserAuthenticated,
  savePlayerNickname,
} from '../utils/storage';
import { MAX_CHARACTERS_PER_PLAYER } from '../../../shared/constants/game';
import styles from './CreateGamePage.module.css';

interface SelectedCharacter {
  id: string;
  classType: CharacterClass;
  name?: string;
  level?: number;
}

export const CreateGamePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'lobby']);
  const sessionState = useRoomSession();
  const isAuthenticated = isUserAuthenticated();

  // Form state
  const [nickname, setNickname] = useState(getDisplayName() || '');
  const [selectedCharacters, setSelectedCharacters] = useState<SelectedCharacter[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>('scenario-1');
  const [isSoloGame, setIsSoloGame] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);

  // Derive displayed error from form error or session error
  const error = formError || sessionState.error?.message || null;

  // Validation
  const isNicknameValid = isAuthenticated || (nickname.length >= 1 && nickname.length <= 50);
  const hasCharacters = selectedCharacters.length > 0;
  const isFormValid = isNicknameValid && hasCharacters;

  // Add character (anonymous - class selection)
  const handleAddCharacterClass = useCallback((characterClass: string) => {
    if (selectedCharacters.length >= MAX_CHARACTERS_PER_PLAYER) return;

    // Check if already selected
    if (selectedCharacters.some(c => c.classType === characterClass)) {
      return;
    }

    setSelectedCharacters(prev => [...prev, {
      id: characterClass, // For anonymous, use class as ID
      classType: characterClass as CharacterClass,
    }]);

    setShowCharacterSelect(false);
  }, [selectedCharacters]);

  // Add character (authenticated - persistent character with details)
  const handleAddCharacterWithDetails = useCallback((character: CharacterResponse) => {
    if (selectedCharacters.length >= MAX_CHARACTERS_PER_PLAYER) return;

    // Check if already selected
    if (selectedCharacters.some(c => c.id === character.id)) {
      return;
    }

    setSelectedCharacters(prev => [...prev, {
      id: character.id,
      classType: character.className as CharacterClass,
      name: character.name,
      level: character.level,
    }]);

    setShowCharacterSelect(false);
  }, [selectedCharacters]);

  // Remove character
  const handleRemoveCharacter = useCallback((index: number) => {
    setSelectedCharacters(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Create room
  const handleCreateRoom = async () => {
    if (!isFormValid) return;

    setIsLoading(true);
    setFormError(null);

    try {
      // Save nickname for anonymous users
      if (!isAuthenticated) {
        savePlayerNickname(nickname);
      }

      // Create room with scenario and solo game option
      // Note: characterIds will be sent via WebSocket after joining
      await roomSessionManager.createRoom(nickname, {
        scenarioId: selectedScenario,
        isSoloGame,
      });

      // Room created - navigation will happen via session state change
    } catch (err) {
      console.error('Failed to create room:', err);
      setFormError(err instanceof Error ? err.message : 'Failed to create room');
      setIsLoading(false);
    }
  };

  // Navigate to room lobby (or game for solo) when room is created
  useEffect(() => {
    if (sessionState.connectionStatus === 'connected' && sessionState.roomCode) {
      // Room created - navigate based on solo game or multiplayer
      if (sessionState.isGameActive) {
        // Solo game started - go directly to play
        navigate(`/rooms/${sessionState.roomCode}/play`);
      } else {
        // Multiplayer - go to room lobby
        navigate(`/rooms/${sessionState.roomCode}`);
      }
    }
  }, [sessionState.connectionStatus, sessionState.roomCode, sessionState.isGameActive, navigate]);

  // Reset loading when session error occurs (error is derived above)
  useEffect(() => {
    if (sessionState.error && isLoading) {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only reset loading on error, not on isLoading change
  }, [sessionState.error]);

  return (
    <div className={styles.createGameContainer}>
      <div className={styles.createGameContent}>
        {/* Header */}
        <div className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => navigate(-1)}
            aria-label={t('common:back', 'Back')}
          >
            ← {t('common:back', 'Back')}
          </button>
          <h1 className={styles.title}>{t('lobby:createGame', 'Create Game')}</h1>
        </div>

        {/* Error Banner */}
        {error && (
          <div className={styles.errorBanner}>
            {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Form */}
        <div className={styles.formSections}>
          {/* Nickname Section (for anonymous users) */}
          {!isAuthenticated && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('lobby:yourNickname', 'Your Nickname')}</h2>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value.slice(0, 50))}
                placeholder={t('lobby:enterNickname', 'Enter your nickname')}
                className={styles.nicknameInput}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Character Selection Section */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              {t('lobby:selectCharacters', 'Select Characters')}
              <span className={styles.required}>*</span>
            </h2>
            <p className={styles.sectionDescription}>
              {t('lobby:selectCharactersDesc', 'Choose at least one character to play with.')}
            </p>

            {/* Selected Characters */}
            <div className={styles.selectedCharacters}>
              {selectedCharacters.map((char, index) => (
                <div key={char.id} className={styles.characterChip}>
                  <span className={styles.characterName}>
                    {char.name ? `${char.name} (${char.classType})` : char.classType}
                  </span>
                  <button
                    className={styles.removeCharacterBtn}
                    onClick={() => handleRemoveCharacter(index)}
                    disabled={isLoading}
                  >
                    ✕
                  </button>
                </div>
              ))}

              {selectedCharacters.length < MAX_CHARACTERS_PER_PLAYER && (
                <button
                  className={styles.addCharacterBtn}
                  onClick={() => setShowCharacterSelect(true)}
                  disabled={isLoading}
                >
                  + {t('lobby:addCharacter', 'Add Character')}
                </button>
              )}
            </div>

            {/* Character Selection Panel */}
            {showCharacterSelect && (
              <div className={styles.characterSelectPanel}>
                {isAuthenticated ? (
                  <UserCharacterSelect
                    onSelect={() => {}} // No-op since we use onSelectWithDetails
                    onSelectWithDetails={handleAddCharacterWithDetails}
                    disabled={isLoading}
                    excludeCharacterIds={selectedCharacters.map(c => c.id)}
                  />
                ) : (
                  <CharacterSelect
                    onSelect={handleAddCharacterClass}
                    disabledClasses={selectedCharacters.map(c => c.classType)}
                  />
                )}
                <button
                  className={styles.cancelSelectBtn}
                  onClick={() => setShowCharacterSelect(false)}
                >
                  {t('common:cancel', 'Cancel')}
                </button>
              </div>
            )}
          </div>

          {/* Scenario Selection Section */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('lobby:selectScenario', 'Select Scenario')}</h2>
            <ScenarioSelectionPanel
              selectedScenarioId={selectedScenario}
              onSelectScenario={setSelectedScenario}
            />
          </div>

          {/* Solo Game Option */}
          <div className={styles.section}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isSoloGame}
                onChange={(e) => setIsSoloGame(e.target.checked)}
                disabled={isLoading}
              />
              <span>{t('lobby:soloGame', 'Solo Game (start immediately)')}</span>
            </label>
          </div>
        </div>

        {/* Create Button */}
        <div className={styles.actionSection}>
          <button
            className={styles.createButton}
            onClick={handleCreateRoom}
            disabled={!isFormValid || isLoading}
          >
            {isLoading
              ? t('lobby:creating', 'Creating...')
              : isSoloGame
                ? t('lobby:startSoloGame', 'Start Solo Game')
                : t('lobby:createRoom', 'Create Room')
            }
          </button>
        </div>
      </div>
    </div>
  );
};
