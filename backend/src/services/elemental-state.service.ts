/**
 * Elemental State Service (US2 - T095)
 *
 * Manages elemental infusion state for the game:
 * - Track 6 element states (fire, ice, air, earth, light, dark)
 * - Generate elements (inert → strong)
 * - Consume elements (any → inert)
 * - Decay elements at end of round (strong → waning → inert)
 */

import { Injectable } from '@nestjs/common';
import {
  ElementalInfusion,
  ElementType,
  ElementState,
} from '../../../shared/types/entities';

@Injectable()
export class ElementalStateService {
  /**
   * Initialize all elements to inert state
   */
  initializeElementalState(): ElementalInfusion {
    return {
      fire: ElementState.INERT,
      ice: ElementState.INERT,
      air: ElementState.INERT,
      earth: ElementState.INERT,
      light: ElementState.INERT,
      dark: ElementState.INERT,
    };
  }

  /**
   * Generate an element (set to strong)
   */
  generateElement(
    state: ElementalInfusion,
    element: ElementType,
  ): ElementalInfusion {
    this.validateElementType(element);

    return {
      ...state,
      [element]: ElementState.STRONG,
    };
  }

  /**
   * Consume an element (set to inert)
   */
  consumeElement(
    state: ElementalInfusion,
    element: ElementType,
  ): ElementalInfusion {
    this.validateElementType(element);

    return {
      ...state,
      [element]: ElementState.INERT,
    };
  }

  /**
   * Decay all elements at end of round
   * strong → waning, waning → inert, inert → inert
   */
  decayElements(state: ElementalInfusion): ElementalInfusion {
    const decayed: ElementalInfusion = { ...state };

    (Object.keys(decayed) as ElementType[]).forEach((element) => {
      const currentState = decayed[element];

      if (currentState === ElementState.STRONG) {
        decayed[element] = ElementState.WANING;
      } else if (currentState === ElementState.WANING) {
        decayed[element] = ElementState.INERT;
      }
      // INERT stays INERT
    });

    return decayed;
  }

  /**
   * Check if element can be consumed (waning or strong)
   */
  canConsumeElement(state: ElementalInfusion, element: ElementType): boolean {
    this.validateElementType(element);

    const elementState = state[element];
    return (
      elementState === ElementState.STRONG ||
      elementState === ElementState.WANING
    );
  }

  /**
   * Get current state of specific element
   */
  getElementState(
    state: ElementalInfusion,
    element: ElementType,
  ): ElementState {
    this.validateElementType(element);
    return state[element];
  }

  /**
   * Set specific element to given state
   */
  setElementState(
    state: ElementalInfusion,
    element: ElementType,
    newState: ElementState,
  ): ElementalInfusion {
    this.validateElementType(element);

    return {
      ...state,
      [element]: newState,
    };
  }

  /**
   * Get list of elements not in inert state
   */
  getActiveElements(state: ElementalInfusion): ElementType[] {
    const active: ElementType[] = [];

    (Object.keys(state) as ElementType[]).forEach((element) => {
      if (state[element] !== ElementState.INERT) {
        active.push(element);
      }
    });

    return active;
  }

  /**
   * Create independent copy of elemental state
   */
  cloneElementalState(state: ElementalInfusion): ElementalInfusion {
    return { ...state };
  }

  /**
   * Validate that element is one of the 6 valid types
   */
  validateElementType(element: string): void {
    const validElements: string[] = [
      ElementType.FIRE,
      ElementType.ICE,
      ElementType.AIR,
      ElementType.EARTH,
      ElementType.LIGHT,
      ElementType.DARK,
    ];

    if (!validElements.includes(element)) {
      throw new Error(`Invalid element type: ${element}`);
    }
  }
}
