/**
 * FloatingChip Component
 *
 * A reusable circular chip component for floating game UI elements.
 * Used by EntityChipsPanel (characters/monsters) and ElementsPanel (elements).
 *
 * Features:
 * - Icon display (emoji or text character)
 * - Color with optional deep border for "full" state
 * - Intensity states: 'full' (bright), 'waning' (dim), 'off' (hidden)
 * - Optional health ring with conic-gradient
 * - Active/selected state styling
 * - Turn indicator with pulse animation
 * - Badge (e.g., elite star) and overlay (e.g., exhausted skull)
 * - Responsive sizing (44px desktop, 36px mobile)
 */

import React from 'react';
import styles from './FloatingChip.module.css';

export interface FloatingChipProps {
  /** Unique identifier */
  id: string;
  /** Icon to display (emoji or text character) */
  icon: string;
  /** Background color of the chip */
  color: string;
  /** Optional deep border color for "full" state */
  borderColor?: string;
  /** Intensity: 'full' (bright), 'infusing' (pending - strong border, dull fill), 'waning' (dim), or 'off' (hidden) */
  intensity: 'full' | 'infusing' | 'waning' | 'off';
  /** Optional ring percentage (0-100) for health display */
  ringPercent?: number;
  /** Optional ring color */
  ringColor?: string;
  /** Whether this chip is active/selected */
  isActive?: boolean;
  /** Whether this chip has current turn */
  isTurn?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Tooltip text */
  title?: string;
  /** Optional badge (e.g., "★" for elite) */
  badge?: string;
  /** Optional overlay (e.g., "💀" for exhausted) */
  overlay?: string;
  /** Test ID for testing */
  testId?: string;
  /** Additional CSS classes */
  className?: string;
}

export const FloatingChip = React.memo(function FloatingChip({
  // id is kept in props interface for debugging/testing but not used internally
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  id: _id,
  icon,
  color,
  borderColor,
  intensity,
  ringPercent,
  ringColor,
  isActive = false,
  isTurn = false,
  onClick,
  title,
  badge,
  overlay,
  testId,
  className = '',
}: FloatingChipProps): React.ReactElement | null {
  // Don't render if intensity is 'off'
  if (intensity === 'off') {
    return null;
  }

  const isWaning = intensity === 'waning';
  const isInfusing = intensity === 'infusing';
  const hasBorder = (intensity === 'full' || intensity === 'infusing') && borderColor;

  // Build class names using CSS modules
  const chipClasses = [
    styles.chip,
    isActive ? styles.active : '',
    isTurn ? styles.currentTurn : '',
    isWaning ? styles.waning : '',
    isInfusing ? styles.infusing : '',
    overlay ? styles.hasOverlay : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Calculate ring gradient if ringPercent provided
  const ringStyle = ringPercent !== undefined && ringColor
    ? {
        background: `conic-gradient(${ringColor} ${ringPercent}%, transparent ${ringPercent}%)`,
      }
    : undefined;

  return (
    <button
      className={chipClasses}
      onClick={onClick}
      style={
        {
          '--chip-color': color,
          '--chip-border-color': hasBorder ? borderColor : 'transparent',
        } as React.CSSProperties
      }
      title={title}
      data-testid={testId}
      type="button"
    >
      <div className={styles.icon} style={{ backgroundColor: color }}>
        {icon}
      </div>
      {ringStyle && <div className={styles.healthRing} style={ringStyle} />}
      {hasBorder && <div className={styles.intensityBorder} />}
      {isTurn && <div className={styles.turnIndicator} />}
      {badge && <div className={styles.badge}>{badge}</div>}
      {overlay && <div className={styles.overlay}>{overlay}</div>}
    </button>
  );
});
