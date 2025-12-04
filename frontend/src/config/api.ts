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
  const { protocol, hostname, host, port } = window.location;

  console.log('[API Config] window.location:', {
    href: window.location.href,
    protocol,
    hostname,
    host,
    port,
  });

  // In development, the backend runs on port 3001
  // In production with nginx, it's on the same host with /api path
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Local development
    return `${protocol}//localhost:3001/api`;
  } else {
    // Production or remote access - use same host with /api path
    // Use 'host' which includes the full host (domain:port if present)
    const apiUrl = `${protocol}//${host}/api`;
    console.log('[API Config] Constructed API URL:', apiUrl);
    return apiUrl;
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

  // In development, the backend runs on port 3001
  // In production with nginx, it's on the same host
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Local development - localhost
    return `http://localhost:3001`;
  } else if (port === '5173' || port === '5174') {
    // Development via network IP (Vite dev server)
    // Backend is on port 3001
    return `http://${hostname}:3001`;
  } else {
    // Production or remote access - use same host
    // Convert back to http/https for socket.io (it handles the upgrade)
    // Use host to preserve the full domain
    const wsUrl = `${protocol}//${host}`;
    console.log('[API Config] Constructed WebSocket URL:', wsUrl);
    return wsUrl;
  }
}

/**
 * Log current configuration (useful for debugging)
 */
export function logApiConfig(): void {
  console.log('API Configuration:', {
    apiUrl: getApiUrl(),
    wsUrl: getWebSocketUrl(),
    location: {
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port,
    },
  });
}
