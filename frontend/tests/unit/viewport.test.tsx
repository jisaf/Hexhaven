/**
 * Viewport Testing Example
 *
 * Demonstrates how to test responsive components across different viewports
 */

import { render, screen } from '@testing-library/react';
import { setViewport, getViewport } from '../setup';

// Example responsive component (for demonstration)
const ResponsiveComponent = () => {
  const isMobile = window.innerWidth <= 768;
  const isDesktop = window.innerWidth >= 1024;

  return (
    <div>
      <h1>Responsive Component</h1>
      {isMobile && <p data-testid="mobile-content">Mobile View</p>}
      {isDesktop && <p data-testid="desktop-content">Desktop View</p>}
      <p data-testid="viewport-width">Width: {window.innerWidth}px</p>
    </div>
  );
};

describe('Viewport Testing', () => {
  describe('setViewport helper', () => {
    it('should set mobile viewport dimensions', () => {
      setViewport('mobile');

      expect(window.innerWidth).toBe(375);
      expect(window.innerHeight).toBe(667);
      expect(getViewport().name).toBe('iPhone SE');
    });

    it('should set tablet viewport dimensions', () => {
      setViewport('tablet');

      expect(window.innerWidth).toBe(768);
      expect(window.innerHeight).toBe(1024);
      expect(getViewport().name).toBe('iPad');
    });

    it('should set desktop viewport dimensions', () => {
      setViewport('desktop');

      expect(window.innerWidth).toBe(1920);
      expect(window.innerHeight).toBe(1080);
      expect(getViewport().name).toBe('Full HD Desktop');
    });

    it('should set custom viewport dimensions', () => {
      setViewport({ width: 360, height: 640 });

      expect(window.innerWidth).toBe(360);
      expect(window.innerHeight).toBe(640);
      expect(getViewport().name).toBe('Custom');
    });
  });

  describe('matchMedia mocking', () => {
    it('should match mobile media queries on mobile viewport', () => {
      setViewport('mobile');

      expect(window.matchMedia('(max-width: 640px)').matches).toBe(true);
      expect(window.matchMedia('(max-width: 768px)').matches).toBe(true);
      expect(window.matchMedia('(min-width: 1024px)').matches).toBe(false);
    });

    it('should match tablet media queries on tablet viewport', () => {
      setViewport('tablet');

      expect(window.matchMedia('(max-width: 640px)').matches).toBe(false);
      expect(window.matchMedia('(max-width: 768px)').matches).toBe(true);
      expect(window.matchMedia('(min-width: 769px)').matches).toBe(false);
    });

    it('should match desktop media queries on desktop viewport', () => {
      setViewport('desktop');

      expect(window.matchMedia('(max-width: 768px)').matches).toBe(false);
      expect(window.matchMedia('(min-width: 1024px)').matches).toBe(true);
      expect(window.matchMedia('(min-width: 1280px)').matches).toBe(true);
    });

    it('should detect portrait orientation', () => {
      setViewport({ width: 375, height: 667 }); // Portrait (height > width)

      expect(window.matchMedia('(orientation: portrait)').matches).toBe(true);
      expect(window.matchMedia('(orientation: landscape)').matches).toBe(false);
    });

    it('should detect landscape orientation', () => {
      setViewport({ width: 1920, height: 1080 }); // Landscape (width > height)

      expect(window.matchMedia('(orientation: portrait)').matches).toBe(false);
      expect(window.matchMedia('(orientation: landscape)').matches).toBe(true);
    });
  });

  describe('Responsive component rendering', () => {
    it('should render mobile content on mobile viewport', () => {
      setViewport('mobile');

      render(<ResponsiveComponent />);

      expect(screen.getByTestId('mobile-content')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('viewport-width')).toHaveTextContent(
        'Width: 375px'
      );
    });

    it('should render desktop content on desktop viewport', () => {
      setViewport('desktop');

      render(<ResponsiveComponent />);

      expect(screen.queryByTestId('mobile-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('desktop-content')).toBeInTheDocument();
      expect(screen.getByTestId('viewport-width')).toHaveTextContent(
        'Width: 1920px'
      );
    });

    it('should not render mobile or desktop content on tablet viewport', () => {
      setViewport('tablet');

      render(<ResponsiveComponent />);

      // Tablet is 768px - not mobile (<= 768) and not desktop (>= 1024)
      expect(screen.queryByTestId('mobile-content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('desktop-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('viewport-width')).toHaveTextContent(
        'Width: 768px'
      );
    });
  });

  describe('Viewport cleanup between tests', () => {
    it('should start with desktop viewport (default)', () => {
      // afterEach in setup.ts resets viewport to desktop
      expect(window.innerWidth).toBe(1920);
      expect(window.innerHeight).toBe(1080);
    });

    it('should reset to desktop after changing viewport', () => {
      setViewport('mobile');
      expect(window.innerWidth).toBe(375);

      // After this test, afterEach will reset to desktop
    });

    it('should have desktop viewport again', () => {
      // Verify cleanup worked
      expect(window.innerWidth).toBe(1920);
      expect(window.innerHeight).toBe(1080);
    });
  });
});

/**
 * Browser Compatibility Testing Checklist
 *
 * Test responsive components on:
 * ✅ Mobile (375px - iPhone SE)
 * ✅ Tablet (768px - iPad)
 * ✅ Desktop (1920px - Full HD)
 *
 * Browser Matrix (latest 2 versions):
 * ✅ Chrome/Chromium (including Edge)
 * ✅ Firefox
 * ✅ Safari (macOS and iOS)
 * ✅ Edge (Chromium-based)
 *
 * Responsive Design Requirements:
 * ✅ Touch targets ≥44px on mobile (WCAG 2.1 AA)
 * ✅ No horizontal scrolling at any breakpoint
 * ✅ Form inputs and buttons accessible at all sizes
 * ✅ Game board rendering adapts to viewport
 * ✅ Text remains readable (min 16px on mobile)
 */
