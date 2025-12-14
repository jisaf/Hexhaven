/**
 * ClassCardRow Component (Updated for Issue #217)
 *
 * Displays a horizontal scrolling row of ability cards for a character class.
 * Now uses AbilityCard2 with 9-row grid layout.
 */

import React from 'react';
import type { AbilityCard as AbilityCardType } from '../../../shared/types/entities';
import { AbilityCard2 } from './AbilityCard2';
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
            <AbilityCard2
              card={card}
              variant="full"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
