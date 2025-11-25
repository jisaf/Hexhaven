# Monster AI Logic

This document outlines the decision-making process for monster actions during their turn in Hexhaven. The logic is based on the official Gloomhaven rules to provide a predictable and challenging experience.

## Turn Order

-   Monsters act on their initiative, which is determined by a monster ability card drawn for their monster type at the start of each round.
-   All monsters of the same type act on the same initiative count.
-   Elite monsters of a type act before normal monsters of the same type.
-   If multiple monsters of the same rank (elite or normal) exist, they act in ascending order based on their standee number.

## Monster Action Flow

For each monster, the following steps are performed on its turn:

### 1. Focus Selection

The monster first determines its "focus," which is the character it will target with its actions for the turn.

-   **Primary Goal:** Find a character it can attack with the least amount of movement. The AI calculates the shortest path to a hex from which it can perform its attack. The character that can be targeted from the end of that path becomes the focus.
-   **Tie-breaker 1 (Proximity):** If multiple characters can be attacked with the same amount of movement, the monster will focus on the character who is physically closer (in hex distance, ignoring walls).
-   **Tie-breaker 2 (Initiative):** If there is still a tie, the monster will focus on the character with the lower (earlier) initiative for the current round.
-   **No Attack Action:** If the monster's ability card for the round does not include an attack, it will determine its focus as if it had a basic melee attack.
-   **Target Validity:** Monsters will not focus on invisible or exhausted characters.

### 2. Movement

If the monster's ability card includes a "Move" action, it will move towards its focus.

-   **Goal:** Move the minimum number of hexes necessary to get in range and line-of-sight to perform its attack on its focus with maximum effect.
-   **Melee Attacks:** The monster will move to the nearest hex adjacent to its focus.
-   **Ranged Attacks:** The monster will move to a hex where it is within its attack range. If it is already in range but adjacent to its focus (which would impose Disadvantage on the attack), it will try to move away to a hex that is still in range but not adjacent.
-   **Multi-target Attacks:** If the attack can target multiple enemies, the monster will move to a position where it can hit its primary focus and as many other characters as possible.
-   **No Attack Action:** If the monster has a move but no attack, it will move as close as possible to its focus, ending in a hex adjacent to it if possible.
-   **Obstacles and Traps:** Monsters treat traps and hazardous terrain as obstacles and will attempt to move around them. They will only move through a trap if it is the *only possible way* to target a character.

### 3. Attack

If the monster's ability card includes an "Attack" action, it will perform the attack after its movement.

-   **Targeting:** The monster will attack its focused character.
-   **Multi-target:** If the attack hits multiple targets, it will always include its primary focus in the group of targets if possible.
-   **Conditions:** A monster cannot attack if it is `DISARMED` or `STUNNED`.
-   **Execution:** The attack is resolved by drawing a card from the monster attack modifier deck and applying the result to the monster's base attack value.

### 4. Other Abilities

Monsters will perform any other abilities listed on their ability card in the order they are written.
