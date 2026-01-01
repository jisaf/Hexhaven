/**
 * CardActionRegion Component (Issue #411 - Phase 4.1)
 *
 * Displays a clickable region for the top or bottom half of an ability card.
 * Supports tap-to-select, tap-to-confirm flow with visual states for:
 * - Available: clickable, normal appearance
 * - Selected: highlighted with confirm/cancel buttons
 * - Used: grayed out, non-interactive
 * - Disabled: not available based on turn state
 *
 * Features:
 * - Shows action summary (type, value, modifiers)
 * - Lost action warning indicator
 * - Touch-friendly (48px min height)
 */

import { GiCrossedSwords, GiRun, GiHeartPlus, GiTreasureMap, GiMagicSwirl, GiBookCover } from 'react-icons/gi';
import { FaCheck, FaTimes, FaSkull } from 'react-icons/fa';
import type { CardAction } from '../../../../shared/types/modifiers';
import { isLostAction, getRange } from '../../../../shared/types/modifiers';
import styles from './CardActionRegion.module.css';

export type CardActionState = 'available' | 'selected' | 'used' | 'disabled';

export interface CardActionRegionProps {
  /** The action data (top or bottom action from the card) */
  action: CardAction;
  /** Position of this action on the card */
  position: 'top' | 'bottom';
  /** Current state of this action region */
  state: CardActionState;
  /** Card name for display */
  cardName: string;
  /** Card initiative value */
  initiative: number;
  /** Called when the region is clicked */
  onClick: () => void;
  /** Called when confirm button is clicked (only shown when selected) */
  onConfirm: () => void;
  /** Called when cancel button is clicked (only shown when selected) */
  onCancel: () => void;
}

/**
 * Action icon component that renders the appropriate icon based on action type
 */
function ActionIconDisplay({ type }: { type: CardAction['type'] }) {
  switch (type) {
    case 'attack':
      return <GiCrossedSwords />;
    case 'move':
      return <GiRun />;
    case 'heal':
      return <GiHeartPlus />;
    case 'loot':
      return <GiTreasureMap />;
    case 'summon':
    case 'special':
      return <GiMagicSwirl />;
    case 'text':
      return <GiBookCover />;
    default:
      return <GiMagicSwirl />;
  }
}

/**
 * Get human-readable action type label
 */
function getActionLabel(type: CardAction['type']): string {
  switch (type) {
    case 'attack':
      return 'Attack';
    case 'move':
      return 'Move';
    case 'heal':
      return 'Heal';
    case 'loot':
      return 'Loot';
    case 'summon':
      return 'Summon';
    case 'special':
      return 'Special';
    case 'text':
      return 'Text';
    default:
      return 'Action';
  }
}

/**
 * Get action value if applicable
 */
function getActionValue(action: CardAction): number | null {
  if ('value' in action && typeof action.value === 'number') {
    return action.value;
  }
  return null;
}

/**
 * Get action summary text including modifiers
 */
function getActionSummary(action: CardAction): string {
  const parts: string[] = [];
  const label = getActionLabel(action.type);
  const value = getActionValue(action);

  if (value !== null) {
    parts.push(`${label} ${value}`);
  } else {
    parts.push(label);
  }

  // Add range if present
  const range = getRange(action.modifiers);
  if (range > 0) {
    parts.push(`Range ${range}`);
  }

  return parts.join(' | ');
}

export function CardActionRegion({
  action,
  position,
  state,
  cardName,
  initiative,
  onClick,
  onConfirm,
  onCancel,
}: CardActionRegionProps) {
  const isLost = isLostAction(action.modifiers);
  const isInteractive = state === 'available' || state === 'selected';

  const handleClick = () => {
    if (isInteractive) {
      onClick();
    }
  };

  const handleConfirmClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConfirm();
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCancel();
  };

  return (
    <div
      className={`${styles.region} ${styles[state]} ${styles[position]}`}
      onClick={handleClick}
      role="button"
      tabIndex={isInteractive ? 0 : -1}
      aria-label={`${position} action: ${getActionSummary(action)}`}
      aria-disabled={!isInteractive}
      onKeyDown={(e) => {
        if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Card info header */}
      <div className={styles.header}>
        <span className={styles.cardName}>{cardName}</span>
        <span className={styles.initiative}>{initiative}</span>
      </div>

      {/* Action content */}
      <div className={styles.content}>
        <div className={styles.actionIcon}>
          <ActionIconDisplay type={action.type} />
        </div>
        <div className={styles.actionDetails}>
          <div className={styles.actionType}>
            {getActionLabel(action.type)}
            {getActionValue(action) !== null && (
              <span className={styles.actionValue}>{getActionValue(action)}</span>
            )}
          </div>
          {getRange(action.modifiers) > 0 && (
            <div className={styles.actionModifier}>
              Range {getRange(action.modifiers)}
            </div>
          )}
        </div>

        {/* Lost action warning */}
        {isLost && (
          <div className={styles.lostIndicator} title="This action is lost when used">
            <FaSkull />
          </div>
        )}
      </div>

      {/* Position indicator */}
      <div className={styles.positionLabel}>
        {position.toUpperCase()}
      </div>

      {/* Confirm/Cancel buttons when selected */}
      {state === 'selected' && (
        <div className={styles.confirmOverlay}>
          <button
            className={styles.confirmButton}
            onClick={handleConfirmClick}
            aria-label="Confirm action"
          >
            <FaCheck />
            <span>Confirm</span>
          </button>
          <button
            className={styles.cancelButton}
            onClick={handleCancelClick}
            aria-label="Cancel selection"
          >
            <FaTimes />
            <span>Cancel</span>
          </button>
        </div>
      )}

      {/* Used overlay */}
      {state === 'used' && (
        <div className={styles.usedOverlay}>
          <span>Used</span>
        </div>
      )}
    </div>
  );
}
