/**
 * useRoomSession Hook
 *
 * Manages room session state subscription and provides
 * access to the current session state from RoomSessionManager.
 */

import { useState, useEffect } from 'react';
import { roomSessionManager } from '../services/room-session.service';

export function useRoomSession() {
  const [sessionState, setSessionState] = useState(roomSessionManager.getState());

  useEffect(() => {
    const unsubscribe = roomSessionManager.subscribe(setSessionState);
    return unsubscribe;
  }, []);

  return sessionState;
}
