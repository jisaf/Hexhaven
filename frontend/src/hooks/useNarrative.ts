/**
 * Narrative Display Hook
 *
 * Thin wrapper around NarrativeStateService.
 * Components use this hook to subscribe to narrative state changes.
 * State is managed by the service, not the hook.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  narrativeStateService,
  type NarrativeState,
  type NarrativeAcknowledgment,
} from '../services/narrative-state.service';
import type { NarrativeDisplayPayload } from '../../../shared/types/events';
import type { NarrativeType } from '../../../shared/types/narrative';

export type { NarrativeAcknowledgment as NarrativeAcknowledgmentState };

export interface UseNarrativeResult {
  /** Currently active narrative, if any */
  activeNarrative: NarrativeDisplayPayload | null;
  /** Whether a narrative is currently being displayed */
  isDisplaying: boolean;
  /** Array of player acknowledgments */
  acknowledgments: NarrativeAcknowledgment[];
  /** Whether all players have acknowledged */
  allAcknowledged: boolean;
  /** Whether the current user has acknowledged */
  myAcknowledgment: boolean;
  /** Current narrative type */
  narrativeType: NarrativeType | null;
  /** Acknowledge the current narrative */
  acknowledge: () => void;
}

/**
 * Hook for subscribing to narrative display state.
 * State is managed by NarrativeStateService singleton.
 */
export function useNarrative(myPlayerId: string | null): UseNarrativeResult {
  const [state, setState] = useState<NarrativeState>(() =>
    narrativeStateService.getState(),
  );

  // Subscribe to state changes
  useEffect(() => {
    return narrativeStateService.subscribe(setState);
  }, []);

  // Computed values
  const isDisplaying = state.activeNarrative !== null;

  const allAcknowledged = useMemo(
    () => state.acknowledgments.every((a) => a.acknowledged),
    [state.acknowledgments],
  );

  const myAcknowledgment = useMemo(
    () =>
      myPlayerId
        ? state.acknowledgments.find((a) => a.playerId === myPlayerId)
            ?.acknowledged ?? false
        : false,
    [state.acknowledgments, myPlayerId],
  );

  const narrativeType = state.activeNarrative?.type ?? null;

  const acknowledge = useCallback(() => {
    if (myPlayerId) {
      narrativeStateService.acknowledge(myPlayerId);
    }
  }, [myPlayerId]);

  return {
    activeNarrative: state.activeNarrative,
    isDisplaying,
    acknowledgments: state.acknowledgments,
    allAcknowledged,
    myAcknowledgment,
    narrativeType,
    acknowledge,
  };
}

export default useNarrative;
