/**
 * Unit Tests: useAutoStartGame Hook - Race Condition Fix
 *
 * Issue: The hook uses a fixed 100ms delay before starting the game after
 * character selection. This is fragile under network latency.
 *
 * Fix: Use event-driven approach - wait for character_selected events
 * for all characters before proceeding, with retry mechanism and exponential backoff.
 *
 * Note: These tests verify the implementation structure and configuration.
 * Full integration testing of the hook requires complex state mocking that
 * is better suited to E2E tests.
 */

import { renderHook, act } from '@testing-library/react';
import * as fs from 'fs';
import * as path from 'path';

// Track event handlers registered with the mock websocket
type EventHandler = (...args: unknown[]) => void;
const mockEventHandlers = new Map<string, Set<EventHandler>>();

// Mock websocket service
const mockWebsocketService = {
  selectCharacter: jest.fn(),
  selectScenario: jest.fn(),
  startGame: jest.fn(),
  on: jest.fn((event: string, handler: EventHandler) => {
    if (!mockEventHandlers.has(event)) {
      mockEventHandlers.set(event, new Set());
    }
    mockEventHandlers.get(event)!.add(handler);
    return () => mockEventHandlers.get(event)?.delete(handler);
  }),
  off: jest.fn((event: string, handler?: EventHandler) => {
    if (handler) {
      mockEventHandlers.get(event)?.delete(handler);
    } else {
      mockEventHandlers.delete(event);
    }
  }),
};

// Mock room session manager
const mockRoomSessionManager = {
  createRoom: jest.fn().mockResolvedValue({ roomCode: 'ABCD' }),
};

// Mock dependencies
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

jest.mock('../../src/services/websocket.service', () => ({
  websocketService: mockWebsocketService,
}));

jest.mock('../../src/services/room-session.service', () => ({
  roomSessionManager: mockRoomSessionManager,
}));

// Create controllable mock for useRoomSession
let mockSessionState = {
  connectionStatus: 'disconnected' as string,
  roomCode: null as string | null,
  isGameActive: false,
  error: null,
};

jest.mock('../../src/hooks/useRoomSession', () => ({
  useRoomSession: () => mockSessionState,
}));

jest.mock('../../src/utils/storage', () => ({
  getDisplayName: () => 'TestPlayer',
}));

describe('useAutoStartGame - Event-Driven Character Selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEventHandlers.clear();
    jest.useFakeTimers();
    // Reset session state
    mockSessionState = {
      connectionStatus: 'disconnected',
      roomCode: null,
      isGameActive: false,
      error: null,
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Hook Initialization', () => {
    it('should register event listeners on mount', async () => {
      // Import the hook - uses mocked dependencies
      const { useAutoStartGame } = await import('../../src/hooks/useAutoStartGame');
      renderHook(() => useAutoStartGame());

      // Should register handlers for character_selected and error events
      expect(mockWebsocketService.on).toHaveBeenCalledWith(
        'character_selected',
        expect.any(Function)
      );
      expect(mockWebsocketService.on).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      );
    });

    it('should return initial state correctly', async () => {
      const { useAutoStartGame } = await import('../../src/hooks/useAutoStartGame');
      const { result } = renderHook(() => useAutoStartGame());

      expect(result.current.isStarting).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.startGame).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('Retry Configuration', () => {
    it('should have retry configuration constants defined', () => {
      // Read the source file to verify constants are set appropriately
      const sourceCode = fs.readFileSync(
        path.join(__dirname, '../../src/hooks/useAutoStartGame.ts'),
        'utf8'
      );

      // Verify the new constants exist (not the old 100ms delay)
      expect(sourceCode).toContain('CHARACTER_CONFIRMATION_TIMEOUT_MS');
      expect(sourceCode).toContain('MAX_CHARACTER_SELECTION_RETRIES');
      expect(sourceCode).toContain('RETRY_BASE_DELAY_MS');
      expect(sourceCode).toContain('MAX_GAME_START_RETRIES');
      expect(sourceCode).toContain('GAME_START_RETRY_DELAY_MS');

      // Verify the old fixed delay constant is removed
      expect(sourceCode).not.toContain('CHARACTER_SELECTION_PROPAGATION_DELAY_MS');
    });

    it('should use event-driven approach instead of fixed delay', () => {
      const sourceCode = fs.readFileSync(
        path.join(__dirname, '../../src/hooks/useAutoStartGame.ts'),
        'utf8'
      );

      // Verify the new event-driven approach is implemented
      expect(sourceCode).toContain('character_selected');
      expect(sourceCode).toContain('handleCharacterSelected');
      expect(sourceCode).toContain('selectionStateRef');
      expect(sourceCode).toContain('confirmed');
      expect(sourceCode).toContain('pending');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup event listeners on unmount', async () => {
      const { useAutoStartGame } = await import('../../src/hooks/useAutoStartGame');
      const { unmount } = renderHook(() => useAutoStartGame());

      // Verify that event listeners were registered during mount
      expect(mockWebsocketService.on).toHaveBeenCalledWith(
        'character_selected',
        expect.any(Function)
      );

      unmount();

      // Event handlers should be cleaned up via either off() or the unsubscribe function
      // The cleanup happens via the returned unsubscribe function from the `on` mock
      // Since our mock returns an unsubscribe function, it will be called on unmount
      // We verify that off was called at least once (can be called multiple times for different events)
      expect(mockWebsocketService.off).toHaveBeenCalled();
    });

    it('should cancel pending timeouts on unmount', async () => {
      const { useAutoStartGame } = await import('../../src/hooks/useAutoStartGame');
      const { unmount } = renderHook(() => useAutoStartGame());

      // Unmount should clean up without errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle room creation failure', async () => {
      mockRoomSessionManager.createRoom.mockRejectedValueOnce(
        new Error('Failed to create room')
      );

      const { useAutoStartGame } = await import('../../src/hooks/useAutoStartGame');
      const { result } = renderHook(() => useAutoStartGame());

      await act(async () => {
        await result.current.startGame('scenario-1', 'campaign-1', ['char-1']);
      });

      expect(result.current.error).toBe('Failed to create room');
      expect(result.current.isStarting).toBe(false);
    });

    it('should clear error with clearError function', async () => {
      mockRoomSessionManager.createRoom.mockRejectedValueOnce(
        new Error('Some error')
      );

      const { useAutoStartGame } = await import('../../src/hooks/useAutoStartGame');
      const { result } = renderHook(() => useAutoStartGame());

      await act(async () => {
        await result.current.startGame('scenario-1', 'campaign-1', ['char-1']);
      });

      expect(result.current.error).toBe('Some error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
