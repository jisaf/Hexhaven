/**
 * API Configuration
 *
 * Automatically detects the correct API and WebSocket URLs based on the current environment.
 * Works for localhost, any IP address, and custom domains.
 */

/**
 * Get the base URL for API requests
 * Uses the same host as the frontend, just changes the path to /api
 */
export function getApiUrl(): string {
  // Check for explicit environment variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Auto-detect based on current location
  const { protocol, hostname, host } = window.location;

  // In development, the backend runs on port 3001 (configurable via VITE_BACKEND_PORT)
  // In production with nginx, it's on the same host with /api path
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Local development
    const backendPort = import.meta.env.VITE_BACKEND_PORT || '3001';
    return `${protocol}//localhost:${backendPort}/api`;
  } else {
    // Production or remote access - use same host with /api path
    // Use 'host' which includes the full host (domain:port if present)
    return `${protocol}//${host}/api`;
  }
}

/**
 * Get the WebSocket URL
 * Uses the same host as the frontend
 */
export function getWebSocketUrl(): string {
  // Check for explicit environment variable first
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  // Auto-detect based on current location
  const { protocol, hostname, host, port } = window.location;

  // In development, the backend runs on port 3001 (configurable via VITE_BACKEND_PORT)
  // In production with nginx, it's on the same host
  const backendPort = import.meta.env.VITE_BACKEND_PORT || '3001';
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Local development - localhost
    return `http://localhost:${backendPort}`;
  } else if (port === '5173' || port === '5174') {
    // Development via network IP (Vite dev server)
    // Backend is on configurable port (default 3001)
    return `http://${hostname}:${backendPort}`;
  } else {
    // Production or remote access - use same host
    // Convert back to http/https for socket.io (it handles the upgrade)
    // Use host to preserve the full domain
    return `${protocol}//${host}`;
  }
}

/**
 * Log current configuration (useful for debugging)
 * Disabled for performance - use browser devtools if needed
 */
export function logApiConfig(): void {
  // Verbose logging disabled
}
