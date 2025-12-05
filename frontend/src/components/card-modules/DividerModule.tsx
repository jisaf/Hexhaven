/**
 * DividerModule Component
 *
 * Visual separator between card modules.
 * Supports multiple styles: faded, solid, dashed.
 */

import React from 'react';
import type { CardModule } from '../../../../shared/types/card-config';
import '../../styles/card-modules.css';

export interface DividerModuleProps {
  module: CardModule;
  className?: string;
}

export const DividerModule: React.FC<DividerModuleProps> = ({
  module,
  className = '',
}) => {
  const { compact, config } = module;
  const style = config?.style || 'faded';

  return (
    <div
      className={`divider-module ${style} ${compact ? 'compact' : ''} ${config?.customClass || ''} ${className}`}
      style={{ gridRow: `span ${module.rows} / span ${module.rows}` }}
      aria-hidden="true"
    />
  );
};

export default DividerModule;
