/**
 * Main App Component with Routing
 *
 * Sets up React Router for navigation between Lobby and GameBoard pages.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Lobby } from './pages/Lobby';
import { GameBoard } from './pages/GameBoard';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/game" element={<GameBoard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
