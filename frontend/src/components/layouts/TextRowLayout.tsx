/**
 * TextRowLayout Component (Issue #217)
 *
 * Generic layout for rendering text content on cards.
 * Used for: descriptions, lore, ability effects, flavor text.
 * Can span 1-4 rows of the card grid.
 *
 * Design: Title (red uppercase) + body text + optional italic quote
 */

import React from 'react';
import type { CardVariant } from '../AbilityCard2';
import './layouts.css';

export interface TextRowLayoutProps {
  /** Section title (e.g., "LORE", "CAST", "RAGE") */
  title?: string;
  /** Main body text */
  text?: string;
  /** Optional flavor text / quote (displayed in italic gray) */
  quote?: string;
  /** Card variant for sizing */
  variant: CardVariant;
  /** Number of rows to span (1-4) */
  rows?: number;
  /** Text alignment */
  alignment?: 'left' | 'center' | 'right';
  /** Allow multiline text */
  multiLine?: boolean;
  /** Position on card */
  position?: 'top' | 'bottom';
  /** Additional CSS class */
  className?: string;
}

export const TextRowLayout: React.FC<TextRowLayoutProps> = ({
  title,
  text,
  quote,
  variant,
  rows = 2,
  alignment = 'left',
  multiLine = false,
  position,
  className = '',
}) => {
  const classNames = [
    'text-row-layout',
    variant,
    `align-${alignment}`,
    multiLine ? 'multiline' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      style={{ gridRow: `span ${rows}` }}
      data-position={position}
      data-testid={`text-row-${position || 'content'}`}
    >
      <div className="text-row-content">
        {title && <span className="text-row-title">{title}</span>}

        {text && <p className="text-row-text">{text}</p>}

        {quote && <p className="text-row-quote">"{quote}"</p>}
      </div>
    </div>
  );
};

export default TextRowLayout;
