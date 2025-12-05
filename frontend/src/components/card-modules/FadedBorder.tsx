/**
 * FadedBorder Component
 *
 * Renders a faded gradient border at the bottom of a module.
 * Used as a visual separator between card modules.
 */

import React from 'react';
import '../../styles/card-modules.css';

export interface FadedBorderProps {
  compact?: boolean;
}

export const FadedBorder: React.FC<FadedBorderProps> = ({ compact = false }) => {
  return (
    <div
      className={`faded-border ${compact ? 'compact' : ''}`}
      aria-hidden="true"
    />
  );
};

export default FadedBorder;
