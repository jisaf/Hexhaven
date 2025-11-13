/**
 * WebSocket Connection Context (US4 Integration)
 *
 * Manages WebSocket connection status and player disconnect/reconnect events.
 * Provides connection state and player event notifications to the application.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { websocketService, ConnectionStatus } from '../services/websocket.service';

interface PlayerConnectionEvent {
  playerId: string;
  playerName: string;
  timestamp: number;
}

interface WebSocketConnectionContextType {
  // Connection status
  connectionStatus: ConnectionStatus;
  isReconnecting: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;

  // Player disconnect/reconnect events
  disconnectedPlayers: PlayerConnectionEvent[];
  reconnectedPlayers: PlayerConnectionEvent[];

  // Methods to dismiss notifications
  dismissDisconnectedPlayer: (playerId: string) => void;
  dismissReconnectedPlayer: (playerId: string) => void;
}

const WebSocketConnectionContext = createContext<WebSocketConnectionContextType | undefined>(
  undefined
);

export function useWebSocketConnection() {
  const context = useContext(WebSocketConnectionContext);
  if (!context) {
    throw new Error(
      'useWebSocketConnection must be used within a WebSocketConnectionProvider'
    );
  }
  return context;
}

interface WebSocketConnectionProviderProps {
  children: React.ReactNode;
}

export function WebSocketConnectionProvider({ children }: WebSocketConnectionProviderProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [disconnectedPlayers, setDisconnectedPlayers] = useState<PlayerConnectionEvent[]>([]);
  const [reconnectedPlayers, setReconnectedPlayers] = useState<PlayerConnectionEvent[]>([]);

  // Setup connection status listeners
  useEffect(() => {
    const handleConnected = () => {
      setConnectionStatus('connected');
      setReconnectAttempts(0);
    };

    const handleDisconnected = () => {
      setConnectionStatus('disconnected');
    };

    const handleReconnecting = () => {
      setConnectionStatus('reconnecting');
      setReconnectAttempts(websocketService.getReconnectAttempts());
    };

    const handleReconnected = () => {
      setConnectionStatus('connected');
      setReconnectAttempts(0);
    };

    const handleError = (data: { message: string; code?: string }) => {
      if (data.code === 'RECONNECT_FAILED') {
        setConnectionStatus('failed');
      }
    };

    // Player disconnect/reconnect handlers
    const handlePlayerDisconnected = (data: { playerId: string; playerName: string }) => {
      console.log('Player disconnected event in context:', data);
      setDisconnectedPlayers((prev) => [
        ...prev,
        {
          playerId: data.playerId,
          playerName: data.playerName,
          timestamp: Date.now(),
        },
      ]);
    };

    const handlePlayerReconnected = (data: { playerId: string; playerName: string }) => {
      console.log('Player reconnected event in context:', data);

      // Remove from disconnected list
      setDisconnectedPlayers((prev) => prev.filter((p) => p.playerId !== data.playerId));

      // Add to reconnected list
      setReconnectedPlayers((prev) => [
        ...prev,
        {
          playerId: data.playerId,
          playerName: data.playerName,
          timestamp: Date.now(),
        },
      ]);
    };

    // Register event handlers
    websocketService.on('ws_connected', handleConnected);
    websocketService.on('ws_disconnected', handleDisconnected);
    websocketService.on('ws_reconnecting', handleReconnecting);
    websocketService.on('ws_reconnected', handleReconnected);
    websocketService.on('error', handleError);
    websocketService.on('player_disconnected', handlePlayerDisconnected);
    websocketService.on('player_reconnected', handlePlayerReconnected);

    // Initialize status
    setConnectionStatus(websocketService.getConnectionStatus());

    // Cleanup
    return () => {
      websocketService.off('ws_connected', handleConnected);
      websocketService.off('ws_disconnected', handleDisconnected);
      websocketService.off('ws_reconnecting', handleReconnecting);
      websocketService.off('ws_reconnected', handleReconnected);
      websocketService.off('error', handleError);
      websocketService.off('player_disconnected', handlePlayerDisconnected);
      websocketService.off('player_reconnected', handlePlayerReconnected);
    };
  }, []);

  const dismissDisconnectedPlayer = useCallback((playerId: string) => {
    setDisconnectedPlayers((prev) => prev.filter((p) => p.playerId !== playerId));
  }, []);

  const dismissReconnectedPlayer = useCallback((playerId: string) => {
    setReconnectedPlayers((prev) => prev.filter((p) => p.playerId !== playerId));
  }, []);

  const value: WebSocketConnectionContextType = {
    connectionStatus,
    isReconnecting: connectionStatus === 'reconnecting',
    reconnectAttempts,
    maxReconnectAttempts: websocketService.getMaxReconnectAttempts(),
    disconnectedPlayers,
    reconnectedPlayers,
    dismissDisconnectedPlayer,
    dismissReconnectedPlayer,
  };

  return (
    <WebSocketConnectionContext.Provider value={value}>
      {children}
    </WebSocketConnectionContext.Provider>
  );
}
