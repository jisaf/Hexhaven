# Card Layout System Implementation Plan

## Overview
Implement a flexible, modular card layout system with database-driven configuration and CSS variable-based theming. The system will support dynamic module composition where each card is built from configurable modules (RowModule, TextBoxModule, CreatureModule, etc.). Focus on single theme implementation initially with infrastructure for future theme expansion.

## Key Decisions from User
1. **CSS Approach**: CSS Variables - map theme colors to custom properties
2. **Creature Module**: Used for summons on ability cards (e.g., Spellweaver) - configurable fields
3. **Enhancements**: Future feature - skip for now
4. **Compatibility**: Clean rewrite - replace AbilityCard entirely
5. **Module Configurations**: Stored in database for dynamic layouts
6. **Layout Strategy**: Modular framework shared by all cards, each card is a combination of configured modules
7. **Theme Scope**: Single theme (default) now, infrastructure for future theming
8. **Theme UI**: No theme selector needed yet, prepare for future game settings integration

## Current State Analysis

### Existing Card Implementation
- **Component**: `frontend/src/components/AbilityCard.tsx`
- **Styling**: `frontend/src/components/AbilityCard.css`
- **Model**: `backend/src/models/ability-card.model.ts`
- **Current approach**:
  - Hardcoded component structure with fixed layout
  - CSS-based styling with basic theming through CSS variables
  - Direct rendering of card properties (name, initiative, top/bottom actions)
  - Portrait/compact mode support via CSS media queries

### Data Structure
- Character classes stored in: `backend/src/data/characters.json` and `backend/prisma/seed-data/character-classes.json`
- Ability cards defined in: `backend/src/models/ability-card.model.ts`
- 6 character classes: Brute, Tinkerer, Spellweaver, Scoundrel, Cragheart, Mindthief

## Proposed Architecture

### 1. Theme System (Future-Ready)

#### CSS Variables Approach
```css
/* frontend/src/index.css - Add to existing file */
:root {
  /* Card Layout */
  --card-bg: #2c3e50;
  --card-bg-gradient: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  --card-border: #7f8c8d;
  --card-border-width: 2px;
  --card-border-radius: 10px;
  --card-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);

  /* Module Backgrounds */
  --module-bg: rgba(255, 255, 255, 0.05);
  --textbox-bg: rgba(255, 255, 255, 0.08);

  /* Text Colors */
  --text-primary: #ecf0f1;
  --text-secondary: #95a5a6;
  --text-initiative: #f39c12;

  /* Dividers & Borders */
  --divider-color: rgba(255, 255, 255, 0.3);
  --faded-border-gradient: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.3), transparent);

  /* Creature Module Stats */
  --creature-health-bg: rgba(231, 76, 60, 0.2);
  --creature-health-text: #e74c3c;
  --creature-move-bg: rgba(52, 152, 219, 0.2);
  --creature-move-text: #3498db;
  --creature-attack-bg: rgba(243, 156, 18, 0.2);
  --creature-attack-text: #f39c12;
  --creature-range-bg: rgba(46, 204, 113, 0.2);
  --creature-range-text: #2ecc71;

  /* Interactive States */
  --card-hover-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
  --card-selected-border: #2ecc71;
  --card-selected-shadow: 0 0 20px rgba(46, 204, 113, 0.5);
}

/* Future theme variants can be added like this: */
/* [data-theme="fantasy"] { ... } */
/* [data-theme="scifi"] { ... } */
```

**Integration with existing CSS:**
- Extend existing `frontend/src/index.css` with new CSS variables
- Maintain compatibility with current styles
- Prepare for future theme switching via `[data-theme]` attribute
- Single default theme for initial implementation

### 2. Database Schema Extensions

#### New Tables for Module Configurations

```sql
-- Add to Prisma schema (backend/prisma/schema.prisma)

model CardLayoutTemplate {
  id          String   @id @default(uuid()) @db.Uuid
  name        String   @unique @db.VarChar(100) // "ability-card-default", "ability-card-compact", "summon-card"
  description String?  @db.VarChar(500)
  modules     Json     // Array of module configurations
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  abilityCards AbilityCard[]

  @@map("card_layout_templates")
}

-- Update AbilityCard model to reference layout template
-- Add to existing AbilityCard:
layoutTemplateId String? @db.Uuid
layoutTemplate   CardLayoutTemplate? @relation(fields: [layoutTemplateId], references: [id])
```

#### Module Configuration Structure (JSON in database)
```typescript
// shared/types/card-config.ts
interface CardModule {
  id: string;  // Unique within card
  type: 'row' | 'textbox' | 'creature' | 'action' | 'header' | 'footer' | 'divider';
  rows: number; // Grid row span (can be fractional like 0.5)
  order: number; // Render order
  compact?: boolean; // For responsive sizing
  config?: ModuleConfig;
}

interface ModuleConfig {
  // For 'header' type
  fields?: ('name' | 'initiative' | 'level')[];
  layout?: 'horizontal' | 'vertical';

  // For 'action' type
  position?: 'top' | 'bottom';
  showElements?: boolean;
  showEffects?: boolean;

  // For 'textbox' type
  title?: string;
  content?: string; // Can be template like "{{description}}"

  // For 'creature' type
  stats?: {
    label: string;
    field: string; // "health", "move", "attack", "range", or custom
    bgVar?: string; // CSS variable name for background
    textVar?: string; // CSS variable name for text color
  }[];

  // For 'divider' type
  style?: 'faded' | 'solid' | 'dashed';

  // Common properties
  noBorder?: boolean;
  customClass?: string;
}
```

#### Example Card Layout Template (stored as JSON in database)
```json
{
  "name": "ability-card-default",
  "modules": [
    {
      "id": "header",
      "type": "header",
      "rows": 1,
      "order": 1,
      "config": {
        "fields": ["name", "initiative"],
        "layout": "horizontal"
      }
    },
    {
      "id": "top-action",
      "type": "action",
      "rows": 4,
      "order": 2,
      "config": {
        "position": "top",
        "showElements": true,
        "showEffects": true
      }
    },
    {
      "id": "divider",
      "type": "divider",
      "rows": 1,
      "order": 3,
      "config": {
        "style": "faded"
      }
    },
    {
      "id": "bottom-action",
      "type": "action",
      "rows": 4,
      "order": 4,
      "config": {
        "position": "bottom",
        "showElements": true,
        "showEffects": true
      }
    },
    {
      "id": "footer",
      "type": "footer",
      "rows": 1,
      "order": 5,
      "config": {
        "fields": ["level"]
      }
    }
  ]
}
```

#### Example Summon Card Template (for Spellweaver)
```json
{
  "name": "summon-card-default",
  "modules": [
    {
      "id": "header",
      "type": "header",
      "rows": 1,
      "order": 1,
      "config": {
        "fields": ["name"],
        "layout": "horizontal"
      }
    },
    {
      "id": "creature-stats",
      "type": "creature",
      "rows": 2,
      "order": 2,
      "config": {
        "stats": [
          { "label": "Health", "field": "health", "bgVar": "--creature-health-bg", "textVar": "--creature-health-text" },
          { "label": "Move", "field": "move", "bgVar": "--creature-move-bg", "textVar": "--creature-move-text" },
          { "label": "Attack", "field": "attack", "bgVar": "--creature-attack-bg", "textVar": "--creature-attack-text" },
          { "label": "Range", "field": "range", "bgVar": "--creature-range-bg", "textVar": "--creature-range-text" }
        ]
      }
    },
    {
      "id": "abilities",
      "type": "textbox",
      "rows": 3,
      "order": 3,
      "config": {
        "title": "Special Abilities",
        "content": "{{specialAbilities}}"
      }
    }
  ]
}
```

### 3. Module Components

#### Module Registry
```typescript
// frontend/src/components/card-modules/ModuleRegistry.ts
const MODULE_REGISTRY = {
  'row': RowModule,
  'textbox': TextBoxModule,
  'creature': CreatureModule,
  'action': ActionModule,
  'header': HeaderModule,
  'footer': FooterModule,
  'divider': DividerModule,
  'element-tracker': ElementTrackerModule,
  'custom': CustomModule
};
```

#### Core Modules (from provided example)
1. **RowModule**: Basic single-row display unit
2. **TextBoxModule**: Multi-row text content area
3. **CreatureModule**: 3-column creature stats (Health/Move, Attack/Range, Icons)
4. **ActionModule**: Display action with type, value, range, elements, effects
5. **HeaderModule**: Card name and initiative
6. **FooterModule**: Card level and other metadata
7. **DividerModule**: Visual separator with faded border

### 4. Component Structure

```
frontend/src/
├── contexts/
│   └── ThemeContext.tsx           # Theme provider and hooks
├── components/
│   ├── card-modules/
│   │   ├── ModuleRegistry.ts      # Module type mapping
│   │   ├── RowModule.tsx
│   │   ├── TextBoxModule.tsx
│   │   ├── CreatureModule.tsx
│   │   ├── ActionModule.tsx
│   │   ├── HeaderModule.tsx
│   │   ├── FooterModule.tsx
│   │   ├── DividerModule.tsx
│   │   └── FadedBorder.tsx        # Shared border component
│   ├── ConfigurableCard.tsx       # New: JSON-driven card renderer
│   ├── ThemeSelector.tsx          # Theme selection UI
│   ├── AbilityCard.tsx            # Keep for backward compatibility
│   └── CardSelectionPanel.tsx     # Update to use new system
├── hooks/
│   └── useTheme.ts                # Theme context hook
└── styles/
    └── card-modules.css           # Module-specific styles
shared/
├── types/
│   └── card-config.ts             # Card configuration types
└── config/
    ├── themes.json                # Theme definitions
    ├── card-layouts.json          # Base card layouts
    └── character-enhancements.json # Character customizations
```

## Implementation Questions & Considerations

### Questions for User

1. **Theme Integration Approach**
   - **Option A**: Full Tailwind migration - Replace existing CSS with Tailwind utility classes
   - **Option B**: Hybrid approach - Use Tailwind for themes, keep existing CSS structure
   - **Option C**: CSS Variables - Map theme colors to CSS custom properties

   **Recommendation**: Option B (Hybrid) - maintains compatibility while adding theme flexibility

2. **Module Data Binding**
   - How should modules access card data?
     - Direct props drilling?
     - Context provider for card data?
     - Field mapping with dot notation (e.g., "topAction.value")?

   **Recommendation**: Field mapping with context fallback for flexibility

3. **Enhancement System Scope**
   - Should enhancements modify:
     - Only visual representation?
     - Both data and visuals?
     - Create new card instances or modify existing?

   **Recommendation**: Modify rendering only, keep data immutable

4. **Creature Module Usage**
   - Is this for monster cards or character stat displays?
   - Should it be integrated into ability cards or separate?

   **Recommendation**: Separate component, reusable for both

5. **Layout Responsiveness**
   - Keep existing portrait mode CSS?
   - Use JSON config for responsive variants?
   - Automatic layout switching based on viewport?

   **Recommendation**: Hybrid - JSON defines layouts, CSS handles media queries

### Architectural Improvements

1. **Type Safety**: Use TypeScript discriminated unions for module types
2. **Performance**: Memoize module rendering, lazy load theme configs
3. **Accessibility**: Maintain ARIA labels, keyboard navigation
4. **Testing**: Unit tests for each module, integration tests for themes
5. **Migration Path**: Keep existing AbilityCard, gradually migrate to ConfigurableCard

## Implementation Steps

### Phase 1: Database Schema & Types (Day 1)
1. Add `CardLayoutTemplate` model to Prisma schema
2. Update `AbilityCard` model with `layoutTemplateId` foreign key
3. Create migration file
4. Define TypeScript types in `shared/types/card-config.ts`
5. Write seed data for default layout templates
6. Run migration and seed database

### Phase 2: CSS Variables & Styling (Day 2)
1. Add CSS variables to `frontend/src/index.css`
2. Create `frontend/src/styles/card-modules.css` for module-specific styles
3. Update existing card styles to use CSS variables
4. Test CSS variable fallbacks
5. Document CSS variable structure

### Phase 3: Base Module Components (Days 3-4)
1. Create `frontend/src/components/card-modules/` directory
2. Implement `FadedBorder.tsx` (shared component)
3. Implement `RowModule.tsx` (basic row display)
4. Implement `TextBoxModule.tsx` (multi-row content)
5. Implement `DividerModule.tsx` (visual separator)
6. Write unit tests for each module
7. Create Storybook stories for visual testing

### Phase 4: Complex Modules (Days 5-6)
1. Implement `HeaderModule.tsx` (name, initiative, level)
2. Implement `FooterModule.tsx` (metadata display)
3. Implement `ActionModule.tsx` (ability action rendering)
4. Implement `CreatureModule.tsx` (configurable 3-column stats)
5. Test module composition and layouts
6. Write unit tests and Storybook stories

### Phase 5: Module Registry & Renderer (Day 7)
1. Create `ModuleRegistry.ts` for type-to-component mapping
2. Implement `ConfigurableCard.tsx` (main renderer)
3. Add module context provider for card data access
4. Implement field mapping system (e.g., "topAction.value")
5. Add error boundaries and fallback rendering
6. Write integration tests

### Phase 6: Backend Services (Day 8)
1. Create `card-layout-template.service.ts`
2. Implement template CRUD operations
3. Add template caching for performance
4. Create API endpoints for template management
5. Update `ability-card.service.ts` to include layout templates
6. Write unit tests for services

### Phase 7: Integration & Migration (Days 9-10)
1. Update `AbilityCard.tsx` to use ConfigurableCard internally
2. Migrate existing card data to use default layout template
3. Update `CardSelectionPanel.tsx` to use new system
4. Update game board components
5. Test all card interactions (selection, display, etc.)
6. Verify backward compatibility

### Phase 8: Responsive Design (Day 11)
1. Add compact layout template to database
2. Implement responsive module sizing
3. Add portrait/landscape detection
4. Test on multiple screen sizes
5. Optimize for mobile performance
6. Update media queries

### Phase 9: Testing & Optimization (Days 12-13)
1. Comprehensive unit test coverage
2. Integration tests for card rendering
3. E2E tests for card selection flow
4. Performance profiling and optimization
5. Accessibility audit (ARIA labels, keyboard nav)
6. Cross-browser testing

### Phase 10: Documentation & Polish (Day 14)
1. Write developer documentation for module system
2. Create guide for adding new module types
3. Document database schema changes
4. Add inline code documentation
5. Create example configurations
6. Final bug fixes and polish

## Testing Strategy

### Unit Tests
- Each module component
- Theme context and provider
- Configuration loader
- Enhancement logic

### Integration Tests
- Theme switching across components
- Card rendering with different layouts
- Enhancement application
- Module composition

### E2E Tests
- Complete card selection flow with themes
- Theme persistence across sessions
- Card customization workflow

## Migration Strategy

1. **Backward Compatibility**: Keep existing AbilityCard.tsx functional
2. **Gradual Adoption**: New features use ConfigurableCard
3. **Feature Flag**: Optional theme system toggle
4. **Fallback**: Default theme matches current styling
5. **Deprecation Path**: Mark old components with warnings

## Performance Considerations

1. **Lazy Loading**: Load theme configurations on demand
2. **Memoization**: Cache rendered modules
3. **Virtual Scrolling**: For large card collections
4. **CSS-in-JS vs Tailwind**: Use Tailwind for better performance
5. **Bundle Size**: Code-split theme definitions

## Accessibility

1. **Theme Contrast**: Ensure WCAG AA compliance for all themes
2. **Keyboard Navigation**: Support tab navigation through modules
3. **Screen Readers**: Proper ARIA labels for all interactive elements
4. **Focus Management**: Visible focus indicators in all themes
5. **Reduced Motion**: Respect prefers-reduced-motion

## Documentation Needs

1. Theme creation guide
2. Module development guide
3. Configuration schema reference
4. Enhancement system guide
5. Migration guide from old to new system

## Resolved Decisions

1. ✅ **CSS Approach**: CSS Variables for theming
2. ✅ **Module Storage**: Database-driven configurations
3. ✅ **Creature Module**: Configurable fields for summons
4. ✅ **Enhancements**: Future feature - not in scope
5. ✅ **Compatibility**: Clean rewrite of AbilityCard
6. ✅ **Theme Scope**: Single default theme, infrastructure for future expansion
7. ✅ **Layout Strategy**: Modular framework shared by all cards

## Remaining Questions for Implementation

1. **Module Validation**: Should invalid module configurations fail silently or throw errors?
   - Recommendation: Throw errors in development, fail gracefully in production

2. **Caching Strategy**: How aggressively should we cache layout templates?
   - Recommendation: Cache in memory, invalidate on template updates

3. **Migration Path**: Should old cards without layoutTemplateId use default template?
   - Recommendation: Yes, with automatic migration script

4. **Performance Target**: Maximum render time for card with all modules?
   - Recommendation: < 16ms (60fps) for smooth scrolling in card selection

5. **Dev Tools**: Need admin UI for creating/editing layout templates?
   - Recommendation: Phase 2 feature - start with seed data only

## Success Criteria

### Core Functionality
- [ ] Database schema includes `CardLayoutTemplate` model with migrations
- [ ] All 7 module types implemented (Row, TextBox, Divider, Header, Footer, Action, Creature)
- [ ] ConfigurableCard can render cards from database templates
- [ ] Default ability card layout matches current visual design
- [ ] Summon card layout with CreatureModule works for Spellweaver
- [ ] Cards render correctly in full and compact layouts
- [ ] All existing card functionality preserved (selection, hover, etc.)

### Performance
- [ ] Card render time < 16ms (60fps target)
- [ ] Layout template caching implemented
- [ ] Mobile performance maintained on target devices
- [ ] No memory leaks in card list rendering

### Code Quality
- [ ] TypeScript types defined for all module configurations
- [ ] Unit test coverage > 80% for module components
- [ ] Integration tests for ConfigurableCard
- [ ] E2E tests pass for card selection flow
- [ ] No linting errors or warnings

### Developer Experience
- [ ] CSS variables documented in code comments
- [ ] Module development guide written
- [ ] Example configurations in seed data
- [ ] Error messages are clear and actionable

### Accessibility
- [ ] ARIA labels present on all interactive elements
- [ ] Keyboard navigation works for all modules
- [ ] Screen reader announces card information correctly
- [ ] Focus indicators visible in all states

### Infrastructure
- [ ] CSS variables prepared for future theming
- [ ] Module registry extensible for new types
- [ ] Database templates editable (foundation laid)
- [ ] No visual regressions in existing features
