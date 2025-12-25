/**
 * Narrative Display Hook
 *
 * Manages narrative state for the campaign narrative system.
 * Handles WebSocket events for narrative display, acknowledgment, and dismissal.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { websocketService } from '../services/websocket.service';
import type {
  NarrativeDisplayPayload,
  NarrativeAcknowledgedPayload,
} from '../../../shared/types/events';
import type { NarrativeType } from '../../../shared/types/narrative';

export interface NarrativeAcknowledgmentState {
  playerId: string;
  playerName: string;
  acknowledged: boolean;
}

export interface UseNarrativeResult {
  /** Currently active narrative, if any */
  activeNarrative: NarrativeDisplayPayload | null;
  /** Whether a narrative is currently being displayed */
  isDisplaying: boolean;
  /** Map of player acknowledgments */
  acknowledgments: NarrativeAcknowledgmentState[];
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
 * Hook for managing narrative display state
 */
export function useNarrative(myPlayerId: string | null): UseNarrativeResult {
  const [activeNarrative, setActiveNarrative] =
    useState<NarrativeDisplayPayload | null>(null);
  const [acknowledgments, setAcknowledgments] = useState<
    NarrativeAcknowledgmentState[]
  >([]);

  /**
   * Handle narrative display event
   */
  const handleNarrativeDisplay = useCallback(
    (payload: NarrativeDisplayPayload) => {
      setActiveNarrative(payload);
      setAcknowledgments(
        payload.acknowledgments.map((a) => ({
          playerId: a.playerId,
          playerName: a.playerName,
          acknowledged: a.acknowledged,
        })),
      );
    },
    [],
  );

  /**
   * Handle player acknowledgment event
   */
  const handleNarrativeAcknowledged = useCallback(
    (payload: NarrativeAcknowledgedPayload) => {
      setAcknowledgments((prev) =>
        prev.map((a) =>
          a.playerId === payload.playerId ? { ...a, acknowledged: true } : a,
        ),
      );
    },
    [],
  );

  /**
   * Handle narrative dismissed event
   */
  const handleNarrativeDismissed = useCallback(
    (/* payload is unused but required by event signature */) => {
      setActiveNarrative(null);
      setAcknowledgments([]);
    },
    [],
  );

  /**
   * Subscribe to narrative events
   */
  useEffect(() => {
    websocketService.on('narrative_display', handleNarrativeDisplay);
    websocketService.on('narrative_acknowledged', handleNarrativeAcknowledged);
    websocketService.on('narrative_dismissed', handleNarrativeDismissed);

    return () => {
      websocketService.off('narrative_display', handleNarrativeDisplay);
      websocketService.off(
        'narrative_acknowledged',
        handleNarrativeAcknowledged,
      );
      websocketService.off('narrative_dismissed', handleNarrativeDismissed);
    };
  }, [
    handleNarrativeDisplay,
    handleNarrativeAcknowledged,
    handleNarrativeDismissed,
  ]);

  /**
   * Acknowledge the current narrative
   */
  const acknowledge = useCallback(() => {
    if (!activeNarrative) return;

    websocketService.emit('acknowledge_narrative', {
      narrativeId: activeNarrative.narrativeId,
    });
  }, [activeNarrative]);

  /**
   * Computed values
   */
  const isDisplaying = activeNarrative !== null;

  const allAcknowledged = useMemo(
    () => acknowledgments.every((a) => a.acknowledged),
    [acknowledgments],
  );

  const myAcknowledgment = useMemo(
    () =>
      myPlayerId
        ? acknowledgments.find((a) => a.playerId === myPlayerId)?.acknowledged ??
          false
        : false,
    [acknowledgments, myPlayerId],
  );

  const narrativeType = activeNarrative?.type ?? null;

  return {
    activeNarrative,
    isDisplaying,
    acknowledgments,
    allAcknowledged,
    myAcknowledgment,
    narrativeType,
    acknowledge,
  };
}

export default useNarrative;
