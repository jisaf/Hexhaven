/**
 * useGameWebSocket Hook
 *
 * Manages WebSocket event listeners for the GameBoard component.
 * Handles game_started, character_moved, turn_started, game_state_update events.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { websocketService } from '../services/websocket.service';
import { roomSessionManager } from '../services/room-session.service';
import { getLastRoomCode, getPlayerUUID, getPlayerNickname } from '../utils/storage';
import type { Axial } from '../game/hex-utils';
import type { GameStartedPayload } from '../../../shared/types/events';

interface GameWebSocketHandlers {
  onGameStarted: (data: GameStartedPayload, ackCallback?: (ack: boolean) => void) => void;
  onCharacterMoved: (data: CharacterMovedData) => void;
  onTurnStarted: (data: TurnStartedData) => void;
  onGameStateUpdate: (data: { gameState: unknown }) => void;
  onConnectionStatusChange: (status: 'connected' | 'disconnected' | 'reconnecting') => void;
}

interface CharacterMovedData {
  characterId: string;
  fromHex: Axial;
  toHex: Axial;
  movementPath: Axial[];
}

interface TurnStartedData {
  turnIndex: number;
  entityId: string;
  entityType: 'character' | 'monster';
}

export function useGameWebSocket(handlers: GameWebSocketHandlers) {
  const navigate = useNavigate();
  const hasEnsuredJoin = useRef(false); // Track if we've already called ensureJoined
  const handlersRef = useRef(handlers); // Store handlers in a ref to avoid recreating callbacks

  // Update ref when handlers change (without triggering useEffect re-run)
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const handleGameStarted = useCallback((data: GameStartedPayload, ackCallback?: (ack: boolean) => void) => {
    console.log('handleGameStarted called with data:', data);
    handlersRef.current.onGameStarted(data, ackCallback);
  }, []);

  const handleCharacterMoved = useCallback((data: CharacterMovedData) => {
    handlersRef.current.onCharacterMoved(data);
  }, []);

  const handleTurnStarted = useCallback((data: TurnStartedData) => {
    console.log('handleNextTurn called with data:', data);
    handlersRef.current.onTurnStarted(data);
  }, []);

  const handleGameStateUpdate = useCallback((data: { gameState: unknown }) => {
    handlersRef.current.onGameStateUpdate(data);
  }, []);

  const handleWsConnected = useCallback(() => {
    handlersRef.current.onConnectionStatusChange('connected');
  }, []);

  const handleWsDisconnected = useCallback(() => {
    handlersRef.current.onConnectionStatusChange('disconnected');
    roomSessionManager.onDisconnected();
  }, []);

  const handleWsReconnecting = useCallback(() => {
    handlersRef.current.onConnectionStatusChange('reconnecting');
  }, []);

  // Setup WebSocket event listeners and ensure joined to room
  useEffect(() => {
    console.log('🔧 Setting up WebSocket listeners and ensuring room join');

    // Step 1: Register all event listeners FIRST
    console.log('📡 Registering WebSocket event listeners...');

    // Connection status
    const unsubscribeWsConnected = websocketService.on('ws_connected', handleWsConnected);
    const unsubscribeWsDisconnected = websocketService.on('ws_disconnected', handleWsDisconnected);
    const unsubscribeWsReconnecting = websocketService.on('ws_reconnecting', handleWsReconnecting);

    // Game events
    console.log('✅ Registering game_started event listener');
    const unsubscribeGameStarted = websocketService.on('game_started', handleGameStarted);
    const unsubscribeCharacterMoved = websocketService.on('character_moved', handleCharacterMoved);
    const unsubscribeTurnStarted = websocketService.on('turn_started', handleTurnStarted);
    const unsubscribeGameStateUpdate = websocketService.on('game_state_update', handleGameStateUpdate);
    console.log('✅ All event listeners registered');

    // Step 2: Get room info from localStorage
    const roomCode = getLastRoomCode();
    const playerUUID = getPlayerUUID();
    const nickname = getPlayerNickname();

    if (!roomCode || !playerUUID || !nickname) {
      console.error('❌ Cannot join room - missing roomCode, playerUUID, or nickname');
      navigate('/');
      return;
    }

    console.log(`🔄 GameBoard mounted - ensuring joined to room ${roomCode}`);

    // Step 3: Ensure joined via RoomSessionManager (only once per component lifetime)
    if (!hasEnsuredJoin.current) {
      hasEnsuredJoin.current = true;
      console.log('🔄 Calling ensureJoined(refresh) for the first time');
      roomSessionManager.ensureJoined('refresh').catch((error) => {
        console.error('❌ Failed to join room:', error);
        navigate('/'); // Return to lobby on error
      });
    } else {
      console.log('⏭️  Skipping ensureJoined - already called in this component lifetime');
    }

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up WebSocket listeners');
      unsubscribeWsConnected();
      unsubscribeWsDisconnected();
      unsubscribeWsReconnecting();
      unsubscribeGameStarted();
      unsubscribeCharacterMoved();
      unsubscribeTurnStarted();
      unsubscribeGameStateUpdate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]); // Only navigate can change, handlers are in ref to prevent re-registration
}
