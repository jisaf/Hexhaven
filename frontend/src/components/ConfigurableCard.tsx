/**
 * ConfigurableCard Component
 *
 * Main card renderer that dynamically builds cards from module configurations.
 * Uses CardDataProvider for data access and ModuleRegistry for component mapping.
 */

import React from 'react';
import { CardDataProvider, abilityCardToCardData } from '../contexts/CardDataContext';
import { getModuleComponent } from './card-modules';
import { ModuleErrorBoundary } from './card-modules/ModuleErrorBoundary';
import type { CardData } from '../contexts/CardDataContext';
import type { AbilityCard } from '../../../shared/types/entities';
import type { CardModule } from '../../../shared/types/card-config';
import '../styles/card-modules.css';

export interface CardLayoutTemplate {
  id: string;
  name: string;
  description?: string;
  modules: CardModule[];
}

export interface ConfigurableCardProps {
  /** Card data (can be AbilityCard entity or CardData format) */
  card: AbilityCard | CardData;

  /** Layout template defining module composition */
  template: CardLayoutTemplate;

  /** Whether to use compact mode */
  compact?: boolean;

  /** Additional CSS class names */
  className?: string;

  /** Whether card is currently active/selected */
  isActive?: boolean;
}

/**
 * ConfigurableCard - Renders a card from a layout template
 */
export const ConfigurableCard: React.FC<ConfigurableCardProps> = ({
  card,
  template,
  compact = false,
  className = '',
  isActive = false,
}) => {
  // Convert AbilityCard to CardData if needed
  const cardData: CardData = 'topAction' in card && 'bottomAction' in card
    ? abilityCardToCardData(card as AbilityCard)
    : card as CardData;

  // Sort modules by order
  const sortedModules = [...template.modules].sort((a, b) => a.order - b.order);

  // Calculate total rows for grid
  const totalRows = sortedModules.reduce((sum, module) => sum + module.rows, 0);

  return (
    <CardDataProvider data={cardData}>
      <div
        className={`configurable-card ${compact ? 'compact' : ''} ${isActive ? 'active' : ''} ${className}`}
        style={{
          display: 'grid',
          gridTemplateRows: `repeat(${totalRows}, 1fr)`,
          gap: 'var(--card-gap, 8px)',
          background: 'var(--card-bg-gradient)',
          border: 'var(--card-border-width) solid var(--card-border)',
          borderRadius: 'var(--card-border-radius)',
          padding: 'var(--card-padding, 12px)',
          boxShadow: 'var(--card-shadow)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {sortedModules.map((module) => {
          const ModuleComponent = getModuleComponent(module.type);

          if (!ModuleComponent) {
            console.warn(`Unknown module type: ${module.type}`);
            return null;
          }

          // Apply compact mode from card or module level
          const moduleCompact = module.compact ?? compact;

          // Render the module based on its type, wrapped in error boundary
          let moduleElement: React.ReactNode = null;

          switch (module.type) {
            case 'action': {
              // ActionModule needs action data and position
              const position = module.config?.position || 'top';
              const action = position === 'top' ? cardData.topAction : cardData.bottomAction;

              moduleElement = (
                <ModuleComponent
                  module={module}
                  action={action}
                  isActive={isActive}
                  className={moduleCompact ? 'compact' : ''}
                />
              );
              break;
            }

            case 'header':
            case 'footer':
            case 'row':
            case 'textbox':
            case 'divider':
            case 'creature':
              // Standard modules receive module config and card data
              moduleElement = (
                <ModuleComponent
                  module={module}
                  data={cardData}
                  className={moduleCompact ? 'compact' : ''}
                />
              );
              break;

            default:
              moduleElement = null;
          }

          // Wrap module in error boundary
          return (
            <ModuleErrorBoundary
              key={module.id}
              moduleId={module.id}
              moduleType={module.type}
            >
              {moduleElement}
            </ModuleErrorBoundary>
          );
        })}
      </div>
    </CardDataProvider>
  );
};

export default ConfigurableCard;
