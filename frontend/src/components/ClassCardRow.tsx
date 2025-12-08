/**
 * ClassCardRow Component
 *
 * Displays a horizontal scrolling row of ability cards for a character class.
 * Designed to be 25vh in portrait, 50vh in landscape naturally.
 */

import React from 'react';
import type { AbilityCard as AbilityCardType } from '../../../shared/types/entities';
import { AbilityCard } from './AbilityCard';
import './ClassCardRow.css';

interface ClassCardRowProps {
  className: string;
  cards: AbilityCardType[];
}

export const ClassCardRow: React.FC<ClassCardRowProps> = ({ className, cards }) => {
  return (
    <div className="class-card-row">
      <div className="class-card-row-header">
        <h2>{className}</h2>
        <span className="card-count">{cards.length} cards</span>
      </div>
      <div className="class-card-row-container">
        {cards.map((card) => (
          <div key={card.id} className="class-card-wrapper">
            <AbilityCard
              card={card}
              compact={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
