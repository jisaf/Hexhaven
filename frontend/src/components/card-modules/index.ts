/**
 * Card Modules - Public API
 *
 * Exports all card module components and utilities.
 */

// Core components
export { FadedBorder } from './FadedBorder';
export { RowModule } from './RowModule';
export { TextBoxModule } from './TextBoxModule';
export { DividerModule } from './DividerModule';
export { HeaderModule } from './HeaderModule';
export { FooterModule } from './FooterModule';
export { ActionModule } from './ActionModule';
export { CreatureModule } from './CreatureModule';
export { ModuleErrorBoundary } from './ModuleErrorBoundary';

// Module registry
export {
  MODULE_REGISTRY,
  getModuleComponent,
  isModuleTypeRegistered,
  getRegisteredModuleTypes,
} from './ModuleRegistry';

export type { ModuleComponent } from './ModuleRegistry';

// Re-export prop types for convenience
export type { FadedBorderProps } from './FadedBorder';
export type { RowModuleProps } from './RowModule';
export type { TextBoxModuleProps } from './TextBoxModule';
export type { DividerModuleProps } from './DividerModule';
export type { HeaderModuleProps } from './HeaderModule';
export type { FooterModuleProps } from './FooterModule';
export type { ActionModuleProps } from './ActionModule';
export type { CreatureModuleProps } from './CreatureModule';
