Run the comprehensive game flow test in headless Firefox and report any bugs found to bugs.md.

IMPORTANT: Before running this command, ensure that both the backend (localhost:3000) and frontend (localhost:5173) dev servers are running.

The test will:
1. Load the dev site (localhost:5173)
2. Create 4 separate games
3. Add 2 players to the first game
4. Start all 4 games
5. Select cards for players
6. Move and attack with characters
7. Verify monsters move and attack back after player ends turn
8. Report any bugs found to bugs.md (with duplicate checking)

To run the test, execute:
```bash
cd /home/opc/hexhaven/frontend
npx playwright test comprehensive-game-flow.spec.ts --config=playwright-firefox.config.ts
```

Test results, videos, and traces will be saved to the test-results directory.
