/**
 * Rate Limit Constants
 * Centralized rate limit configurations to prevent drift between code and documentation
 */

export const RATE_LIMITS = {
  // Campaign invitation rate limits
  INVITATION_CREATE: { limit: 5, ttl: 60000 }, // 5 invitations per minute
  INVITE_TOKEN_CREATE: { limit: 5, ttl: 60000 }, // 5 tokens per minute
} as const;
