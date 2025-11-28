import { useState, useEffect } from 'react';
import { gameStateManager } from '../services/game-state.service';

export function useGameState() {
  const [gameState, setGameState] = useState(gameStateManager.getState());

  useEffect(() => {
    const unsubscribe = gameStateManager.subscribe(setGameState);
    return unsubscribe;
  }, []);

  return gameState;
}
