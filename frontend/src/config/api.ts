/**
 * API Configuration
 *
 * Automatically detects the correct API and WebSocket URLs based on the current environment.
 * Works for localhost, any IP address, and custom domains.
 */

/**
 * Get the base URL for API requests.
 * In development, this will be a relative path that the Vite proxy will handle.
 * In production, it will be an absolute path on the same host.
 */
export function getApiUrl(): string {
  // Check for explicit environment variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // In development, the Vite proxy is active.
  if (import.meta.env.DEV) {
    return '/api'; // Use the proxy
  }

  // In production, the API is on the same host.
  const { protocol, hostname, port } = window.location;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}/api`;
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
  const { protocol, hostname, port } = window.location;

  // In development, the backend runs on port 3000
  // In production with nginx, it's on the same host
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Local development - localhost
    return `http://localhost:3000`;
  } else if (port === '5173' || port === '5174') {
    // Development via network IP (Vite dev server)
    // Backend is on port 3000
    return `http://${hostname}:3000`;
  } else {
    // Production or remote access - use same host
    // Convert back to http/https for socket.io (it handles the upgrade)
    return `${protocol}//${hostname}`;
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
