/**
 * Unit Test: TurnStatus CSS z-index Fix
 *
 * Tests that the TurnStatus component's CSS fixes for Issue #294
 * are properly applied. This verifies that the controlBar class
 * has the correct z-index to ensure the Back to Lobby button
 * remains clickable above the card selection overlay.
 *
 * Issue #294 - Ensures Back to Lobby button is clickable during gameplay
 * and card selection phases.
 */

import fs from 'fs';
import path from 'path';

describe('TurnStatus CSS - Issue #294 Fix', () => {
  let cssContent: string;

  beforeAll(() => {
    // Read the CSS file to verify the z-index fix is in place
    const cssPath = path.resolve(__dirname, '../../src/components/game/TurnStatus.module.css');
    cssContent = fs.readFileSync(cssPath, 'utf8');
  });

  describe('controlBar z-index', () => {
    it('should have position: relative on controlBar', () => {
      // The controlBar must be positioned to use z-index
      expect(cssContent).toMatch(/\.controlBar\s*\{[^}]*position:\s*relative/);
    });

    it('should have z-index greater than 30 on controlBar', () => {
      // The cardSelectionOverlay has z-index: 30
      // The controlBar must have a higher z-index
      const zIndexMatch = cssContent.match(/\.controlBar\s*\{[^}]*z-index:\s*(\d+)/);
      expect(zIndexMatch).toBeTruthy();

      if (zIndexMatch) {
        const zIndex = parseInt(zIndexMatch[1], 10);
        expect(zIndex).toBeGreaterThan(30);
      }
    });

    it('should include a comment explaining the fix', () => {
      // Ensure the fix is documented for future maintainers
      expect(cssContent).toMatch(/Issue #294.*Back to Lobby/i);
    });
  });

  describe('backButton styling', () => {
    it('should have cursor: pointer on backButton', () => {
      expect(cssContent).toMatch(/\.backButton\s*\{[^}]*cursor:\s*pointer/);
    });

    it('should not have pointer-events: none on backButton', () => {
      // Ensure the button can receive click events
      const backButtonMatch = cssContent.match(/\.backButton\s*\{[^}]*\}/);
      if (backButtonMatch) {
        expect(backButtonMatch[0]).not.toMatch(/pointer-events:\s*none/);
      }
    });
  });
});

/**
 * Test Coverage Summary:
 *
 * controlBar z-index (Issue #294):
 * - position: relative is set (required for z-index to work)
 * - z-index is greater than 30 (above cardSelectionOverlay)
 * - Fix is documented with a comment
 *
 * backButton styling:
 * - cursor: pointer is set
 * - pointer-events is not set to none
 *
 * This CSS-level test ensures the fix remains in place even if
 * the component code changes. The actual click behavior is
 * verified through E2E tests.
 */
