/**
 * UserCharacterSelect Component (002)
 *
 * Displays user's persistent characters for selection in lobby.
 * Replaces the temporary CharacterSelect component.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { characterService } from '../services/character.service';
import { authService } from '../services/auth.service';
import type { CharacterResponse } from '../types/character.types';

export interface UserCharacterSelectProps {
  selectedCharacterId?: string;
  disabledCharacterIds?: string[];
  onSelect: (characterId: string) => void;
}

export function UserCharacterSelect({
  selectedCharacterId,
  disabledCharacterIds = [],
  onSelect,
}: UserCharacterSelectProps) {
  const { t } = useTranslation();
  const [characters, setCharacters] = useState<CharacterResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCharacters();
  }, []);

  const loadCharacters = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        setError('Please login to select a character');
        return;
      }

      const userCharacters = await characterService.listCharacters();
      setCharacters(userCharacters);
    } catch (err) {
      console.error('Failed to load characters:', err);
      setError(err instanceof Error ? err.message : 'Failed to load characters');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (characterId: string, character: CharacterResponse) => {
    // Don't allow selecting characters in active games or disabled
    if (character.currentGameId || disabledCharacterIds.includes(characterId)) {
      return;
    }
    onSelect(characterId);
  };

  if (loading) {
    return (
      <div className="user-character-select">
        <h3 className="character-select-title">
          {t('lobby:selectCharacter', 'Select Your Character')}
        </h3>
        <div className="loading">Loading your characters...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-character-select">
        <h3 className="character-select-title">
          {t('lobby:selectCharacter', 'Select Your Character')}
        </h3>
        <div className="error-message">{error}</div>
        {!authService.isAuthenticated() && (
          <Link to="/login" className="login-link">
            Go to Login
          </Link>
        )}
      </div>
    );
  }

  if (characters.length === 0) {
    return (
      <div className="user-character-select">
        <h3 className="character-select-title">
          {t('lobby:selectCharacter', 'Select Your Character')}
        </h3>
        <div className="no-characters">
          <p>You don't have any characters yet.</p>
          <Link to="/characters/create" className="create-character-link">
            Create Your First Character
          </Link>
        </div>
        <style>{noCharactersStyles}</style>
      </div>
    );
  }

  return (
    <div className="user-character-select" data-testid="user-character-select">
      <h3 className="character-select-title">
        {t('lobby:selectCharacter', 'Select Your Character')}
      </h3>

      <div className="character-grid">
        {characters.map((character) => {
          const isSelected = selectedCharacterId === character.id;
          const isInGame = !!character.currentGameId;
          const isDisabled = disabledCharacterIds.includes(character.id) || isInGame;

          return (
            <button
              key={character.id}
              className={`character-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
              onClick={() => handleSelect(character.id, character)}
              disabled={isDisabled}
              data-testid={`character-card-${character.id}`}
            >
              <div className="character-header">
                <div className="character-name">{character.name}</div>
                <div className="character-class">{character.className}</div>
              </div>

              <div className="character-stats-row">
                <div className="stat-item">
                  <span className="stat-label">Level:</span>
                  <span className="stat-value">{character.level}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">❤️ HP:</span>
                  <span className="stat-value">{character.health}</span>
                </div>
              </div>

              <div className="character-stats-row">
                <div className="stat-item">
                  <span className="stat-label">⭐ XP:</span>
                  <span className="stat-value">{character.experience}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">💰 Gold:</span>
                  <span className="stat-value">{character.gold}</span>
                </div>
              </div>

              {isSelected && <div className="selected-indicator">✓</div>}
              {isInGame && (
                <div className="disabled-overlay">
                  <span>In Game</span>
                </div>
              )}
              {isDisabled && !isInGame && (
                <div className="disabled-overlay">
                  <span>Taken</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="character-actions">
        <Link to="/characters/create" className="create-new-link">
          + Create New Character
        </Link>
      </div>

      <style>{characterSelectStyles}</style>
    </div>
  );
}

const characterSelectStyles = `
  .user-character-select {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
  }

  .character-select-title {
    margin: 0 0 24px 0;
    font-size: 20px;
    font-weight: 600;
    color: #ffffff;
    text-align: center;
  }

  .loading,
  .error-message {
    text-align: center;
    padding: 40px 20px;
    color: #aaa;
    font-size: 16px;
  }

  .error-message {
    color: #ef4444;
  }

  .login-link {
    display: block;
    text-align: center;
    margin-top: 16px;
    color: #3b82f6;
    text-decoration: none;
    font-weight: 500;
  }

  .login-link:hover {
    text-decoration: underline;
  }

  .character-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .character-card {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 20px;
    background: #2c2c2c;
    border: 3px solid #444;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    min-height: 140px;
  }

  .character-card:hover:not(:disabled) {
    border-color: #3b82f6;
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  }

  .character-card.selected {
    border-color: #10b981;
    background: rgba(16, 185, 129, 0.1);
  }

  .character-card.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .character-header {
    margin-bottom: 12px;
  }

  .character-name {
    font-size: 18px;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 4px;
  }

  .character-class {
    font-size: 14px;
    color: #aaa;
  }

  .character-stats-row {
    display: flex;
    gap: 20px;
    margin-bottom: 8px;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
  }

  .stat-label {
    color: #999;
    font-weight: 500;
  }

  .stat-value {
    color: #ffffff;
    font-weight: 600;
  }

  .selected-indicator {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: #ffffff;
    background: #10b981;
    border-radius: 50%;
  }

  .disabled-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.8);
    border-radius: 12px;
  }

  .disabled-overlay span {
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
    background: #ef4444;
    border-radius: 8px;
  }

  .character-actions {
    text-align: center;
    margin-top: 16px;
  }

  .create-new-link {
    display: inline-block;
    padding: 12px 24px;
    color: #3b82f6;
    text-decoration: none;
    font-weight: 500;
    border: 2px solid #3b82f6;
    border-radius: 8px;
    transition: all 0.2s;
  }

  .create-new-link:hover {
    background: #3b82f6;
    color: #ffffff;
  }

  @media (max-width: 768px) {
    .character-grid {
      grid-template-columns: 1fr;
    }
  }
`;

const noCharactersStyles = `
  .no-characters {
    text-align: center;
    padding: 40px 20px;
  }

  .no-characters p {
    color: #aaa;
    font-size: 16px;
    margin-bottom: 20px;
  }

  .create-character-link {
    display: inline-block;
    padding: 12px 24px;
    background: #10b981;
    color: #ffffff;
    text-decoration: none;
    font-weight: 600;
    border-radius: 8px;
    transition: all 0.2s;
  }

  .create-character-link:hover {
    background: #059669;
    transform: translateY(-2px);
  }
`;
