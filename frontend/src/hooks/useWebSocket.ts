/**
 * WebSocket Connection Hook
 *
 * Provides a React hook for managing WebSocket connection state.
 */

import { useState, useEffect, useCallback } from 'react';
import { websocketService, ConnectionStatus } from '../services/websocket.service';

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
    const wsUrl = url || import.meta.env.VITE_WS_URL || 'http://localhost:3000';
    websocketService.connect(wsUrl);

    // Setup connection event listeners
    websocketService.on('connect', handleConnect);
    websocketService.on('disconnect', handleDisconnect);
    websocketService.on('reconnecting', handleReconnecting);
    websocketService.on('reconnected', handleReconnected);

    // Update initial state
    setConnectionStatus(websocketService.getConnectionStatus());
    setIsConnected(websocketService.isConnected());

    // Cleanup on unmount
    return () => {
      websocketService.off('connect', handleConnect);
      websocketService.off('disconnect', handleDisconnect);
      websocketService.off('reconnecting', handleReconnecting);
      websocketService.off('reconnected', handleReconnected);
      websocketService.disconnect();
    };
  }, [url, handleConnect, handleDisconnect, handleReconnecting, handleReconnected]);

  /**
   * Manually reconnect
   */
  const reconnect = useCallback(() => {
    const wsUrl = url || import.meta.env.VITE_WS_URL || 'http://localhost:3000';
    websocketService.disconnect();
    websocketService.connect(wsUrl);
  }, [url]);

  return {
    connectionStatus,
    isConnected,
    reconnect,
  };
}
