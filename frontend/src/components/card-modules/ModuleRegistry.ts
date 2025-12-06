/**
 * Module Registry
 *
 * Maps module type strings to their corresponding React components.
 * Used by ConfigurableCard to dynamically render modules based on configuration.
 */

import type { ComponentType } from 'react';
import type { ModuleType } from '../../../../shared/types/card-config';

// Import all module components
import { RowModule } from './RowModule';
import { TextBoxModule } from './TextBoxModule';
import { DividerModule } from './DividerModule';
import { HeaderModule } from './HeaderModule';
import { FooterModule } from './FooterModule';
import { ActionModule } from './ActionModule';
import { CreatureModule } from './CreatureModule';

// Module component type (all modules share similar prop structure)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ModuleComponent = ComponentType<any>;

/**
 * Registry mapping module types to components
 */
export const MODULE_REGISTRY: Record<ModuleType, ModuleComponent> = {
  row: RowModule,
  textbox: TextBoxModule,
  divider: DividerModule,
  header: HeaderModule,
  footer: FooterModule,
  action: ActionModule,
  creature: CreatureModule,
};

/**
 * Get component for a given module type
 * @param type - The module type
 * @returns The corresponding component or null if not found
 */
export function getModuleComponent(type: ModuleType): ModuleComponent | null {
  return MODULE_REGISTRY[type] || null;
}

/**
 * Check if a module type is registered
 * @param type - The module type to check
 * @returns True if the type is registered
 */
export function isModuleTypeRegistered(type: string): type is ModuleType {
  return type in MODULE_REGISTRY;
}

/**
 * Get all registered module types
 * @returns Array of registered module type names
 */
export function getRegisteredModuleTypes(): ModuleType[] {
  return Object.keys(MODULE_REGISTRY) as ModuleType[];
}
