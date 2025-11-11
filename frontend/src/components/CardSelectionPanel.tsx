/**
 * CardSelectionPanel Component (US2 - T104)
 *
 * Displays a swipeable carousel of ability cards for selection.
 * Players select 2 cards (top/bottom) for the turn.
 * Mobile-optimized with touch gestures.
 */

import React, { useState, useRef, useEffect } from 'react';
import type { AbilityCard as AbilityCardType } from '../../../shared/types/entities';
import { AbilityCard } from './AbilityCard';
import { GestureHandler, type SwipeEvent } from '../utils/gestures';
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
  const [selectionMode, setSelectionMode] = useState<'top' | 'bottom' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const gestureHandlerRef = useRef<GestureHandler | null>(null);

  // Initialize gesture handler
  useEffect(() => {
    if (!carouselRef.current) return;

    const handler = new GestureHandler(carouselRef.current, {
      swipeVelocityThreshold: 0.3,
      swipeDistanceThreshold: 50,
      enablePan: false, // Disable pan to avoid conflicts
      enablePinch: false,
    });

    // Handle swipe gestures for card navigation
    handler.onSwipe((event: SwipeEvent) => {
      if (isAnimating) return;

      const isLeftSwipe = event.direction === 'left';
      const isRightSwipe = event.direction === 'right';

      setIsAnimating(true);

      if (isLeftSwipe && currentIndex < cards.length - 1) {
        setCurrentIndex((prev) => Math.min(prev + 1, cards.length - 1));
      } else if (isRightSwipe && currentIndex > 0) {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
      }

      // Reset animation flag after transition
      setTimeout(() => setIsAnimating(false), 300);
    });

    // Prevent tap from selecting during swipe
    handler.onTap(() => {
      // Taps are handled by card click handlers
    });

    gestureHandlerRef.current = handler;

    return () => {
      handler.destroy();
    };
  }, [cards.length, currentIndex, isAnimating]);

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
          data-testid="carousel-prev"
        >
          ◀
        </button>

        <div
          className="carousel-track"
          ref={carouselRef}
          data-testid="card-carousel"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
            transition: isAnimating ? 'transform 0.3s ease-out' : 'none',
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
          data-testid="carousel-next"
        >
          ▶
        </button>
      </div>

      {/* Carousel Indicators */}
      <div className="carousel-indicators" data-testid="carousel-pagination">
        {cards.map((card, idx) => (
          <button
            key={card.id}
            className={`indicator ${idx === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(idx)}
            aria-label={`Go to card ${idx + 1}`}
            data-testid={`pagination-dot-${idx}`}
            data-active={idx === currentIndex}
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
          data-testid="confirm-cards-button"
        >
          Confirm Cards
        </button>
      </div>
    </div>
  );
};
