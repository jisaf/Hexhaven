/**
 * Unit Test: Elemental State Service (US2 - T085)
 *
 * Tests elemental infusion state management:
 * - Six elements: fire, ice, air, earth, light, dark
 * - State transitions: inert → strong → waning → inert
 * - Generate element (inert → strong)
 * - Consume element (any state → inert)
 * - End of round decay (strong → waning, waning → inert)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ElementalStateService } from '../../src/services/elemental-state.service';
import {
  ElementalInfusion,
  ElementType,
  ElementState,
} from '../../../shared/types/entities';

describe('ElementalStateService', () => {
  let elementalService: ElementalStateService;

  beforeEach(() => {
    elementalService = new ElementalStateService();
  });

  describe('initializeElementalState', () => {
    it('should initialize all elements to inert', () => {
      const state = elementalService.initializeElementalState();

      expect(state.fire).toBe(ElementState.INERT);
      expect(state.ice).toBe(ElementState.INERT);
      expect(state.air).toBe(ElementState.INERT);
      expect(state.earth).toBe(ElementState.INERT);
      expect(state.light).toBe(ElementState.INERT);
      expect(state.dark).toBe(ElementState.INERT);
    });

    it('should contain all 6 elements', () => {
      const state = elementalService.initializeElementalState();

      expect(Object.keys(state)).toHaveLength(6);
      expect(state).toHaveProperty('fire');
      expect(state).toHaveProperty('ice');
      expect(state).toHaveProperty('air');
      expect(state).toHaveProperty('earth');
      expect(state).toHaveProperty('light');
      expect(state).toHaveProperty('dark');
    });

    it('should create new instance each time', () => {
      const state1 = elementalService.initializeElementalState();
      const state2 = elementalService.initializeElementalState();

      expect(state1).not.toBe(state2); // Different objects
      expect(state1).toEqual(state2); // Same values
    });
  });

  describe('generateElement', () => {
    it('should set element from inert to strong', () => {
      const state = elementalService.initializeElementalState();

      const newState = elementalService.generateElement(state, ElementType.FIRE);

      expect(newState.fire).toBe(ElementState.STRONG);
    });

    it('should overwrite waning with strong', () => {
      const state: ElementalInfusion = {
        fire: ElementState.WANING,
        ice: ElementState.INERT,
        air: ElementState.INERT,
        earth: ElementState.INERT,
        light: ElementState.INERT,
        dark: ElementState.INERT,
      };

      const newState = elementalService.generateElement(state, ElementType.FIRE);

      expect(newState.fire).toBe(ElementState.STRONG); // Waning → strong
    });

    it('should not change if already strong', () => {
      const state: ElementalInfusion = {
        fire: ElementState.STRONG,
        ice: ElementState.INERT,
        air: ElementState.INERT,
        earth: ElementState.INERT,
        light: ElementState.INERT,
        dark: ElementState.INERT,
      };

      const newState = elementalService.generateElement(state, ElementType.FIRE);

      expect(newState.fire).toBe(ElementState.STRONG); // Still strong
    });

    it('should not affect other elements', () => {
      const state = elementalService.initializeElementalState();

      const newState = elementalService.generateElement(state, ElementType.FIRE);

      expect(newState.ice).toBe(ElementState.INERT);
      expect(newState.air).toBe(ElementState.INERT);
      expect(newState.earth).toBe(ElementState.INERT);
      expect(newState.light).toBe(ElementState.INERT);
      expect(newState.dark).toBe(ElementState.INERT);
    });

    it('should not mutate original state', () => {
      const state = elementalService.initializeElementalState();
      const originalFireState = state.fire;

      const newState = elementalService.generateElement(state, ElementType.FIRE);

      expect(state.fire).toBe(originalFireState); // Original unchanged
      expect(newState.fire).toBe(ElementState.STRONG); // New state changed
    });

    it('should work for all 6 element types', () => {
      const state = elementalService.initializeElementalState();

      const withFire = elementalService.generateElement(state, ElementType.FIRE);
      const withIce = elementalService.generateElement(state, ElementType.ICE);
      const withAir = elementalService.generateElement(state, ElementType.AIR);
      const withEarth = elementalService.generateElement(state, ElementType.EARTH);
      const withLight = elementalService.generateElement(state, ElementType.LIGHT);
      const withDark = elementalService.generateElement(state, ElementType.DARK);

      expect(withFire.fire).toBe(ElementState.STRONG);
      expect(withIce.ice).toBe(ElementState.STRONG);
      expect(withAir.air).toBe(ElementState.STRONG);
      expect(withEarth.earth).toBe(ElementState.STRONG);
      expect(withLight.light).toBe(ElementState.STRONG);
      expect(withDark.dark).toBe(ElementState.STRONG);
    });

    it('should throw for invalid element type', () => {
      const state = elementalService.initializeElementalState();

      expect(() => {
        elementalService.generateElement(state, 'water' as ElementType);
      }).toThrow('Invalid element type: water');
    });
  });

  describe('consumeElement', () => {
    it('should set element to inert when consumed from strong', () => {
      const state: ElementalInfusion = {
        fire: ElementState.STRONG,
        ice: ElementState.INERT,
        air: ElementState.INERT,
        earth: ElementState.INERT,
        light: ElementState.INERT,
        dark: ElementState.INERT,
      };

      const newState = elementalService.consumeElement(state, ElementType.FIRE);

      expect(newState.fire).toBe(ElementState.INERT);
    });

    it('should consume from waning state', () => {
      const state: ElementalInfusion = {
        fire: ElementState.WANING,
        ice: ElementState.INERT,
        air: ElementState.INERT,
        earth: ElementState.INERT,
        light: ElementState.INERT,
        dark: ElementState.INERT,
      };

      const newState = elementalService.consumeElement(state, ElementType.FIRE);

      expect(newState.fire).toBe(ElementState.INERT);
    });

    it('should not change if already inert', () => {
      const state = elementalService.initializeElementalState();

      const newState = elementalService.consumeElement(state, ElementType.FIRE);

      expect(newState.fire).toBe(ElementState.INERT); // Already inert
    });

    it('should not affect other elements', () => {
      const state: ElementalInfusion = {
        fire: ElementState.STRONG,
        ice: ElementState.STRONG,
        air: ElementState.INERT,
        earth: ElementState.INERT,
        light: ElementState.INERT,
        dark: ElementState.INERT,
      };

      const newState = elementalService.consumeElement(state, ElementType.FIRE);

      expect(newState.ice).toBe(ElementState.STRONG); // Ice unchanged
      expect(newState.air).toBe(ElementState.INERT);
    });

    it('should not mutate original state', () => {
      const state: ElementalInfusion = {
        fire: ElementState.STRONG,
        ice: ElementState.INERT,
        air: ElementState.INERT,
        earth: ElementState.INERT,
        light: ElementState.INERT,
        dark: ElementState.INERT,
      };

      const newState = elementalService.consumeElement(state, ElementType.FIRE);

      expect(state.fire).toBe(ElementState.STRONG); // Original unchanged
      expect(newState.fire).toBe(ElementState.INERT); // New state changed
    });

    it('should throw for invalid element type', () => {
      const state = elementalService.initializeElementalState();

      expect(() => {
        elementalService.consumeElement(state, 'wind' as ElementType);
      }).toThrow('Invalid element type: wind');
    });
  });

  describe('decayElements', () => {
    it('should decay all elements at end of round', () => {
      const state: ElementalInfusion = {
        fire: ElementState.STRONG,
        ice: ElementState.WANING,
        air: ElementState.INERT,
        earth: ElementState.STRONG,
        light: ElementState.WANING,
        dark: ElementState.INERT,
      };

      const newState = elementalService.decayElements(state);

      expect(newState.fire).toBe(ElementState.WANING); // strong → waning
      expect(newState.ice).toBe(ElementState.INERT); // waning → inert
      expect(newState.air).toBe(ElementState.INERT); // inert → inert
      expect(newState.earth).toBe(ElementState.WANING); // strong → waning
      expect(newState.light).toBe(ElementState.INERT); // waning → inert
      expect(newState.dark).toBe(ElementState.INERT); // inert → inert
    });

    it('should transition strong to waning', () => {
      const state: ElementalInfusion = {
        fire: ElementState.STRONG,
        ice: ElementState.INERT,
        air: ElementState.INERT,
        earth: ElementState.INERT,
        light: ElementState.INERT,
        dark: ElementState.INERT,
      };

      const newState = elementalService.decayElements(state);

      expect(newState.fire).toBe(ElementState.WANING);
    });

    it('should transition waning to inert', () => {
      const state: ElementalInfusion = {
        fire: ElementState.WANING,
        ice: ElementState.INERT,
        air: ElementState.INERT,
        earth: ElementState.INERT,
        light: ElementState.INERT,
        dark: ElementState.INERT,
      };

      const newState = elementalService.decayElements(state);

      expect(newState.fire).toBe(ElementState.INERT);
    });

    it('should keep inert as inert', () => {
      const state = elementalService.initializeElementalState();

      const newState = elementalService.decayElements(state);

      expect(newState.fire).toBe(ElementState.INERT);
      expect(newState.ice).toBe(ElementState.INERT);
      expect(newState.air).toBe(ElementState.INERT);
      expect(newState.earth).toBe(ElementState.INERT);
      expect(newState.light).toBe(ElementState.INERT);
      expect(newState.dark).toBe(ElementState.INERT);
    });

    it('should not mutate original state', () => {
      const state: ElementalInfusion = {
        fire: ElementState.STRONG,
        ice: ElementState.WANING,
        air: ElementState.INERT,
        earth: ElementState.INERT,
        light: ElementState.INERT,
        dark: ElementState.INERT,
      };

      const newState = elementalService.decayElements(state);

      expect(state.fire).toBe(ElementState.STRONG); // Original unchanged
      expect(state.ice).toBe(ElementState.WANING); // Original unchanged
      expect(newState.fire).toBe(ElementState.WANING); // New state changed
      expect(newState.ice).toBe(ElementState.INERT); // New state changed
    });
  });

  describe('canConsumeElement', () => {
    it('should return true if element is strong', () => {
      const state: ElementalInfusion = {
        fire: ElementState.STRONG,
        ice: ElementState.INERT,
        air: ElementState.INERT,
        earth: ElementState.INERT,
        light: ElementState.INERT,
        dark: ElementState.INERT,
      };

      const canConsume = elementalService.canConsumeElement(
        state,
        ElementType.FIRE,
      );

      expect(canConsume).toBe(true);
    });

    it('should return true if element is waning', () => {
      const state: ElementalInfusion = {
        fire: ElementState.WANING,
        ice: ElementState.INERT,
        air: ElementState.INERT,
        earth: ElementState.INERT,
        light: ElementState.INERT,
        dark: ElementState.INERT,
      };

      const canConsume = elementalService.canConsumeElement(
        state,
        ElementType.FIRE,
      );

      expect(canConsume).toBe(true);
    });

    it('should return false if element is inert', () => {
      const state = elementalService.initializeElementalState();

      const canConsume = elementalService.canConsumeElement(
        state,
        ElementType.FIRE,
      );

      expect(canConsume).toBe(false);
    });

    it('should throw for invalid element type', () => {
      const state = elementalService.initializeElementalState();

      expect(() => {
        elementalService.canConsumeElement(state, 'plasma' as ElementType);
      }).toThrow('Invalid element type: plasma');
    });
  });

  describe('getElementState', () => {
    it('should return current state of specific element', () => {
      const state: ElementalInfusion = {
        fire: ElementState.STRONG,
        ice: ElementState.WANING,
        air: ElementState.INERT,
        earth: ElementState.INERT,
        light: ElementState.INERT,
        dark: ElementState.INERT,
      };

      expect(elementalService.getElementState(state, ElementType.FIRE)).toBe(
        ElementState.STRONG,
      );
      expect(elementalService.getElementState(state, ElementType.ICE)).toBe(
        ElementState.WANING,
      );
      expect(elementalService.getElementState(state, ElementType.AIR)).toBe(
        ElementState.INERT,
      );
    });

    it('should throw for invalid element type', () => {
      const state = elementalService.initializeElementalState();

      expect(() => {
        elementalService.getElementState(state, 'lightning' as ElementType);
      }).toThrow('Invalid element type: lightning');
    });
  });

  describe('setElementState', () => {
    it('should set specific element to given state', () => {
      const state = elementalService.initializeElementalState();

      const newState = elementalService.setElementState(
        state,
        ElementType.FIRE,
        ElementState.STRONG,
      );

      expect(newState.fire).toBe(ElementState.STRONG);
    });

    it('should allow setting to any valid state', () => {
      const state = elementalService.initializeElementalState();

      const withWaning = elementalService.setElementState(
        state,
        ElementType.ICE,
        ElementState.WANING,
      );
      expect(withWaning.ice).toBe(ElementState.WANING);

      const withStrong = elementalService.setElementState(
        state,
        ElementType.AIR,
        ElementState.STRONG,
      );
      expect(withStrong.air).toBe(ElementState.STRONG);

      const withInert = elementalService.setElementState(
        state,
        ElementType.EARTH,
        ElementState.INERT,
      );
      expect(withInert.earth).toBe(ElementState.INERT);
    });

    it('should not mutate original state', () => {
      const state = elementalService.initializeElementalState();

      const newState = elementalService.setElementState(
        state,
        ElementType.FIRE,
        ElementState.STRONG,
      );

      expect(state.fire).toBe(ElementState.INERT); // Original unchanged
      expect(newState.fire).toBe(ElementState.STRONG); // New state changed
    });

    it('should throw for invalid element type', () => {
      const state = elementalService.initializeElementalState();

      expect(() => {
        elementalService.setElementState(
          state,
          'void' as ElementType,
          ElementState.STRONG,
        );
      }).toThrow('Invalid element type: void');
    });
  });

  describe('getActiveElements', () => {
    it('should return list of elements not in inert state', () => {
      const state: ElementalInfusion = {
        fire: ElementState.STRONG,
        ice: ElementState.WANING,
        air: ElementState.INERT,
        earth: ElementState.STRONG,
        light: ElementState.INERT,
        dark: ElementState.INERT,
      };

      const active = elementalService.getActiveElements(state);

      expect(active).toHaveLength(3);
      expect(active).toContain(ElementType.FIRE);
      expect(active).toContain(ElementType.ICE);
      expect(active).toContain(ElementType.EARTH);
      expect(active).not.toContain(ElementType.AIR);
      expect(active).not.toContain(ElementType.LIGHT);
      expect(active).not.toContain(ElementType.DARK);
    });

    it('should return empty array if all elements inert', () => {
      const state = elementalService.initializeElementalState();

      const active = elementalService.getActiveElements(state);

      expect(active).toEqual([]);
    });

    it('should return all elements if all are active', () => {
      const state: ElementalInfusion = {
        fire: ElementState.STRONG,
        ice: ElementState.STRONG,
        air: ElementState.WANING,
        earth: ElementState.WANING,
        light: ElementState.STRONG,
        dark: ElementState.WANING,
      };

      const active = elementalService.getActiveElements(state);

      expect(active).toHaveLength(6);
    });

    it('should include both strong and waning elements', () => {
      const state: ElementalInfusion = {
        fire: ElementState.STRONG,
        ice: ElementState.WANING,
        air: ElementState.INERT,
        earth: ElementState.INERT,
        light: ElementState.INERT,
        dark: ElementState.INERT,
      };

      const active = elementalService.getActiveElements(state);

      expect(active).toContain(ElementType.FIRE); // Strong
      expect(active).toContain(ElementType.ICE); // Waning
    });
  });

  describe('cloneElementalState', () => {
    it('should create independent copy of elemental state', () => {
      const original: ElementalInfusion = {
        fire: ElementState.STRONG,
        ice: ElementState.WANING,
        air: ElementState.INERT,
        earth: ElementState.INERT,
        light: ElementState.INERT,
        dark: ElementState.INERT,
      };

      const clone = elementalService.cloneElementalState(original);

      expect(clone).toEqual(original);
      expect(clone).not.toBe(original); // Different objects
    });

    it('should not mutate original when clone is modified', () => {
      const original: ElementalInfusion = {
        fire: ElementState.STRONG,
        ice: ElementState.WANING,
        air: ElementState.INERT,
        earth: ElementState.INERT,
        light: ElementState.INERT,
        dark: ElementState.INERT,
      };

      const clone = elementalService.cloneElementalState(original);

      // Modify clone
      clone.fire = ElementState.INERT;

      // Original should be unchanged
      expect(original.fire).toBe(ElementState.STRONG);
      expect(clone.fire).toBe(ElementState.INERT);
    });
  });

  describe('elementalStateTransitions', () => {
    it('should follow correct state lifecycle over multiple rounds', () => {
      let state = elementalService.initializeElementalState();

      // Round 1: Generate fire
      state = elementalService.generateElement(state, ElementType.FIRE);
      expect(state.fire).toBe(ElementState.STRONG);

      // End of Round 1: Decay
      state = elementalService.decayElements(state);
      expect(state.fire).toBe(ElementState.WANING);

      // End of Round 2: Decay again
      state = elementalService.decayElements(state);
      expect(state.fire).toBe(ElementState.INERT);

      // End of Round 3: Still inert
      state = elementalService.decayElements(state);
      expect(state.fire).toBe(ElementState.INERT);
    });

    it('should handle consume interrupting decay cycle', () => {
      let state = elementalService.initializeElementalState();

      // Generate element
      state = elementalService.generateElement(state, ElementType.FIRE);
      expect(state.fire).toBe(ElementState.STRONG);

      // Consume before decay
      state = elementalService.consumeElement(state, ElementType.FIRE);
      expect(state.fire).toBe(ElementState.INERT); // Immediately inert

      // Decay has no effect
      state = elementalService.decayElements(state);
      expect(state.fire).toBe(ElementState.INERT);
    });

    it('should handle regenerate during waning phase', () => {
      let state: ElementalInfusion = {
        fire: ElementState.WANING,
        ice: ElementState.INERT,
        air: ElementState.INERT,
        earth: ElementState.INERT,
        light: ElementState.INERT,
        dark: ElementState.INERT,
      };

      // Generate while waning
      state = elementalService.generateElement(state, ElementType.FIRE);
      expect(state.fire).toBe(ElementState.STRONG); // Back to strong

      // Next decay
      state = elementalService.decayElements(state);
      expect(state.fire).toBe(ElementState.WANING); // Decays normally
    });

    it('should handle multiple elements with different states', () => {
      let state = elementalService.initializeElementalState();

      // Generate multiple elements
      state = elementalService.generateElement(state, ElementType.FIRE);
      state = elementalService.generateElement(state, ElementType.ICE);
      expect(state.fire).toBe(ElementState.STRONG);
      expect(state.ice).toBe(ElementState.STRONG);

      // Decay once
      state = elementalService.decayElements(state);
      expect(state.fire).toBe(ElementState.WANING);
      expect(state.ice).toBe(ElementState.WANING);

      // Generate fire again while it's waning
      state = elementalService.generateElement(state, ElementType.FIRE);
      expect(state.fire).toBe(ElementState.STRONG); // Refreshed
      expect(state.ice).toBe(ElementState.WANING); // Still waning

      // Decay again
      state = elementalService.decayElements(state);
      expect(state.fire).toBe(ElementState.WANING); // Back to waning
      expect(state.ice).toBe(ElementState.INERT); // Decayed to inert
    });
  });

  describe('validateElementType', () => {
    it('should validate all 6 element types', () => {
      const validElements: ElementType[] = [
        ElementType.FIRE,
        ElementType.ICE,
        ElementType.AIR,
        ElementType.EARTH,
        ElementType.LIGHT,
        ElementType.DARK,
      ];

      validElements.forEach((element) => {
        expect(() =>
          elementalService.validateElementType(element),
        ).not.toThrow();
      });
    });

    it('should throw for invalid element type', () => {
      expect(() =>
        elementalService.validateElementType('water' as ElementType),
      ).toThrow('Invalid element type: water');

      expect(() =>
        elementalService.validateElementType('wind' as ElementType),
      ).toThrow('Invalid element type: wind');

      expect(() =>
        elementalService.validateElementType('lightning' as ElementType),
      ).toThrow('Invalid element type: lightning');
    });

    it('should throw for empty string', () => {
      expect(() =>
        elementalService.validateElementType('' as ElementType),
      ).toThrow('Invalid element type: ');
    });

    it('should throw for null/undefined', () => {
      expect(() =>
        elementalService.validateElementType(null as any),
      ).toThrow();

      expect(() =>
        elementalService.validateElementType(undefined as any),
      ).toThrow();
    });
  });
});
