/**
 * CardDemo Page
 *
 * Displays all ability cards organized by character class.
 * Each class gets its own horizontally scrolling row.
 * Page scrolls vertically to see all classes.
 */

import React, { useState, useEffect } from 'react';
import { ClassCardRow } from '../components/ClassCardRow';
import { getApiUrl } from '../config/api';
import type { AbilityCard } from '../../../shared/types/entities';
import './CardDemo.css';

interface CardsByClass {
  [className: string]: AbilityCard[];
}

export const CardDemo: React.FC = () => {
  const [cardsByClass, setCardsByClass] = useState<CardsByClass>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/ability-cards`);

        if (!response.ok) {
          throw new Error(`Failed to fetch cards: ${response.statusText}`);
        }

        const data = await response.json();
        setCardsByClass(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching ability cards:', err);
        setError(err instanceof Error ? err.message : 'Failed to load cards');
        setLoading(false);
      }
    };

    fetchCards();
  }, []);

  if (loading) {
    return (
      <div className="card-demo-page">
        <div className="card-demo-loading">
          <h1>Loading Ability Cards...</h1>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-demo-page">
        <div className="card-demo-error">
          <h1>Error Loading Cards</h1>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  const classes = Object.keys(cardsByClass).sort();

  return (
    <div className="card-demo-page">
      <header className="card-demo-header">
        <h1>Ability Card Gallery</h1>
        <p>Explore all ability cards for each character class</p>
      </header>

      <div className="card-demo-content">
        {classes.length === 0 ? (
          <div className="no-cards">
            <p>No ability cards found in the database.</p>
          </div>
        ) : (
          classes.map((className) => (
            <ClassCardRow
              key={className}
              className={className}
              cards={cardsByClass[className]}
            />
          ))
        )}
      </div>

      <footer className="card-demo-footer">
        <p>Total Classes: {classes.length}</p>
        <p>Total Cards: {Object.values(cardsByClass).flat().length}</p>
      </footer>
    </div>
  );
};
