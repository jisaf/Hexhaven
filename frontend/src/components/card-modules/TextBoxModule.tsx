/**
 * TextBoxModule Component
 *
 * Multi-row text content area with optional title.
 * Supports template syntax for dynamic content (e.g., "{{fieldName}}").
 */

import React from 'react';
import { FadedBorder } from './FadedBorder';
import type { CardModule } from '../../../../shared/types/card-config';
import '../../styles/card-modules.css';

export interface TextBoxModuleProps {
  module: CardModule;
  data?: Record<string, any>;
  className?: string;
}

/**
 * Replaces template placeholders like {{fieldName}} with actual values from data
 */
function replaceTemplateVars(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, fieldName) => {
    return data[fieldName] !== undefined ? String(data[fieldName]) : match;
  });
}

export const TextBoxModule: React.FC<TextBoxModuleProps> = ({
  module,
  data = {},
  className = '',
}) => {
  const { compact, config } = module;
  const noBorder = config?.noBorder ?? false;

  const title = config?.title;
  const content = config?.content
    ? replaceTemplateVars(config.content, data)
    : '';

  return (
    <div
      className={`textbox-module ${compact ? 'compact' : ''} ${config?.customClass || ''} ${className}`}
      style={{ gridRow: `span ${module.rows} / span ${module.rows}` }}
    >
      {title && (
        <div className="textbox-title">
          {title}
        </div>
      )}
      {content && (
        <div className="textbox-content">
          {content}
        </div>
      )}
      {!noBorder && <FadedBorder compact={compact} />}
    </div>
  );
};

export default TextBoxModule;
