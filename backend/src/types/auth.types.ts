/**
 * Authentication Types
 * Type definitions for user authentication, JWT tokens, and auth requests/responses
 */

/**
 * User registration data transfer object
 */
export interface RegisterDto {
  username: string;
  password: string;
}

/**
 * User login credentials
 */
export interface LoginDto {
  username: string;
  password: string;
}

/**
 * JWT access and refresh token pair
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * JWT payload structure
 */
export interface JwtPayload {
  userId: string;
  username: string;
  iat?: number; // Issued at (Unix timestamp)
  exp?: number; // Expiration (Unix timestamp)
}

/**
 * User data returned to client (no sensitive info)
 */
export interface UserResponse {
  id: string;
  username: string;
  createdAt: Date;
}

/**
 * Authentication response (login/register)
 */
export interface AuthResponse {
  user: UserResponse;
  tokens: TokenPair;
}

/**
 * Token refresh request
 */
export interface RefreshTokenDto {
  refreshToken: string;
}
