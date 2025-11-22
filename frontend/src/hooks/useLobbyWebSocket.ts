/**
 * useLobbyWebSocket Hook
 *
 * Manages WebSocket event listeners for the Lobby component.
 * Handles room_joined, player_joined/left, character_selected, game_started events.
 */

import { useEffect, useCallback } from 'react';
import { websocketService } from '../services/websocket.service';
import { roomSessionManager } from '../services/room-session.service';
import { getWebSocketUrl, logApiConfig } from '../config/api';
import { saveLastRoomCode } from '../utils/storage';
import { transformPlayers, transformPlayer, type RawPlayerData } from '../utils/playerTransformers';
import type { Player } from '../components/PlayerList';
import type { CharacterClass } from '../components/CharacterSelect';
import type { RoomJoinedPayload, GameStartedPayload } from '../../../shared/types/events';

interface LobbyWebSocketHandlers {
  onRoomJoined: (data: RoomJoinedData) => void;
  onPlayerJoined: (player: Player) => void;
  onPlayerLeft: (playerId: string) => void;
  onCharacterSelected: (playerId: string, characterClass: CharacterClass) => void;
  onGameStarted?: () => void;
  onError: (message: string) => void;
}

interface RoomJoinedData {
  roomCode: string;
  roomStatus: 'lobby' | 'active' | 'completed' | 'abandoned';
  players: Player[];
  playerId?: string;
  isHost?: boolean;
}

export function useLobbyWebSocket(handlers: LobbyWebSocketHandlers) {

  const handleRoomJoined = useCallback((data: RoomJoinedPayload) => {
    console.log('Room joined event received:', data);

    // Save room code to localStorage for GameBoard to use
    saveLastRoomCode(data.roomCode);

    // Update RoomSessionManager with room state
    roomSessionManager.onRoomJoined(data);

    // Transform players using utility
    const transformedPlayers = transformPlayers(data.players);

    handlers.onRoomJoined({
      roomCode: data.roomCode,
      roomStatus: data.roomStatus,
      players: transformedPlayers,
      playerId: undefined, // Not provided in RoomJoinedPayload - determined from players array
      isHost: undefined, // Not provided in RoomJoinedPayload - determined from players array
    });
  }, [handlers]);

  const handlePlayerJoined = useCallback((data: { player: RawPlayerData }) => {
    const transformedPlayer = transformPlayer(data.player);
    handlers.onPlayerJoined(transformedPlayer);
  }, [handlers]);

  const handlePlayerLeft = useCallback((data: { playerId: string }) => {
    handlers.onPlayerLeft(data.playerId);
  }, [handlers]);

  const handleCharacterSelected = useCallback((data: { playerId: string; characterClass: string }) => {
    handlers.onCharacterSelected(data.playerId, data.characterClass as CharacterClass);
  }, [handlers]);

  const handleGameStarted = useCallback((data: GameStartedPayload) => {
    console.log('Game started event received in Lobby');
    // Update RoomSessionManager with game state
    roomSessionManager.onGameStarted(data);
    // Notify Lobby component that game has started
    handlers.onGameStarted?.();
  }, [handlers]);

  const handleError = useCallback((data: { message: string }) => {
    handlers.onError(data.message);
  }, [handlers]);

  // Connect to WebSocket and setup event listeners
  useEffect(() => {
    // Log the API configuration for debugging
    logApiConfig();

    const wsUrl = getWebSocketUrl();
    websocketService.connect(wsUrl);

    // Setup event listeners
    websocketService.on('room_joined', handleRoomJoined);
    websocketService.on('player_joined', handlePlayerJoined);
    websocketService.on('player_left', handlePlayerLeft);
    websocketService.on('character_selected', handleCharacterSelected);
    websocketService.on('game_started', handleGameStarted);
    websocketService.on('error', handleError);

    return () => {
      // Cleanup
      websocketService.off('room_joined');
      websocketService.off('player_joined');
      websocketService.off('player_left');
      websocketService.off('character_selected');
      websocketService.off('game_started');
      websocketService.off('error');
    };
  }, [handleRoomJoined, handlePlayerJoined, handlePlayerLeft, handleCharacterSelected, handleGameStarted, handleError]);
}
