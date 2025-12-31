/// <reference types="vite/client" />

/**
 * Type declarations for non-TypeScript modules
 *
 * These declarations allow TypeScript to understand imports of
 * CSS modules, images, and other assets.
 */

// CSS Modules - allows importing .module.css files
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

// Regular CSS files
declare module '*.css' {
  const content: string;
  export default content;
}

// SVG imports
declare module '*.svg' {
  const content: string;
  export default content;
}

// Image imports
declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}
