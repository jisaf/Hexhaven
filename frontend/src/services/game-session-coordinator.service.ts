/**
 * GameSessionCoordinator
 *
 * Centralized lifecycle coordinator for game sessions.
 * Orchestrates state transitions between RoomSessionManager and GameStateManager.
 *
 * Architecture Pattern: Facade Pattern
 * - Provides simplified interface to complex subsystem (two state managers)
 * - Coordinates lifecycle operations atomically
 * - Single entry point for session lifecycle
 *
 * Responsibilities:
 * - Coordinate lifecycle operations (switch, leave, reset)
 * - Ensure atomic state transitions
 * - Prevent partial state updates
 * - Provide debugging visibility
 *
 * Usage:
 *   gameSessionCoordinator.switchGame();  // When switching to different game
 *   gameSessionCoordinator.leaveGame();   // When leaving game but staying in room
 *   gameSessionCoordinator.resetAll();    // When logging out or hard reset
 */
import { roomSessionManager } from './room-session.service';
import { gameStateManager } from './game-state.service';
import { loggingService } from './logging.service';

interface SessionStatus {
    room: ReturnType<typeof roomSessionManager.getState>;
    game: ReturnType<typeof gameStateManager.getState>;
    timestamp: number;
}

type LifecycleEventType =
    | 'switching_game'
    | 'game_switched'
    | 'leaving_game'
    | 'game_left'
    | 'resetting_all'
    | 'all_reset';

interface LifecycleEvent {
    type: LifecycleEventType;
    timestamp: number;
    status?: SessionStatus;
}

class GameSessionCoordinator {
    private lifecycleHooks: Set<(event: LifecycleEvent) => void> = new Set();

    /**
     * Switch to a new game session
     * Resets both room and game state atomically
     *
     * Use when:
     * - Navigating to lobby to join/create different room
     * - Switching between different game sessions
     * - Initial page load that needs clean slate
     *
     * Order matters:
     * 1. Room first (disconnects from old session)
     * 2. Game second (clears gameplay data)
     */
    public switchGame(): void {
        loggingService.log('State', 'Switching game - resetting all state');

        this.emitLifecycleEvent({
            type: 'switching_game',
            timestamp: Date.now(),
            status: this.getSessionStatus()
        });

        try {
            // Order matters: room first (disconnects), then game (clears data)
            roomSessionManager.switchRoom();
            gameStateManager.reset();

            this.emitLifecycleEvent({
                type: 'game_switched',
                timestamp: Date.now(),
                status: this.getSessionStatus()
            });

            loggingService.log('State', '✅ Switch complete');
        } catch (error) {
            loggingService.error('State', '❌ Switch failed:', error);
            throw error;
        }
    }

    /**
     * Leave current game but stay in room/lobby
     * Resets game state only, keeps room connection
     *
     * Use when:
     * - Game ends and returning to lobby
     * - Player wants to spectate instead of play
     * - Scenario completion
     */
    public leaveGame(): void {
        loggingService.log('State', 'Leaving game - resetting game state');

        this.emitLifecycleEvent({
            type: 'leaving_game',
            timestamp: Date.now()
        });

        try {
            gameStateManager.reset();
            roomSessionManager.clearGameState();

            this.emitLifecycleEvent({
                type: 'game_left',
                timestamp: Date.now()
            });

            loggingService.log('State', '✅ Left game');
        } catch (error) {
            loggingService.error('State', '❌ Leave failed:', error);
            throw error;
        }
    }

    /**
     * Complete reset of all session state
     * Resets both room and game state to initial values
     *
     * Use when:
     * - User logs out
     * - Hard reset needed for debugging
     * - Clearing all data for new anonymous session
     */
    public resetAll(): void {
        loggingService.log('State', 'Full reset - clearing all state');

        this.emitLifecycleEvent({
            type: 'resetting_all',
            timestamp: Date.now()
        });

        try {
            roomSessionManager.reset();
            gameStateManager.reset();

            this.emitLifecycleEvent({
                type: 'all_reset',
                timestamp: Date.now()
            });

            loggingService.log('State', '✅ Full reset complete');
        } catch (error) {
            loggingService.error('State', '❌ Reset failed:', error);
            throw error;
        }
    }

    /**
     * Get combined session status
     * Useful for debugging, logging, and diagnostics
     *
     * @returns Current state of both managers with timestamp
     */
    public getSessionStatus(): SessionStatus {
        return {
            room: roomSessionManager.getState(),
            game: gameStateManager.getState(),
            timestamp: Date.now()
        };
    }

    /**
     * Subscribe to lifecycle events
     * Allows components to react to lifecycle transitions
     *
     * @param handler - Callback function to handle lifecycle events
     * @returns Unsubscribe function
     */
    public onLifecycleEvent(handler: (event: LifecycleEvent) => void): () => void {
        this.lifecycleHooks.add(handler);
        return () => this.lifecycleHooks.delete(handler);
    }

    /**
     * Emit lifecycle event to all subscribers
     * @private
     */
    private emitLifecycleEvent(event: LifecycleEvent): void {
        this.lifecycleHooks.forEach(handler => {
            try {
                handler(event);
            } catch (error) {
                loggingService.error('Default', 'Error in lifecycle hook:', error);
            }
        });
    }
}

// Export singleton instance
export const gameSessionCoordinator = new GameSessionCoordinator();
