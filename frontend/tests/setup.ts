/**
 * Jest Setup File for Frontend Tests
 *
 * Runs before all tests to configure the test environment
 */

import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

// Extend Jest matchers with accessibility testing
expect.extend(toHaveNoViolations);

// Viewport dimensions for responsive testing
export const VIEWPORTS = {
  mobile: { width: 375, height: 667, name: 'iPhone SE' },
  tablet: { width: 768, height: 1024, name: 'iPad' },
  desktop: { width: 1920, height: 1080, name: 'Full HD Desktop' },
};

// Current viewport state (can be changed by tests)
let currentViewport = VIEWPORTS.desktop;

/**
 * Set viewport dimensions for testing responsive designs
 * Usage in tests:
 *   setViewport('mobile');
 *   setViewport('tablet');
 *   setViewport('desktop');
 *   setViewport({ width: 360, height: 640 }); // Custom size
 */
export function setViewport(
  viewport: keyof typeof VIEWPORTS | { width: number; height: number }
) {
  if (typeof viewport === 'string') {
    currentViewport = VIEWPORTS[viewport];
  } else {
    currentViewport = { ...viewport, name: 'Custom' };
  }

  // Update window dimensions
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: currentViewport.width,
  });

  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: currentViewport.height,
  });

  // Trigger resize event
  window.dispatchEvent(new Event('resize'));

  // Update matchMedia to reflect new viewport
  updateMatchMedia();
}

/**
 * Get current viewport dimensions
 */
export function getViewport() {
  return currentViewport;
}

/**
 * Reset viewport to default (desktop)
 */
export function resetViewport() {
  setViewport('desktop');
}

/**
 * Update matchMedia mock based on current viewport
 */
function updateMatchMedia() {
  const mediaQueries: Record<string, boolean> = {
    '(max-width: 640px)': currentViewport.width <= 640, // Mobile breakpoint
    '(max-width: 768px)': currentViewport.width <= 768, // Tablet breakpoint
    '(min-width: 769px)': currentViewport.width >= 769, // Desktop breakpoint
    '(min-width: 1024px)': currentViewport.width >= 1024, // Large desktop
    '(min-width: 1280px)': currentViewport.width >= 1280, // XL desktop
    '(orientation: portrait)': currentViewport.height > currentViewport.width,
    '(orientation: landscape)': currentViewport.width >= currentViewport.height,
    '(prefers-color-scheme: dark)': false, // Default to light mode
    '(prefers-reduced-motion: reduce)': false, // Default to animations enabled
  };

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => {
      // Check if query matches current viewport
      const matches = mediaQueries[query] ?? false;

      return {
        matches,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      };
    }),
  });
}

// Initialize matchMedia with desktop viewport
updateMatchMedia();

// Mock IntersectionObserver (not available in jsdom)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver (not available in jsdom)
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock window.requestAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(callback, 0) as any;
};

global.cancelAnimationFrame = (id: number) => {
  clearTimeout(id);
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.VITE_API_URL = 'http://localhost:3001';
process.env.VITE_WS_URL = 'ws://localhost:3001';

// Increase test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllTimers();
  resetViewport(); // Reset viewport to desktop for next test
});
