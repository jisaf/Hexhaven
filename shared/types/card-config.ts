/**
 * Card Layout Configuration Types
 *
 * Defines the structure for modular card layouts stored in the database.
 * Each card can be composed of multiple configurable modules (header, action, creature stats, etc.)
 */

// ========== MODULE TYPES ==========

export type ModuleType =
  | 'row'       // Basic single-row display unit
  | 'textbox'   // Multi-row text content area
  | 'creature'  // 3-column creature stats grid
  | 'action'    // Ability action display
  | 'header'    // Card header (name, initiative)
  | 'footer'    // Card footer (level, metadata)
  | 'divider';  // Visual separator

// ========== BASE MODULE INTERFACE ==========

export interface CardModule {
  id: string;           // Unique identifier within card
  type: ModuleType;     // Type of module to render
  rows: number;         // Grid row span (can be fractional like 0.5)
  order: number;        // Render order (1, 2, 3...)
  compact?: boolean;    // Enable compact/responsive sizing
  config?: ModuleConfig; // Type-specific configuration
}

// ========== MODULE CONFIGURATIONS ==========

export interface ModuleConfig {
  // Common properties
  noBorder?: boolean;
  customClass?: string;

  // Header module
  fields?: HeaderField[];
  layout?: 'horizontal' | 'vertical';

  // Action module
  position?: 'top' | 'bottom';
  showElements?: boolean;
  showEffects?: boolean;

  // TextBox module
  title?: string;
  content?: string; // Can use template syntax like "{{description}}"

  // Creature module
  stats?: CreatureStat[];

  // Divider module
  style?: 'faded' | 'solid' | 'dashed';
}

// ========== HEADER MODULE TYPES ==========

export type HeaderField = 'name' | 'initiative' | 'level';

// ========== CREATURE MODULE TYPES ==========

export interface CreatureStat {
  label: string;         // Display label (e.g., "Health", "Move")
  field: string;         // Data field to display (e.g., "health", "move", "attack", "range")
  bgVar?: string;        // CSS variable for background color (e.g., "--creature-health-bg")
  textVar?: string;      // CSS variable for text color (e.g., "--creature-health-text")
  position?: {           // Grid position (row, col)
    row: number;
    col: number;
  };
}

// ========== CARD LAYOUT TEMPLATE ==========

export interface CardLayoutTemplate {
  id: string;
  name: string;          // e.g., "ability-card-default", "summon-card"
  description?: string;
  modules: CardModule[];
  createdAt: Date;
  updatedAt: Date;
}

// ========== TEMPLATE DATA (for database storage) ==========

export interface CardLayoutTemplateData {
  id?: string;          // Optional for creation
  name: string;
  description?: string;
  modules: CardModule[];
}

// ========== TYPE GUARDS ==========

export function isValidModuleType(type: string): type is ModuleType {
  return ['row', 'textbox', 'creature', 'action', 'header', 'footer', 'divider'].includes(type);
}

export function isHeaderModule(module: CardModule): boolean {
  return module.type === 'header';
}

export function isActionModule(module: CardModule): boolean {
  return module.type === 'action';
}

export function isCreatureModule(module: CardModule): boolean {
  return module.type === 'creature';
}

export function isTextBoxModule(module: CardModule): boolean {
  return module.type === 'textbox';
}

export function isDividerModule(module: CardModule): boolean {
  return module.type === 'divider';
}

// ========== VALIDATION HELPERS ==========

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCardModule(module: CardModule): ValidationResult {
  const errors: string[] = [];

  if (!module.id || module.id.trim().length === 0) {
    errors.push('Module ID is required');
  }

  if (!isValidModuleType(module.type)) {
    errors.push(`Invalid module type: ${module.type}`);
  }

  if (typeof module.rows !== 'number' || module.rows <= 0) {
    errors.push('Module rows must be a positive number');
  }

  if (typeof module.order !== 'number' || module.order < 0) {
    errors.push('Module order must be a non-negative number');
  }

  // Type-specific validation
  if (module.type === 'header' && module.config?.fields) {
    const validFields: HeaderField[] = ['name', 'initiative', 'level'];
    const invalidFields = module.config.fields.filter(f => !validFields.includes(f as HeaderField));
    if (invalidFields.length > 0) {
      errors.push(`Invalid header fields: ${invalidFields.join(', ')}`);
    }
  }

  if (module.type === 'action' && module.config?.position) {
    if (!['top', 'bottom'].includes(module.config.position)) {
      errors.push(`Invalid action position: ${module.config.position}`);
    }
  }

  if (module.type === 'creature' && module.config?.stats) {
    if (!Array.isArray(module.config.stats) || module.config.stats.length === 0) {
      errors.push('Creature module must have at least one stat');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateCardLayoutTemplate(template: CardLayoutTemplateData): ValidationResult {
  const errors: string[] = [];

  if (!template.name || template.name.trim().length === 0) {
    errors.push('Template name is required');
  }

  if (!Array.isArray(template.modules) || template.modules.length === 0) {
    errors.push('Template must have at least one module');
  }

  // Validate each module
  template.modules.forEach((module, index) => {
    const moduleValidation = validateCardModule(module);
    if (!moduleValidation.valid) {
      errors.push(`Module ${index + 1} (${module.id}): ${moduleValidation.errors.join(', ')}`);
    }
  });

  // Check for duplicate module IDs
  const moduleIds = template.modules.map(m => m.id);
  const duplicateIds = moduleIds.filter((id, index) => moduleIds.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    errors.push(`Duplicate module IDs: ${duplicateIds.join(', ')}`);
  }

  // Check for duplicate order values
  const orders = template.modules.map(m => m.order);
  const duplicateOrders = orders.filter((order, index) => orders.indexOf(order) !== index);
  if (duplicateOrders.length > 0) {
    errors.push(`Duplicate module orders: ${duplicateOrders.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
