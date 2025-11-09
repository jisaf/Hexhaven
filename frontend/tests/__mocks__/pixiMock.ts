/**
 * Mock for PixiJS library
 *
 * Used in unit tests that don't need full PixiJS functionality.
 * For integration/E2E tests, use actual PixiJS.
 */

export class Application {
  stage = {
    addChild: jest.fn(),
    removeChild: jest.fn(),
    children: []
  };

  renderer = {
    resize: jest.fn(),
    render: jest.fn(),
    view: document.createElement('canvas')
  };

  ticker = {
    add: jest.fn(),
    remove: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    deltaTime: 1
  };

  canvas = document.createElement('canvas');

  async init() {
    return Promise.resolve();
  }

  destroy() {
    jest.fn();
  }
}

export class Container {
  children: any[] = [];

  addChild = jest.fn((child) => {
    this.children.push(child);
    return child;
  });

  removeChild = jest.fn((child) => {
    const index = this.children.indexOf(child);
    if (index > -1) {
      this.children.splice(index, 1);
    }
    return child;
  });
}

export class Sprite {
  static from = jest.fn(() => new Sprite());

  x = 0;
  y = 0;
  width = 0;
  height = 0;
  anchor = { x: 0, y: 0 };
  scale = { x: 1, y: 1 };
  rotation = 0;
  visible = true;
  alpha = 1;
}

export class Graphics {
  beginFill = jest.fn().mockReturnThis();
  drawCircle = jest.fn().mockReturnThis();
  drawRect = jest.fn().mockReturnThis();
  drawPolygon = jest.fn().mockReturnThis();
  endFill = jest.fn().mockReturnThis();
  clear = jest.fn().mockReturnThis();
  lineStyle = jest.fn().mockReturnThis();
  moveTo = jest.fn().mockReturnThis();
  lineTo = jest.fn().mockReturnThis();
}

export class Text {
  constructor(public text: string, public style?: any) {}

  x = 0;
  y = 0;
  anchor = { x: 0, y: 0 };
}

export const Assets = {
  load: jest.fn().mockResolvedValue({}),
  add: jest.fn(),
  get: jest.fn()
};
