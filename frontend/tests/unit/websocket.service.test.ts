/**
 * Unit Tests: WebSocket Service - Authentication Error Handling
 *
 * Issue #290: WebSocket Retry Loop When Unauthenticated
 *
 * These tests verify that the WebSocket service properly handles
 * authentication errors and stops reconnection attempts when
 * AUTH_REQUIRED or AUTH_INVALID errors are received.
 *
 * TODO (Issue #419 MEDIUM-1): Refactor test architecture
 * - Extract MockSocket class into a shared test utility (e.g., tests/utils/mock-socket.ts)
 * - Reduce duplication of mock setup across test files
 * - Consider using a more centralized mock factory pattern
 * - This is a larger refactoring that should be addressed in a separate PR
 */

// Define event handler type for socket events
type SocketEventHandler = (...args: unknown[]) => void;

// Create a mock socket class that tracks handler registrations
class MockSocket {
  connected = false;
  io = {
    opts: {
      reconnection: true,
    },
  };

  connect = jest.fn();
  disconnect = jest.fn();

  // Mock emit method - for sending events TO server (not triggering handlers)
  emit = jest.fn();

  // Track registered event handlers for testing
  private registeredHandlers: Map<string, SocketEventHandler[]> = new Map();

  on(event: string, handler: SocketEventHandler): this {
    if (!this.registeredHandlers.has(event)) {
      this.registeredHandlers.set(event, []);
    }
    this.registeredHandlers.get(event)!.push(handler);
    return this;
  }

  off(event: string, handler?: SocketEventHandler): this {
    if (handler) {
      const handlers = this.registeredHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
      }
    } else {
      this.registeredHandlers.delete(event);
    }
    return this;
  }

  // Trigger an event (simulating server-side events coming FROM server)
  triggerEvent(event: string, ...args: unknown[]): void {
    const handlers = this.registeredHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(...args));
    }
  }
}

let mockSocketInstance: MockSocket;
const mockGetAccessToken: jest.Mock = jest.fn(() => 'mock-token');

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => {
    mockSocketInstance = new MockSocket();
    return mockSocketInstance;
  }),
}));

// Mock auth service with controllable token
jest.mock('../../src/services/auth.service', () => ({
  authService: {
    getAccessToken: () => mockGetAccessToken(),
    getUser: jest.fn(() => ({ id: 'test-user-id' })),
  },
}));

// Mock storage utility
jest.mock('../../src/utils/storage', () => ({
  saveLastRoomCode: jest.fn(),
}));

describe('WebSocketService - Authentication Error Handling', () => {
  let websocketService: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    mockGetAccessToken.mockReturnValue('mock-token');

    // Re-import the service fresh for each test
    const module = await import('../../src/services/websocket.service');
    websocketService = module.websocketService;
  });

  afterEach(() => {
    if (websocketService) {
      websocketService.disconnect();
    }
  });

  describe('AUTH_REQUIRED error handling', () => {
    it('should stop reconnection attempts when AUTH_REQUIRED error is received', () => {
      // Arrange
      websocketService.connect('http://localhost:3000');

      // Act - Simulate AUTH_REQUIRED error from server
      mockSocketInstance.triggerEvent('error', {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      });

      // Assert - Reconnection should be disabled
      expect(mockSocketInstance.io.opts.reconnection).toBe(false);
    });

    it('should set connection status to failed when AUTH_REQUIRED error is received', () => {
      // Arrange
      websocketService.connect('http://localhost:3000');

      // Act - Simulate connect then AUTH_REQUIRED error
      mockSocketInstance.connected = true;
      mockSocketInstance.triggerEvent('connect');
      mockSocketInstance.triggerEvent('error', {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      });

      // Assert
      expect(websocketService.getConnectionStatus()).toBe('failed');
    });

    it('should disconnect socket when AUTH_REQUIRED error is received', () => {
      // Arrange
      websocketService.connect('http://localhost:3000');

      // Act
      mockSocketInstance.triggerEvent('error', {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      });

      // Assert - Socket should be disconnected
      expect(mockSocketInstance.disconnect).toHaveBeenCalled();
    });

    it('should NOT retry connection after AUTH_REQUIRED error', () => {
      // Arrange
      websocketService.connect('http://localhost:3000');

      // Act - Simulate AUTH_REQUIRED error
      mockSocketInstance.triggerEvent('error', {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      });

      // Simulate disconnect event that would normally trigger reconnect
      mockSocketInstance.triggerEvent('disconnect', 'io server disconnect');

      // Assert - connect should not be called (reconnection blocked)
      expect(mockSocketInstance.connect).not.toHaveBeenCalled();
    });

    it('should set authFailed flag when AUTH_REQUIRED error is received', () => {
      // Arrange
      websocketService.connect('http://localhost:3000');

      // Act
      mockSocketInstance.triggerEvent('error', {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      });

      // Assert
      expect(websocketService.hasAuthFailed()).toBe(true);
    });
  });

  describe('AUTH_INVALID error handling', () => {
    it('should stop reconnection attempts when AUTH_INVALID error is received', () => {
      // Arrange
      websocketService.connect('http://localhost:3000');

      // Act - Simulate AUTH_INVALID error from server
      mockSocketInstance.triggerEvent('error', {
        code: 'AUTH_INVALID',
        message: 'Invalid or expired token',
      });

      // Assert - Reconnection should be disabled
      expect(mockSocketInstance.io.opts.reconnection).toBe(false);
    });

    it('should set connection status to failed when AUTH_INVALID error is received', () => {
      // Arrange
      websocketService.connect('http://localhost:3000');

      // Act
      mockSocketInstance.connected = true;
      mockSocketInstance.triggerEvent('connect');
      mockSocketInstance.triggerEvent('error', {
        code: 'AUTH_INVALID',
        message: 'Invalid or expired token',
      });

      // Assert
      expect(websocketService.getConnectionStatus()).toBe('failed');
    });

    it('should disconnect socket when AUTH_INVALID error is received', () => {
      // Arrange
      websocketService.connect('http://localhost:3000');

      // Act
      mockSocketInstance.triggerEvent('error', {
        code: 'AUTH_INVALID',
        message: 'Invalid or expired token',
      });

      // Assert
      expect(mockSocketInstance.disconnect).toHaveBeenCalled();
    });
  });

  describe('Normal error handling', () => {
    it('should NOT stop reconnection for non-auth errors', () => {
      // Arrange
      websocketService.connect('http://localhost:3000');
      const initialReconnection = mockSocketInstance.io.opts.reconnection;

      // Act - Simulate a non-auth error
      mockSocketInstance.triggerEvent('error', {
        code: 'SOME_OTHER_ERROR',
        message: 'Some other error',
      });

      // Assert - Reconnection should still be enabled
      expect(mockSocketInstance.io.opts.reconnection).toBe(initialReconnection);
    });

    it('should allow reconnection for generic errors without code', () => {
      // Arrange
      websocketService.connect('http://localhost:3000');
      const initialReconnection = mockSocketInstance.io.opts.reconnection;

      // Act - Simulate generic error
      mockSocketInstance.triggerEvent('error', {
        message: 'Connection timeout',
      });

      // Assert - Reconnection should still be enabled
      expect(mockSocketInstance.io.opts.reconnection).toBe(initialReconnection);
    });

    it('should NOT set authFailed for non-auth errors', () => {
      // Arrange
      websocketService.connect('http://localhost:3000');

      // Act
      mockSocketInstance.triggerEvent('error', {
        code: 'NETWORK_ERROR',
        message: 'Network error',
      });

      // Assert
      expect(websocketService.hasAuthFailed()).toBe(false);
    });
  });

  describe('No token available', () => {
    it('should not attempt connection when no access token is available', async () => {
      // Arrange - No token available
      mockGetAccessToken.mockReturnValue(null);

      // Need to reimport to get fresh instance
      jest.resetModules();
      const module = await import('../../src/services/websocket.service');
      const serviceNoToken = module.websocketService;

      // Act
      serviceNoToken.connect('http://localhost:3000');

      // Assert - Connection status should be failed
      expect(serviceNoToken.getConnectionStatus()).toBe('failed');
      expect(serviceNoToken.hasAuthFailed()).toBe(true);
    });

    it('should set authFailed when no token is available', async () => {
      // Arrange
      mockGetAccessToken.mockReturnValue(null);

      jest.resetModules();
      const module = await import('../../src/services/websocket.service');
      const serviceNoToken = module.websocketService;

      // Act
      serviceNoToken.connect('http://localhost:3000');

      // Assert
      expect(serviceNoToken.hasAuthFailed()).toBe(true);
    });
  });

  describe('Reset auth state', () => {
    it('should allow connection after resetAuthState is called', () => {
      // Arrange - First fail auth
      websocketService.connect('http://localhost:3000');
      mockSocketInstance.triggerEvent('error', {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      });

      expect(websocketService.hasAuthFailed()).toBe(true);

      // Act - Reset auth state (simulating user login)
      websocketService.resetAuthState();

      // Assert
      expect(websocketService.hasAuthFailed()).toBe(false);
      expect(websocketService.getConnectionStatus()).toBe('disconnected');
    });
  });

  describe('Connection state after auth error', () => {
    it('should prevent new emit calls after auth failure', () => {
      // Arrange
      websocketService.connect('http://localhost:3000');
      mockSocketInstance.connected = true;
      mockSocketInstance.triggerEvent('connect');

      // Act - Auth failure
      mockSocketInstance.triggerEvent('error', {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      });
      mockSocketInstance.connected = false;

      // Try to emit after auth failure
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      websocketService.emit('some_event', { data: 'test' });

      // Assert - Should warn and not emit
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot emit')
      );

      consoleSpy.mockRestore();
    });

    it('should block future connect attempts after auth failure', async () => {
      // Arrange
      websocketService.connect('http://localhost:3000');
      mockSocketInstance.triggerEvent('error', {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      });

      // Get the io mock to track calls
      const socketIoClient = await import('socket.io-client');
      const io = socketIoClient.io as jest.Mock;
      const initialCallCount = io.mock.calls.length;

      // Act - Try to connect again
      websocketService.connect('http://localhost:3000');

      // Assert - Should not create a new socket
      expect(io.mock.calls.length).toBe(initialCallCount);
    });
  });
});
