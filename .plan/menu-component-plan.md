# Menu Component Implementation Plan (Final)

**Issue**: #196 - Create a proper menu component
**Objective**: Build a header component with Hexhaven branding and inline menu toggle, with a sliding menu panel that floats from the right. No floating AuthNav component - consolidate into header + menu.

## Design Overview

### Architecture (Hybrid Approach)
The solution consists of two components:

1. **Header Component** (Fixed at top)
   - Contains Hexhaven branding on left
   - Contains inline menu toggle button (hamburger icon) on right
   - Contains language selector inline
   - No floating elements - proper flex layout
   - Replaces the current floating AuthNav

2. **Menu Component** (Floats/slides from right)
   - Slides in from right when toggle is clicked
   - Semi-transparent backdrop overlay
   - Contains all navigation items (login, register, my characters, etc.)
   - Floats above content with proper z-index
   - Close on backdrop click or Esc key

### Layout Structure
```
┌─────────────────────────────────────────────────┐
│ [Logo]             [Language] [Menu Toggle ☰]  │  <- Header (fixed, 64px)
├─────────────────────────────────────────────────┤
│                                                   │
│                   Page Content                   │
│                                                  │
│                        ┌──────────────┐          │
│                        │ Menu Panel   │          │  <- Menu floats from right
│                        │ (slides in)  │          │
│                        │              │          │
│                        └──────────────┘          │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Header Contents (Left to Right)
1. **Left**: Hexhaven logo or brand text
2. **Center/Right**: Flex spacer
3. **Right Section** (inline items):
   - Language Selector (LanguageSelector component)
   - Menu Toggle Button (hamburger icon)

### Menu Panel Contents
**Unauthenticated Users:**
- Login (link to /login)
- Register (link to /register)

**Authenticated Users:**
- My Characters (link to /characters)
- Create Character (link to /characters/new)
- New Game (link to / - Lobby, can create room)
- Logout (button, calls authService.logout())

## Implementation Approach

### 1. Create Header Component
- **File**: `frontend/src/components/Header.tsx`
- **Styling**: `frontend/src/components/Header.module.css`

**Key Features**:
- Fixed positioning at top of non-game pages
- Flexbox layout: logo | spacer | language selector | menu toggle
- No floating elements - clean layout
- Height: 64px (consistent with existing design)
- Z-index: 1000 (above page content, below menu)

### 2. Create Menu Component
- **File**: `frontend/src/components/Menu.tsx`
- **Styling**: Uses Menu.module.css

**Key Features**:
- Slides in from right (transform: translateX)
- Semi-transparent backdrop overlay for click-to-close
- Smooth CSS transitions (300ms)
- Mobile-optimized width
- Keyboard handling (Esc to close)
- Z-index: 1001 (above header and backdrop)

### 3. Create Menu Items Component
- **File**: `frontend/src/components/MenuItems.tsx`
- **Styling**: Part of Menu.module.css

**Key Features**:
- Conditional rendering based on authentication state
- Navigation via React Router
- Logout integration with authService
- Menu item styling with hover/active states

### 4. Integrate Into App Layout
- Update `App.tsx`:
  - Add state for menu visibility (useState)
  - Render Header component
  - Render Menu component with state control
  - Conditionally hide Header + Menu on GameBoard page
  - Add content padding to account for header height

**Layout in App.tsx**:
```typescript
{!isGameBoardPage && (
  <>
    <Header menuOpen={menuOpen} onMenuToggle={toggleMenu} />
    <Menu isOpen={menuOpen} onClose={closeMenu} />
  </>
)}
<Routes>
  {/* Page routes */}
</Routes>
```

### 5. Remove AuthNav Component
- Delete `frontend/src/components/AuthNav.tsx`
- Delete `frontend/src/components/AuthNav.css`
- Remove any imports of AuthNav from other files

## Technical Details

### Header Component

```typescript
// Header.tsx
interface HeaderProps {
  menuOpen: boolean;
  onMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ menuOpen, onMenuToggle }) => {
  // Return: Logo | Spacer | LanguageSelector | MenuToggleButton
}
```

**Header Layout (Flexbox)**:
```css
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  height: 64px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: var(--primary-bg-color);
  border-bottom: 2px solid var(--divider-color);
}

.headerLeft { /* Logo */ }
.headerCenter { /* Spacer - flex: 1 */ }
.headerRight { /* LanguageSelector + MenuButton */
  display: flex;
  align-items: center;
  gap: 16px;
}

.menuToggleButton {
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 24px;
  cursor: pointer;
  padding: 8px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Menu Component

```typescript
// Menu.tsx
interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const Menu: React.FC<MenuProps> = ({ isOpen, onClose }) => {
  // Handle Esc key press
  // Handle backdrop click
  // Render backdrop overlay
  // Render menu panel (slides from right)
  // Render MenuItems component inside
}
```

**Menu Styling**:
```css
.backdrop {
  display: ${isOpen ? 'block' : 'none'};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  animation: fadeIn 300ms ease-in-out;
}

.menuPanel {
  position: fixed;
  top: 0;
  right: 0;
  width: 300px; /* Desktop */
  height: 100vh;
  background: var(--primary-bg-color);
  z-index: 1001;
  transform: translateX(${isOpen ? '0' : '100%'});
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
  padding-top: 24px; /* Below header */
  overflow-y: auto;
}

/* Mobile: full-width minus safe area */
@media (max-width: 480px) {
  .menuPanel {
    width: calc(100vw - 24px);
  }
}
```

### Menu Items Component

```typescript
// MenuItems.tsx - Renders inside Menu.tsx
const MenuItems: React.FC<{ onItemClick: () => void }> = ({ onItemClick }) => {
  const isAuthenticated = authService.isAuthenticated();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authService.logout();
    onItemClick(); // Close menu
  };

  return (
    <nav className={styles.menuItems}>
      {!isAuthenticated ? (
        <>
          <MenuItem label="Login" onClick={() => {
            navigate('/login');
            onItemClick();
          }} />
          <MenuItem label="Register" onClick={() => {
            navigate('/register');
            onItemClick();
          }} />
        </>
      ) : (
        <>
          <MenuItem label="My Characters" onClick={() => {
            navigate('/characters');
            onItemClick();
          }} />
          <MenuItem label="Create Character" onClick={() => {
            navigate('/characters/new');
            onItemClick();
          }} />
          <MenuItem label="New Game" onClick={() => {
            navigate('/');
            onItemClick();
          }} />
          <MenuItem label="Logout" onClick={handleLogout} />
        </>
      )}
    </nav>
  );
};
```

## Styling Summary

### Colors and Theme
- Use existing CSS variables from `index.css`
- Panel background: var(--primary-bg-color, #0d1a2e)
- Text: var(--text-primary, #ecf0f1)
- Accent: var(--divider-color, rgba(255, 255, 255, 0.1))
- Gold highlights: #c9a444

### Responsive Design
**Desktop** (>768px):
- Menu width: 300px
- Header height: 64px
- Menu slides smoothly

**Mobile** (<768px):
- Menu width: calc(100vw - 24px) or full screen
- Header height: 56px (slightly smaller)
- Touch targets: 44px minimum
- Menu appears full-screen

**Tablet** (768px-1024px):
- Menu width: 280px-300px
- Header height: 64px

### Z-Index Hierarchy
- Page content: 1 (default)
- Header: 1000 (above content)
- Backdrop overlay: 1000 (same level as header)
- Menu panel: 1001 (above backdrop and header)

## File Changes

### New Files (4)
1. `frontend/src/components/Header.tsx` - Header component with logo and menu toggle
2. `frontend/src/components/Header.module.css` - Header styling
3. `frontend/src/components/Menu.tsx` - Menu panel that slides from right
4. `frontend/src/components/Menu.module.css` - Menu styling

### Modified Files (3+)
1. `frontend/src/App.tsx` - Add menu state, render Header + Menu, hide on GameBoard
2. `frontend/src/pages/Lobby.tsx` - Add padding-top for fixed header
3. `frontend/src/pages/Characters.tsx` - Add padding-top
4. `frontend/src/pages/Login.tsx` - Add padding-top
5. `frontend/src/pages/Register.tsx` - Add padding-top
6. `frontend/src/pages/CreateCharacter.tsx` - Add padding-top

### Files to Delete (2)
1. `frontend/src/components/AuthNav.tsx` - Remove floating auth nav
2. `frontend/src/components/AuthNav.css` - Remove associated styles

### No Changes Required
- `frontend/src/services/auth.service.ts` - Uses as-is
- `frontend/src/i18n/` - Uses as-is
- `frontend/src/components/LanguageSelector.tsx` - Move into header

## Success Criteria

✅ Header is fixed at top of all non-game pages
✅ Header contains Hexhaven branding (logo/text) on left
✅ Header contains inline language selector and menu toggle button on right
✅ Menu toggle (hamburger icon) is 44px+ for mobile touch target
✅ Menu slides in from right with smooth animation (300ms)
✅ Menu has semi-transparent backdrop that closes menu on click
✅ Menu contains all navigation items (login, register, my characters, logout, etc.)
✅ AuthNav component is completely removed
✅ No floating elements except the menu panel itself
✅ Menu closes on Esc key press
✅ Menu closes when navigating to a page
✅ Header and menu do NOT appear on GameBoard page
✅ Page content has proper padding to avoid overlap with header
✅ Responsive: Works on mobile (375px), tablet (768px), desktop (1920px)
✅ Consistent styling with existing theme (dark blue + gold)
✅ Proper z-index layering (header > content, menu > header)

## Phase Breakdown

**Phase 1: Create Header Component** (2 files)
- Header.tsx with fixed positioning, logo, language selector, menu toggle
- Header.module.css with flexbox layout and responsive styling

**Phase 2: Create Menu Component** (2 files)
- Menu.tsx with slide-in animation and backdrop
- Menu.module.css with animation keyframes and responsive sizing
- Includes MenuItems component inside Menu.tsx

**Phase 3: Integrate Into App** (3-6 files)
- Update App.tsx to add menu state and render Header + Menu
- Add padding-top to non-game pages (Lobby, Characters, Login, Register, CreateCharacter)
- Conditionally hide Header + Menu on GameBoard

**Phase 4: Cleanup** (2 files)
- Delete AuthNav.tsx and AuthNav.css
- Remove any imports of AuthNav

**Phase 5: Testing**
- Visual testing on multiple devices
- Verify menu animations
- Verify no floating elements except menu
- Verify GameBoard is unaffected
- Accessibility testing

## Key Implementation Notes

1. **Menu Toggle in Header**
   - Hamburger icon button (☰) positioned in header
   - Size: 44px x 44px for mobile touch targets
   - Click toggles menu open/closed

2. **Menu State Management**
   - Single boolean state in App.tsx: `const [menuOpen, setMenuOpen] = useState(false)`
   - Pass to Header as `menuOpen` and `onMenuToggle` callback
   - Pass to Menu as `isOpen` and `onClose` callback

3. **Navigation on Menu Item Click**
   - Each menu item navigates and closes menu
   - Logout requires special handling: call authService.logout() first, then close menu

4. **Padding for Fixed Header**
   - All non-game pages need `padding-top: 64px` or use flexbox layout
   - GameBoard should have NO padding (remains unchanged)
   - Can use a layout wrapper component for consistency

5. **Language Selector in Header**
   - Move LanguageSelector component from LobbyHeader to Header
   - Position inline on right side of header with menu toggle
   - Keep existing i18n integration

6. **Mobile Considerations**
   - Menu width should be most of screen but not 100% (leave some visual separation)
   - Recommend: `calc(100vw - 24px)` or max 300px
   - Hamburger icon is main navigation on mobile
   - Touch-friendly spacing throughout

7. **Keyboard Handling**
   - Esc key closes menu
   - Tab focus should stay within menu when open (optional for MVP)
   - Menu items should be focusable

8. **Animation Details**
   - Menu transform: `translateX(100%)` (closed) → `translateX(0)` (open)
   - Backdrop opacity: 0 (closed) → 0.5 (open)
   - Duration: 300ms
   - Easing: cubic-bezier(0.4, 0, 0.2, 1) (material-ui standard)
