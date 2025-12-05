/**
 * HeaderModule Component
 *
 * Displays card header information (name, initiative, level).
 * Supports horizontal and vertical layouts.
 */

import React from 'react';
import { FadedBorder } from './FadedBorder';
import type { CardModule, HeaderField } from '../../../../shared/types/card-config';
import '../../styles/card-modules.css';

export interface HeaderModuleProps {
  module: CardModule;
  data?: {
    name?: string;
    initiative?: number;
    level?: number | string;
  };
  className?: string;
}

export const HeaderModule: React.FC<HeaderModuleProps> = ({
  module,
  data = {},
  className = '',
}) => {
  const { compact, config } = module;
  const noBorder = config?.noBorder ?? false;
  const layout = config?.layout || 'horizontal';
  const fields = (config?.fields as HeaderField[]) || ['name', 'initiative'];

  return (
    <div
      className={`header-module ${layout} ${compact ? 'compact' : ''} ${config?.customClass || ''} ${className}`}
      style={{ gridRow: `span ${module.rows} / span ${module.rows}` }}
    >
      {fields.includes('name') && data.name && (
        <div className="card-name" title={data.name}>
          {data.name}
        </div>
      )}

      {fields.includes('initiative') && data.initiative !== undefined && (
        <div className="card-initiative">
          Initiative: {data.initiative}
        </div>
      )}

      {fields.includes('level') && data.level !== undefined && (
        <div className="card-level">
          Level {data.level}
        </div>
      )}

      {!noBorder && <FadedBorder compact={compact} />}
    </div>
  );
};

export default HeaderModule;
