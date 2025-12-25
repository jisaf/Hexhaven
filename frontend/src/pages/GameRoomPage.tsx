/**
 * Game Room Page Component (Issue #314)
 *
 * Wrapper for GameBoard at the new URL structure:
 * /rooms/:roomCode/play
 *
 * This page:
 * - Validates room code from URL
 * - Renders GameBoard component
 * - Uses URL as source of truth (no navigation interception)
 */

import { useParams, Navigate } from 'react-router-dom';
import { GameBoard } from './GameBoard';

export const GameRoomPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();

  // No room code - redirect to games hub
  if (!roomCode) {
    return <Navigate to="/games" replace />;
  }

  // Render GameBoard - it handles the rest
  return <GameBoard />;
};
