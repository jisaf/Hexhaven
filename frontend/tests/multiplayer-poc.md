# Multiplayer Testing Proof of Concept

## Approach: Dual Sub-Agent Testing

Use two independent Task agents running in parallel, each with isolated browser contexts.

## Test: Two Players Join Same Game

### Agent 1 (Player A - Host)
1. Navigate to lobby
2. Create new game room
3. Extract room code
4. Select character
5. Wait for Player B to join
6. Start game
7. Report success

### Agent 2 (Player B - Guest)
1. Wait for room code from Agent 1
2. Navigate to lobby
3. Join room using code
4. Select different character
5. Wait for game start
6. Report success

## Implementation Notes

- Each agent has independent MCP browser instance
- Room code must be shared between agents (via file or return value)
- Agents can run in parallel after room creation
- Full process isolation ensures true multiplayer testing

## Next Steps

1. Implement orchestrator script that launches both agents
2. Coordinate room code sharing
3. Verify both players see each other in lobby
4. Extend to test in-game multiplayer interactions
