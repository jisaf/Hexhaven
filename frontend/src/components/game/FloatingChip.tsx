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

// CSS styles extracted outside component to avoid re-creating on every render
const FLOATING_CHIP_STYLES = `
  .floating-chip {
    /* Chip dimension variables for easy customization */
    --chip-size: 44px;
    --chip-icon-size: 32px;

    position: relative;
    width: var(--chip-size);
    height: var(--chip-size);
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
  }

  .floating-chip:hover {
    transform: scale(1.1);
  }

  .floating-chip.active {
    transform: scale(1.15);
  }

  .floating-chip.active .chip-icon {
    box-shadow: 0 0 0 3px var(--chip-color), 0 0 12px rgba(90, 159, 212, 0.5);
  }

  .floating-chip.waning {
    opacity: 0.5;
  }

  .floating-chip.waning .chip-icon {
    filter: brightness(0.7);
  }

  .floating-chip.current-turn {
    animation: chip-pulse 1.5s ease-in-out infinite;
  }

  .chip-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: var(--chip-icon-size);
    height: var(--chip-icon-size);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: bold;
    color: #ffffff;
    border-radius: 50%;
    z-index: 2;
  }

  .health-ring {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    z-index: 1;
  }

  .intensity-border {
    position: absolute;
    top: -2px;
    left: -2px;
    width: calc(100% + 4px);
    height: calc(100% + 4px);
    border: 3px solid var(--chip-border-color);
    border-radius: 50%;
    z-index: 0;
    box-shadow: 0 0 8px var(--chip-border-color);
  }

  .turn-indicator {
    position: absolute;
    top: -2px;
    right: -2px;
    width: 12px;
    height: 12px;
    background: #fbbf24;
    border: 2px solid #000;
    border-radius: 50%;
    z-index: 3;
  }

  .chip-badge {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 14px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: #fbbf24;
    background: #000;
    border: 1px solid #fbbf24;
    border-radius: 50%;
    z-index: 3;
  }

  .chip-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 20px;
    z-index: 4;
  }

  .floating-chip.has-overlay .chip-icon {
    opacity: 0.4;
    filter: grayscale(100%);
  }

  @keyframes chip-pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(251, 191, 36, 0);
    }
  }

  @media (max-width: 768px) {
    .floating-chip {
      --chip-size: 36px;
      --chip-icon-size: 26px;
    }

    .chip-icon {
      font-size: 14px;
    }
  }
`;

// Track whether styles have been injected (checked outside render)
let stylesInjected = false;

// Inject styles once into document head (runs outside of render)
function injectStylesOnce(): void {
  if (stylesInjected || typeof document === 'undefined') {
    return;
  }
  stylesInjected = true;
  const styleElement = document.createElement('style');
  styleElement.setAttribute('data-floating-chip-styles', 'true');
  styleElement.textContent = FLOATING_CHIP_STYLES;
  document.head.appendChild(styleElement);
}

export interface FloatingChipProps {
  /** Unique identifier */
  id: string;
  /** Icon to display (emoji or text character) */
  icon: string;
  /** Background color of the chip */
  color: string;
  /** Optional deep border color for "full" state */
  borderColor?: string;
  /** Intensity: 'full' (bright), 'waning' (dim), or 'off' (hidden) */
  intensity: 'full' | 'waning' | 'off';
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
  // Inject styles once into document head (effect runs after render, not during)
  React.useEffect(() => {
    injectStylesOnce();
  }, []);

  // Don't render if intensity is 'off'
  if (intensity === 'off') {
    return null;
  }

  const isWaning = intensity === 'waning';
  const hasBorder = intensity === 'full' && borderColor;

  // Build class names
  const chipClasses = [
    'floating-chip',
    isActive ? 'active' : '',
    isTurn ? 'current-turn' : '',
    isWaning ? 'waning' : '',
    overlay ? 'has-overlay' : '',
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
      <div className="chip-icon" style={{ backgroundColor: color }}>
        {icon}
      </div>
      {ringStyle && <div className="health-ring" style={ringStyle} />}
      {hasBorder && <div className="intensity-border" />}
      {isTurn && <div className="turn-indicator" />}
      {badge && <div className="chip-badge">{badge}</div>}
      {overlay && <div className="chip-overlay">{overlay}</div>}
    </button>
  );
});
