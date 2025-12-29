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

**Maintenance Endpoints:**
- `POST /api/campaigns/cleanup-expired` - Delete expired invitations and tokens (returns count)

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
- Reusable helper methods for common validation patterns
- Input sanitization for user-provided data
- Automated cleanup mechanism for expired records

**Business Logic:**
- Users cannot be invited if already in campaign
- Only one pending invitation per user per campaign
- Invitations expire after configurable TTL (default: 7 days for direct, 14 days for tokens)
- Tokens support 1-100 uses (configurable)
- Campaign creator OR members can manage invitations (Issue #388)
- Usernames are trimmed and validated before database queries
- Expired invitations and tokens can be cleaned up via API endpoint

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
- Refactored `handleResponse` method to handle both JSON and void responses
- Eliminated duplicate `handleVoidResponse` method (DRY violation)
- All void-returning methods now use consistent error handling
- Centralized error message parsing and throwing
- Shared error extraction utility (`extractErrorMessage`) for consistent error handling across components
- Added `USERNAME_MAX_LENGTH` constant exported from shared types

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

#### Pages & Components

**CampaignJoinPage (`frontend/src/pages/CampaignJoinPage.tsx`)**

**React Best Practices:**
- Moved navigation side effects from render to `useEffect`
- Proper separation of concerns between data fetching and UI rendering
- No side effects during render phase
- Consistent error handling with `extractErrorMessage` utility

**User Flow:**
1. User receives invite link with token
2. Page validates token and displays campaign preview
3. User selects character to join with
4. Token is consumed and user joins campaign

**CampaignInvitePanel (`frontend/src/components/CampaignInvitePanel.tsx`)**

**React Best Practices:**
- Uses `Promise.allSettled` for parallel data fetching with graceful partial failure handling
- Invitations and tokens load independently - one can fail while the other succeeds
- Consistent error handling with `extractErrorMessage` utility
- Proper loading states for async operations
- Implements `isMountedRef` cleanup pattern to prevent memory leaks
- All async operations check mount status before state updates
- Uses `useRef` to persist mount status across renders for reliable cleanup

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
- Shared `extractErrorMessage` utility for standardized error extraction (frontend/src/utils/error.ts)
- User-friendly error messages displayed in UI
- Network errors caught and displayed appropriately
- Partial failure handling with `Promise.allSettled` prevents complete UI failures

**Server-Side:**
- Validation errors return 400 Bad Request
- Authorization errors return 403 Forbidden
- Not found errors return 404 Not Found
- All errors include descriptive messages

## Code Quality Improvements (PR #381 Code Review)

### High Priority Fixes
1. **Token Parameter Validation**: Added `ValidateTokenPipe` for format validation
2. **Type Safety**: Replaced `Promise<any>` with TypeScript function overloads

### Medium Priority Fixes (Initial PR #381)
1. **DRY Violations**: Created `handleVoidResponse` helper for consistent error handling
2. **React Anti-pattern**: Moved navigation side effects to `useEffect`
3. **Authorization Gap**: Added campaign ID validation for revocation endpoints
4. **Type Safety**: Removed inline type assertions, improved type inference
5. **Migration Safety**: Added data migration steps for `createdByUserId` field

### Additional Code Quality Fixes (Post-Review)

Following comprehensive code quality review, the following improvements were implemented:

#### M1: Eliminated Duplicated Campaign Membership Validation
**Location:** `backend/src/services/campaign-invitation.service.ts:539-544`

Created reusable helper method:
```typescript
private isUserInCampaign(
  characters: { userId: string }[],
  userId: string,
): boolean {
  return characters.some((char) => char.userId === userId);
}
```
- Eliminates code duplication at lines 75-83 and 484-492
- Ensures consistent validation logic across the service
- Improves maintainability

#### M2: Added Input Sanitization for Username
**Location:** `backend/src/services/campaign-invitation.service.ts:65-69`

- Trims whitespace from username before database query
- Validates non-empty username
- Prevents confusing errors from trailing spaces
- Uses sanitized username consistently in error messages

#### M3: Standardized Error Handling in Frontend
**Location:** `frontend/src/utils/error.ts`

Created shared error extraction utility:
```typescript
export function extractErrorMessage(error: unknown, fallback: string): string
```
- Eliminates repeated error handling pattern across components
- Consistent error message extraction from Error objects, strings, or unknown types
- Used in `CampaignInvitePanel.tsx` and `CampaignJoinPage.tsx`
- Reduces code duplication and improves maintainability

#### M4: Replaced Type Assertions with Type-Safe Helpers
**Location:** `backend/src/services/campaign-invitation.service.ts:649`

- Removed `any` type assertion in `validateCampaignMembership`
- Now uses type-safe `isUserInCampaign()` helper
- Eliminates TypeScript safety bypass
- Improves compile-time type checking

#### M5: Implemented Cleanup Mechanism for Expired Records
**Location:**
- Service: `backend/src/services/campaign-invitation.service.ts:533-562`
- Controller: `backend/src/api/campaigns.controller.ts:445-461`

Added `cleanupExpiredRecords()` method that:
- Deletes expired invitations and tokens
- Returns count of deleted records
- Prevents database bloat from stale records
- Exposed via `POST /api/campaigns/cleanup-expired` endpoint
- Can be called manually or scheduled via cron job

**Note:** For production deployments, this endpoint should be:
1. Protected by admin role (when role system is implemented)
2. Scheduled via cron job or task scheduler
3. Or called manually by system administrators

#### M6: Improved Partial Failure Handling in Frontend
**Location:** `frontend/src/components/CampaignInvitePanel.tsx:36-61`

Replaced `Promise.all` with `Promise.allSettled`:
- Handles partial failures gracefully
- If invitations API fails, tokens still load successfully
- If tokens API fails, invitations still load successfully
- Better user experience when one endpoint has issues
- Prevents complete failure from single endpoint errors

#### MEDIUM Priority Fixes (PR #381 Code Quality Review - December 2025)

Following code quality review of PR #381, the following MEDIUM priority issues were addressed:

##### 1. Missing Cleanup Pattern in CampaignsList Component
**Location:** `frontend/src/components/lobby/CampaignsList.tsx:34-62`

**Issue:** Component lacked the `isMountedRef` cleanup pattern used in sibling components, potentially causing "setState on unmounted component" warnings and memory leaks.

**Fix:** Implemented the same cleanup pattern as `CampaignInvitePanel` and `CampaignJoinPage`:
```typescript
const fetchData = useCallback(async (isMountedRef?: { current: boolean }) => {
  try {
    setLoading(true);
    const data = await Promise.all([...]);
    if (isMountedRef && !isMountedRef.current) return;
    // set state...
  } catch (err) {
    if (isMountedRef && !isMountedRef.current) return;
    // handle error...
  } finally {
    if (!isMountedRef || isMountedRef.current) {
      setLoading(false);
    }
  }
}, []);

useEffect(() => {
  const isMountedRef = { current: true };
  fetchData(isMountedRef);
  return () => { isMountedRef.current = false; };
}, [fetchData]);
```

**Impact:** Prevents memory leaks and React warnings during unmount scenarios.

##### 2. Duplicate Error Handling Methods in Campaign Service
**Location:** `frontend/src/services/campaign.service.ts:56-79`

**Issue:** Two nearly identical methods (`handleResponse` and `handleVoidResponse`) differing only in return type violated DRY principles.

**Fix:** Unified into single method that handles both JSON and void responses:
```typescript
private async handleResponse<T>(response: Response, fallbackError: string): Promise<T> {
  if (!response.ok) {
    // ... error handling
  }

  // Handle void responses (204 No Content or empty response)
  const contentLength = response.headers.get('content-length');
  if (response.status === 204 || contentLength === '0') {
    return undefined as T;
  }

  return response.json();
}
```

**Impact:** Reduces code duplication and maintenance burden.

##### 3. Magic Number for Username Max Length
**Location:**
- `frontend/src/components/CampaignInvitePanel.tsx:184`
- `backend/src/types/campaign.types.ts:90`

**Issue:** Hardcoded `maxLength={20}` could become out of sync with backend validation.

**Fix:**
1. Added shared constant in `shared/types/campaign.ts`:
```typescript
export const USERNAME_MAX_LENGTH = 20;
```
2. Exported from backend types: `export { USERNAME_MAX_LENGTH } from '../../../shared/types/campaign'`
3. Used in backend DTO: `@MaxLength(USERNAME_MAX_LENGTH)`
4. Imported and used in frontend: `maxLength={USERNAME_MAX_LENGTH}`

**Impact:** Ensures frontend and backend validation remain synchronized.

##### 4. State Update Race Conditions in CampaignInvitePanel
**Location:** `frontend/src/components/CampaignInvitePanel.tsx:89,104,117,132`

**Issue:** After operations like `handleInviteUser`, the code called `loadData()` without the `isMountedRef` parameter, potentially causing state updates on unmounted components.

**Fix:**
1. Added persistent `isMountedRef` using `useRef(true)`
2. Updated all `loadData()` calls to pass `isMountedRef`:
```typescript
const isMountedRef = useRef(true);

useEffect(() => {
  isMountedRef.current = true;
  loadData(isMountedRef);
  return () => { isMountedRef.current = false; };
}, [loadData]);

// In handlers:
await loadData(isMountedRef);
```

**Impact:** Prevents potential memory leaks during rapid user interactions and component unmounting.

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
