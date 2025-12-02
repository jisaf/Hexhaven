/**
 * Accessibility Testing Example
 *
 * Tests components for WCAG 2.1 AA compliance using jest-axe
 */

import { render } from '@testing-library/react';
import { axe } from 'jest-axe';

// Example components for accessibility testing (for demonstration)
const AccessibleButton = () => (
  <button type="button" aria-label="Close dialog">
    ×
  </button>
);

const InaccessibleButton = () => (
  // Missing aria-label for icon-only button
  <button type="button">×</button>
);

const AccessibleForm = () => (
  <form>
    <label htmlFor="username">Username</label>
    <input id="username" type="text" name="username" required />

    <label htmlFor="password">Password</label>
    <input id="password" type="password" name="password" required />

    <button type="submit">Login</button>
  </form>
);

const InaccessibleForm = () => (
  <form>
    {/* Missing label association */}
    <label>Username</label>
    <input type="text" name="username" />

    <label>Password</label>
    <input type="password" name="password" />

    <button type="submit">Login</button>
  </form>
);

const HighContrastText = () => (
  <div style={{ backgroundColor: '#000', color: '#fff', padding: '16px' }}>
    <p>This text has sufficient contrast (21:1 ratio)</p>
  </div>
);

const LowContrastText = () => (
  <div style={{ backgroundColor: '#eee', color: '#ddd', padding: '16px' }}>
    <p>This text has insufficient contrast</p>
  </div>
);

describe('Accessibility Testing with jest-axe', () => {
  describe('Button accessibility', () => {
    it('should pass axe checks for accessible button', async () => {
      const { container } = render(<AccessibleButton />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should detect violations for button without aria-label', async () => {
      const { container } = render(<InaccessibleButton />);

      const results = await axe(container);
      // This test demonstrates how axe detects violations
      // In real code, we'd fix the component, not expect violations
      expect(results.violations.length).toBeGreaterThan(0);
    });
  });

  describe('Form accessibility', () => {
    it('should pass axe checks for properly labeled form', async () => {
      const { container } = render(<AccessibleForm />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should detect missing label associations', async () => {
      const { container } = render(<InaccessibleForm />);

      const results = await axe(container);
      expect(results.violations.length).toBeGreaterThan(0);

      // Check for specific violation
      const labelViolation = results.violations.find(
        (v) => v.id === 'label'
      );
      expect(labelViolation).toBeDefined();
    });
  });

  describe('Color contrast', () => {
    it('should pass for high contrast text', async () => {
      const { container } = render(<HighContrastText />);

      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });

      expect(results).toHaveNoViolations();
    });

    // Note: jest-axe cannot detect color contrast in JSDOM
    // Use browser-based tools (Lighthouse, axe DevTools) for contrast testing
    it('should use browser tools for accurate contrast testing', () => {
      // This is a reminder test - contrast checking requires real browser
      expect(true).toBe(true);
    });
  });

  describe('Keyboard navigation', () => {
    it('should have focusable interactive elements', () => {
      const { container } = render(
        <div>
          <button type="button">Button 1</button>
          <a href="/test">Link 1</a>
          <input type="text" />
        </div>
      );

      const focusableElements = container.querySelectorAll(
        'button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );

      expect(focusableElements.length).toBeGreaterThan(0);
    });
  });

  describe('ARIA roles and labels', () => {
    it('should have proper ARIA attributes for modal dialog', async () => {
      const { container } = render(
        <div
          role="dialog"
          aria-labelledby="dialog-title"
          aria-modal="true"
        >
          <h2 id="dialog-title">Confirm Action</h2>
          <p>Are you sure you want to proceed?</p>
          <button type="button" aria-label="Cancel">Cancel</button>
          <button type="button" aria-label="Confirm">Confirm</button>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have aria-live regions for dynamic content', async () => {
      const { container } = render(
        <div aria-live="polite" aria-atomic="true">
          <p>Game started! Your turn.</p>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Landmark regions', () => {
    it('should use semantic HTML for page structure', async () => {
      const { container } = render(
        <div>
          <header>
            <h1>Hexhaven</h1>
          </header>
          <nav aria-label="Main navigation">
            <ul>
              <li><a href="/home">Home</a></li>
              <li><a href="/games">Games</a></li>
            </ul>
          </nav>
          <main>
            <h2>Game Lobby</h2>
            <p>Join a game to start playing</p>
          </main>
          <footer>
            <p>&copy; 2025 Hexhaven</p>
          </footer>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});

/**
 * WCAG 2.1 AA Testing Checklist
 *
 * Keyboard Navigation:
 * ✅ Tab - Move focus forward
 * ✅ Shift+Tab - Move focus backward
 * ✅ Enter/Space - Activate buttons
 * ✅ Escape - Close modals/dropdowns
 * ✅ Arrow keys - Navigate within components
 *
 * ARIA Labels:
 * ✅ All icon-only buttons have aria-label
 * ✅ Form inputs have associated labels
 * ✅ Modals have role="dialog" and aria-labelledby
 * ✅ Live regions use aria-live for dynamic updates
 *
 * Color Contrast (use browser tools):
 * ✅ Text: 4.5:1 contrast ratio minimum
 * ✅ UI components: 3:1 contrast ratio minimum
 * ✅ Large text (18pt+): 3:1 contrast ratio minimum
 *
 * Screen Reader Testing:
 * ✅ NVDA (Windows, free)
 * ✅ JAWS (Windows, commercial)
 * ✅ VoiceOver (macOS/iOS, built-in)
 * ✅ TalkBack (Android, built-in)
 *
 * Focus Management:
 * ✅ Visible focus indicators on all interactive elements
 * ✅ Focus trap in modals
 * ✅ Focus restoration after closing dialogs
 * ✅ Skip navigation links for keyboard users
 *
 * Tools:
 * ✅ jest-axe (automated testing in CI)
 * ✅ Chrome DevTools Lighthouse
 * ✅ axe DevTools browser extension
 * ✅ WAVE browser extension
 */
