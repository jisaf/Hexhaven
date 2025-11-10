/**
 * ElementalStateDisplay Component (US2 - T109)
 *
 * Displays the current state of all 6 elements (fire, ice, air, earth, light, dark).
 * Shows states: inert, waning, or strong with visual indicators.
 */

import React from 'react';
import { ElementalInfusion, ElementType, ElementState } from '../../../shared/types/entities';
import './ElementalStateDisplay.css';

interface ElementalStateDisplayProps {
  elementalState: ElementalInfusion;
  compact?: boolean;
}

interface ElementInfo {
  type: ElementType;
  icon: string;
  color: string;
  state: ElementState;
}

export const ElementalStateDisplay: React.FC<ElementalStateDisplayProps> = ({
  elementalState,
  compact = false,
}) => {
  const getElementInfo = (): ElementInfo[] => {
    return [
      {
        type: ElementType.FIRE,
        icon: '🔥',
        color: '#e74c3c',
        state: elementalState.fire,
      },
      {
        type: ElementType.ICE,
        icon: '❄️',
        color: '#3498db',
        state: elementalState.ice,
      },
      {
        type: ElementType.AIR,
        icon: '💨',
        color: '#95a5a6',
        state: elementalState.air,
      },
      {
        type: ElementType.EARTH,
        icon: '🪨',
        color: '#7f6a3b',
        state: elementalState.earth,
      },
      {
        type: ElementType.LIGHT,
        icon: '☀️',
        color: '#f39c12',
        state: elementalState.light,
      },
      {
        type: ElementType.DARK,
        icon: '🌙',
        color: '#34495e',
        state: elementalState.dark,
      },
    ];
  };

  const getStateClass = (state: ElementState): string => {
    switch (state) {
      case ElementState.STRONG:
        return 'strong';
      case ElementState.WANING:
        return 'waning';
      case ElementState.INERT:
      default:
        return 'inert';
    }
  };

  const getStateLabel = (state: ElementState): string => {
    switch (state) {
      case ElementState.STRONG:
        return 'Strong';
      case ElementState.WANING:
        return 'Waning';
      case ElementState.INERT:
      default:
        return 'Inert';
    }
  };

  const elements = getElementInfo();

  if (compact) {
    return (
      <div className="elemental-state-display compact">
        {elements.map((element) => {
          const isActive = element.state !== ElementState.INERT;
          return (
            <div
              key={element.type}
              className={`element-icon-compact ${getStateClass(element.state)}`}
              style={{
                borderColor: isActive ? element.color : 'transparent',
              }}
              title={`${element.type}: ${getStateLabel(element.state)}`}
            >
              <span className="icon">{element.icon}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="elemental-state-display">
      <div className="display-header">
        <h3>Elemental Infusions</h3>
        <p className="subtitle">Current element states</p>
      </div>

      <div className="elements-grid">
        {elements.map((element) => {
          const stateClass = getStateClass(element.state);
          const isActive = element.state !== ElementState.INERT;

          return (
            <div
              key={element.type}
              className={`element-card ${stateClass}`}
              style={{
                borderColor: element.color,
                boxShadow: isActive
                  ? `0 0 20px ${element.color}40`
                  : 'none',
              }}
            >
              {/* Element Icon */}
              <div
                className="element-icon"
                style={{
                  backgroundColor: isActive
                    ? `${element.color}20`
                    : 'rgba(255, 255, 255, 0.05)',
                }}
              >
                <span className="icon">{element.icon}</span>
              </div>

              {/* Element Name */}
              <div className="element-name">
                {element.type.charAt(0).toUpperCase() + element.type.slice(1)}
              </div>

              {/* State Indicator */}
              <div
                className={`state-indicator ${stateClass}`}
                style={{
                  backgroundColor: isActive ? element.color : '#7f8c8d',
                }}
              >
                {getStateLabel(element.state)}
              </div>

              {/* State Description */}
              <div className="state-description">
                {element.state === ElementState.STRONG &&
                  'Can be consumed this round'}
                {element.state === ElementState.WANING &&
                  'Will become inert next round'}
                {element.state === ElementState.INERT && 'Not available'}
              </div>

              {/* Visual Effect for Active States */}
              {isActive && (
                <div
                  className={`glow-effect ${stateClass}`}
                  style={{
                    boxShadow: `0 0 30px ${element.color}, inset 0 0 15px ${element.color}`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="state-legend">
        <div className="legend-item">
          <span className="legend-indicator strong">●</span>
          <span className="legend-text">Strong - Can consume</span>
        </div>
        <div className="legend-item">
          <span className="legend-indicator waning">●</span>
          <span className="legend-text">Waning - Expires soon</span>
        </div>
        <div className="legend-item">
          <span className="legend-indicator inert">●</span>
          <span className="legend-text">Inert - Inactive</span>
        </div>
      </div>
    </div>
  );
};
