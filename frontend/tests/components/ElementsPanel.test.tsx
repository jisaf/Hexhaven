/**
 * Unit Test: ElementsPanel Component
 *
 * Tests the ElementsPanel component which displays elemental state
 * on the right side of the game board.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ElementsPanel } from '../../src/components/game/ElementsPanel';
import { ElementState } from '../../../shared/types/entities';
import type { ElementalInfusion } from '../../../shared/types/entities';

describe('ElementsPanel', () => {
  const allInertState: ElementalInfusion = {
    fire: ElementState.INERT,
    ice: ElementState.INERT,
    air: ElementState.INERT,
    earth: ElementState.INERT,
    light: ElementState.INERT,
    dark: ElementState.INERT,
  };

  const mixedState: ElementalInfusion = {
    fire: ElementState.STRONG,
    ice: ElementState.WANING,
    air: ElementState.INERT,
    earth: ElementState.INERT,
    light: ElementState.STRONG,
    dark: ElementState.INERT,
  };

  const allStrongState: ElementalInfusion = {
    fire: ElementState.STRONG,
    ice: ElementState.STRONG,
    air: ElementState.STRONG,
    earth: ElementState.STRONG,
    light: ElementState.STRONG,
    dark: ElementState.STRONG,
  };

  const stateWithInfusing: ElementalInfusion = {
    fire: ElementState.INFUSING,
    ice: ElementState.STRONG,
    air: ElementState.INERT,
    earth: ElementState.INFUSING,
    light: ElementState.WANING,
    dark: ElementState.INERT,
  };

  describe('null state handling', () => {
    it('should not render when elementalState is null', () => {
      render(<ElementsPanel elementalState={null} />);

      expect(screen.queryByTestId('elements-panel')).not.toBeInTheDocument();
    });
  });

  describe('all inert state', () => {
    it('should not render when all elements are inert', () => {
      render(<ElementsPanel elementalState={allInertState} />);

      expect(screen.queryByTestId('elements-panel')).not.toBeInTheDocument();
    });
  });

  describe('active elements', () => {
    it('should render panel when there are active elements', () => {
      render(<ElementsPanel elementalState={mixedState} />);

      expect(screen.getByTestId('elements-panel')).toBeInTheDocument();
    });

    it('should render only STRONG and WANING elements', () => {
      render(<ElementsPanel elementalState={mixedState} />);

      // STRONG elements should be visible
      expect(screen.getByTestId('element-chip-fire')).toBeInTheDocument();
      expect(screen.getByTestId('element-chip-light')).toBeInTheDocument();

      // WANING elements should be visible
      expect(screen.getByTestId('element-chip-ice')).toBeInTheDocument();

      // INERT elements should not be rendered
      expect(screen.queryByTestId('element-chip-air')).not.toBeInTheDocument();
      expect(screen.queryByTestId('element-chip-earth')).not.toBeInTheDocument();
      expect(screen.queryByTestId('element-chip-dark')).not.toBeInTheDocument();
    });

    it('should render all elements when all are strong', () => {
      render(<ElementsPanel elementalState={allStrongState} />);

      expect(screen.getByTestId('element-chip-fire')).toBeInTheDocument();
      expect(screen.getByTestId('element-chip-ice')).toBeInTheDocument();
      expect(screen.getByTestId('element-chip-air')).toBeInTheDocument();
      expect(screen.getByTestId('element-chip-earth')).toBeInTheDocument();
      expect(screen.getByTestId('element-chip-light')).toBeInTheDocument();
      expect(screen.getByTestId('element-chip-dark')).toBeInTheDocument();
    });
  });

  describe('element icons', () => {
    it('should display correct icons for each element', () => {
      render(<ElementsPanel elementalState={allStrongState} />);

      expect(screen.getByTestId('element-chip-fire')).toHaveTextContent('🔥');
      expect(screen.getByTestId('element-chip-ice')).toHaveTextContent('❄️');
      expect(screen.getByTestId('element-chip-air')).toHaveTextContent('💨');
      expect(screen.getByTestId('element-chip-earth')).toHaveTextContent('🪨');
      expect(screen.getByTestId('element-chip-light')).toHaveTextContent('✨');
      expect(screen.getByTestId('element-chip-dark')).toHaveTextContent('🌑');
    });
  });

  describe('element state styling', () => {
    it('should apply pulse animation (isTurn) for STRONG elements', () => {
      render(<ElementsPanel elementalState={mixedState} />);

      const fireChip = screen.getByTestId('element-chip-fire');
      expect(fireChip).toHaveClass('currentTurn');
    });

    it('should apply waning styling for WANING elements', () => {
      render(<ElementsPanel elementalState={mixedState} />);

      const iceChip = screen.getByTestId('element-chip-ice');
      expect(iceChip).toHaveClass('waning');
    });

    it('should not apply pulse animation for WANING elements', () => {
      render(<ElementsPanel elementalState={mixedState} />);

      const iceChip = screen.getByTestId('element-chip-ice');
      expect(iceChip).not.toHaveClass('currentTurn');
    });
  });

  describe('INFUSING state', () => {
    it('should render INFUSING elements (visible, not hidden)', () => {
      render(<ElementsPanel elementalState={stateWithInfusing} />);

      // INFUSING elements should be visible
      expect(screen.getByTestId('element-chip-fire')).toBeInTheDocument();
      expect(screen.getByTestId('element-chip-earth')).toBeInTheDocument();

      // Verify INERT elements are still hidden
      expect(screen.queryByTestId('element-chip-air')).not.toBeInTheDocument();
      expect(screen.queryByTestId('element-chip-dark')).not.toBeInTheDocument();
    });

    it('should apply infusing class for INFUSING elements', () => {
      render(<ElementsPanel elementalState={stateWithInfusing} />);

      const fireChip = screen.getByTestId('element-chip-fire');
      expect(fireChip).toHaveClass('infusing');

      const earthChip = screen.getByTestId('element-chip-earth');
      expect(earthChip).toHaveClass('infusing');
    });

    it('should NOT apply pulse animation (currentTurn) for INFUSING elements', () => {
      render(<ElementsPanel elementalState={stateWithInfusing} />);

      // INFUSING elements should NOT have the pulse animation (isTurn=false)
      const fireChip = screen.getByTestId('element-chip-fire');
      expect(fireChip).not.toHaveClass('currentTurn');

      const earthChip = screen.getByTestId('element-chip-earth');
      expect(earthChip).not.toHaveClass('currentTurn');

      // Verify STRONG elements still have pulse
      const iceChip = screen.getByTestId('element-chip-ice');
      expect(iceChip).toHaveClass('currentTurn');
    });

    it('should display correct tooltip for INFUSING elements', () => {
      render(<ElementsPanel elementalState={stateWithInfusing} />);

      const fireChip = screen.getByTestId('element-chip-fire');
      expect(fireChip).toHaveAttribute('title', 'Fire - infusing');

      const earthChip = screen.getByTestId('element-chip-earth');
      expect(earthChip).toHaveAttribute('title', 'Earth - infusing');
    });
  });

  describe('tooltips', () => {
    it('should display element name and state in tooltip', () => {
      render(<ElementsPanel elementalState={mixedState} />);

      const fireChip = screen.getByTestId('element-chip-fire');
      expect(fireChip).toHaveAttribute('title', 'Fire - strong');

      const iceChip = screen.getByTestId('element-chip-ice');
      expect(iceChip).toHaveAttribute('title', 'Ice - waning');
    });
  });

  describe('positioning', () => {
    it('should have elements-panel class for right-side positioning', () => {
      render(<ElementsPanel elementalState={mixedState} />);

      const panel = screen.getByTestId('elements-panel');
      expect(panel).toHaveClass('elements-panel');
    });
  });

  describe('element order', () => {
    it('should render elements in consistent order: fire, ice, air, earth, light, dark', () => {
      render(<ElementsPanel elementalState={allStrongState} />);

      const panel = screen.getByTestId('elements-panel');
      const chips = panel.querySelectorAll('[data-testid^="element-chip-"]');

      const order = Array.from(chips).map((chip) =>
        chip.getAttribute('data-testid')?.replace('element-chip-', '')
      );

      expect(order).toEqual(['fire', 'ice', 'air', 'earth', 'light', 'dark']);
    });
  });
});
