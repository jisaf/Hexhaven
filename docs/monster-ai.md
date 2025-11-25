# Monster AI

This document outlines the logic for monster actions during their turn in a scenario.

## Turn Order

1.  **Initiative:** At the start of each round, an ability card is drawn for each monster type on the board. The initiative number on this card determines when all monsters of that type will act.
2.  **Activation:** All elite monsters of a type act first, in ascending order of their standee number. Then, all normal monsters of that type act in ascending order.

## Monster Focus

Before taking any actions, a monster determines its "focus" – the character it will target.

1.  **Least Movement for Attack:** The primary focus is the character that the monster can attack by moving the fewest number of hexes.
2.  **Proximity Tie-breaker:** If there's a tie, the monster focuses on the character who is physically closer (fewer hexes away, ignoring walls).
3.  **Initiative Tie-breaker:** If there's still a tie, the monster focuses on the character with the lower initiative in the current round.

## Monster Movement

-   A monster only moves if its ability card for the round includes a "Move" action.
-   If the card also has an "Attack" action, the monster moves the minimum distance necessary to get in range and line-of-sight of its focused target.
-   For multi-target attacks, the monster will position itself to attack its focus and as many other characters as possible.
-   For ranged attacks, monsters will try to move to a position where they are not adjacent to their target to avoid Disadvantage.
-   Monsters treat traps and hazardous terrain as obstacles unless moving through them is the only way to focus on a character.

## Monster Attack

-   A monster only attacks if its ability card includes an "Attack" action.
-   The attack's base damage is on the monster's stat card, modified by the value on the ability card.
-   A monster always attacks its focused character.
-   If a monster can attack multiple targets, it will attack its focus and as many other characters as possible.
