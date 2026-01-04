/**
 * ElementsPanel Component
 *
 * Floating panel on the right side of the game board showing elemental state.
 * Features:
 * - Shows active elements (STRONG and WANING states)
 * - STRONG elements are bright with deep border glow
 * - WANING elements are dimmed
 * - INERT elements are hidden
 *
 * Uses FloatingChip component for consistent styling with entity chips.
 */

import { ElementType, ElementState } from '../../../../shared/types/entities';
import type { ElementalInfusion } from '../../../../shared/types/entities';
import { FloatingChip } from './FloatingChip';

// Element configuration - data-driven for easy extensibility
const ELEMENT_CONFIG: Record<ElementType, { icon: string; color: string; borderColor: string }> = {
  [ElementType.FIRE]: { icon: '🔥', color: '#ff4500', borderColor: '#8b0000' },
  [ElementType.ICE]: { icon: '❄️', color: '#00bfff', borderColor: '#004080' },
  [ElementType.AIR]: { icon: '💨', color: '#b0e0e6', borderColor: '#4682b4' },
  [ElementType.EARTH]: { icon: '🪨', color: '#8b4513', borderColor: '#3d2a0d' },
  [ElementType.LIGHT]: { icon: '✨', color: '#ffd700', borderColor: '#b8860b' },
  [ElementType.DARK]: { icon: '🌑', color: '#4b0082', borderColor: '#1a0033' },
};

// Element display order
const ELEMENT_ORDER: ElementType[] = [
  ElementType.FIRE,
  ElementType.ICE,
  ElementType.AIR,
  ElementType.EARTH,
  ElementType.LIGHT,
  ElementType.DARK,
];

interface ElementsPanelProps {
  /** Current elemental state from game */
  elementalState: ElementalInfusion | null;
}

/**
 * Map ElementState to FloatingChip intensity
 * Returns 'off' for undefined or invalid states to handle malformed data gracefully
 */
function mapStateToIntensity(state: ElementState | undefined): 'full' | 'infusing' | 'waning' | 'off' {
  if (!state) {
    return 'off';
  }
  switch (state) {
    case ElementState.STRONG:
      return 'full';
    case ElementState.INFUSING:
      return 'infusing';
    case ElementState.WANING:
      return 'waning';
    case ElementState.INERT:
    default:
      return 'off';
  }
}

export function ElementsPanel({ elementalState }: ElementsPanelProps) {
  // Don't render if no elemental state
  if (!elementalState) {
    return null;
  }

  // Filter to only active elements (STRONG, INFUSING, or WANING)
  // Also verify the element exists in ELEMENT_CONFIG for defensive coding
  const activeElements = ELEMENT_ORDER.filter((element) => {
    // Skip elements not in config (defensive check)
    if (!ELEMENT_CONFIG[element]) {
      return false;
    }
    const state = elementalState[element];
    // Handle undefined states gracefully
    if (!state) {
      return false;
    }
    return state === ElementState.STRONG || state === ElementState.INFUSING || state === ElementState.WANING;
  });

  // Don't render if no active elements
  if (activeElements.length === 0) {
    return null;
  }

  return (
    <div className="elements-panel" data-testid="elements-panel">
      <div className="chips-container">
        {activeElements.map((element) => {
          const config = ELEMENT_CONFIG[element];
          const state = elementalState[element];

          // Defensive check: skip if config is missing (shouldn't happen due to filter above)
          if (!config) {
            return null;
          }

          const intensity = mapStateToIntensity(state);

          return (
            <FloatingChip
              key={element}
              id={`element-${element}`}
              icon={config.icon}
              color={config.color}
              borderColor={config.borderColor}
              intensity={intensity}
              isTurn={intensity === 'full'} // Use pulse animation for STRONG elements
              title={`${element.charAt(0).toUpperCase() + element.slice(1)} - ${state ?? 'unknown'}`}
              testId={`element-chip-${element}`}
              className="element-chip"
            />
          );
        })}
      </div>

      <style>{`
        .elements-panel {
          position: absolute;
          right: 12px;
          top: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          z-index: 100;
          pointer-events: auto;
        }

        .elements-panel .chips-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 24px;
          padding: 8px;
        }

        @media (max-width: 768px) {
          .elements-panel {
            right: 8px;
            top: 8px;
          }

          .elements-panel .chips-container {
            padding: 6px;
          }
        }
      `}</style>
    </div>
  );
}
