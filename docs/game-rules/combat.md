# Combat System

[Back to Index](./index.md)

---

### MOVE

A [**“Move X”**](../../img/icons/general/move.png) ability allows a character to move **up to** X number of hexes on the map. Figures (characters and monsters) can move through allies, but cannot move through enemies or obstacles. Traps and other terrain effects of hexes must be resolved when a figure enters them with normal movement. A figure cannot end its movement in the same hex as another figure. Figures can **never** move through walls.

Some Move abilities are specified as a [“Jump.”](../../img/icons/general/jump.png) **Move X (Jump)** allows the character to ignore all figures and terrain effects during their movement. However, the last hex of a jump is still considered a normal movement, and so must obey the normal movement rules above.

Some figures may also have the [**“Flying”**](../../img/icons/general/flying.png) special trait. This allows figures to completely ignore any figures and terrain tiles during any part of their movement, including the last hex, except that they still must end their movement in an **unoccupied** hex (no figures present). This includes forced movement like PUSH or PULL. If a figure loses its Flying trait while occupying an obstacle hex, it takes damage as if it had sprung a damage trap and then moves immediately to the nearest **empty** hex (no figures, tokens, or overlay tiles of any kind present except corridors, pressure plates, and open doors).

#### REVEALING A ROOM

During any part of a character’s movement, if they enter a tile with a closed door, flip the door tile to the opened side and immediately reveal the adjacent room on the other side of the door. The Scenario Book will then specify what monsters, money tokens, and special overlay tiles should be placed in the revealed room, based on the number of characters (including exhausted characters). Note that, as in scenario setup, the standee numbers of the monsters in the new room should be randomized when placed. It is possible to run out of specific types of monster standees when revealing a room. If this happens, place only the standees that are available, starting with the monsters closest to the revealing character.

Once everything is placed in the new room, any present monster types without an action card should have one drawn for them now. Once the revealing character’s turn ends, the initiative values of all monsters in the new room are reviewed, and any monster type that has a lower initiative value than the revealing character (i.e., they should have acted earlier in the round) must immediately act out their turn (in normal initiative order in case of multiple monster types in this situation). This ensures that all monsters revealed in the new room will **always** take a turn in the round in which they are revealed.

### ATTACK

An [**“Attack X”**](../../img/icons/general/attack.png) ability allows a character to do a base X amount of damage to an enemy within their range. Figures cannot attack their allies. There are two types of attacks: **ranged** and **melee**.

**Ranged attacks** are accompanied by a [**“Range Y”**](../../img/icons/general/range.png) value, which means any enemy within Y hexes can be targeted by the attack. Any ranged attack targeting an adjacent enemy gains Disadvantage against that target (see Advantage and Disadvantage on pp. 20–21 for details).

**Melee attacks** have no accompanying range value and are considered to have a default range of 1 hex, which means they typically target adjacent enemies.

**Line-of-sight:** All ranged and melee attacks can only be performed against enemies within line-of-sight, which means that a line can be drawn from any corner of the attacker’s hex to any corner of the defender’s hex without touching any part of a wall (the line edge of a map tile or the entire area of any partial hex along the edge of a map tile, unless covered by an overlay tile). Only walls block line-of-sight. In addition, **any ability** which specifies a range can only be performed on a figure within line-of-sight. If a non-attack ability does not specify a range, then line-of-sight is not required. Also note that two hexes separated by a wall line are not considered adjacent, and range cannot be counted through walls.

---
**<p align="right"><a name="page20">Page 20</a></p>**

---

When attacking, the base attack value written on the card can be modified by three types of values in the following order. Repeat these steps for each individual enemy targeted by the attack: 

- An **attacker’s attack modifiers** are applied first. These modifiers include bonuses and penalties from active ability cards, items, and other sources (e.g., +1 Attack from POISON). 
- Next, an **attack modifier card** is drawn from the attacker’s attack modifier deck and applied. 
- Lastly, the **defender’s defensive bonuses** are applied. This reduces the incoming attack value for each individual enemy targeted based on each defender’s own shield modifier or other defensive bonuses. 
- If there are multiple modifiers in any single step of this process, the player chooses the order in which they are applied. Also note that because the bonuses are applied **per target**, it is possible for the same attack action to ultimately deal different damage to each enemy it targets.

***Example:** The Scoundrel performs an “Attack 3” ability on an adjacent elite Bandit Guard. The Scoundrel adds a +2 attack modifier because of specific conditions set by the card and also is allowed to double the attack because of an active card in front of her. She chooses to add the +2, then doubles the result, resulting in an “Attack 10.” She then plays an attack modifier card to reveal a “-1,” so the attack is reduced to 9. Finally, the Bandit Guard has a shield value of 1, so the attack value is reduced to 8 and the bandit suffers 8 damage.*

Any damage suffered by a monster should be tracked on the stat sleeve in the section corresponding to the number on the specific monster’s standee. When a monster is brought to zero or fewer hit points by an attack or any source of damage, that monster immediately dies and is removed from the board. Any additional effects of an attack are not applied once a monster dies.

**When a monster dies, a money token is also placed on the hex where it died if the monster was not summoned or spawned.**

#### ADVANTAGE AND DISADVANTAGE

Some attacks may have either **Advantage** or **Disadvantage**.

- [Advantage](../../img/rulebook/advantage.png)
  
  An attacker with **Advantage** will draw two modifier cards from their deck and use whichever one is **better** (a). If one rolling modifier card was drawn, its effect is added to the other card played (b). If two rolling modifier cards were drawn, continue to draw cards until a rolling modifier is not drawn and then add together all drawn effects (c).
- [Disadvantage](../../img/rulebook/disadvantage.png)

  An attacker with **Disadvantage** will draw two modifier cards from their deck and use whichever one is **worse** (d). Rolling modifiers are disregarded in the case of Disadvantage (e). If two rolling modifier cards were drawn, continue to draw cards until a rolling modifier is not played and then only apply the effect of the last card drawn (f).

---
**<p align="right"><a name="page21">Page 21</a></p>**

---

If there is ambiguity about which card drawn is better or worse, use whichever card was drawn first. Ambiguity can occur when comparing one or more added effects provided by attack modifier cards (e.g., elemental infusions, negative conditions, etc.) All added effects should be considered to have a positive but undefined numerical value.

Instances of Advantage and Disadvantage are mostly gained by specific character or monster abilities. However, any ranged attack targeting an adjacent enemy also gains Disadvantage for that target. Instances of Advantage or Disadvantage don’t stack, and if an attack has instances of both Advantage and Disadvantage, they cancel out each other and the attack is performed normally.

#### AREA EFFECTS

Some attacks and other abilities allow figures to target multiple hexes or multiple targets at the same time. In these cases, the area of effect for the ability is shown on the ability card. **Note that any rotational orientation of the depicted diagram is valid. Also note that each target constitutes a separate *attack* (drawing its own attack modifier card), but all attacks together make up a single *attack action*.**

[Grey](../../img/icons/general/aoe-attacker.png) indicates the hex on which the figure is currently located. An area attack which includes a grey hex is always considered a melee attack.

[Red](../../img/icons/general/aoe-target.png) indicates the hexes with enemies affected by the ability.

For a ranged area attack, only one of the red hexes needs to be within the range specified, and it does not need to contain an enemy. However, for both ranged and melee area attacks, **you can only attack enemies in hexes you have line of sight to**.

[AoE example 1](../../img/rulebook/aoe-example-1.png) | [AoE example 2](../../img/rulebook/aoe-example-2.png)
-|-
***Example:** This attack indicates that the figure can perform a ranged “Attack 4” on a cluster of three hexes as long as at least one of those hexes is within Range 3.* | ***Example:** This attack indicates that the figure can perform a melee “Attack 3” on the cluster of three hexes.*

Some attacks are accompanied by a [“Target X”](../../img/icons/general/target.png) value, which means the character can target X number of different enemies within the attack’s range with the attack.

For any attack that targets multiple enemies, an attack modifier card is drawn for **each target**. It is not possible to target the same enemy with multiple attacks from the same ability. **Note:** Abilities can **never** target allies (positive abilities meant for allies will use the term “affect” instead of “target”). An ally can be within the affected area of an attack, but **they will not be targeted by it.**

Note also that as long as an attack does not specify range, it is considered melee, such that it is possible to attack a non-adjacent target with a melee attack if hex configuration allows.

---
**<p align="right"><a name="page22">Page 22</a></p>**

---

#### ATTACK EFFECTS

Attack abilities will often have effects that increase their power. If an attack effect is listed on an ability card after an attack, the target (or targets) of the attack is subject to the additional effect as well, after damage from the attack is resolved. **Attack effects are applied regardless of whether the corresponding attack does damage.** These effects (except experience gains) are optional and can be skipped. Some character actions can also apply these effects without an attack, and in such cases the target of the effect is written on the ability card.

[**PUSH X**](../../img/icons/status/push.png) – The target is forced to move X hexes in a direction specified by the attacker, but each hex moved must place the target **farther away from** the attacker than it was previously. If there are no viable hexes into which to push the target, the push ends. The target can be pushed through its allies, but not its enemies.

[**PULL X**](../../img/icons/status/pull.png) – The target is forced to move X hexes in a direction specified by the attacker, but each hex moved must place the target **closer to** the attacker than it was previously. If there are no viable hexes into which to pull the target, the pull ends. The target can be pulled through its allies, but not its enemies. Both push and pull effects are considered movements, however, they are not affected by difficult terrain.

#### PUSH/PULL TARGETING (HEXHAVEN IMPLEMENTATION)

When a player character attacks with a push or pull effect, they are presented with an **interactive targeting system** to select the destination hex:

1. **Valid Destination Highlighting**: After the attack resolves, all valid destination hexes are highlighted in **yellow**. Valid hexes must satisfy:
   - **Push**: Each hex in the path must be farther from the attacker than the previous hex
   - **Pull**: Each hex in the path must be closer to the attacker than the previous hex
   - The hex cannot be blocked by obstacles or occupied by other figures
   - The path cannot pass through obstacles or enemies

2. **Hex Selection**: Tap any highlighted yellow hex to immediately move the target to that location. Movement is applied without requiring confirmation (tap-to-confirm pattern).

3. **Skip Option**: Players can choose to skip the forced movement by tapping the "Skip Push" or "Skip Pull" button. This is useful when pushing an enemy might disadvantage the player's strategy.

4. **Monster Attackers**: When a monster performs a push or pull attack, the movement is calculated automatically using the most direct path that satisfies the distance constraint.

5. **No Valid Destinations**: If no valid hexes exist (e.g., target is backed against a wall), the push/pull effect is skipped silently and noted in the game log.

[**PIERCE X**](../../img/icons/status/pierce.png) – Up to X points of the target’s Shield are ignored for the attack. Unlike other effects, PIERCE is applied while calculating the accompanying attack damage instead of afterwards.

***Example:** an Attack 3 PIERCE 2 ability used on a monster with Shield 3 would ignore two of the monster’s Shield points and inflict 2 damage (modified by an attack modifier card).*

[**ADD TARGET**](../../img/icons/status/add-target.png) – If a figure triggers this effect with an attack action, the figure may add an additional target within range to their attack. All added effects and conditions of the attack action are applied to the target, as well, except for effects that would result in additional targets outside of the original added target (e.g., area attacks).

