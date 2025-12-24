/**
 * CharacterDetail Page
 * Displays detailed character information with tabs for Overview, Inventory, and Cards.
 * Allows inventory management when character is not in an active game.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { characterService } from '../services/character.service';
import { useInventory } from '../hooks/useInventory';
import { Tabs } from '../components/Tabs';
import { InventoryTabContent } from '../components/inventory/InventoryTabContent';
import type { CharacterDetailResponse } from '../types/character.types';
import './CharacterDetail.css';

/**
 * Overview Tab Content - displays character stats
 */
function OverviewTab({ character }: { character: CharacterDetailResponse | null }) {
  if (!character) return null;

  return (
    <div className="overview-tab">
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Level</span>
          <span className="stat-value">{character.level}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Health</span>
          <span className="stat-value">{character.health}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Experience</span>
          <span className="stat-value">{character.experience}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Gold</span>
          <span className="stat-value gold">{character.gold}</span>
        </div>
      </div>

      {/* Class Info */}
      <section className="detail-section">
        <h3>Class Details</h3>
        <div className="class-info">
          <p className="class-description">{character.class.description}</p>
          <div className="class-stats">
            <span>Hand Size: {character.class.handSize}</span>
            <span>Starting Health: {character.class.startingHealth}</span>
          </div>
        </div>
      </section>

      {/* Perks */}
      {character.perks.length > 0 && (
        <section className="detail-section">
          <h3>Perks ({character.perks.length})</h3>
          <div className="perks-list">
            {character.perks.map((perk, index) => (
              <span key={index} className="perk-badge">{perk}</span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Cards Tab Content - displays ability cards (placeholder for now)
 */
function CardsTab({ character }: { character: CharacterDetailResponse | null }) {
  if (!character) return null;

  const abilityCards = character.abilityCards || [];

  return (
    <div className="cards-tab">
      <p className="cards-info">
        {abilityCards.length > 0
          ? `${abilityCards.length} ability cards available`
          : 'Ability card management coming soon'}
      </p>
      {abilityCards.length > 0 && (
        <div className="cards-grid">
          {abilityCards.map((card) => (
            <div key={card.id} className="ability-card-preview">
              <span className="card-name">{card.name}</span>
              <span className="card-initiative">Init: {card.initiative}</span>
              <span className="card-level">
                Level {card.level === 'X' ? 'X' : card.level}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CharacterDetail() {
  const { characterId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromLobby = searchParams.get('from') === 'lobby';

  const [character, setCharacter] = useState<CharacterDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use inventory hook for inventory management
  const {
    ownedItems,
    equippedItems,
    itemStates,
    loading: inventoryLoading,
    error: inventoryError,
    equipItem,
    unequipItem,
  } = useInventory({ characterId: characterId || null });

  // Check if character is in active game (equipment locked)
  const isInGame = !!character?.currentGameId;

  const loadCharacter = useCallback(async () => {
    if (!characterId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await characterService.getCharacter(characterId);
      setCharacter(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load character');
    } finally {
      setLoading(false);
    }
  }, [characterId]);

  const handleBack = () => {
    if (fromLobby) {
      // Use browser history to go back to wherever they came from
      // This preserves campaign/room context
      navigate(-1);
    } else {
      navigate('/characters');
    }
  };

  // Fetch character details on mount
  useEffect(() => {
    loadCharacter();
  }, [loadCharacter]);

  // Define tabs with loading indicators where applicable
  const tabs = [
    {
      label: 'Overview',
      content: <OverviewTab character={character} />,
    },
    {
      label: inventoryLoading ? 'Inventory...' : 'Inventory',
      content: (
        <InventoryTabContent
          ownedItems={ownedItems}
          equippedItems={equippedItems}
          itemStates={itemStates}
          characterLevel={character?.level || 1}
          onEquipItem={isInGame ? undefined : equipItem}
          onUnequipItem={isInGame ? undefined : unequipItem}
          disabled={isInGame}
          loading={inventoryLoading}
          error={inventoryError || undefined}
        />
      ),
    },
    {
      label: 'Cards',
      content: <CardsTab character={character} />,
    },
  ];

  if (loading) {
    return (
      <div className="character-detail-page">
        <div className="loading">Loading character...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="character-detail-page">
        <div className="error-container">
          <div className="error-message">{error}</div>
          <button className="back-button" onClick={handleBack}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="character-detail-page">
        <div className="error-container">
          <div className="error-message">Character not found</div>
          <button className="back-button" onClick={handleBack}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="character-detail-page">
      {/* Header */}
      <div className="character-detail-header">
        <button className="back-button" onClick={handleBack}>
          ← {fromLobby ? 'Back to Lobby' : 'Back to Characters'}
        </button>
        <div className="character-title">
          <h1>{character.name}</h1>
          <span className="character-class-badge">{character.className}</span>
        </div>
      </div>

      {/* In-Game Warning */}
      {isInGame && (
        <div className="in-game-warning">
          <span className="warning-icon">⚠</span>
          Equipment is locked while character is in an active game
        </div>
      )}

      {/* Tabs */}
      <Tabs tabs={tabs} defaultTab={0} />
    </div>
  );
}

export default CharacterDetail;
