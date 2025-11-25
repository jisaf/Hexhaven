# Monster AI Logic

This document outlines the decision-making process for monster AI in the game, based on the official Gloomhaven rules.

## 1. Monster Focus Selection

Before taking any action, a monster must determine its "focus" – the player character it will target for the current turn. This selection is based on a strict set of rules, applied in order:

1.  **Least Movement to Attack:** The monster identifies the player it can attack with the minimum number of movement points. It calculates the shortest path to a hex from which it can perform its attack (as defined on its ability card for the round). The player who can be targeted from the end of this path becomes the focus.

2.  **Closest Proximity (Tie-breaker):** If multiple players can be attacked with the same amount of movement, the monster will focus on the player who is physically closest in terms of the number of hexes, ignoring walls and obstacles.

3.  **Lowest Initiative (Final Tie-breaker):** If there is still a tie, the monster will focus on the player with the lower initiative value for the current round.

## 2. Monster Movement

If a monster's ability card for the round includes a "Move" action, its movement is determined by its focus and the type of attack it will perform:

*   **Melee Attack (Single Target):** The monster will move the fewest number of hexes necessary to become adjacent to its focus.

*   **Melee Attack (Multi-Target):** The monster will move to a position where it can attack its focus and the maximum possible number of additional players.

*   **Ranged Attack:** The monster will move to a hex from which it can perform its attack on its focus without suffering from Disadvantage (i.e., not adjacent to the target). It will also try to maximize the number of targets if it's a multi-target attack.

*   **No Attack:** If the monster's ability card does not include an "Attack" action, it will move as if it had a single-target melee attack, getting as close as possible to its focus.

*   **Avoiding Negative Terrain:** Monsters will treat traps and hazardous terrain as obstacles and will not move through them unless it is the only way to target a player.

## 3. Monster Attack

If a monster's ability card includes an "Attack" action, it will perform the attack on its focus.

*   **Multi-Target Attacks:** If the attack can target multiple enemies, the monster will attack its focus and as many other players as it can, prioritizing the maximum number of targets.

*   **Attack Modifiers:** Monster attacks are modified by the monster's attack modifier deck, just like player attacks.

## 4. Ambiguity

In any situation where the rules are ambiguous (e.g., two equally viable paths to move, or two equally viable targets), the players will decide the monster's course of action.
