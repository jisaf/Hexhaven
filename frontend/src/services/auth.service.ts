/**
 * Frontend Authentication Service
 * Handles user registration, login, logout, and token management
 */

import type {
  User,
  LoginCredentials,
  RegisterCredentials,
  TokenPair,
  AuthResponse,
} from '../types/auth.types';
import { getApiUrl } from '../config/api';

// Lazy import to avoid circular dependency
let websocketServiceInstance: { resetAuthState: () => void } | null = null;
const getWebsocketService = async () => {
  if (!websocketServiceInstance) {
    const module = await import('./websocket.service');
    websocketServiceInstance = module.websocketService;
  }
  return websocketServiceInstance;
};

/**
 * Storage keys for tokens
 */
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'hexhaven_access_token',
  REFRESH_TOKEN: 'hexhaven_refresh_token',
  USER: 'hexhaven_user',
} as const;

class AuthService {
  /**
   * T089: Register a new user
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await fetch(`${getApiUrl()}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = this.extractErrorMessage(errorData, 'Registration failed');
      throw new Error(errorMessage);
    }

    const data: AuthResponse = await response.json();

    // Store tokens and user data
    this.setTokens(data.tokens);
    this.setUser(data.user);

    // Reset WebSocket auth state to allow connection after registration
    getWebsocketService().then(ws => ws.resetAuthState()).catch(() => {
      // Ignore errors - WebSocket integration is optional
    });

    return data;
  }

  /**
   * T090: Login existing user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${getApiUrl()}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = this.extractErrorMessage(errorData, 'Login failed');
      throw new Error(errorMessage);
    }

    const data: AuthResponse = await response.json();

    // Store tokens and user data
    this.setTokens(data.tokens);
    this.setUser(data.user);

    // Reset WebSocket auth state to allow reconnection after login
    // Issue #290: Prevents WebSocket from being blocked after auth failure
    getWebsocketService().then(ws => ws.resetAuthState()).catch(() => {
      // Ignore errors - WebSocket integration is optional
    });

    return data;
  }

  /**
   * T091: Logout current user
   */
  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();

    if (refreshToken) {
      try {
        await fetch(`${getApiUrl()}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error) {
        // Continue with local logout even if API call fails
        console.error('Logout API call failed:', error);
      }
    }

    // Clear local storage
    this.clearTokens();
    this.clearUser();
  }

  /**
   * T092: Refresh access token
   */
  async refreshToken(): Promise<TokenPair> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${getApiUrl()}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      // Refresh token expired or invalid - logout user
      this.clearTokens();
      this.clearUser();
      throw new Error('Session expired. Please login again.');
    }

    const data: { tokens: TokenPair } = await response.json();

    // Store new tokens
    this.setTokens(data.tokens);

    return data.tokens;
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Get current refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Get current user
   */
  getUser(): User | null {
    const userJson = localStorage.getItem(STORAGE_KEYS.USER);
    if (!userJson) return null;

    try {
      return JSON.parse(userJson) as User;
    } catch {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken() && !!this.getUser();
  }

  /**
   * Set tokens in localStorage
   */
  private setTokens(tokens: TokenPair): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
  }

  /**
   * Set user data in localStorage
   */
  private setUser(user: User): void {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  /**
   * Clear tokens from localStorage
   */
  private clearTokens(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Clear user data from localStorage
   */
  private clearUser(): void {
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  /**
   * T093: Make authenticated API request with auto token refresh
   */
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const accessToken = this.getAccessToken();

    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    // Add Authorization header
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    };

    let response = await fetch(url, { ...options, headers });

    // If 401, try refreshing token once
    if (response.status === 401) {
      try {
        await this.refreshToken();

        // Retry with new token
        const newAccessToken = this.getAccessToken();
        const newHeaders = {
          ...options.headers,
          Authorization: `Bearer ${newAccessToken}`,
        };

        response = await fetch(url, { ...options, headers: newHeaders });
      } catch {
        // Refresh failed - logout user
        await this.logout();
        throw new Error('Session expired. Please login again.');
      }
    }

    return response;
  }

  /**
   * Extract error message from error response
   * Handles both ErrorResponse format and NestJS default format
   */
  private extractErrorMessage(errorData: Record<string, unknown>, fallback: string): string {
    // Try ErrorResponse format: { error: { message: "..." } }
    const error = errorData?.error as Record<string, unknown> | undefined;
    if (error?.message && typeof error.message === 'string') {
      return error.message;
    }

    // Try NestJS default format: { message: "..." } or { message: ["...", "..."] }
    const message = errorData?.message;
    if (message) {
      if (Array.isArray(message)) {
        return message.join(', ');
      }
      if (typeof message === 'string') {
        return message;
      }
    }

    // Fallback
    return fallback;
  }
}

// Export singleton instance
export const authService = new AuthService();
