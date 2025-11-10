/**
 * Touch Gesture Utilities
 *
 * Provides touch gesture detection and handling for mobile devices:
 * - Tap (single touch)
 * - Long press (press and hold)
 * - Pinch zoom (two-finger pinch)
 * - Pan (drag/swipe)
 * - Swipe (fast pan with velocity)
 *
 * All coordinates are normalized to handle different screen densities.
 */

/**
 * Point in 2D space
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Touch event data
 */
export interface TouchEventData {
  point: Point;
  timestamp: number;
  identifier?: number;
}

/**
 * Tap gesture event
 */
export interface TapEvent {
  point: Point;
  timestamp: number;
}

/**
 * Long press gesture event
 */
export interface LongPressEvent {
  point: Point;
  duration: number;
}

/**
 * Pan gesture event
 */
export interface PanEvent {
  start: Point;
  current: Point;
  delta: Point;
  velocity: Point;
}

/**
 * Pinch gesture event
 */
export interface PinchEvent {
  center: Point;
  scale: number;
  delta: number;
}

/**
 * Swipe direction
 */
export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Swipe gesture event
 */
export interface SwipeEvent {
  start: Point;
  end: Point;
  direction: SwipeDirection;
  velocity: number;
  distance: number;
}

/**
 * Gesture configuration
 */
export interface GestureConfig {
  /** Long press duration in milliseconds (default: 500ms) */
  longPressDuration?: number;

  /** Maximum movement allowed for tap/long-press in pixels (default: 10px) */
  tapThreshold?: number;

  /** Minimum velocity for swipe detection in px/ms (default: 0.3) */
  swipeVelocityThreshold?: number;

  /** Minimum distance for swipe detection in pixels (default: 30px) */
  swipeDistanceThreshold?: number;

  /** Enable pan gesture (default: true) */
  enablePan?: boolean;

  /** Enable pinch gesture (default: true) */
  enablePinch?: boolean;
}

/**
 * Default gesture configuration
 */
const DEFAULT_CONFIG: Required<GestureConfig> = {
  longPressDuration: 500,
  tapThreshold: 10,
  swipeVelocityThreshold: 0.3,
  swipeDistanceThreshold: 30,
  enablePan: true,
  enablePinch: true
};

/**
 * Gesture Handler
 *
 * Manages touch gesture detection and callbacks
 */
export class GestureHandler {
  private config: Required<GestureConfig>;
  private element: HTMLElement;

  // Touch tracking
  private touches: Map<number, TouchEventData> = new Map();
  private startTouches: Map<number, TouchEventData> = new Map();

  // Long press tracking
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressTriggered: boolean = false;

  // Pinch tracking
  private lastPinchDistance: number = 0;
  private pinchScale: number = 1;

  // Callbacks
  private onTapCallback?: (event: TapEvent) => void;
  private onLongPressCallback?: (event: LongPressEvent) => void;
  private onPanCallback?: (event: PanEvent) => void;
  private onPinchCallback?: (event: PinchEvent) => void;
  private onSwipeCallback?: (event: SwipeEvent) => void;

  constructor(element: HTMLElement, config: GestureConfig = {}) {
    this.element = element;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.bindEvents();
  }

  /**
   * Register tap callback
   */
  onTap(callback: (event: TapEvent) => void): this {
    this.onTapCallback = callback;
    return this;
  }

  /**
   * Register long press callback
   */
  onLongPress(callback: (event: LongPressEvent) => void): this {
    this.onLongPressCallback = callback;
    return this;
  }

  /**
   * Register pan callback
   */
  onPan(callback: (event: PanEvent) => void): this {
    this.onPanCallback = callback;
    return this;
  }

  /**
   * Register pinch callback
   */
  onPinch(callback: (event: PinchEvent) => void): this {
    this.onPinchCallback = callback;
    return this;
  }

  /**
   * Register swipe callback
   */
  onSwipe(callback: (event: SwipeEvent) => void): this {
    this.onSwipeCallback = callback;
    return this;
  }

  /**
   * Bind touch events to element
   */
  private bindEvents(): void {
    this.element.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    this.element.addEventListener('touchcancel', this.handleTouchCancel, { passive: false });
  }

  /**
   * Unbind touch events from element
   */
  private unbindEvents(): void {
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel);
  }

  /**
   * Handle touch start event
   */
  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const touchData: TouchEventData = {
        point: { x: touch.clientX, y: touch.clientY },
        timestamp: Date.now(),
        identifier: touch.identifier
      };

      this.touches.set(touch.identifier, touchData);
      this.startTouches.set(touch.identifier, { ...touchData });
    }

    // Start long press timer for single touch
    if (this.touches.size === 1 && this.onLongPressCallback) {
      this.longPressTriggered = false;
      this.longPressTimer = setTimeout(() => {
        this.handleLongPress();
      }, this.config.longPressDuration);
    }

    // Initialize pinch tracking for two touches
    if (this.touches.size === 2 && this.config.enablePinch) {
      this.lastPinchDistance = this.getTouchDistance();
      this.pinchScale = 1;
    }
  };

  /**
   * Handle touch move event
   */
  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();

    // Update touch positions
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const existing = this.touches.get(touch.identifier);
      if (existing) {
        this.touches.set(touch.identifier, {
          point: { x: touch.clientX, y: touch.clientY },
          timestamp: Date.now(),
          identifier: touch.identifier
        });
      }
    }

    // Check if movement exceeds tap threshold (cancel long press)
    const firstTouch = Array.from(this.touches.values())[0];
    const firstStart = Array.from(this.startTouches.values())[0];
    if (firstTouch && firstStart) {
      const distance = this.calculateDistance(firstTouch.point, firstStart.point);
      if (distance > this.config.tapThreshold && this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    }

    // Handle pan gesture (single touch)
    if (this.touches.size === 1 && this.config.enablePan && this.onPanCallback) {
      this.handlePan();
    }

    // Handle pinch gesture (two touches)
    if (this.touches.size === 2 && this.config.enablePinch && this.onPinchCallback) {
      this.handlePinch();
    }
  };

  /**
   * Handle touch end event
   */
  private handleTouchEnd = (e: TouchEvent): void => {
    e.preventDefault();

    // Clear long press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // Handle tap or swipe
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const current = this.touches.get(touch.identifier);
      const start = this.startTouches.get(touch.identifier);

      if (current && start && !this.longPressTriggered) {
        const distance = this.calculateDistance(current.point, start.point);
        const duration = current.timestamp - start.timestamp;
        const velocity = duration > 0 ? distance / duration : 0;

        // Check for swipe
        if (
          velocity >= this.config.swipeVelocityThreshold &&
          distance >= this.config.swipeDistanceThreshold &&
          this.onSwipeCallback
        ) {
          this.handleSwipe(start, current);
        }
        // Check for tap
        else if (distance <= this.config.tapThreshold && this.onTapCallback) {
          this.onTapCallback({
            point: current.point,
            timestamp: current.timestamp
          });
        }
      }

      this.touches.delete(touch.identifier);
      this.startTouches.delete(touch.identifier);
    }

    this.longPressTriggered = false;
  };

  /**
   * Handle touch cancel event
   */
  private handleTouchCancel = (e: TouchEvent): void => {
    e.preventDefault();

    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      this.touches.delete(touch.identifier);
      this.startTouches.delete(touch.identifier);
    }

    this.longPressTriggered = false;
  };

  /**
   * Handle long press gesture
   */
  private handleLongPress(): void {
    if (this.touches.size !== 1 || !this.onLongPressCallback) return;

    const touch = Array.from(this.touches.values())[0];
    const start = Array.from(this.startTouches.values())[0];

    if (touch && start) {
      const distance = this.calculateDistance(touch.point, start.point);
      if (distance <= this.config.tapThreshold) {
        this.longPressTriggered = true;
        this.onLongPressCallback({
          point: touch.point,
          duration: touch.timestamp - start.timestamp
        });
      }
    }
  }

  /**
   * Handle pan gesture
   */
  private handlePan(): void {
    if (this.touches.size !== 1 || !this.onPanCallback) return;

    const current = Array.from(this.touches.values())[0];
    const start = Array.from(this.startTouches.values())[0];

    if (current && start) {
      const delta = {
        x: current.point.x - start.point.x,
        y: current.point.y - start.point.y
      };

      const duration = current.timestamp - start.timestamp;
      const velocity = {
        x: duration > 0 ? delta.x / duration : 0,
        y: duration > 0 ? delta.y / duration : 0
      };

      this.onPanCallback({
        start: start.point,
        current: current.point,
        delta,
        velocity
      });
    }
  }

  /**
   * Handle pinch gesture
   */
  private handlePinch(): void {
    if (this.touches.size !== 2 || !this.onPinchCallback) return;

    const distance = this.getTouchDistance();
    const scale = distance / this.lastPinchDistance;
    this.pinchScale *= scale;

    const center = this.getTouchCenter();

    this.onPinchCallback({
      center,
      scale: this.pinchScale,
      delta: scale
    });

    this.lastPinchDistance = distance;
  }

  /**
   * Handle swipe gesture
   */
  private handleSwipe(start: TouchEventData, end: TouchEventData): void {
    if (!this.onSwipeCallback) return;

    const delta = {
      x: end.point.x - start.point.x,
      y: end.point.y - start.point.y
    };

    const distance = Math.sqrt(delta.x ** 2 + delta.y ** 2);
    const duration = end.timestamp - start.timestamp;
    const velocity = duration > 0 ? distance / duration : 0;

    // Determine swipe direction
    let direction: SwipeDirection;

    if (Math.abs(delta.x) > Math.abs(delta.y)) {
      direction = delta.x > 0 ? 'right' : 'left';
    } else {
      direction = delta.y > 0 ? 'down' : 'up';
    }

    this.onSwipeCallback({
      start: start.point,
      end: end.point,
      direction,
      velocity,
      distance
    });
  }

  /**
   * Get distance between two touches
   */
  private getTouchDistance(): number {
    const touches = Array.from(this.touches.values());
    if (touches.length !== 2) return 0;

    return this.calculateDistance(touches[0].point, touches[1].point);
  }

  /**
   * Get center point between two touches
   */
  private getTouchCenter(): Point {
    const touches = Array.from(this.touches.values());
    if (touches.length !== 2) return { x: 0, y: 0 };

    return {
      x: (touches[0].point.x + touches[1].point.x) / 2,
      y: (touches[0].point.y + touches[1].point.y) / 2
    };
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Destroy gesture handler and clean up
   */
  destroy(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    this.unbindEvents();
    this.touches.clear();
    this.startTouches.clear();
  }
}

/**
 * Create a gesture handler for an element
 *
 * @param element - HTML element to attach gestures to
 * @param config - Gesture configuration
 * @returns GestureHandler instance
 */
export function createGestureHandler(
  element: HTMLElement,
  config?: GestureConfig
): GestureHandler {
  return new GestureHandler(element, config);
}
