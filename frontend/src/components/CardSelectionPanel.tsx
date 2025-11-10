/**
 * CardSelectionPanel Component (US2 - T104)
 *
 * Displays a swipeable carousel of ability cards for selection.
 * Players select 2 cards (top/bottom) for the turn.
 * Mobile-optimized with touch gestures.
 */

import React, { useState, useRef } from 'react';
import type { AbilityCard as AbilityCardType } from '../../../shared/types/entities';
import { AbilityCard } from './AbilityCard';
import './CardSelectionPanel.css';

interface CardSelectionPanelProps {
  cards: AbilityCardType[];
  selectedTopCard: string | null;
  selectedBottomCard: string | null;
  onSelectTop: (cardId: string) => void;
  onSelectBottom: (cardId: string) => void;
  onConfirm: () => void;
  disabled?: boolean;
}

export const CardSelectionPanel: React.FC<CardSelectionPanelProps> = ({
  cards,
  selectedTopCard,
  selectedBottomCard,
  onSelectTop,
  onSelectBottom,
  onConfirm,
  disabled = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState<'top' | 'bottom' | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }

    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleCardClick = (cardId: string) => {
    if (disabled) return;

    // If no card selected yet, ask which half to use
    if (!selectionMode) {
      setSelectionMode('top');
      return;
    }

    if (selectionMode === 'top') {
      onSelectTop(cardId);
      setSelectionMode('bottom');
    } else {
      onSelectBottom(cardId);
      setSelectionMode(null);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const canConfirm = selectedTopCard !== null && selectedBottomCard !== null;

  return (
    <div className="card-selection-panel">
      {/* Selection Instructions */}
      <div className="selection-instructions">
        <h3>Select Your Cards</h3>
        <p>
          {!selectedTopCard && !selectedBottomCard
            ? 'Select 2 cards for this turn'
            : !selectedTopCard
              ? 'Select TOP action'
              : !selectedBottomCard
                ? 'Select BOTTOM action'
                : 'Cards selected! Click Confirm when ready.'}
        </p>
      </div>

      {/* Selection Summary */}
      {(selectedTopCard || selectedBottomCard) && (
        <div className="selection-summary">
          <div className="summary-item">
            <span className="summary-label">Top:</span>
            <span className="summary-value">
              {selectedTopCard
                ? cards.find((c) => c.id === selectedTopCard)?.name || 'Unknown'
                : 'Not selected'}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Bottom:</span>
            <span className="summary-value">
              {selectedBottomCard
                ? cards.find((c) => c.id === selectedBottomCard)?.name || 'Unknown'
                : 'Not selected'}
            </span>
          </div>
        </div>
      )}

      {/* Carousel Container */}
      <div className="carousel-container">
        <button
          className="carousel-nav prev"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          aria-label="Previous card"
        >
          ◀
        </button>

        <div
          className="carousel-track"
          ref={carouselRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {cards.map((card) => {
            const isSelectedTop = selectedTopCard === card.id;
            const isSelectedBottom = selectedBottomCard === card.id;
            const isSelected = isSelectedTop || isSelectedBottom;

            return (
              <div key={card.id} className="carousel-item">
                <AbilityCard
                  card={card}
                  isSelected={isSelected}
                  isTop={isSelectedTop ? true : isSelectedBottom ? false : undefined}
                  onClick={() => handleCardClick(card.id)}
                  disabled={disabled}
                />
              </div>
            );
          })}
        </div>

        <button
          className="carousel-nav next"
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
          aria-label="Next card"
        >
          ▶
        </button>
      </div>

      {/* Carousel Indicators */}
      <div className="carousel-indicators">
        {cards.map((card, idx) => (
          <button
            key={card.id}
            className={`indicator ${idx === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(idx)}
            aria-label={`Go to card ${idx + 1}`}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          className="btn-clear"
          onClick={() => {
            onSelectTop('');
            onSelectBottom('');
            setSelectionMode(null);
          }}
          disabled={!selectedTopCard && !selectedBottomCard}
        >
          Clear Selection
        </button>
        <button
          className="btn-confirm"
          onClick={onConfirm}
          disabled={!canConfirm || disabled}
        >
          Confirm Cards
        </button>
      </div>
    </div>
  );
};
