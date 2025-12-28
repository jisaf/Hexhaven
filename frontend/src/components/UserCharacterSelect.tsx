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
  /** Optional callback that passes full character details */
  onSelectWithDetails?: (character: CharacterResponse) => void;
  /** Compact mode for inline display (smaller cards) */
  compact?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Character IDs to exclude from display */
  excludeCharacterIds?: string[];
}

export function UserCharacterSelect({
  selectedCharacterId,
  disabledCharacterIds = [],
  onSelect,
  onSelectWithDetails,
  compact = false,
  disabled = false,
  excludeCharacterIds = [],
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
    // Only check disabledCharacterIds and disabled flag
    // Backend validates if character is actually available (#372)
    // Removed currentGameId check - it's set in lobby before game starts
    if (disabledCharacterIds.includes(characterId) || disabled) {
      return;
    }
    onSelect(characterId);
    // Also call the detailed callback if provided
    if (onSelectWithDetails) {
      onSelectWithDetails(character);
    }
  };

  // Filter out excluded characters
  const displayCharacters = characters.filter(
    c => !excludeCharacterIds.includes(c.id)
  );

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

  if (displayCharacters.length === 0) {
    return (
      <div className="user-character-select">
        <h3 className="character-select-title">
          {t('lobby:selectCharacter', 'Select Your Character')}
        </h3>
        <div className="no-characters">
          <p>{characters.length === 0 ? "You don't have any characters yet." : 'No available characters.'}</p>
          <Link to="/characters/create" className="create-character-link">
            Create New Character
          </Link>
        </div>
        <style>{noCharactersStyles}</style>
      </div>
    );
  }

  return (
    <div className={`user-character-select ${compact ? 'compact' : ''}`} data-testid="user-character-select">
      {!compact && (
        <h3 className="character-select-title">
          {t('lobby:selectCharacter', 'Select Your Character')}
        </h3>
      )}

      <div className="character-grid">
        {displayCharacters.map((character) => {
          const isSelected = selectedCharacterId === character.id;
          const isDisabled = disabledCharacterIds.includes(character.id) || disabled;

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
                  <span className="stat-label">{compact ? 'Lv' : 'Level'}:</span>
                  <span className="stat-value">{character.level}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">❤️</span>
                  <span className="stat-value">{character.health}</span>
                </div>
              </div>

              {!compact && (
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
              )}

              {isSelected && <div className="selected-indicator">✓</div>}
              {isDisabled && (
                <div className="disabled-overlay">
                  <span>Unavailable</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {!compact && (
        <div className="character-actions">
          <Link to="/characters/create" className="create-new-link">
            + Create New Character
          </Link>
        </div>
      )}

      <style>{characterSelectStyles}</style>
      {compact && <style>{compactStyles}</style>}
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

const compactStyles = `
  .user-character-select.compact .character-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 8px;
  }

  .user-character-select.compact .character-card {
    padding: 12px;
    min-height: 80px;
  }

  .user-character-select.compact .character-header {
    margin-bottom: 8px;
  }

  .user-character-select.compact .character-name {
    font-size: 14px;
    margin-bottom: 2px;
  }

  .user-character-select.compact .character-class {
    font-size: 12px;
  }

  .user-character-select.compact .character-stats-row {
    gap: 12px;
    margin-bottom: 4px;
  }

  .user-character-select.compact .stat-item {
    font-size: 12px;
    gap: 2px;
  }

  .user-character-select.compact .selected-indicator {
    width: 24px;
    height: 24px;
    font-size: 14px;
    top: 8px;
    right: 8px;
  }
`;
