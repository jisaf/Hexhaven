/**
 * useRoomManagement Hook
 *
 * Manages room creation, fetching active rooms, and player's current room.
 * Handles REST API calls for room operations.
 */

import { useState, useCallback, useEffect } from 'react';
import { getApiUrl } from '../config/api';
import { roomSessionManager } from '../services/room-session.service';
import { websocketService } from '../services/websocket.service';
import {
  getOrCreatePlayerUUID,
  getPlayerUUID,
  savePlayerNickname,
  saveLastRoomCode,
  getPlayerNickname
} from '../utils/storage';

export interface ActiveRoom {
  roomCode: string;
  status: string;
  playerCount: number;
  maxPlayers: number;
  hostNickname: string;
  createdAt: string;
}

export interface RoomWithPlayers {
  room: {
    id: string;
    roomCode: string;
    status: string;
    scenarioId?: string;
    playerCount: number;
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
  };
  players: {
    id: string;
    uuid: string;
    nickname: string;
    isHost: boolean;
    characterClass?: string;
    connectionStatus: string;
  }[];
}

interface UseRoomManagementOptions {
  mode: string;
  onRoomCreated?: () => void;
}

export function useRoomManagement(options: UseRoomManagementOptions) {
  const { mode, onRoomCreated } = options;

  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [myRoom, setMyRoom] = useState<ActiveRoom | null>(null);
  const [myRooms, setMyRooms] = useState<RoomWithPlayers[]>([]); // All rooms player is in
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all rooms player is in (multi-room support)
  const fetchMyRooms = useCallback(async () => {
    const uuid = getPlayerUUID();
    if (!uuid) return;

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/rooms/my-rooms/${uuid}`);

      if (response.ok) {
        const data: { rooms: RoomWithPlayers[] } = await response.json();
        setMyRooms(data.rooms || []);

        // Also set myRoom to the first room for backwards compatibility
        if (data.rooms && data.rooms.length > 0) {
          const firstRoom = data.rooms[0];
          const hostPlayer = firstRoom.players.find((p) => p.isHost);
          setMyRoom({
            roomCode: firstRoom.room.roomCode,
            status: firstRoom.room.status,
            playerCount: firstRoom.room.playerCount,
            maxPlayers: 4,
            hostNickname: hostPlayer?.nickname || 'Unknown',
            createdAt: firstRoom.room.createdAt,
          });
        } else {
          setMyRoom(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch my rooms:', err);
      // Silently fail
    }
  }, []);

  // Fetch active rooms
  const fetchActiveRooms = useCallback(async () => {
    if (mode !== 'initial') return; // Only fetch when in initial mode

    try {
      setLoadingRooms(true);
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/rooms`);

      if (response.ok) {
        const data = await response.json();
        setActiveRooms(data.rooms || []);
      }
    } catch (err) {
      console.error('Failed to fetch active rooms:', err);
      // Silently fail - not critical to the user experience
    } finally {
      setLoadingRooms(false);
    }
  }, [mode]);

  // Create room
  const createRoom = useCallback(async (playerNickname: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Switch room context to prepare for new room (keeps old room membership)
      if (websocketService.isConnected()) {
        console.log('Switching to new room context (keeping old room membership)');
        roomSessionManager.switchRoom();

        // Wait a brief moment for the state transition
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Get or create UUID
      const uuid = getOrCreatePlayerUUID();

      console.log('Creating room for:', { uuid, nickname: playerNickname });

      // Call REST API to create room
      const apiUrl = getApiUrl();
      console.log('API URL:', apiUrl);

      // Add timeout to fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        console.log('Starting fetch request...');
        const response = await fetch(`${apiUrl}/rooms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ uuid, nickname: playerNickname }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        console.log('API Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('API Error:', errorData);
          throw new Error('Failed to create room');
        }

        const data = await response.json();
        console.log('Room created:', data);

        // Store room code and nickname
        saveLastRoomCode(data.room.roomCode);
        savePlayerNickname(playerNickname);

        // Wait for WebSocket connection and join room
        const waitForConnection = () => {
          return new Promise<void>((resolve) => {
            if (websocketService.isConnected()) {
              console.log('WebSocket already connected');
              resolve();
            } else {
              console.log('Waiting for WebSocket connection...');
              const checkConnection = setInterval(() => {
                if (websocketService.isConnected()) {
                  console.log('WebSocket connected');
                  clearInterval(checkConnection);
                  resolve();
                }
              }, 100);

              setTimeout(() => {
                clearInterval(checkConnection);
                console.error('WebSocket connection timeout');
                resolve();
              }, 5000);
            }
          });
        };

        await waitForConnection();
        await roomSessionManager.ensureJoined('create');

        setIsLoading(false);
        onRoomCreated?.();
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error('Request timeout');
          throw new Error('Request timed out. Please check your connection.');
        }
        throw fetchError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
      setIsLoading(false);
      throw err;
    }
  }, [onRoomCreated]);

  // Join room
  const joinRoom = useCallback(async (roomCode: string, playerNickname: string) => {
    setIsLoading(true);
    setError(null);

    // Switch room context to prepare for joining (keeps old room membership)
    if (websocketService.isConnected()) {
      console.log('Switching to new room context (keeping old room membership)');
      roomSessionManager.switchRoom();

      // Wait a brief moment for the state transition
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Get or create UUID (stored in localStorage)
    getOrCreatePlayerUUID();

    // Store nickname and roomCode for RoomSessionManager
    savePlayerNickname(playerNickname);
    saveLastRoomCode(roomCode);

    // Wait for WebSocket connection before joining room
    const waitForConnection = () => {
      return new Promise<void>((resolve) => {
        if (websocketService.isConnected()) {
          console.log('WebSocket already connected');
          resolve();
        } else {
          console.log('Waiting for WebSocket connection...');
          const checkConnection = setInterval(() => {
            if (websocketService.isConnected()) {
              console.log('WebSocket connected');
              clearInterval(checkConnection);
              resolve();
            }
          }, 100);

          setTimeout(() => {
            clearInterval(checkConnection);
            console.error('WebSocket connection timeout');
            resolve();
          }, 5000);
        }
      });
    };

    await waitForConnection();
    await roomSessionManager.ensureJoined('join');
  }, []);

  // Rejoin existing room
  const rejoinRoom = useCallback(async () => {
    if (!myRoom) return;

    const storedNickname = getPlayerNickname();
    const uuid = getPlayerUUID();

    if (storedNickname && uuid) {
      setIsLoading(true);
      setError(null);

      const waitForConnection = () => {
        return new Promise<void>((resolve) => {
          if (websocketService.isConnected()) {
            resolve();
          } else {
            const checkConnection = setInterval(() => {
              if (websocketService.isConnected()) {
                clearInterval(checkConnection);
                resolve();
              }
            }, 100);

            setTimeout(() => {
              clearInterval(checkConnection);
              resolve();
            }, 5000);
          }
        });
      };

      await waitForConnection();
      await roomSessionManager.ensureJoined('rejoin');
    }
  }, [myRoom]);

  // Fetch my rooms on mount (multi-room support)
  useEffect(() => {
    fetchMyRooms();
  }, [fetchMyRooms]);

  // Fetch active rooms on mount and periodically
  useEffect(() => {
    if (mode === 'initial') {
      fetchActiveRooms(); // Initial fetch
      const interval = setInterval(fetchActiveRooms, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [mode, fetchActiveRooms]);

  return {
    activeRooms,
    loadingRooms,
    myRoom,
    myRooms, // All rooms player is in
    isLoading,
    error,
    createRoom,
    joinRoom,
    rejoinRoom,
    setError,
  };
}
