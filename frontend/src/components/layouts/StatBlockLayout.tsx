/**
 * StatBlockLayout Component (Issue #217)
 *
 * Generic layout for rendering creature/entity stats.
 * Design: 3-column grid per mockup
 * - Column 1-2: 2x2 stats (Health/Attack top, Move/Range bottom)
 * - Column 3: Icon/conditions column (e.g., Push 2, Wound)
 *
 * Can span 1-4 rows of the card grid.
 */

import React from 'react';
import type { CardVariant } from '../AbilityCard2';
import { formatEffect } from './effectIcons';
import 'rpg-awesome/css/rpg-awesome.min.css';
import './layouts.css';

export interface StatData {
  label: string;
  value: number | string;
  type: 'health' | 'attack' | 'move' | 'range' | 'custom';
}

export interface StatBlockLayoutProps {
  /** Stats to display (expects 4: health, attack, move, range) */
  stats: StatData[];
  /** Type icon (emoji or component) */
  typeIcon?: string;
  /** Type label (e.g., "BEAST TYPE") */
  typeLabel?: string;
  /** Effects/conditions to display (e.g., ["Push 2", "Wound"]) */
  effects?: string[];
  /** Card variant for sizing */
  variant: CardVariant;
  /** Number of rows to span (1-4) */
  rows?: number;
  /** Position on card */
  position?: 'top' | 'bottom';
  /** Additional CSS class */
  className?: string;
}

/**
 * Get default stats for creature cards (abbreviated labels for mobile)
 */
export function createDefaultStats(
  health: number,
  attack: number,
  move: number,
  range: number
): StatData[] {
  return [
    { label: 'HP', value: health, type: 'health' },
    { label: 'ATK', value: `+${attack}`, type: 'attack' },
    { label: 'MOV', value: move, type: 'move' },
    { label: 'RNG', value: range, type: 'range' },
  ];
}

export const StatBlockLayout: React.FC<StatBlockLayoutProps> = ({
  stats,
  typeIcon,
  typeLabel,
  effects,
  variant,
  rows = 2,
  position,
  className = '',
}) => {
  // Expect 4 stats in order: health, attack, move, range
  const [health, attack, move, range] = stats;

  const classNames = ['stat-block-layout', variant, className]
    .filter(Boolean)
    .join(' ');

  // Determine if we should show the icon column
  const hasIconColumn = typeIcon || typeLabel || (effects && effects.length > 0);

  return (
    <div
      className={classNames}
      style={{ gridRow: `span ${rows}` }}
      data-position={position}
      data-testid={`stat-block-${position || 'content'}`}
    >
      {/* Row 1: Health, Attack */}
      {health && (
        <div className={`stat-block-item stat-${health.type}`}>
          <span className="stat-block-label">{health.label}</span>
          <span className="stat-block-value">{health.value}</span>
        </div>
      )}

      {attack && (
        <div className={`stat-block-item stat-${attack.type}`}>
          <span className="stat-block-label">{attack.label}</span>
          <span className="stat-block-value">{attack.value}</span>
        </div>
      )}

      {/* Icon/Effects column (spans both rows) */}
      {hasIconColumn && (
        <div className="stat-block-icon-column">
          {typeIcon && !effects?.length && (
            <span className="stat-block-type-icon" aria-hidden="true">
              {typeIcon}
            </span>
          )}
          {effects && effects.length > 0 ? (
            <div className="stat-block-effects">
              {effects.map((effect, idx) => {
                const formatted = formatEffect(effect);
                return (
                  <span
                    key={idx}
                    className="stat-block-effect"
                    title={effect}
                    style={formatted.icon?.color ? { color: formatted.icon.color } : undefined}
                  >
                    {formatted.icon ? (
                      <>
                        <i className={`ra ${formatted.icon.icon}`} aria-hidden="true" />
                        {formatted.value !== null && <span>{formatted.value}</span>}
                      </>
                    ) : (
                      effect
                    )}
                  </span>
                );
              })}
            </div>
          ) : (
            typeLabel && <span className="stat-block-type-label">{typeLabel}</span>
          )}
        </div>
      )}

      {/* Row 2: Move, Range */}
      {move && (
        <div className={`stat-block-item stat-${move.type}`}>
          <span className="stat-block-label">{move.label}</span>
          <span className="stat-block-value">{move.value}</span>
        </div>
      )}

      {range && (
        <div className={`stat-block-item stat-${range.type}`}>
          <span className="stat-block-label">{range.label}</span>
          <span className="stat-block-value">{range.value}</span>
        </div>
      )}
    </div>
  );
};

export default StatBlockLayout;
