/**
 * Unit Test: Load Character Data (6 classes with stats and ability decks) (US5 - T166)
 *
 * Tests:
 * 1. Character JSON file loads successfully
 * 2. All 6 starting character classes are present
 * 3. Each character has required attributes (health, hand size, description)
 * 4. Each character has unique ability deck
 * 5. Ability deck references are valid
 */

import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Character Data Loading (US5 - T166)', () => {
  let characterData: any;
  let characters: any[];

  beforeAll(() => {
    // Load character data JSON
    const dataPath = path.join(__dirname, '../../src/data/characters.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    characterData = JSON.parse(rawData);
    characters = Object.entries(characterData.characters).map(([classType, data]) => ({
        classType,
        ...(data as object),
      }));
  });

  it('should load characters.json successfully', () => {
    expect(characterData).toBeDefined();
    expect(characterData.characters).toBeDefined();
    expect(typeof characterData.characters).toBe('object');
  });

  it('should contain all 6 starting character classes', () => {
    expect(Object.keys(characterData.characters).length).toBe(6);

    const expectedClasses = [
      'Brute',
      'Tinkerer',
      'Spellweaver',
      'Scoundrel',
      'Cragheart',
      'Mindthief'
    ];

    const actualClasses = Object.keys(characterData.characters);

    expectedClasses.forEach(expectedClass => {
      expect(actualClasses).toContain(expectedClass);
    });
  });

  it('should have valid health stats for each character', () => {
    const expectedHealth = {
      'Brute': 10,
      'Tinkerer': 8,
      'Spellweaver': 6,
      'Scoundrel': 8,
      'Cragheart': 10,
      'Mindthief': 6
    };

    characters.forEach((char: any) => {
      expect(char.maxHealth).toBeDefined();
      expect(char.maxHealth).toBe(expectedHealth[char.classType as keyof typeof expectedHealth]);
      expect(char.maxHealth).toBeGreaterThan(0);
    });
  });

  it('should have valid hand size for each character', () => {
    const expectedHandSize = {
      'Brute': 10,
      'Tinkerer': 12,
      'Spellweaver': 8,
      'Scoundrel': 9,
      'Cragheart': 11,
      'Mindthief': 10
    };

    characters.forEach((char: any) => {
      expect(char.startingHandSize).toBeDefined();
      expect(char.startingHandSize).toBe(expectedHandSize[char.classType as keyof typeof expectedHandSize]);
      expect(char.startingHandSize).toBeGreaterThan(0);
    });
  });

  it('should have unique descriptions for each character', () => {
    characters.forEach((char: any) => {
      expect(char.description).toBeDefined();
      expect(typeof char.description).toBe('string');
      expect(char.description.length).toBeGreaterThan(10); // Meaningful description
    });

    // Verify descriptions are unique
    const descriptions = characters.map((char: any) => char.description);
    const uniqueDescriptions = new Set(descriptions);
    expect(uniqueDescriptions.size).toBe(6);
  });

  it('should have unique ability decks for each character', () => {
    characters.forEach((char: any) => {
      expect(char.abilityCards).toBeDefined();
      expect(Array.isArray(char.abilityCards)).toBe(true);
      expect(char.abilityCards.length).toBeGreaterThan(0);
      expect(char.abilityCards.length).toBeGreaterThanOrEqual(10); // Each class has at least 10 starting cards
    });

    // Verify each character has different ability cards
    const brute = characters.find((c: any) => c.classType === 'Brute');
    const tinkerer = characters.find((c: any) => c.classType === 'Tinkerer');

    // Brute and Tinkerer should have no overlapping cards
    const bruteCards = new Set(brute.abilityCards);
    const tinkererCards = new Set(tinkerer.abilityCards);

    const overlap = [...bruteCards].filter(card => tinkererCards.has(card));
    expect(overlap.length).toBe(0);
  });

  it('should have valid ability card IDs (class-prefixed)', () => {
    characters.forEach((char: any) => {
      const classPrefix = char.classType.toLowerCase();

      char.abilityCards.forEach((cardId: string) => {
        expect(typeof cardId).toBe('string');
        expect(cardId.startsWith(classPrefix)).toBe(true);
        expect(cardId.length).toBeGreaterThan(classPrefix.length + 1); // Has name after prefix
      });
    });
  });

  it('should have required character attributes', () => {
    const requiredAttributes = [
      'maxHealth',
      'startingHandSize',
      'description',
      'abilityCards'
    ];

    characters.forEach((char: any) => {
      requiredAttributes.forEach(attr => {
        expect(char).toHaveProperty(attr);
      });
    });
  });

  it('should have ability deck sizes matching character design', () => {
    // Each character should have exactly 10 level-1 cards (standard Gloomhaven design)
    characters.forEach((char: any) => {
      expect(char.abilityCards.length).toBe(10);
    });
  });

  it('should load character data for Brute with expected values', () => {
    const brute = characterData.characters.Brute;

    expect(brute).toBeDefined();
    expect(brute.maxHealth).toBe(10);
    expect(brute.startingHandSize).toBe(10);
    expect(brute.description).toContain('tanky');
    expect(brute.abilityCards).toContain('brute-trample');
    expect(brute.abilityCards).toContain('brute-warding-strength');
  });

  it('should load character data for Spellweaver with expected values', () => {
    const spellweaver = characterData.characters.Spellweaver;

    expect(spellweaver).toBeDefined();
    expect(spellweaver.maxHealth).toBe(6); // Lowest health
    expect(spellweaver.startingHandSize).toBe(8); // Smallest hand
    expect(spellweaver.description).toContain('mage');
  });

  it('should load character data for Tinkerer with expected values', () => {
    const tinkerer = characterData.characters.Tinkerer;

    expect(tinkerer).toBeDefined();
    expect(tinkerer.maxHealth).toBe(8);
    expect(tinkerer.startingHandSize).toBe(12); // Largest hand
    expect(tinkerer.description).toContain('support');
  });
});
