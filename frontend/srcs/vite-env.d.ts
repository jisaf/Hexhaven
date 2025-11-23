/// <reference types="vite/client" />

// Extend the ImportMeta interface to include Vite's custom globEager property
// This provides type safety and removes the need for `(import.meta as any)`.
interface ImportMeta {
  readonly globEager: (pattern: string) => Record<string, { default: string }>;
}
