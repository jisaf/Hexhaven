/**
 * CardDataContext
 *
 * Provides card data to all child modules within a ConfigurableCard.
 * Allows modules to access card properties without prop drilling.
 */

import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { AbilityCard, Action } from '../../../shared/types/entities';

export interface CardData {
  // Core card properties
  id?: string;
  name?: string;
  initiative?: number;
  level?: number | string;

  // Actions
  topAction?: Action;
  bottomAction?: Action;

  // Character/class info
  characterClass?: string;

  // Creature/summon stats (for summon cards)
  health?: number;
  move?: number;
  attack?: number;
  range?: number;
  specialAbilities?: string;

  // Allow any additional properties
  [key: string]: unknown;
}

interface CardDataContextValue {
  data: CardData;
}

const CardDataContext = createContext<CardDataContextValue | null>(null);

export interface CardDataProviderProps {
  data: CardData;
  children: ReactNode;
}

/**
 * Provider component that makes card data available to all child modules
 */
export const CardDataProvider: React.FC<CardDataProviderProps> = ({ data, children }) => {
  return (
    <CardDataContext.Provider value={{ data }}>
      {children}
    </CardDataContext.Provider>
  );
};

/**
 * Hook to access card data from any module component
 * @throws Error if used outside of CardDataProvider
 */
export function useCardData(): CardData {
  const context = useContext(CardDataContext);

  if (!context) {
    throw new Error('useCardData must be used within a CardDataProvider');
  }

  return context.data;
}

/**
 * Get a nested value from card data using dot notation
 * Example: getCardDataValue(data, "topAction.value") => data.topAction.value
 */
export function getCardDataValue(data: CardData, path: string): unknown {
  if (!path) return undefined;

  return path.split('.').reduce((obj: unknown, key: string) => {
    return (obj as Record<string, unknown>)?.[key];
  }, data as unknown);
}

/**
 * Convert an AbilityCard entity to CardData format
 */
export function abilityCardToCardData(card: AbilityCard): CardData {
  return {
    id: card.id,
    name: card.name,
    initiative: card.initiative,
    level: card.level,
    topAction: card.topAction,
    bottomAction: card.bottomAction,
    characterClass: card.characterClass,
  };
}

export default CardDataContext;
