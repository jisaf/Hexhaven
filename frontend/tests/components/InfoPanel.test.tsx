/**
 * Unit Test: InfoPanel CSS z-index Structure
 *
 * Tests that the InfoPanel component's CSS has the correct z-index
 * structure to allow the TurnStatus control bar (with Back to Lobby button)
 * to remain clickable above the card selection overlay.
 *
 * Issue #294 - Ensures Back to Lobby button is clickable during card selection phase
 */

import fs from 'fs';
import path from 'path';

describe('InfoPanel CSS - Issue #294 Fix Validation', () => {
  let infoPanelCss: string;
  let turnStatusCss: string;

  beforeAll(() => {
    // Read both CSS files to verify z-index relationship
    const infoPanelPath = path.resolve(__dirname, '../../src/components/game/InfoPanel.module.css');
    const turnStatusPath = path.resolve(__dirname, '../../src/components/game/TurnStatus.module.css');

    infoPanelCss = fs.readFileSync(infoPanelPath, 'utf8');
    turnStatusCss = fs.readFileSync(turnStatusPath, 'utf8');
  });

  describe('cardSelectionOverlay z-index', () => {
    it('should have z-index: 30 on cardSelectionOverlay', () => {
      // The cardSelectionOverlay overlays the turn status and game log
      expect(infoPanelCss).toMatch(/\.cardSelectionOverlay\s*\{[^}]*z-index:\s*30/);
    });
  });

  describe('controlBar z-index relationship', () => {
    it('should have controlBar z-index higher than cardSelectionOverlay z-index', () => {
      // Extract z-index values
      const overlayMatch = infoPanelCss.match(/\.cardSelectionOverlay\s*\{[^}]*z-index:\s*(\d+)/);
      const controlBarMatch = turnStatusCss.match(/\.controlBar\s*\{[^}]*z-index:\s*(\d+)/);

      expect(overlayMatch).toBeTruthy();
      expect(controlBarMatch).toBeTruthy();

      if (overlayMatch && controlBarMatch) {
        const overlayZIndex = parseInt(overlayMatch[1], 10);
        const controlBarZIndex = parseInt(controlBarMatch[1], 10);

        // The control bar (containing Back to Lobby) must be above the overlay
        expect(controlBarZIndex).toBeGreaterThan(overlayZIndex);
      }
    });
  });

  describe('InfoPanel structure', () => {
    it('should have infoPanel with position: relative', () => {
      // The infoPanel needs to be the positioning context
      expect(infoPanelCss).toMatch(/\.infoPanel\s*\{[^}]*position:\s*relative/);
    });

    it('should have cardSelectionOverlay with position: absolute', () => {
      // The overlay should be absolutely positioned
      expect(infoPanelCss).toMatch(/\.cardSelectionOverlay\s*\{[^}]*position:\s*absolute/);
    });
  });
});

/**
 * Test Coverage Summary:
 *
 * cardSelectionOverlay z-index:
 * - Verifies z-index is 30 (baseline for overlay)
 *
 * controlBar z-index relationship:
 * - Ensures controlBar z-index > cardSelectionOverlay z-index
 * - This is the key fix for Issue #294
 *
 * InfoPanel structure:
 * - infoPanel has position: relative (positioning context)
 * - cardSelectionOverlay has position: absolute
 *
 * This test ensures the z-index hierarchy is maintained and
 * the Back to Lobby button remains accessible above the overlay.
 */
