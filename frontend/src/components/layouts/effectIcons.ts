/**
 * Effect Icons Mapping (Issue #217)
 *
 * Maps common Gloomhaven effects to RPG Awesome icons.
 * Provides compact icon representation for mobile screens.
 */

import 'rpg-awesome/css/rpg-awesome.min.css';

export interface EffectIcon {
  icon: string;      // RPG Awesome class name
  label: string;     // Short label for tooltip
  color?: string;    // Optional color override
}

/**
 * Action type icons using RPG Awesome
 */
export const ACTION_ICONS: Record<string, EffectIcon> = {
  'move': { icon: 'ra-boot-stomp', label: 'Move', color: '#3498db' },
  'attack': { icon: 'ra-sword', label: 'Attack', color: '#e74c3c' },
  'heal': { icon: 'ra-health', label: 'Heal', color: '#27ae60' },
  'loot': { icon: 'ra-gold-bar', label: 'Loot', color: '#f39c12' },
  'special': { icon: 'ra-crystals', label: 'Special', color: '#9b59b6' },
  'summon': { icon: 'ra-wolf-howl', label: 'Summon', color: '#8e44ad' },
  'text': { icon: 'ra-scroll-unfurled', label: 'Text', color: '#2c3e50' },
};

/**
 * Element type icons using RPG Awesome
 */
export const ELEMENT_ICONS: Record<string, EffectIcon> = {
  'fire': { icon: 'ra-fire', label: 'Fire', color: '#e74c3c' },
  'ice': { icon: 'ra-snowflake', label: 'Ice', color: '#3498db' },
  'air': { icon: 'ra-feathered-wing', label: 'Air', color: '#95a5a6' },
  'earth': { icon: 'ra-mountains', label: 'Earth', color: '#8b4513' },
  'light': { icon: 'ra-sun', label: 'Light', color: '#f1c40f' },
  'dark': { icon: 'ra-moon-sun', label: 'Dark', color: '#2c3e50' },
};

/**
 * Card indicator icons (loss, persist, XP) using RPG Awesome
 */
export const CARD_ICONS: Record<string, EffectIcon> = {
  'loss': { icon: 'ra-cancel', label: 'Lost', color: '#e74c3c' },
  'persistent': { icon: 'ra-cycle', label: 'Persistent', color: '#3498db' },
  'xp': { icon: 'ra-trophy', label: 'XP', color: '#f1c40f' },
};

/**
 * Map of effect keywords to RPG Awesome icons
 */
export const EFFECT_ICONS: Record<string, EffectIcon> = {
  // Status effects
  'stun': { icon: 'ra-lightning-bolt', label: 'Stun', color: '#f1c40f' },
  'poison': { icon: 'ra-vial', label: 'Poison', color: '#27ae60' },
  'wound': { icon: 'ra-bleeding-eye', label: 'Wound', color: '#c0392b' },
  'muddle': { icon: 'ra-help', label: 'Muddle', color: '#9b59b6' },
  'immobilize': { icon: 'ra-chain', label: 'Immobilize', color: '#7f8c8d' },
  'disarm': { icon: 'ra-broken-shield', label: 'Disarm', color: '#95a5a6' },
  'invisible': { icon: 'ra-hood', label: 'Invisible', color: '#3498db' },
  'strengthen': { icon: 'ra-muscle-up', label: 'Strengthen', color: '#e67e22' },
  'bless': { icon: 'ra-sun-symbol', label: 'Bless', color: '#f1c40f' },
  'curse': { icon: 'ra-death-skull', label: 'Curse', color: '#2c3e50' },

  // Movement effects
  'push': { icon: 'ra-hand', label: 'Push', color: '#3498db' },
  'pull': { icon: 'ra-magnet', label: 'Pull', color: '#9b59b6' },
  'jump': { icon: 'ra-footprint', label: 'Jump', color: '#27ae60' },

  // Defense effects
  'shield': { icon: 'ra-shield', label: 'Shield', color: '#3498db' },
  'retaliate': { icon: 'ra-crossed-swords', label: 'Retaliate', color: '#e74c3c' },

  // Targeting
  'all adjacent': { icon: 'ra-radial-balance', label: 'All Adjacent', color: '#e74c3c' },
  'target all': { icon: 'ra-radial-balance', label: 'Target All', color: '#e74c3c' },
  'target 2': { icon: 'ra-double-team', label: 'Target 2', color: '#e74c3c' },
  'ally': { icon: 'ra-player', label: 'Ally', color: '#27ae60' },
  'self': { icon: 'ra-player-dodge', label: 'Self', color: '#3498db' },

  // Special
  'recover': { icon: 'ra-recycle', label: 'Recover', color: '#27ae60' },
  'loot': { icon: 'ra-gold-bar', label: 'Loot', color: '#f39c12' },
  'xp': { icon: 'ra-trophy', label: 'XP', color: '#f1c40f' },
  'control': { icon: 'ra-overmind', label: 'Control', color: '#9b59b6' },
  'augment': { icon: 'ra-aura', label: 'Augment', color: '#8e44ad' },

  // Terrain
  'obstacle': { icon: 'ra-barrier', label: 'Obstacle', color: '#7f8c8d' },
  'trap': { icon: 'ra-bear-trap', label: 'Trap', color: '#c0392b' },
  'through obstacles': { icon: 'ra-hole-ladder', label: 'Phase', color: '#3498db' },
};

/**
 * Parse effect text and return matching icon if found
 */
export function getEffectIcon(effectText: string): EffectIcon | null {
  const lowerText = effectText.toLowerCase();

  // Check for exact matches first
  for (const [key, icon] of Object.entries(EFFECT_ICONS)) {
    if (lowerText === key || lowerText.startsWith(key + ' ') || lowerText.includes(key)) {
      return icon;
    }
  }

  return null;
}

/**
 * Extract numeric value from effect text (e.g., "Push 2" -> 2)
 */
export function getEffectValue(effectText: string): number | null {
  const match = effectText.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Format effect for display - returns icon + value if applicable
 */
export function formatEffect(effectText: string): { icon: EffectIcon | null; value: number | null; text: string } {
  return {
    icon: getEffectIcon(effectText),
    value: getEffectValue(effectText),
    text: effectText,
  };
}
