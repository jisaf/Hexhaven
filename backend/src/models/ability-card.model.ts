/**
 * AbilityCard Model (US2 - T087)
 *
 * Represents a playable action card with initiative, top action,
 * bottom action, and optional elemental effects. Each character
 * class has a unique deck of ability cards.
 */

import type { Action, ElementType } from '../../../shared/types/entities';
import { CharacterClass } from '../../../shared/types/entities';

export interface AbilityCardData {
  id: string;
  characterClass: CharacterClass;
  name: string;
  level: number | 'X';
  initiative: number;
  topAction: Action;
  bottomAction: Action;
  imageUrl?: string;
  createdAt: Date;
}

export class AbilityCard {
  public readonly id: string;
  public readonly characterClass: CharacterClass;
  public readonly name: string;
  public readonly level: number | 'X';
  public readonly initiative: number;
  private readonly _topAction: Action;
  private readonly _bottomAction: Action;
  public readonly imageUrl?: string;
  private readonly _createdAt: Date;

  constructor(data: AbilityCardData) {
    this.id = data.id;
    this.characterClass = data.characterClass;
    this.name = data.name;
    this.level = data.level;
    this.initiative = data.initiative;
    this._topAction = data.topAction;
    this._bottomAction = data.bottomAction;
    this.imageUrl = data.imageUrl;
    this._createdAt = data.createdAt;

    this.validate();
  }

  // Getters
  get topAction(): Readonly<Action> {
    return { ...this._topAction };
  }

  get bottomAction(): Readonly<Action> {
    return { ...this._bottomAction };
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get isStarterCard(): boolean {
    return this.level === 1;
  }

  get isLevelUpCard(): boolean {
    return this.level === 'X';
  }

  get generatesElement(): boolean {
    return !!(
      this._topAction.elementGenerate || this._bottomAction.elementGenerate
    );
  }

  get consumesElement(): boolean {
    return !!(
      this._topAction.elementConsume || this._bottomAction.elementConsume
    );
  }

  // Methods
  private validate(): void {
    if (this.initiative < 1 || this.initiative > 99) {
      throw new Error('Initiative must be between 1 and 99');
    }

    if (typeof this.level === 'number' && (this.level < 1 || this.level > 9)) {
      throw new Error('Level must be between 1 and 9, or "X"');
    }

    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Card name cannot be empty');
    }
  }

  getActionByPosition(position: 'top' | 'bottom'): Readonly<Action> {
    return position === 'top' ? this.topAction : this.bottomAction;
  }

  getElementGenerated(position: 'top' | 'bottom'): ElementType | null {
    const action = this.getActionByPosition(position);
    return action.elementGenerate || null;
  }

  getElementConsumed(position: 'top' | 'bottom'): ElementType | null {
    const action = this.getActionByPosition(position);
    return action.elementConsume || null;
  }

  getElementBonus(position: 'top' | 'bottom'): {
    effect: string;
    value: number;
  } | null {
    const action = this.getActionByPosition(position);
    return action.elementBonus || null;
  }

  hasActionType(type: Action['type']): boolean {
    return this._topAction.type === type || this._bottomAction.type === type;
  }

  isAttackCard(): boolean {
    return this.hasActionType('attack');
  }

  isMoveCard(): boolean {
    return this.hasActionType('move');
  }

  isHealCard(): boolean {
    return this.hasActionType('heal');
  }

  toJSON(): AbilityCardData {
    return {
      id: this.id,
      characterClass: this.characterClass,
      name: this.name,
      level: this.level,
      initiative: this.initiative,
      topAction: this._topAction,
      bottomAction: this._bottomAction,
      imageUrl: this.imageUrl,
      createdAt: this._createdAt,
    };
  }

  /**
   * Create a new AbilityCard instance
   */
  static create(
    characterClass: CharacterClass,
    name: string,
    level: number | 'X',
    initiative: number,
    topAction: Action,
    bottomAction: Action,
    imageUrl?: string,
  ): AbilityCard {
    return new AbilityCard({
      id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      characterClass,
      name,
      level,
      initiative,
      topAction,
      bottomAction,
      imageUrl,
      createdAt: new Date(),
    });
  }

  /**
   * Get starter deck for a character class (level 1 cards)
   */
  static getStarterDeck(characterClass: CharacterClass): AbilityCard[] {
    // Brute starter cards (simplified examples)
    const bruteCards: Omit<
      AbilityCardData,
      'id' | 'createdAt' | 'characterClass'
    >[] = [
      {
        name: 'Trample',
        level: 1,
        initiative: 72,
        topAction: {
          type: 'attack',
          value: 3,
          range: 0,
          effects: ['Push 1'],
        },
        bottomAction: {
          type: 'move',
          value: 3,
        },
      },
      {
        name: 'Provoking Roar',
        level: 1,
        initiative: 10,
        topAction: {
          type: 'attack',
          value: 2,
          range: 0,
        },
        bottomAction: {
          type: 'special',
          effects: ['All adjacent enemies focus on you'],
        },
      },
      {
        name: 'Warding Strength',
        level: 1,
        initiative: 32,
        topAction: {
          type: 'attack',
          value: 3,
          range: 0,
        },
        bottomAction: {
          type: 'special',
          effects: ['Shield 1 for round'],
        },
      },
      {
        name: 'Eye for an Eye',
        level: 1,
        initiative: 18,
        topAction: {
          type: 'attack',
          value: 2,
          range: 0,
          effects: ['Retaliate 2'],
        },
        bottomAction: {
          type: 'move',
          value: 4,
        },
      },
      {
        name: 'Spare Dagger',
        level: 1,
        initiative: 27,
        topAction: {
          type: 'attack',
          value: 2,
          range: 2,
        },
        bottomAction: {
          type: 'move',
          value: 3,
        },
      },
      {
        name: 'Sweeping Blow',
        level: 1,
        initiative: 64,
        topAction: {
          type: 'attack',
          value: 2,
          range: 0,
          effects: ['Attack all adjacent enemies'],
        },
        bottomAction: {
          type: 'move',
          value: 2,
        },
      },
      {
        name: 'Skewer',
        level: 1,
        initiative: 77,
        topAction: {
          type: 'attack',
          value: 4,
          range: 0,
        },
        bottomAction: {
          type: 'move',
          value: 2,
        },
      },
      {
        name: 'Shield Bash',
        level: 1,
        initiative: 15,
        topAction: {
          type: 'attack',
          value: 1,
          range: 0,
          effects: ['Push 2', 'Stun'],
        },
        bottomAction: {
          type: 'move',
          value: 3,
        },
      },
      {
        name: 'Overwhelming Assault',
        level: 1,
        initiative: 52,
        topAction: {
          type: 'attack',
          value: 3,
          range: 0,
          effects: ['Target all adjacent enemies'],
        },
        bottomAction: {
          type: 'move',
          value: 1,
        },
      },
      {
        name: 'Leaping Cleave',
        level: 1,
        initiative: 84,
        topAction: {
          type: 'attack',
          value: 3,
          range: 0,
        },
        bottomAction: {
          type: 'move',
          value: 4,
          effects: ['Jump'],
        },
      },
    ];

    // For now, only Brute cards are implemented
    // Other classes would have their own starter decks
    const cardTemplates =
      characterClass === CharacterClass.BRUTE ? bruteCards : [];

    return cardTemplates.map((template) =>
      AbilityCard.create(
        characterClass,
        template.name,
        template.level,
        template.initiative,
        template.topAction,
        template.bottomAction,
        template.imageUrl,
      ),
    );
  }

  /**
   * Compare two cards by initiative (for turn order sorting)
   */
  static compareByInitiative(a: AbilityCard, b: AbilityCard): number {
    return a.initiative - b.initiative;
  }
}
