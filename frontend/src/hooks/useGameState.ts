/**
 * Game State Management Hook
 *
 * Provides centralized game state management with React hooks.
 * Syncs with WebSocket updates and provides local state management.
 */

import { useState, useEffect, useCallback } from 'react';
import { websocketService } from '../services/websocket.service';

export interface Player {
  id: string;
  nickname: string;
  characterClass?: string;
  isHost: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

export interface GameRoom {
  roomCode: string;
  status: 'lobby' | 'active' | 'completed' | 'abandoned';
  players: Player[];
  scenarioId?: string;
}

export interface GameState {
  room: GameRoom | null;
  currentPlayerId: string | null;
  turnOrder: string[];
  currentTurnIndex: number;
  currentRound: number;
}

const initialState: GameState = {
  room: null,
  currentPlayerId: null,
  turnOrder: [],
  currentTurnIndex: 0,
  currentRound: 1,
};

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle room joined event
   */
  const handleRoomJoined = useCallback((data: { roomCode: string; players: unknown[] }) => {
    setGameState((prev) => ({
      ...prev,
      room: {
        roomCode: data.roomCode,
        status: 'lobby',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        players: data.players as any[],
      },
    }));
    setIsLoading(false);
  }, []);

  /**
   * Handle player joined event
   */
  const handlePlayerJoined = useCallback((data: { player: unknown }) => {
    setGameState((prev) => ({
      ...prev,
      room: prev.room
        ? {
            ...prev.room,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            players: [...prev.room.players, data.player as any],
          }
        : null,
    }));
  }, []);

  /**
   * Handle player left event
   */
  const handlePlayerLeft = useCallback((data: { playerId: string }) => {
    setGameState((prev) => ({
      ...prev,
      room: prev.room
        ? {
            ...prev.room,
            players: prev.room.players.filter((p) => p.id !== data.playerId),
          }
        : null,
    }));
  }, []);

  /**
   * Handle character selected event
   */
  const handleCharacterSelected = useCallback(
    (data: { playerId: string; characterClass: string }) => {
      setGameState((prev) => ({
        ...prev,
        room: prev.room
          ? {
              ...prev.room,
              players: prev.room.players.map((p) =>
                p.id === data.playerId ? { ...p, characterClass: data.characterClass } : p
              ),
            }
          : null,
      }));
    },
    []
  );

  /**
   * Handle game started event
   */
  const handleGameStarted = useCallback((data: {
    scenarioId: string;
    scenarioName: string;
    mapLayout: { coordinates: { q: number; r: number }; terrain: string; occupiedBy: string | null; hasLoot: boolean; hasTreasure: boolean }[];
    monsters: { id: string; monsterType: string; isElite: boolean; currentHex: { q: number; r: number }; health: number; maxHealth: number; conditions: string[] }[];
    characters: { id: string; playerId: string; classType: string; health: number; maxHealth: number; currentHex: { q: number; r: number }; conditions: string[]; isExhausted: boolean }[]
  }) => {
    setGameState((prev) => ({
      ...prev,
      room: prev.room ? { ...prev.room, status: 'active', scenarioId: data.scenarioId } : null,
      turnOrder: [],
      currentTurnIndex: 0,
      currentRound: 1,
    }));
  }, []);

  /**
   * Handle turn order determined event
   */
  const handleTurnOrderDetermined = useCallback((data: { turnOrder: string[] }) => {
    setGameState((prev) => ({
      ...prev,
      turnOrder: data.turnOrder,
      currentTurnIndex: 0,
    }));
  }, []);

  /**
   * Handle turn started event
   */
  const handleTurnStarted = useCallback(
    (data: { entityId: string; entityType: 'character' | 'monster'; turnIndex: number }) => {
      setGameState((prev) => ({
        ...prev,
        currentTurnIndex: data.turnIndex,
      }));
    },
    []
  );

  /**
   * Handle game state update event
   */
  const handleGameStateUpdate = useCallback((data: { gameState: unknown }) => {
    setGameState((prev) => ({
      ...prev,
      ...(data.gameState as Partial<GameState>),
    }));
  }, []);

  /**
   * Handle error event
   */
  const handleError = useCallback((data: { message: string }) => {
    setError(data.message);
    setIsLoading(false);
  }, []);

  /**
   * Setup WebSocket event listeners
   */
  useEffect(() => {
    websocketService.on('room_joined', handleRoomJoined);
    websocketService.on('player_joined', handlePlayerJoined);
    websocketService.on('player_left', handlePlayerLeft);
    websocketService.on('character_selected', handleCharacterSelected);
    websocketService.on('game_started', handleGameStarted);
    websocketService.on('turn_order_determined', handleTurnOrderDetermined);
    websocketService.on('turn_started', handleTurnStarted);
    websocketService.on('game_state_update', handleGameStateUpdate);
    websocketService.on('error', handleError);

    return () => {
      websocketService.off('room_joined', handleRoomJoined);
      websocketService.off('player_joined', handlePlayerJoined);
      websocketService.off('player_left', handlePlayerLeft);
      websocketService.off('character_selected', handleCharacterSelected);
      websocketService.off('game_started', handleGameStarted);
      websocketService.off('turn_order_determined', handleTurnOrderDetermined);
      websocketService.off('turn_started', handleTurnStarted);
      websocketService.off('game_state_update', handleGameStateUpdate);
      websocketService.off('error', handleError);
    };
  }, [
    handleRoomJoined,
    handlePlayerJoined,
    handlePlayerLeft,
    handleCharacterSelected,
    handleGameStarted,
    handleTurnOrderDetermined,
    handleTurnStarted,
    handleGameStateUpdate,
    handleError,
  ]);

  /**
   * Join a game room
   */
  const joinRoom = useCallback((roomCode: string, nickname: string, uuid?: string) => {
    setIsLoading(true);
    setError(null);
    websocketService.joinRoom(roomCode, nickname, uuid);
  }, []);

  /**
   * Leave current room
   */
  const leaveRoom = useCallback(() => {
    websocketService.leaveRoom();
    setGameState(initialState);
  }, []);

  /**
   * Select character
   */
  const selectCharacter = useCallback((characterClass: string) => {
    websocketService.selectCharacter(characterClass);
  }, []);

  /**
   * Start game (host only)
   */
  const startGame = useCallback(() => {
    websocketService.startGame();
  }, []);

  /**
   * Check if it's the current player's turn
   */
  const isMyTurn = useCallback((): boolean => {
    if (!gameState.currentPlayerId || gameState.turnOrder.length === 0) {
      return false;
    }
    const currentEntityId = gameState.turnOrder[gameState.currentTurnIndex];
    return currentEntityId === gameState.currentPlayerId;
  }, [gameState]);

  /**
   * Get current player
   */
  const getCurrentPlayer = useCallback((): Player | null => {
    if (!gameState.room || !gameState.currentPlayerId) {
      return null;
    }
    return gameState.room.players.find((p) => p.id === gameState.currentPlayerId) || null;
  }, [gameState]);

  return {
    gameState,
    isLoading,
    error,
    joinRoom,
    leaveRoom,
    selectCharacter,
    startGame,
    isMyTurn,
    getCurrentPlayer,
  };
}
