/**
 * Unit Test: InfoPanel CSS z-index Structure
 *
 * Tests that the InfoPanel component's CSS has the correct z-index
 * structure using CSS variables to allow the TurnStatus control bar
 * (with Back to Lobby button) to remain clickable above the card
 * selection overlay.
 *
 * Issue #294 - Ensures Back to Lobby button is clickable during card selection phase
 */

import fs from 'fs';
import path from 'path';

describe('InfoPanel CSS - Issue #294 Fix Validation', () => {
  let infoPanelCss: string;
  let indexCss: string;

  beforeAll(() => {
    const infoPanelPath = path.resolve(__dirname, '../../src/components/game/InfoPanel.module.css');
    const indexCssPath = path.resolve(__dirname, '../../src/index.css');

    infoPanelCss = fs.readFileSync(infoPanelPath, 'utf8');
    indexCss = fs.readFileSync(indexCssPath, 'utf8');
  });

  describe('cardSelectionOverlay z-index', () => {
    it('should use CSS variable for z-index on cardSelectionOverlay', () => {
      // Verify the overlay uses the CSS variable
      expect(infoPanelCss).toContain('z-index: var(--z-index-card-selection-overlay)');
    });
  });

  describe('z-index hierarchy', () => {
    it('should define z-index scale in index.css', () => {
      expect(indexCss).toContain('Z-INDEX SCALE');
    });

    it('should have control-bar higher than overlay in the scale', () => {
      const controlBarMatch = indexCss.match(/--z-index-control-bar:\s*(\d+)/);
      const overlayMatch = indexCss.match(/--z-index-card-selection-overlay:\s*(\d+)/);

      expect(controlBarMatch).toBeTruthy();
      expect(overlayMatch).toBeTruthy();

      if (controlBarMatch && overlayMatch) {
        const controlBarZ = parseInt(controlBarMatch[1], 10);
        const overlayZ = parseInt(overlayMatch[1], 10);
        expect(controlBarZ).toBeGreaterThan(overlayZ);
      }
    });
  });

  describe('InfoPanel structure', () => {
    it('should have infoPanel with position: relative', () => {
      expect(infoPanelCss).toContain('position: relative');
    });

    it('should have cardSelectionOverlay with position: absolute', () => {
      expect(infoPanelCss).toContain('position: absolute');
    });
  });
});
