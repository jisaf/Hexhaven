# Campaign Invitation System Architecture

## Overview

The campaign invitation system provides two methods for users to join campaigns:
1. **Direct Invitations**: Campaign members can invite specific users by username
2. **Shareable Invite Links**: Campaign members can generate shareable tokens with configurable usage limits

## Architecture Components

### Backend

#### Controllers (`backend/src/api/campaigns.controller.ts`)

**Invitation Endpoints:**
- `POST /api/campaigns/:campaignId/invitations` - Send direct invitation by username
- `GET /api/campaigns/:campaignId/invitations` - Get pending invitations for a campaign
- `DELETE /api/campaigns/:campaignId/invitations/:invitationId` - Revoke pending invitation
- `GET /api/campaigns/invitations/received` - Get invitations received by current user
- `POST /api/campaigns/invitations/:invitationId/decline` - Decline received invitation
- `POST /api/campaigns/join/by-invite/:invitationId` - Join campaign via direct invitation

**Token Endpoints:**
- `POST /api/campaigns/:campaignId/invite-tokens` - Create shareable invite token
- `GET /api/campaigns/:campaignId/invite-tokens` - Get active tokens for a campaign
- `DELETE /api/campaigns/:campaignId/invite-tokens/:tokenId` - Revoke invite token
- `GET /api/campaigns/validate-token/:token` - Validate token without consuming
- `POST /api/campaigns/join/by-token/:token` - Join campaign via token

**Security Features:**
- Token parameter validation using `ValidateTokenPipe` (base64url format, 20-50 char length)
- UUID validation for all ID parameters using `ParseUUIDPipe`
- Rate limiting on invitation and token creation (5 per minute via `@Throttle`)
- Campaign membership validation for all operations
- Authorization check that invitation/token belongs to specified campaign

#### Services (`backend/src/services/campaign-invitation.service.ts`)

**Core Features:**
- Type-safe campaign membership validation with function overloads
- Transaction-based token consumption to prevent race conditions
- Automatic token revocation when max uses reached
- Cryptographically secure token generation (24 random bytes, base64url encoded)

**Business Logic:**
- Users cannot be invited if already in campaign
- Only one pending invitation per user per campaign
- Invitations expire after configurable TTL (default: 7 days for direct, 14 days for tokens)
- Tokens support 1-100 uses (configurable)
- Campaign creator OR members can manage invitations (Issue #388)

**Type Safety Improvements:**
- Removed `Promise<any>` return types
- Added TypeScript function overloads for `validateCampaignMembership`:
  - Returns `void` when `includeCharacters` is false
  - Returns `CampaignWithCharacters` when `includeCharacters` is true
- Defined `CampaignWithCharacters` interface for proper type inference
- Removed inline type assertions in favor of proper type inference

#### Data Models

**CampaignInvitation:**
```typescript
{
  id: UUID
  campaignId: UUID
  invitedUserId: UUID
  invitedUsername: string
  invitedByUserId: UUID
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED'
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}
```

**CampaignInviteToken:**
```typescript
{
  id: UUID
  campaignId: UUID
  token: string (32 chars, base64url)
  createdByUserId: UUID
  maxUses: number (1-100)
  usedCount: number
  expiresAt: Date
  isRevoked: boolean
  createdAt: Date
}
```

### Frontend

#### Services (`frontend/src/services/campaign.service.ts`)

**Code Quality Improvements:**
- Added `handleVoidResponse` helper to eliminate DRY violations
- All void-returning methods now use consistent error handling
- Centralized error message parsing and throwing

**Methods:**
- `inviteUser(campaignId, username)` - Send direct invitation
- `getCampaignInvitations(campaignId)` - Get campaign's pending invitations
- `getReceivedInvitations()` - Get current user's received invitations
- `revokeInvitation(campaignId, invitationId)` - Revoke invitation
- `declineInvitation(invitationId)` - Decline received invitation
- `joinViaInvitation(invitationId, characterId?)` - Accept invitation and join
- `createInviteToken(campaignId, maxUses?)` - Create shareable link
- `getInviteTokens(campaignId)` - Get active tokens
- `revokeInviteToken(campaignId, tokenId)` - Revoke token
- `validateInviteToken(token)` - Validate token without consuming
- `joinViaToken(token, characterId?)` - Join via shareable link

#### Pages (`frontend/src/pages/CampaignJoinPage.tsx`)

**React Best Practices:**
- Moved navigation side effects from render to `useEffect`
- Proper separation of concerns between data fetching and UI rendering
- No side effects during render phase

**User Flow:**
1. User receives invite link with token
2. Page validates token and displays campaign preview
3. User selects character to join with
4. Token is consumed and user joins campaign

## Security Considerations

### Token Validation
- Tokens are validated for format (base64url), length (20-50 chars), and character set
- Invalid tokens are rejected before database queries
- Defense in depth: validation at controller level AND service level

### Authorization
- All endpoints require JWT authentication (except public campaign info)
- Campaign membership verified before any invitation operations
- Invitations/tokens verified to belong to specified campaign (prevents cross-campaign attacks)
- Only campaign creator or members can manage invitations

### Race Condition Prevention
- Token consumption uses database transactions with optimistic locking
- `updateMany` with `WHERE usedCount < maxUses` prevents double-consumption
- Automatic revocation when last use is consumed

### Rate Limiting
- Invitation creation: 5 per minute per user
- Token creation: 5 per minute per user
- Prevents invitation spam and abuse

## Database Migration Safety

The `createdByUserId` field migration includes data migration steps:
1. Column added as nullable initially
2. Existing campaigns populated with userId from first character
3. Orphaned campaigns (no characters) are deleted
4. Column made NOT NULL after data migration

This ensures zero-downtime deployments and handles edge cases properly.

## Configuration

**Environment Variables:**
- `CAMPAIGN_DIRECT_INVITATION_TTL_DAYS` - Direct invitation expiry (default: 7)
- `CAMPAIGN_INVITE_TOKEN_TTL_DAYS` - Shareable link expiry (default: 14)

**Constants:**
- `MIN_TOKEN_USES = 1`
- `MAX_TOKEN_USES = 100`

## Error Handling

**Client-Side:**
- Consistent error message parsing via `handleResponse` and `handleVoidResponse` helpers
- User-friendly error messages displayed in UI
- Network errors caught and displayed appropriately

**Server-Side:**
- Validation errors return 400 Bad Request
- Authorization errors return 403 Forbidden
- Not found errors return 404 Not Found
- All errors include descriptive messages

## Code Quality Improvements (PR #381 Code Review)

### High Priority Fixes
1. **Token Parameter Validation**: Added `ValidateTokenPipe` for format validation
2. **Type Safety**: Replaced `Promise<any>` with TypeScript function overloads

### Medium Priority Fixes
1. **DRY Violations**: Created `handleVoidResponse` helper for consistent error handling
2. **React Anti-pattern**: Moved navigation side effects to `useEffect`
3. **Authorization Gap**: Added campaign ID validation for revocation endpoints
4. **Type Safety**: Removed inline type assertions, improved type inference
5. **Migration Safety**: Added data migration steps for `createdByUserId` field

## Testing Considerations

**Integration Tests Should Cover:**
- Direct invitation flow (send, accept, decline, revoke)
- Token creation and consumption
- Race conditions on token usage
- Authorization checks (non-members cannot manage invitations)
- Cross-campaign authorization (cannot revoke other campaign's invitations)
- Expired invitation/token handling
- Invalid token format rejection

**E2E Tests Should Cover:**
- Complete join flow via direct invitation
- Complete join flow via shareable link
- Token usage limit enforcement
- Character selection during join process

## Future Enhancements

Potential improvements for future iterations:
- Email notifications for invitations
- Invitation templates with custom messages
- Analytics on invitation acceptance rates
- Batch invitation management
- Role-based invitation permissions (host vs member)
