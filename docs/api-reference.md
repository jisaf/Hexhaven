# API Reference

Complete REST API documentation for Hexhaven Multiplayer.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Match History API](#match-history-api)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [Examples](#examples)

---

## Overview

### Base URL

```
http://localhost:3001/api
```

**Production**: Update base URL for production deployment

### Response Format

All endpoints return JSON responses:

**Success Response**:
```json
{
  "data": { /* response data */ }
}
```

**Error Response**:
```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing or invalid auth token |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error - Server error |

---

## Authentication

All match history endpoints require JWT authentication.

### How to Authenticate

Include JWT token in Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

### Obtaining a Token

Users receive JWT tokens after logging in. For details on authentication, see the authentication API (not covered in this document).

### Token Format

```
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Match History API

### Get Player's Game History

Retrieve a player's completed games with optional filtering and pagination.

**Endpoint**: `GET /api/games/history/:userId`

**Authentication**: Required

**URL Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string (UUID) | Yes | The user's unique identifier |

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| limit | number | No | 20 | Number of results to return (1-100) |
| offset | number | No | 0 | Number of results to skip |
| victory | boolean | No | - | Filter by victory (true) or defeat (false) |
| scenarioId | string | No | - | Filter by scenario ID |
| fromDate | string (ISO 8601) | No | - | Filter results after this date |
| toDate | string (ISO 8601) | No | - | Filter results before this date |

**Success Response** (200 OK):

```json
{
  "total": 42,
  "games": [
    {
      "id": "game-result-uuid-1",
      "roomCode": "ABC123",
      "scenarioName": "Black Barrow",
      "scenarioId": "scenario-1",
      "victory": true,
      "completedAt": "2025-12-07T14:30:00.000Z",
      "roundsCompleted": 8,
      "playerResult": {
        "characterClass": "Brute",
        "characterName": "Thorin",
        "damageDealt": 45,
        "experienceGained": 15,
        "goldGained": 25,
        "monstersKilled": 3,
        "survived": true
      },
      "otherPlayers": [
        {
          "characterClass": "Tinkerer",
          "characterName": "Gizmo",
          "survived": true
        }
      ]
    }
  ]
}
```

**Error Responses**:

400 Bad Request:
```json
{
  "statusCode": 400,
  "message": "Limit must be between 1 and 100",
  "error": "Bad Request"
}
```

401 Unauthorized:
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

**Example Request**:

```bash
curl -X GET \
  'http://localhost:3001/api/games/history/user-uuid-123?limit=10&victory=true' \
  -H 'Authorization: Bearer your_jwt_token'
```

**Example with Date Filter**:

```bash
curl -X GET \
  'http://localhost:3001/api/games/history/user-uuid-123?fromDate=2025-12-01&toDate=2025-12-07' \
  -H 'Authorization: Bearer your_jwt_token'
```

---

### Get Detailed Game Result

Retrieve complete details for a specific game result.

**Endpoint**: `GET /api/games/history/result/:gameResultId`

**Authentication**: Required

**URL Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| gameResultId | string (UUID) | Yes | The game result unique identifier |

**Success Response** (200 OK):

```json
{
  "id": "game-result-uuid-1",
  "gameId": "game-uuid-1",
  "roomCode": "ABC123",
  "scenarioId": "scenario-1",
  "scenarioName": "Black Barrow",
  "victory": true,
  "roundsCompleted": 8,
  "completionTimeMs": 1800000,
  "completedAt": "2025-12-07T14:30:00.000Z",
  "primaryObjectiveCompleted": true,
  "secondaryObjectiveCompleted": true,
  "objectivesCompletedList": ["primary-1", "secondary-1"],
  "objectiveProgress": {
    "primary-1": {
      "current": 3,
      "target": 3,
      "completed": true
    },
    "secondary-1": {
      "current": 1,
      "target": 1,
      "completed": true
    }
  },
  "totalLootCollected": 8,
  "totalExperience": 20,
  "totalGold": 35,
  "playerResults": [
    {
      "userId": "user-uuid-1",
      "characterId": "char-uuid-1",
      "characterClass": "Brute",
      "characterName": "Thorin",
      "survived": true,
      "wasExhausted": false,
      "damageDealt": 45,
      "damageTaken": 12,
      "monstersKilled": 2,
      "lootCollected": 5,
      "cardsLost": 3,
      "experienceGained": 10,
      "goldGained": 20
    },
    {
      "userId": "user-uuid-2",
      "characterId": "char-uuid-2",
      "characterClass": "Tinkerer",
      "characterName": "Gizmo",
      "survived": true,
      "wasExhausted": false,
      "damageDealt": 28,
      "damageTaken": 8,
      "monstersKilled": 1,
      "lootCollected": 3,
      "cardsLost": 2,
      "experienceGained": 10,
      "goldGained": 15
    }
  ]
}
```

**Error Responses**:

404 Not Found:
```json
{
  "statusCode": 404,
  "message": "Game result not found",
  "error": "Not Found"
}
```

**Example Request**:

```bash
curl -X GET \
  'http://localhost:3001/api/games/history/result/game-result-uuid-1' \
  -H 'Authorization: Bearer your_jwt_token'
```

---

### Get User Statistics

Retrieve aggregate statistics for a user across all completed games.

**Endpoint**: `GET /api/games/history/stats/:userId`

**Authentication**: Required

**URL Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string (UUID) | Yes | The user's unique identifier |

**Success Response** (200 OK):

```json
{
  "totalGames": 42,
  "victories": 28,
  "defeats": 14,
  "winRate": 66.67,
  "totalExperience": 420,
  "totalGold": 850,
  "totalMonstersKilled": 156,
  "favoriteClass": "Brute"
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| totalGames | number | Total number of games played |
| victories | number | Number of victories |
| defeats | number | Number of defeats |
| winRate | number | Win rate as percentage (0-100, 2 decimal places) |
| totalExperience | number | Total experience earned across all games |
| totalGold | number | Total gold earned across all games |
| totalMonstersKilled | number | Total monsters killed across all games |
| favoriteClass | string or null | Most played character class |

**Error Responses**:

401 Unauthorized:
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

**Example Request**:

```bash
curl -X GET \
  'http://localhost:3001/api/games/history/stats/user-uuid-123' \
  -H 'Authorization: Bearer your_jwt_token'
```

---

## Error Handling

### Standard Error Format

All errors follow this structure:

```json
{
  "statusCode": 400,
  "message": "Human-readable error message",
  "error": "Error type (e.g., Bad Request)"
}
```

### Common Error Scenarios

#### Invalid UUID Format

```json
{
  "statusCode": 400,
  "message": "Invalid UUID format",
  "error": "Bad Request"
}
```

#### Missing Authorization Header

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

#### Invalid Token

```json
{
  "statusCode": 401,
  "message": "Invalid token",
  "error": "Unauthorized"
}
```

#### Resource Not Found

```json
{
  "statusCode": 404,
  "message": "Game result not found",
  "error": "Not Found"
}
```

#### Validation Errors

```json
{
  "statusCode": 400,
  "message": "Limit must be between 1 and 100",
  "error": "Bad Request"
}
```

### Error Handling Best Practices

1. **Check HTTP Status Code**: Always check the status code first
2. **Parse Error Message**: Use the `message` field for user-facing errors
3. **Retry on 500 Errors**: Implement exponential backoff for server errors
4. **Handle 401 Errors**: Redirect to login when unauthorized
5. **Validate Before Sending**: Validate parameters client-side to reduce errors

---

## Rate Limiting

### Current Limits

**No rate limiting is currently implemented** for match history endpoints.

### Future Implementation

Planned rate limits:
- 100 requests per minute per user
- 1000 requests per hour per user

Rate limit headers (future):
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1638360000
```

---

## Examples

### Example 1: Get Recent Victories

Get the last 5 victories for a user:

```bash
curl -X GET \
  'http://localhost:3001/api/games/history/user-uuid-123?limit=5&victory=true' \
  -H 'Authorization: Bearer your_jwt_token'
```

**Response**:
```json
{
  "total": 28,
  "games": [
    { "id": "...", "scenarioName": "Black Barrow", "victory": true },
    { "id": "...", "scenarioName": "Crypt of Blood", "victory": true },
    { "id": "...", "scenarioName": "Inox Encampment", "victory": true },
    { "id": "...", "scenarioName": "Vermling Nest", "victory": true },
    { "id": "...", "scenarioName": "Elemental Convergence", "victory": true }
  ]
}
```

---

### Example 2: Get Games from Last Week

Get all games completed in the last 7 days:

```javascript
// JavaScript example
const oneWeekAgo = new Date();
oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

const response = await fetch(
  `http://localhost:3001/api/games/history/user-uuid-123?fromDate=${oneWeekAgo.toISOString()}`,
  {
    headers: {
      'Authorization': `Bearer ${jwtToken}`
    }
  }
);

const data = await response.json();
console.log(`Games this week: ${data.total}`);
```

---

### Example 3: Paginate Through History

Get all games with pagination:

```javascript
// JavaScript example
async function getAllGames(userId, jwtToken) {
  const limit = 20;
  let offset = 0;
  let allGames = [];
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `http://localhost:3001/api/games/history/${userId}?limit=${limit}&offset=${offset}`,
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      }
    );

    const data = await response.json();
    allGames = allGames.concat(data.games);
    offset += limit;
    hasMore = data.games.length === limit;
  }

  return allGames;
}
```

---

### Example 4: Display User Stats Dashboard

Build a stats dashboard:

```javascript
// JavaScript example
async function displayUserStats(userId, jwtToken) {
  const response = await fetch(
    `http://localhost:3001/api/games/history/stats/${userId}`,
    {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    }
  );

  const stats = await response.json();

  console.log('=== Player Statistics ===');
  console.log(`Total Games: ${stats.totalGames}`);
  console.log(`Win Rate: ${stats.winRate}%`);
  console.log(`Total Experience: ${stats.totalExperience}`);
  console.log(`Total Gold: ${stats.totalGold}`);
  console.log(`Monsters Killed: ${stats.totalMonstersKilled}`);
  console.log(`Favorite Class: ${stats.favoriteClass}`);
}
```

---

### Example 5: Filter by Scenario

Get all completions of a specific scenario:

```bash
curl -X GET \
  'http://localhost:3001/api/games/history/user-uuid-123?scenarioId=scenario-1' \
  -H 'Authorization: Bearer your_jwt_token'
```

**Response**:
```json
{
  "total": 5,
  "games": [
    { "id": "...", "scenarioName": "Black Barrow", "victory": true },
    { "id": "...", "scenarioName": "Black Barrow", "victory": true },
    { "id": "...", "scenarioName": "Black Barrow", "victory": false },
    { "id": "...", "scenarioName": "Black Barrow", "victory": true },
    { "id": "...", "scenarioName": "Black Barrow", "victory": true }
  ]
}
```

---

### Example 6: Get Detailed Game with Frontend Display

Fetch and display detailed game result:

```typescript
// TypeScript example
interface GameResultDetail {
  scenarioName: string;
  victory: boolean;
  roundsCompleted: number;
  completionTimeMs: number;
  playerResults: Array<{
    characterName: string;
    damageDealt: number;
    monstersKilled: number;
    goldGained: number;
  }>;
}

async function displayGameResult(gameResultId: string, jwtToken: string) {
  const response = await fetch(
    `http://localhost:3001/api/games/history/result/${gameResultId}`,
    {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    }
  );

  const result: GameResultDetail = await response.json();

  console.log(`\n=== ${result.scenarioName} ===`);
  console.log(`Result: ${result.victory ? 'VICTORY' : 'DEFEAT'}`);
  console.log(`Rounds: ${result.roundsCompleted}`);
  console.log(`Time: ${(result.completionTimeMs / 60000).toFixed(1)} minutes`);

  console.log('\nPlayer Stats:');
  result.playerResults.forEach(player => {
    console.log(`\n${player.characterName}:`);
    console.log(`  Damage: ${player.damageDealt}`);
    console.log(`  Kills: ${player.monstersKilled}`);
    console.log(`  Gold: ${player.goldGained}`);
  });
}
```

---

## TypeScript Type Definitions

For TypeScript projects, use these types:

```typescript
// Match History Response
export interface GameHistoryResponse {
  total: number;
  games: GameHistoryItem[];
}

export interface GameHistoryItem {
  id: string;
  roomCode: string;
  scenarioName: string;
  scenarioId: string;
  victory: boolean;
  completedAt: string;
  roundsCompleted: number;
  playerResult: PlayerResult;
  otherPlayers: OtherPlayer[];
}

export interface PlayerResult {
  characterClass: string;
  characterName: string;
  damageDealt: number;
  experienceGained: number;
  goldGained: number;
  monstersKilled: number;
  survived: boolean;
}

export interface OtherPlayer {
  characterClass: string;
  characterName: string;
  survived: boolean;
}

// Game Result Detail Response
export interface GameResultDetailResponse {
  id: string;
  gameId: string;
  roomCode: string;
  scenarioId: string;
  scenarioName: string;
  victory: boolean;
  roundsCompleted: number;
  completionTimeMs: number;
  completedAt: string;
  primaryObjectiveCompleted: boolean;
  secondaryObjectiveCompleted: boolean;
  objectivesCompletedList: string[];
  objectiveProgress: Record<string, ObjectiveProgressEntry>;
  totalLootCollected: number;
  totalExperience: number;
  totalGold: number;
  playerResults: PlayerGameResultDetail[];
}

export interface ObjectiveProgressEntry {
  current: number;
  target: number;
  completed: boolean;
}

export interface PlayerGameResultDetail {
  userId: string;
  characterId: string;
  characterClass: string;
  characterName: string;
  survived: boolean;
  wasExhausted: boolean;
  damageDealt: number;
  damageTaken: number;
  monstersKilled: number;
  lootCollected: number;
  cardsLost: number;
  experienceGained: number;
  goldGained: number;
}

// User Statistics Response
export interface UserStatisticsResponse {
  totalGames: number;
  victories: number;
  defeats: number;
  winRate: number;
  totalExperience: number;
  totalGold: number;
  totalMonstersKilled: number;
  favoriteClass: string | null;
}
```

---

## Related Documentation

- [game-completion-system.md](./game-completion-system.md) - Game completion architecture
- [objective-system-guide.md](./objective-system-guide.md) - Objective system details
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall system architecture

---

**Last Updated**: 2025-12-07
**Version**: 1.0.0 (Issue #186 - Game Completion System)
