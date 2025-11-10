/**
 * AttackModifierDeck Model (US2 - T088)
 *
 * Represents a deck of attack modifier cards used during combat.
 * The standard deck has 20 cards with modifiers ranging from -2 to +2,
 * plus null (miss) and x2 (critical hit) cards that trigger reshuffles.
 * Bless and curse cards can be added temporarily.
 */

import type { AttackModifierCard } from '../../../shared/types/entities';

export interface ModifierDeckData {
  characterId: string;
  cards: AttackModifierCard[];
  discardPile: AttackModifierCard[];
  createdAt: Date;
  updatedAt: Date;
}

export class ModifierDeck {
  public readonly characterId: string;
  private _cards: AttackModifierCard[];
  private _discardPile: AttackModifierCard[];
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(data: ModifierDeckData) {
    this.characterId = data.characterId;
    this._cards = [...data.cards];
    this._discardPile = [...data.discardPile];
    this._createdAt = data.createdAt;
    this._updatedAt = data.updatedAt;
  }

  // Getters
  get cards(): readonly AttackModifierCard[] {
    return [...this._cards];
  }

  get discardPile(): readonly AttackModifierCard[] {
    return [...this._discardPile];
  }

  get remainingCards(): number {
    return this._cards.length;
  }

  get totalCards(): number {
    return this._cards.length + this._discardPile.length;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Methods
  draw(): AttackModifierCard {
    if (this._cards.length === 0) {
      throw new Error('Cannot draw from empty deck');
    }

    const card = this._cards.shift()!;
    this._discardPile.push(card);
    this._updatedAt = new Date();

    // Auto-reshuffle if reshuffle card drawn
    if (card.isReshuffle) {
      this.reshuffle();
    }

    return card;
  }

  drawTwo(): [AttackModifierCard, AttackModifierCard] {
    if (this._cards.length < 2) {
      throw new Error('Not enough cards to draw two');
    }

    const card1 = this.draw();
    const card2 = this.draw();

    return [card1, card2];
  }

  reshuffle(): void {
    // Move all discarded cards back to deck
    this._cards = [...this._cards, ...this._discardPile];
    this._discardPile = [];

    // Shuffle the deck
    this.shuffle();
    this._updatedAt = new Date();
  }

  private shuffle(): void {
    // Fisher-Yates shuffle algorithm
    for (let i = this._cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this._cards[i], this._cards[j]] = [this._cards[j], this._cards[i]];
    }
  }

  addBless(): void {
    const blessCard: AttackModifierCard = {
      modifier: 2,
      isReshuffle: false,
      effects: ['Bless (removed after draw)'],
    };

    // Shuffle bless into deck
    this._cards.push(blessCard);
    this.shuffle();
    this._updatedAt = new Date();
  }

  addCurse(): void {
    const curseCard: AttackModifierCard = {
      modifier: 'null',
      isReshuffle: false,
      effects: ['Curse (removed after draw)'],
    };

    // Shuffle curse into deck
    this._cards.push(curseCard);
    this.shuffle();
    this._updatedAt = new Date();
  }

  removeBless(): void {
    const blessIndex = this._cards.findIndex(
      (card) =>
        card.modifier === 2 &&
        !card.isReshuffle &&
        card.effects?.includes('Bless (removed after draw)'),
    );

    if (blessIndex !== -1) {
      this._cards.splice(blessIndex, 1);
      this._updatedAt = new Date();
    }
  }

  removeCurse(): void {
    const curseIndex = this._cards.findIndex(
      (card) =>
        card.modifier === 'null' &&
        !card.isReshuffle &&
        card.effects?.includes('Curse (removed after draw)'),
    );

    if (curseIndex !== -1) {
      this._cards.splice(curseIndex, 1);
      this._updatedAt = new Date();
    }
  }

  countBlessCards(): number {
    return this._cards.filter(
      (card) =>
        card.modifier === 2 &&
        !card.isReshuffle &&
        card.effects?.includes('Bless (removed after draw)'),
    ).length;
  }

  countCurseCards(): number {
    return this._cards.filter(
      (card) =>
        card.modifier === 'null' &&
        !card.isReshuffle &&
        card.effects?.includes('Curse (removed after draw)'),
    ).length;
  }

  toJSON(): ModifierDeckData {
    return {
      characterId: this.characterId,
      cards: [...this._cards],
      discardPile: [...this._discardPile],
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  /**
   * Create a standard 20-card attack modifier deck
   */
  static createStandard(characterId: string): ModifierDeck {
    const now = new Date();

    // Standard deck composition:
    // 1x null (miss), 1x x2 (critical)
    // 5x +1, 5x -1
    // 6x +0
    // 1x +2, 1x -2
    const standardCards: AttackModifierCard[] = [
      { modifier: 'null', isReshuffle: true }, // Miss (triggers reshuffle)
      { modifier: 'x2', isReshuffle: true }, // Critical (triggers reshuffle)
      { modifier: 2, isReshuffle: false },
      { modifier: -2, isReshuffle: false },
      { modifier: 1, isReshuffle: false },
      { modifier: 1, isReshuffle: false },
      { modifier: 1, isReshuffle: false },
      { modifier: 1, isReshuffle: false },
      { modifier: 1, isReshuffle: false },
      { modifier: -1, isReshuffle: false },
      { modifier: -1, isReshuffle: false },
      { modifier: -1, isReshuffle: false },
      { modifier: -1, isReshuffle: false },
      { modifier: -1, isReshuffle: false },
      { modifier: 0, isReshuffle: false },
      { modifier: 0, isReshuffle: false },
      { modifier: 0, isReshuffle: false },
      { modifier: 0, isReshuffle: false },
      { modifier: 0, isReshuffle: false },
      { modifier: 0, isReshuffle: false },
    ];

    const deck = new ModifierDeck({
      characterId,
      cards: standardCards,
      discardPile: [],
      createdAt: now,
      updatedAt: now,
    });

    // Shuffle the deck
    deck.shuffle();

    return deck;
  }

  /**
   * Create a deck from existing data (for loading from database)
   */
  static fromJSON(data: ModifierDeckData): ModifierDeck {
    return new ModifierDeck(data);
  }

  /**
   * Compare two modifiers (for advantage/disadvantage)
   * Returns positive if card1 is better, negative if card2 is better
   */
  static compareModifiers(
    card1: AttackModifierCard,
    card2: AttackModifierCard,
  ): number {
    // Rank order: x2 > numbers > null

    // Handle x2 (best)
    if (card1.modifier === 'x2' && card2.modifier !== 'x2') return 1;
    if (card2.modifier === 'x2' && card1.modifier !== 'x2') return -1;
    if (card1.modifier === 'x2' && card2.modifier === 'x2') return 0;

    // Handle null (worst)
    if (card1.modifier === 'null' && card2.modifier !== 'null') return -1;
    if (card2.modifier === 'null' && card1.modifier !== 'null') return 1;
    if (card1.modifier === 'null' && card2.modifier === 'null') return 0;

    // Both are numbers, compare values
    if (typeof card1.modifier === 'number' && typeof card2.modifier === 'number') {
      return card1.modifier - card2.modifier;
    }

    return 0;
  }

  /**
   * Select better of two cards (for advantage)
   */
  static selectBetter(
    card1: AttackModifierCard,
    card2: AttackModifierCard,
  ): AttackModifierCard {
    return ModifierDeck.compareModifiers(card1, card2) > 0 ? card1 : card2;
  }

  /**
   * Select worse of two cards (for disadvantage)
   */
  static selectWorse(
    card1: AttackModifierCard,
    card2: AttackModifierCard,
  ): AttackModifierCard {
    return ModifierDeck.compareModifiers(card1, card2) < 0 ? card1 : card2;
  }
}
