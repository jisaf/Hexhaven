/**
 * Main App Component with Routing
 *
 * Sets up React Router for navigation between Lobby and GameBoard pages.
 * Includes WebSocket connection management and reconnection UI (US4).
 */

import { useEffect, lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { websocketService } from './services/websocket.service';
import { getWebSocketUrl } from './config/api';
import { WebSocketConnectionProvider, useWebSocketConnection } from './contexts/WebSocketConnectionContext';
import { ReconnectingModal } from './components/ReconnectingModal';
import { PlayerDisconnectedBanner } from './components/PlayerDisconnectedBanner';
import { DebugConsole } from './components/DebugConsole';
import Header from './components/Header';
import Menu from './components/Menu';
import { ProtectedRoute } from './components/ProtectedRoute';
import './App.css';

// Lazy load route components
const Lobby = lazy(() => import('./pages/Lobby').then(m => ({ default: m.Lobby })));
const HexMapDemo = lazy(() => import('./pages/HexMapDemo').then(m => ({ default: m.HexMapDemo })));
const ScenarioDesigner = lazy(() => import('./pages/ScenarioDesigner'));
const TestVideos = lazy(() => import('./pages/TestVideos').then(m => ({ default: m.TestVideos })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const Characters = lazy(() => import('./pages/Characters').then(m => ({ default: m.Characters })));
const CreateCharacter = lazy(() => import('./pages/CreateCharacter').then(m => ({ default: m.CreateCharacter })));
const CharacterDetail = lazy(() => import('./pages/CharacterDetail').then(m => ({ default: m.CharacterDetail })));
const MatchHistory = lazy(() => import('./pages/MatchHistory').then(m => ({ default: m.MatchHistory })));
const ItemCreatorTool = lazy(() => import('./pages/ItemCreatorTool').then(m => ({ default: m.ItemCreatorTool })));
const CardDemo = lazy(() => import('./pages/CardDemo').then(m => ({ default: m.CardDemo })));

// New multi-page game flow routes (Issue #305-317)
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const GamesHubPage = lazy(() => import('./pages/GamesHubPage').then(m => ({ default: m.GamesHubPage })));
const CreateGamePage = lazy(() => import('./pages/CreateGamePage').then(m => ({ default: m.CreateGamePage })));
const JoinGamePage = lazy(() => import('./pages/JoinGamePage').then(m => ({ default: m.JoinGamePage })));
const RoomLobbyPage = lazy(() => import('./pages/RoomLobbyPage').then(m => ({ default: m.RoomLobbyPage })));
const GameRoomPage = lazy(() => import('./pages/GameRoomPage').then(m => ({ default: m.GameRoomPage })));
const CampaignsHubPage = lazy(() => import('./pages/CampaignsHubPage').then(m => ({ default: m.CampaignsHubPage })));
const CreateCampaignPage = lazy(() => import('./pages/CreateCampaignPage').then(m => ({ default: m.CreateCampaignPage })));
const CampaignDashboardPage = lazy(() => import('./pages/CampaignDashboardPage').then(m => ({ default: m.CampaignDashboardPage })));
const CampaignScenarioLobbyPage = lazy(() => import('./pages/CampaignScenarioLobbyPage').then(m => ({ default: m.CampaignScenarioLobbyPage })));

/**
 * Loading Component
 * Shows while lazy-loaded routes are being fetched
 */
function RouteLoading() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      color: '#fff',
      fontSize: '1.2rem'
    }}>
      Loading...
    </div>
  );
}

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

/**
 * Legacy Game Route Redirect Component
 * Redirects /game/:roomCode to /rooms/:roomCode/play for backward compatibility
 */
function LegacyGameRedirect() {
  const { roomCode } = useParams<{ roomCode: string }>();
  return <Navigate to={`/rooms/${roomCode}/play`} replace />;
}

/**
 * Layout Component
 * Renders Header and Menu on non-game pages, handles menu state
 */
function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Check if current page should hide header (game and scenario designer pages)
  // Includes both old /game/:roomCode route and new /rooms/:roomCode/play route
  const isGamePage = location.pathname.startsWith('/game/') ||
    location.pathname.match(/^\/rooms\/[^/]+\/play$/) !== null ||
    location.pathname === '/design';

  // Check if current page is Lobby (show Create Game button in header)
  // Show on /lobby but not on new HomePage which has its own Create Game button
  const isLobbyPage = location.pathname === '/lobby' || location.pathname === '/games';

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const handleCreateGame = () => {
    // Dispatch custom event that Lobby component will listen to
    const event = new CustomEvent('header-create-game');
    window.dispatchEvent(event);
    // Close menu if open
    closeMenu();
  };

  return (
    <>
      {!isGamePage && (
        <>
          <Header
            menuOpen={menuOpen}
            onMenuToggle={toggleMenu}
            onCreateGame={handleCreateGame}
            showCreateGame={isLobbyPage}
          />
          <Menu isOpen={menuOpen} onClose={closeMenu} />
        </>
      )}
      <Routes>
        {/* New home page (Issue #309) */}
        <Route path="/" element={<HomePage />} />
        {/* Legacy lobby route for backward compatibility */}
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/characters" element={<ProtectedRoute><Characters /></ProtectedRoute>} />
        <Route path="/characters/new" element={<ProtectedRoute><CreateCharacter /></ProtectedRoute>} />
        <Route path="/characters/:characterId" element={<ProtectedRoute><CharacterDetail /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><MatchHistory /></ProtectedRoute>} />
        <Route path="/creator/items" element={<ItemCreatorTool />} />
        {/* Legacy route - redirect to new URL structure */}
        <Route path="/game/:roomCode" element={<LegacyGameRedirect />} />

        {/* New multi-page game flow routes */}
        <Route path="/games" element={<GamesHubPage />} />
        <Route path="/games/create" element={<CreateGamePage />} />
        <Route path="/games/join" element={<JoinGamePage />} />
        <Route path="/games/join/:roomCode" element={<JoinGamePage />} />
        <Route path="/rooms/:roomCode" element={<RoomLobbyPage />} />
        <Route path="/rooms/:roomCode/play" element={<GameRoomPage />} />
        <Route path="/campaigns" element={<CampaignsHubPage />} />
        <Route path="/campaigns/create" element={<CreateCampaignPage />} />
        <Route path="/campaigns/:campaignId" element={<CampaignDashboardPage />} />
        <Route path="/campaigns/:campaignId/scenario/:scenarioId" element={<CampaignScenarioLobbyPage />} />

        {/* Debug/demo routes */}
        <Route path="/demo" element={<HexMapDemo />} />
        <Route path="/design" element={<ScenarioDesigner />} />
        <Route path="/test-videos" element={<TestVideos />} />
        <Route path="/carddemo" element={<CardDemo />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
        <Suspense fallback={<RouteLoading />}>
          <Layout />
        </Suspense>
        <DebugConsole />
      </BrowserRouter>
    </WebSocketConnectionProvider>
  );
}

export default App;
