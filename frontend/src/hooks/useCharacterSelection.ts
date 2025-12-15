/**
 * useCharacterSelection Hook
 *
 * Manages character selection state for the current player:
 * - Subscribes to RoomSessionManager for authoritative state (single source of truth)
 * - Provides action methods for add/remove/setActive operations
 * - Handles both persistent (UUID) and anonymous (class name) characters
 * - Uses ID-based operations preferentially with index-based for backward compatibility
 *
 * Follows the pattern established by useRoomSession and useInventory.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { roomSessionManager } from '../services/room-session.service';
import { websocketService } from '../services/websocket.service';
import { MAX_CHARACTERS_PER_PLAYER } from '../../../shared/constants/game';
import type { CharacterClass } from '../../../shared/types/entities';

/**
 * Selected character representation
 */
export interface SelectedCharacter {
  id: string;
  classType: CharacterClass;
  name?: string;
  level?: number;
}

/**
 * Return type for useCharacterSelection hook
 */
export interface UseCharacterSelectionReturn {
  /** List of selected characters for current player */
  selectedCharacters: SelectedCharacter[];
  /** Index of currently active character */
  activeCharacterIndex: number;
  /** Currently active character (convenience getter) */
  activeCharacter: SelectedCharacter | null;
  /** Whether player can add more characters */
  canAddMore: boolean;
  /** Maximum allowed characters */
  maxCharacters: number;
  /** Add a character (by UUID for persistent, class name for anonymous) */
  addCharacter: (characterIdOrClass: string) => void;
  /** Remove a character by its ID (preferred) */
  removeCharacter: (characterId: string) => void;
  /** Remove a character by index (deprecated, use removeCharacter) */
  removeCharacterByIndex: (index: number) => void;
  /** Set the active character by ID (preferred) */
  setActiveCharacter: (characterId: string) => void;
  /** Set the active character by index (deprecated, use setActiveCharacter) */
  setActiveCharacterByIndex: (index: number) => void;
  /** IDs of characters selected by other players (for disabling) */
  disabledCharacterIds: string[];
}

/**
 * Hook for managing character selection state
 *
 * @example
 * ```tsx
 * const {
 *   selectedCharacters,
 *   activeCharacterIndex,
 *   addCharacter,
 *   removeCharacter,
 *   setActiveCharacter,
 *   disabledCharacterIds,
 * } = useCharacterSelection();
 *
 * // Add a character
 * addCharacter('Brute'); // Anonymous user - class name
 * addCharacter('char-uuid-123'); // Authenticated user - persistent character ID
 *
 * // Remove by ID (preferred)
 * removeCharacter(selectedCharacters[0].id);
 *
 * // Set active by ID (preferred)
 * setActiveCharacter(selectedCharacters[1].id);
 * ```
 */
export function useCharacterSelection(): UseCharacterSelectionReturn {
  const [sessionState, setSessionState] = useState(roomSessionManager.getState());

  // Subscribe to session state changes
  useEffect(() => {
    const unsubscribe = roomSessionManager.subscribe(setSessionState);
    return unsubscribe;
  }, []);

  // Derive selected characters from session state
  const selectedCharacters = useMemo((): SelectedCharacter[] => {
    const { characterClasses, characterIds } = sessionState.currentPlayerCharacters;
    return characterClasses.map((classType, index) => ({
      id: characterIds[index] || classType, // Use class name as fallback ID for anonymous
      classType: classType,
    }));
  }, [sessionState.currentPlayerCharacters]);

  const activeCharacterIndex = sessionState.currentPlayerCharacters.activeIndex;

  const activeCharacter = useMemo(() => {
    return selectedCharacters[activeCharacterIndex] || null;
  }, [selectedCharacters, activeCharacterIndex]);

  // Calculate disabled character IDs (selected by other players)
  const disabledCharacterIds = useMemo((): string[] => {
    const currentPlayerId = websocketService.getPlayerUUID();
    return sessionState.players
      .filter(p => p.id !== currentPlayerId)
      .flatMap(p => {
        // Include both character IDs and character classes as disabled
        const classes = p.characterClasses || (p.characterClass ? [p.characterClass] : []);
        return classes;
      });
  }, [sessionState.players]);

  // Action: Add character
  const addCharacter = useCallback((characterIdOrClass: string) => {
    if (selectedCharacters.length >= MAX_CHARACTERS_PER_PLAYER) {
      console.warn('[useCharacterSelection] Cannot add more characters, limit reached');
      return;
    }

    // Check if already selected
    if (selectedCharacters.some(c => c.id === characterIdOrClass || c.classType === characterIdOrClass)) {
      console.warn('[useCharacterSelection] Character already selected');
      return;
    }

    // Check if disabled (selected by another player)
    if (disabledCharacterIds.includes(characterIdOrClass)) {
      console.warn('[useCharacterSelection] Character is already selected by another player');
      return;
    }

    websocketService.selectCharacter(characterIdOrClass, 'add');
  }, [selectedCharacters, disabledCharacterIds]);

  // Action: Remove character by ID (preferred)
  const removeCharacter = useCallback((characterId: string) => {
    const index = selectedCharacters.findIndex(c => c.id === characterId);
    if (index === -1) {
      console.warn('[useCharacterSelection] Character not found:', characterId);
      return;
    }
    // Use ID-based removal via WebSocket
    websocketService.emit('select_character', {
      action: 'remove',
      targetCharacterId: characterId,
    });
  }, [selectedCharacters]);

  // Action: Remove character by index (deprecated)
  const removeCharacterByIndex = useCallback((index: number) => {
    if (index < 0 || index >= selectedCharacters.length) {
      console.warn('[useCharacterSelection] Invalid index:', index);
      return;
    }
    console.warn('[useCharacterSelection] removeCharacterByIndex is deprecated, use removeCharacter with ID');
    websocketService.selectCharacter('', 'remove', index);
  }, [selectedCharacters.length]);

  // Action: Set active character by ID (preferred)
  const setActiveCharacter = useCallback((characterId: string) => {
    const index = selectedCharacters.findIndex(c => c.id === characterId);
    if (index === -1) {
      console.warn('[useCharacterSelection] Character not found for setActive:', characterId);
      return;
    }
    // Use ID-based set_active via WebSocket
    websocketService.emit('select_character', {
      action: 'set_active',
      targetCharacterId: characterId,
    });
  }, [selectedCharacters]);

  // Action: Set active character by index (deprecated)
  const setActiveCharacterByIndex = useCallback((index: number) => {
    if (index < 0 || index >= selectedCharacters.length) {
      console.warn('[useCharacterSelection] Invalid index for setActive:', index);
      return;
    }
    console.warn('[useCharacterSelection] setActiveCharacterByIndex is deprecated, use setActiveCharacter with ID');
    websocketService.selectCharacter('', 'set_active', index);
  }, [selectedCharacters.length]);

  return {
    selectedCharacters,
    activeCharacterIndex,
    activeCharacter,
    canAddMore: selectedCharacters.length < MAX_CHARACTERS_PER_PLAYER,
    maxCharacters: MAX_CHARACTERS_PER_PLAYER,
    addCharacter,
    removeCharacter,
    removeCharacterByIndex,
    setActiveCharacter,
    setActiveCharacterByIndex,
    disabledCharacterIds,
  };
}
