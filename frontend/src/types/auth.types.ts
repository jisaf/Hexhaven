/**
 * Frontend Authentication Types
 * Matches backend API contracts
 */

/**
 * User data returned from API
 */
export interface User {
  id: string;
  username: string;
  createdAt: string;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Registration credentials
 */
export interface RegisterCredentials {
  username: string;
  password: string;
}

/**
 * JWT token pair
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Authentication response (login/register)
 */
export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

/**
 * Authentication error from API
 */
export interface AuthError {
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: any;
    timestamp: string;
  };
}
