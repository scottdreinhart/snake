# UI Pattern Analysis: Hamburger Menu & Settings Screens
## Cross-Repository Study
**Focus**: Reusable patterns for UI enhancement across game projects.

---

## Executive Summary

**TicTacToe** is the model implementation with a sophisticated, reusable hamburger menu pattern and comprehensive settings architecture. The framework applies uniformly across all game projects in this ecosystem.

**Key Finding**: TicTacToe's `HamburgerMenu` component using React.createPortal() + useDropdownBehavior is the gold standard for in-game menu access.

**Reference Implementation**: Copy patterns from TicTacToe
- `src/ui/molecules/HamburgerMenu.tsx`
- `src/app/useDropdownBehavior.ts`
- `src/ui/molecules/SettingsOverlay.tsx`

---

## Implementation Pattern

### File Structure
```
src/app/
├── useDropdownBehavior.ts → Reusable hook

src/ui/molecules/
├── HamburgerMenu.tsx → Menu component
├── HamburgerMenu.module.css → Styles

src/ui/atoms/
├── Game-specific toggles
└── Shared toggles (SoundToggle, ThemeToggle)
```

### Key Features
- ✅ Portal-rendered dropdown (z-index 9999)
- ✅ 3-line icon animates to X (cubic-bezier spring)
- ✅ Smart positioning from button bounding rect
- ✅ Click-outside detection via useDropdownBehavior
- ✅ ESC key to close, focus management
- ✅ Touch-safe, mobile-optimized (240px width)

---

## Integration Steps

1. Copy `useDropdownBehavior.ts` from TicTacToe
2. Create `HamburgerMenu.tsx` component
3. Create or adapt toggle atoms
4. Integrate into game board header
5. Wire up context providers
6. Test on all devices

---

## Checklist

- [ ] Copy useDropdownBehavior hook
- [ ] Create HamburgerMenu component
- [ ] Create HamburgerMenu.module.css
- [ ] Create game-specific toggle atoms
- [ ] Integrate into game board
- [ ] Test keyboard navigation
- [ ] Test click-outside dismissal
- [ ] Test accessibility

---

## References

- **AGENTS.md § 13**: Menu & Settings Architecture Governance
- **TicTacToe**: Reference implementation
- All specifications apply uniformly across the game ecosystem.
