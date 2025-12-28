/**
 * Narrative State Service
 *
 * Singleton service that manages narrative state independently of component lifecycle.
 * Uses EAGER INITIALIZATION pattern to subscribe to WebSocket events immediately
 * on module load, preventing race conditions where events arrive before components mount.
 *
 * ARCHITECTURAL NOTE (Race Condition Fix):
 * Previously this service required an explicit initialize() call from App.tsx,
 * which created a gap between module load and initialization where events could be lost.
 * Now the constructor subscribes to WebSocket events immediately. The WebSocketService
 * queues handlers if the socket isn't connected yet, ensuring no events are lost.
 *
 * Components subscribe to state changes via the subscribe() method.
 */

import { websocketService } from './websocket.service';
import type {
  NarrativeDisplayPayload,
  NarrativeAcknowledgedPayload,
} from '../../../shared/types/events';
import type { NarrativeType } from '../../../shared/types/narrative';

export interface NarrativeAcknowledgment {
  playerId: string;
  playerName: string;
  acknowledged: boolean;
}

export interface NarrativeState {
  activeNarrative: NarrativeDisplayPayload | null;
  acknowledgments: NarrativeAcknowledgment[];
}

type StateSubscriber = (state: NarrativeState) => void;

class NarrativeStateService {
  private state: NarrativeState = { activeNarrative: null, acknowledgments: [] };
  private subscribers = new Set<StateSubscriber>();
  private unsubscribers: (() => void)[] = [];

  /**
   * Constructor - EAGER INITIALIZATION
   *
   * Subscribes to WebSocket events immediately on instantiation.
   * This prevents the race condition where events could arrive between
   * module load and explicit initialization.
   *
   * The WebSocketService.on() method queues handlers if socket isn't connected,
   * so this is safe to call before WebSocket connection is established.
   */
  constructor() {
    this.subscribeToWebSocket();
  }

  /**
   * Initialize the service.
   *
   * @deprecated No longer required - service now uses eager initialization.
   * Kept for backward compatibility. Safe to call - will be a no-op.
   */
  initialize(): void {
    // No-op: initialization now happens in constructor
    // Kept for backward compatibility with existing code that calls this
  }

  /**
   * Subscribe to WebSocket events.
   * This ensures we capture events regardless of component mount state.
   */
  private subscribeToWebSocket(): void {
    this.unsubscribers.push(
      websocketService.on('narrative_display', this.handleDisplay),
      websocketService.on('narrative_acknowledged', this.handleAcknowledged),
      websocketService.on('narrative_dismissed', this.handleDismissed),
    );
  }

  /**
   * Get current state synchronously.
   * Useful for initializing component state on mount.
   */
  getState(): NarrativeState {
    return this.state;
  }

  /**
   * Subscribe to state changes.
   * Immediately calls callback with current state.
   * Returns unsubscribe function.
   */
  subscribe(callback: StateSubscriber): () => void {
    this.subscribers.add(callback);
    // Immediately notify with current state
    callback(this.state);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Acknowledge the current narrative.
   * Emits to server - backend handles dismissal and queued narratives.
   */
  acknowledge(playerId: string): void {
    const activeNarrative = this.state.activeNarrative;
    if (!activeNarrative) return;

    // Mark as acknowledged locally for UI feedback
    this.state = {
      ...this.state,
      acknowledgments: this.state.acknowledgments.map((a) =>
        a.playerId === playerId ? { ...a, acknowledged: true } : a,
      ),
    };
    this.notify();

    // Emit acknowledgment to server - let backend handle dismissal
    // Backend will send narrative_dismissed, then any queued narrative_display
    websocketService.emit('acknowledge_narrative', {
      narrativeId: activeNarrative.narrativeId,
    });
  }

  /**
   * Reset state (call on game leave/room leave)
   */
  reset(): void {
    this.state = { activeNarrative: null, acknowledgments: [] };
    this.notify();
  }

  private notify(): void {
    this.subscribers.forEach((cb) => cb(this.state));
  }

  private handleDisplay = (payload: NarrativeDisplayPayload): void => {
    this.state = {
      activeNarrative: payload,
      acknowledgments: payload.acknowledgments.map((a) => ({
        playerId: a.playerId,
        playerName: a.playerName,
        acknowledged: a.acknowledged,
      })),
    };
    this.notify();
  };

  private handleAcknowledged = (payload: NarrativeAcknowledgedPayload): void => {
    this.state = {
      ...this.state,
      acknowledgments: this.state.acknowledgments.map((a) =>
        a.playerId === payload.playerId ? { ...a, acknowledged: true } : a,
      ),
    };
    this.notify();
  };

  private handleDismissed = (): void => {
    this.state = { activeNarrative: null, acknowledgments: [] };
    this.notify();
  };

  // Convenience getters for narrative type
  getNarrativeType(): NarrativeType | null {
    return this.state.activeNarrative?.type ?? null;
  }

  isDisplaying(): boolean {
    return this.state.activeNarrative !== null;
  }
}

// Export singleton instance
export const narrativeStateService = new NarrativeStateService();
