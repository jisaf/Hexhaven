/**
 * FooterModule Component
 *
 * Displays card footer information (level, metadata).
 * Typically shown at the bottom of the card.
 */

import React from 'react';
import { FadedBorder } from './FadedBorder';
import type { CardModule, HeaderField } from '../../../../shared/types/card-config';
import '../../styles/card-modules.css';

export interface FooterModuleProps {
  module: CardModule;
  data?: {
    level?: number | string;
    name?: string;
    [key: string]: unknown;
  };
  className?: string;
}

export const FooterModule: React.FC<FooterModuleProps> = ({
  module,
  data = {},
  className = '',
}) => {
  const { compact, config } = module;
  const noBorder = config?.noBorder ?? false;
  const fields = (config?.fields as HeaderField[]) || ['level'];

  return (
    <div
      className={`footer-module ${compact ? 'compact' : ''} ${config?.customClass || ''} ${className}`}
      style={{ gridRow: `span ${module.rows} / span ${module.rows}` }}
    >
      {fields.includes('level') && data.level !== undefined && (
        <div className="card-level">
          Level {data.level}
        </div>
      )}

      {fields.includes('name') && data.name && (
        <div className="card-name">
          {data.name}
        </div>
      )}

      {!noBorder && <FadedBorder compact={compact} />}
    </div>
  );
};

export default FooterModule;
