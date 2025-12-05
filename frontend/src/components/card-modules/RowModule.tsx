/**
 * RowModule Component
 *
 * Basic single-row display unit for card layouts.
 * Can be used for simple text, labels, or custom content.
 */

import React from 'react';
import { FadedBorder } from './FadedBorder';
import type { CardModule } from '../../../../shared/types/card-config';
import '../../styles/card-modules.css';

export interface RowModuleProps {
  module: CardModule;
  children?: React.ReactNode;
  className?: string;
}

export const RowModule: React.FC<RowModuleProps> = ({
  module,
  children,
  className = '',
}) => {
  const { compact, config } = module;
  const noBorder = config?.noBorder ?? false;

  return (
    <div
      className={`row-module ${compact ? 'compact' : ''} ${config?.customClass || ''} ${className}`}
      style={{ gridRow: `span ${module.rows} / span ${module.rows}` }}
    >
      {children}
      {!noBorder && <FadedBorder compact={compact} />}
    </div>
  );
};

export default RowModule;
