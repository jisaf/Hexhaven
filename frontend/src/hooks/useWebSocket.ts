/**
 * WebSocket Connection Hook
 *
 * Provides a React hook for managing WebSocket connection state.
 */

import { useState, useEffect, useCallback } from 'react';
import { websocketService, type ConnectionStatus } from '../services/websocket.service';
import { getWebSocketUrl } from '../config/api';

export function useWebSocket(url?: string) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isConnected, setIsConnected] = useState(false);

  /**
   * Handle connection state changes
   */
  const handleConnect = useCallback(() => {
    setConnectionStatus('connected');
    setIsConnected(true);
  }, []);

  const handleDisconnect = useCallback(() => {
    setConnectionStatus('disconnected');
    setIsConnected(false);
  }, []);

  const handleReconnecting = useCallback(() => {
    setConnectionStatus('reconnecting');
    setIsConnected(false);
  }, []);

  const handleReconnected = useCallback(() => {
    setConnectionStatus('connected');
    setIsConnected(true);
  }, []);

  /**
   * Connect to WebSocket on mount
   */
  useEffect(() => {
    // Setup connection event listeners
    websocketService.on('ws_connected', handleConnect);
    websocketService.on('ws_disconnected', handleDisconnect);
    websocketService.on('ws_reconnecting', handleReconnecting);
    websocketService.on('ws_reconnected', handleReconnected);

    // Update initial state using a microtask to avoid cascading renders
    queueMicrotask(() => {
      setConnectionStatus(websocketService.getConnectionStatus());
      setIsConnected(websocketService.isConnected());
    });

    // Cleanup on unmount
    return () => {
      websocketService.off('ws_connected', handleConnect);
      websocketService.off('ws_disconnected', handleDisconnect);
      websocketService.off('ws_reconnecting', handleReconnecting);
      websocketService.off('ws_reconnected', handleReconnected);
    };
  }, [url, handleConnect, handleDisconnect, handleReconnecting, handleReconnected]);

  /**
   * Manually reconnect
   */
  const reconnect = useCallback(() => {
    // Reconnect is now handled by the service, just trigger it.
    // The service knows the last URL it connected to.
    websocketService.reconnect();
  }, []);

  return {
    connectionStatus,
    isConnected,
    reconnect,
  };
}
