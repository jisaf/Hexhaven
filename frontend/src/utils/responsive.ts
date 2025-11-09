/**
 * Responsive Layout Utilities for Mobile-First Design
 *
 * Provides utilities for responsive breakpoints, viewport detection,
 * and adaptive layout calculations based on device characteristics.
 *
 * Design System Breakpoints (mobile-first):
 * - Mobile: 375px - 767px (default, iPhone SE to larger phones)
 * - Tablet: 768px - 1023px (iPad, Android tablets)
 * - Desktop: 1024px+ (laptops, desktops)
 */

/**
 * Breakpoint values in pixels
 */
export const BREAKPOINTS = {
  mobile: 375,
  tablet: 768,
  desktop: 1024,
  wide: 1920
} as const;

/**
 * Device type based on viewport width
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'wide';

/**
 * Orientation type
 */
export type Orientation = 'portrait' | 'landscape';

/**
 * Get the current device type based on viewport width
 */
export function getDeviceType(): DeviceType {
  const width = window.innerWidth;

  if (width >= BREAKPOINTS.wide) return 'wide';
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}

/**
 * Get the current orientation
 */
export function getOrientation(): Orientation {
  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
}

/**
 * Check if current viewport is mobile
 */
export function isMobile(): boolean {
  return window.innerWidth < BREAKPOINTS.tablet;
}

/**
 * Check if current viewport is tablet
 */
export function isTablet(): boolean {
  const width = window.innerWidth;
  return width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
}

/**
 * Check if current viewport is desktop
 */
export function isDesktop(): boolean {
  return window.innerWidth >= BREAKPOINTS.desktop;
}

/**
 * Check if device is touch-enabled
 */
export function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).msMaxTouchPoints > 0
  );
}

/**
 * Get viewport dimensions
 */
export function getViewportSize(): { width: number; height: number } {
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
}

/**
 * Calculate scale factor to fit content within viewport
 * while maintaining aspect ratio
 *
 * @param contentWidth - Original content width
 * @param contentHeight - Original content height
 * @param maxWidth - Maximum allowed width (default: viewport width)
 * @param maxHeight - Maximum allowed height (default: viewport height)
 * @returns Scale factor to apply
 */
export function calculateFitScale(
  contentWidth: number,
  contentHeight: number,
  maxWidth?: number,
  maxHeight?: number
): number {
  const viewport = getViewportSize();
  const targetWidth = maxWidth ?? viewport.width;
  const targetHeight = maxHeight ?? viewport.height;

  const scaleX = targetWidth / contentWidth;
  const scaleY = targetHeight / contentHeight;

  // Use the smaller scale to ensure content fits
  return Math.min(scaleX, scaleY);
}

/**
 * Calculate adaptive font size based on viewport
 * Uses a scale that increases with viewport size
 *
 * @param baseSize - Base font size in pixels (at mobile breakpoint)
 * @param scaleFactor - How much to scale (0-1, default 0.3 = 30% increase at desktop)
 * @returns Calculated font size in pixels
 */
export function getAdaptiveFontSize(
  baseSize: number,
  scaleFactor: number = 0.3
): number {
  const viewport = getViewportSize();
  const width = viewport.width;

  if (width >= BREAKPOINTS.desktop) {
    return baseSize * (1 + scaleFactor);
  }

  if (width >= BREAKPOINTS.tablet) {
    return baseSize * (1 + scaleFactor * 0.5);
  }

  return baseSize;
}

/**
 * Calculate adaptive spacing based on viewport
 *
 * @param baseSpacing - Base spacing in pixels (at mobile breakpoint)
 * @returns Calculated spacing in pixels
 */
export function getAdaptiveSpacing(baseSpacing: number): number {
  const deviceType = getDeviceType();

  const multipliers: Record<DeviceType, number> = {
    mobile: 1,
    tablet: 1.25,
    desktop: 1.5,
    wide: 1.75
  };

  return baseSpacing * multipliers[deviceType];
}

/**
 * Get safe area insets for devices with notches/home indicators
 * Returns CSS environment variable values
 */
export function getSafeAreaInsets(): {
  top: string;
  right: string;
  bottom: string;
  left: string;
} {
  return {
    top: 'env(safe-area-inset-top, 0px)',
    right: 'env(safe-area-inset-right, 0px)',
    bottom: 'env(safe-area-inset-bottom, 0px)',
    left: 'env(safe-area-inset-left, 0px)'
  };
}

/**
 * Apply safe area padding to an element style
 */
export function applySafeAreaPadding(style: React.CSSProperties): React.CSSProperties {
  const insets = getSafeAreaInsets();
  return {
    ...style,
    paddingTop: `calc(${style.paddingTop || '0px'} + ${insets.top})`,
    paddingRight: `calc(${style.paddingRight || '0px'} + ${insets.right})`,
    paddingBottom: `calc(${style.paddingBottom || '0px'} + ${insets.bottom})`,
    paddingLeft: `calc(${style.paddingLeft || '0px'} + ${insets.left})`
  };
}

/**
 * Minimum touch target size in pixels (WCAG AA compliance)
 */
export const MIN_TOUCH_TARGET_SIZE = 44;

/**
 * Ensure an element meets minimum touch target size
 *
 * @param currentSize - Current size in pixels
 * @returns Size that meets minimum touch target requirements
 */
export function ensureTouchTargetSize(currentSize: number): number {
  return Math.max(currentSize, MIN_TOUCH_TARGET_SIZE);
}

/**
 * Debounce function for resize events
 * Use this to avoid excessive recalculations during window resize
 *
 * @param func - Function to debounce
 * @param wait - Debounce delay in milliseconds (default: 150ms)
 * @returns Debounced function
 */
export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number = 150
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Media query helper for responsive styles
 * Returns a media query string for the given breakpoint
 *
 * @param breakpoint - Breakpoint name
 * @param type - 'min' or 'max' width
 * @returns Media query string
 */
export function mediaQuery(
  breakpoint: keyof typeof BREAKPOINTS,
  type: 'min' | 'max' = 'min'
): string {
  const value = BREAKPOINTS[breakpoint];
  return `(${type}-width: ${value}px)`;
}

/**
 * Check if media query matches
 *
 * @param query - Media query string
 * @returns True if query matches current viewport
 */
export function matchesMediaQuery(query: string): boolean {
  return window.matchMedia(query).matches;
}
