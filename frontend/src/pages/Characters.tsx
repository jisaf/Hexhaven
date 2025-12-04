/**
 * Characters Page (002)
 * Displays user's character list with navigation to create/view characters
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { characterService } from '../services/character.service';
import type { CharacterResponse } from '../types/character.types';
import './Characters.css';

export function Characters() {
  const navigate = useNavigate();
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
      const data = await characterService.listCharacters();
      setCharacters(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load characters');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCharacter = () => {
    navigate('/characters/new');
  };

  const handleViewCharacter = (characterId: string) => {
    navigate(`/characters/${characterId}`);
  };

  const handleDeleteCharacter = async (characterId: string, characterName: string) => {
    if (!confirm(`Are you sure you want to retire ${characterName}?`)) {
      return;
    }

    try {
      await characterService.deleteCharacter(characterId);
      await loadCharacters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete character');
    }
  };

  if (loading) {
    return (
      <div className="characters-page">
        <div className="loading">Loading characters...</div>
      </div>
    );
  }

  return (
    <div className="characters-page">
      <div className="characters-header">
        <h1>My Characters</h1>
        <button className="create-button" onClick={handleCreateCharacter}>
          Create New Character
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {characters.length === 0 ? (
        <div className="empty-state">
          <p>You don't have any characters yet.</p>
          <button className="create-button-large" onClick={handleCreateCharacter}>
            Create Your First Character
          </button>
        </div>
      ) : (
        <div className="characters-grid">
          {characters.map((character) => (
            <div key={character.id} className="character-card">
              <div className="character-card-header">
                <h3>{character.name}</h3>
                <span className="character-class">{character.className}</span>
              </div>

              <div className="character-stats">
                <div className="stat">
                  <span className="stat-label">Level</span>
                  <span className="stat-value">{character.level}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Health</span>
                  <span className="stat-value">{character.health}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Gold</span>
                  <span className="stat-value">{character.gold}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">XP</span>
                  <span className="stat-value">{character.experience}</span>
                </div>
              </div>

              {character.currentGameId && (
                <div className="active-game-badge">
                  In Active Game
                </div>
              )}

              <div className="character-actions">
                <button
                  className="view-button"
                  onClick={() => handleViewCharacter(character.id)}
                >
                  View Details
                </button>
                <button
                  className="delete-button"
                  onClick={() => handleDeleteCharacter(character.id, character.name)}
                  disabled={!!character.currentGameId}
                  title={character.currentGameId ? 'Cannot delete character in active game' : ''}
                >
                  Retire
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
