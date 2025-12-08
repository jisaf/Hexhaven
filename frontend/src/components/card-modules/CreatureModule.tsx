/**
 * CreatureModule Component
 *
 * Configurable grid display for creature stats (health, move, attack, range, etc.).
 * Used for summons and monster cards. Supports custom CSS variables for stat colors.
 */

import React from 'react';
import { FadedBorder } from './FadedBorder';
import type { CardModule, CreatureStat } from '../../../../shared/types/card-config';
import '../../styles/card-modules.css';

export interface CreatureModuleProps {
  module: CardModule;
  data?: Record<string, unknown>;
  className?: string;
}

/**
 * Get value from nested data object using dot notation
 * e.g., "stats.health" => data.stats.health
 */
function getNestedValue(data: Record<string, unknown>, field: string): unknown {
  return field.split('.').reduce((obj: unknown, key: string) => (obj as Record<string, unknown>)?.[key], data);
}

/**
 * Get CSS class name from stat field for styling
 */
function getStatClassName(field: string): string {
  // Extract the last part of the field path
  const fieldName = field.split('.').pop() || field;
  return fieldName.toLowerCase();
}

export const CreatureModule: React.FC<CreatureModuleProps> = ({
  module,
  data = {},
  className = '',
}) => {
  const { compact, config } = module;
  const noBorder = config?.noBorder ?? false;
  const stats = (config?.stats as CreatureStat[]) || [];

  return (
    <div
      className={`creature-module ${compact ? 'compact' : ''} ${config?.customClass || ''} ${className}`}
      style={{ gridRow: `span ${module.rows} / span ${module.rows}` }}
    >
      {stats.map((stat, index) => {
        const value = getNestedValue(data, stat.field);
        const statClass = getStatClassName(stat.field);

        // Custom CSS variable styling
        const customStyle: React.CSSProperties = {};
        if (stat.bgVar) {
          customStyle.background = `var(${stat.bgVar})`;
        }

        return (
          <div
            key={index}
            className={`creature-stat ${statClass}`}
            style={customStyle}
          >
            <div
              className="stat-label"
              style={stat.textVar ? { color: `var(${stat.textVar})` } : {}}
            >
              {stat.label}
            </div>
            <div className="stat-value">
              {value !== undefined ? String(value) : '-'}
            </div>
          </div>
        );
      })}

      {!noBorder && <FadedBorder compact={compact} />}
    </div>
  );
};

export default CreatureModule;
