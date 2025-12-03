/**
 * Main App Component with Routing
 *
 * Sets up React Router for navigation between Lobby and GameBoard pages.
 * Includes WebSocket connection management and reconnection UI (US4).
 */

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { websocketService } from './services/websocket.service';
import { getWebSocketUrl } from './config/api';
import { Lobby } from './pages/Lobby';
import { GameBoard } from './pages/GameBoard';
import { HexMapDemo } from './pages/HexMapDemo';
import ScenarioDesigner from './pages/ScenarioDesigner';
import { TestVideos } from './pages/TestVideos';
import { WebSocketConnectionProvider, useWebSocketConnection } from './contexts/WebSocketConnectionContext';
import { ReconnectingModal } from './components/ReconnectingModal';
import { PlayerDisconnectedBanner } from './components/PlayerDisconnectedBanner';
import { DebugConsole } from './components/DebugConsole';
import './App.css';

/**
 * Connection UI Component
 * Renders reconnection modal and player disconnect/reconnect banners
 */
function ConnectionUI() {
  const {
    connectionStatus,
    isReconnecting,
    reconnectAttempts,
    maxReconnectAttempts,
    disconnectedPlayers,
    reconnectedPlayers,
    dismissDisconnectedPlayer,
    dismissReconnectedPlayer,
  } = useWebSocketConnection();

  return (
    <>
      {/* Reconnecting Modal - shown when current player loses connection */}
      <ReconnectingModal
        isVisible={isReconnecting || connectionStatus === 'failed'}
        reconnectAttempt={reconnectAttempts}
        maxAttempts={maxReconnectAttempts}
        status={
          connectionStatus === 'failed'
            ? 'failed'
            : isReconnecting
            ? 'connecting'
            : 'connected'
        }
      />

      {/* Player Disconnected Banners - shown when other players disconnect */}
      {disconnectedPlayers.map((player) => (
        <PlayerDisconnectedBanner
          key={`disconnected-${player.playerId}`}
          playerName={player.playerName}
          status="disconnected"
          onDismiss={() => dismissDisconnectedPlayer(player.playerId)}
          autoDismissDelay={0} // Don't auto-dismiss disconnect notifications
        />
      ))}

      {/* Player Reconnected Banners - shown when other players reconnect */}
      {reconnectedPlayers.map((player) => (
        <PlayerDisconnectedBanner
          key={`reconnected-${player.playerId}`}
          playerName={player.playerName}
          status="reconnected"
          onDismiss={() => dismissReconnectedPlayer(player.playerId)}
          autoDismissDelay={5000} // Auto-dismiss after 5 seconds
        />
      ))}
    </>
  );
}

function App() {
  // Set background color based on subdomain
  useEffect(() => {
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];

    let backgroundColor: string;
    let backgroundColorRgb: string;

    if (subdomain === 'test') {
      // Rich brick red for test.hexhaven.net
      backgroundColor = '#8B2F2F';
      backgroundColorRgb = '139, 47, 47';
    } else if (subdomain === 'dev') {
      // Rich earthy green for dev.hexhaven.net
      backgroundColor = '#2F5233';
      backgroundColorRgb = '47, 82, 51';
    } else {
      // Default dark blue for hexhaven.net and localhost
      backgroundColor = '#0d1a2e';
      backgroundColorRgb = '13, 26, 46';
    }

    // Set CSS custom properties
    document.documentElement.style.setProperty('--primary-bg-color', backgroundColor);
    document.documentElement.style.setProperty('--primary-bg-color-rgb', backgroundColorRgb);
  }, []);

  useEffect(() => {
    const wsUrl = getWebSocketUrl();
    websocketService.connect(wsUrl);

    return () => {
      websocketService.disconnect();
    };
  }, []);

  return (
    <WebSocketConnectionProvider>
      <BrowserRouter>
        <ConnectionUI />
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/game/:roomCode" element={<GameBoard />} />
          <Route path="/demo" element={<HexMapDemo />} />
          <Route path="/design" element={<ScenarioDesigner />} />
          <Route path="/test-videos" element={<TestVideos />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <DebugConsole />
      </BrowserRouter>
    </WebSocketConnectionProvider>
  );
}

export default App;
