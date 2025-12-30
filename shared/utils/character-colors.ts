/**
 * Character Colors Utility
 *
 * @deprecated This file is deprecated in favor of database-driven character class data.
 * Character colors are now stored in the database and should be fetched via:
 * - Frontend: `frontend/src/services/character-class.service.ts`
 * - Backend: Query CharacterClass model directly
 *
 * This file is kept for backward compatibility only and will be removed in a future version.
 *
 * Migration guide:
 * - Frontend components should use `useCharacterClasses` hook or `characterClassService`
 * - Backend code should query the CharacterClass table for color data
 *
 * Original description:
 * Centralized color definitions for each character class.
 * Used for consistent UI representation across the application.
 *
 * Uses string keys for maximum compatibility with both:
 * - CharacterClass enum from shared/types/entities
 * - String literal union types from frontend components
 */

/**
 * Valid character class names
 */
export type CharacterClassName = 'Brute' | 'Tinkerer' | 'Spellweaver' | 'Scoundrel' | 'Cragheart' | 'Mindthief';

/**
 * Color mapping for each character class
 * Colors are chosen to match the official Gloomhaven aesthetic
 * @deprecated Use database-driven color data instead
 */
export const CHARACTER_COLORS: Record<CharacterClassName, string> = {
  Brute: '#CC3333',
  Tinkerer: '#3399CC',
  Spellweaver: '#9933CC',
  Scoundrel: '#33CC33',
  Cragheart: '#CC9933',
  Mindthief: '#CC33CC',
};

/**
 * Get the color for a character class
 * @deprecated Use characterClassService.getCharacterColor() or useCharacterClasses hook instead
 * @param classType - The character class name (string or enum value)
 * @param fallback - Fallback color if class not found (default: '#666')
 * @returns Hex color string
 */
export function getCharacterColor(classType: string, fallback: string = '#666'): string {
  return CHARACTER_COLORS[classType as CharacterClassName] || fallback;
}

/**
 * Get a lighter version of the character color (for backgrounds)
 * @deprecated Use database-driven color data instead
 * @param classType - The character class name (string or enum value)
 * @param opacity - Opacity value 0-1 (default: 0.2)
 * @returns RGBA color string
 */
export function getCharacterColorWithOpacity(classType: string, opacity: number = 0.2): string {
  const hex = CHARACTER_COLORS[classType as CharacterClassName] || '#666';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
