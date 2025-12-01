Use Playwright MCP to interactively test the complete game flow by analyzing the page and interacting with it intelligently.

Start the Playwright MCP server in Firefox and test the full game flow:
1. Navigate to localhost:5173
2. Create a game by analyzing the page and clicking the appropriate button
3. Fill in player nickname
4. Create additional games in new tabs
5. Join second player to first game
6. Select characters by describing what you see
7. Start the game
8. Select ability cards
9. Move character by describing the board
10. Attack monsters
11. End turn and observe monster AI behavior
12. Report any issues found

The Playwright MCP will use accessibility tree analysis to understand the page structure and interact with it naturally, without relying on test IDs or specific selectors.
