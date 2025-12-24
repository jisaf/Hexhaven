/**
 * Unit Test: TurnStatus CSS z-index Fix
 *
 * Tests that the TurnStatus component's CSS fixes for Issue #294
 * are properly applied. This verifies that the controlBar class
 * uses CSS variables for z-index to ensure the Back to Lobby button
 * remains clickable above the card selection overlay.
 *
 * Issue #294 - Ensures Back to Lobby button is clickable during gameplay
 * and card selection phases.
 */

import fs from 'fs';
import path from 'path';

describe('TurnStatus CSS - Issue #294 Fix', () => {
  let cssContent: string;
  let indexCssContent: string;

  beforeAll(() => {
    const cssPath = path.resolve(__dirname, '../../src/components/game/TurnStatus.module.css');
    const indexCssPath = path.resolve(__dirname, '../../src/index.css');
    cssContent = fs.readFileSync(cssPath, 'utf8');
    indexCssContent = fs.readFileSync(indexCssPath, 'utf8');
  });

  describe('controlBar z-index', () => {
    it('should use CSS variable for z-index on controlBar', () => {
      // Verify the controlBar uses the CSS variable for z-index
      expect(cssContent).toContain('z-index: var(--z-index-control-bar)');
    });

    it('should have position: relative on controlBar for z-index to work', () => {
      expect(cssContent).toContain('position: relative');
    });

    it('should include a comment explaining the fix', () => {
      expect(cssContent).toMatch(/Issue #294.*Back to Lobby/i);
    });
  });

  describe('z-index CSS variables are defined', () => {
    it('should define --z-index-control-bar in index.css', () => {
      expect(indexCssContent).toContain('--z-index-control-bar:');
    });

    it('should define --z-index-card-selection-overlay in index.css', () => {
      expect(indexCssContent).toContain('--z-index-card-selection-overlay:');
    });

    it('should have control-bar z-index value greater than card-selection-overlay', () => {
      // Extract the numeric values from the CSS variables
      const controlBarMatch = indexCssContent.match(/--z-index-control-bar:\s*(\d+)/);
      const overlayMatch = indexCssContent.match(/--z-index-card-selection-overlay:\s*(\d+)/);

      expect(controlBarMatch).toBeTruthy();
      expect(overlayMatch).toBeTruthy();

      if (controlBarMatch && overlayMatch) {
        const controlBarZ = parseInt(controlBarMatch[1], 10);
        const overlayZ = parseInt(overlayMatch[1], 10);
        expect(controlBarZ).toBeGreaterThan(overlayZ);
      }
    });
  });

  describe('backButton styling', () => {
    it('should have cursor: pointer on backButton', () => {
      expect(cssContent).toContain('cursor: pointer');
    });

    it('should not have pointer-events: none on backButton', () => {
      // Find the backButton block and ensure it doesn't disable pointer events
      const backButtonMatch = cssContent.match(/\.backButton\s*\{[^}]*\}/);
      if (backButtonMatch) {
        expect(backButtonMatch[0]).not.toContain('pointer-events: none');
      }
    });
  });
});
