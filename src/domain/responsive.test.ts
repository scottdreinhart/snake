import { describe, expect, it } from 'vitest'
import {
  HEIGHT_THRESHOLDS,
  RESPONSIVE_BREAKPOINTS,
  deriveBreakpointFlags,
  deriveContentDensity,
  deriveDeviceCategory,
  deriveDialogMode,
  deriveGridColumns,
  deriveInteractionMode,
  deriveNavMode,
  deriveResponsiveState,
} from './responsive'
import type { ResponsiveCapabilities } from './responsive'

// ─── Helpers ────────────────────────────────────────────────

/** Default desktop capabilities for partial override. */
const desktop: ResponsiveCapabilities = {
  width: 1440,
  height: 900,
  isPortrait: false,
  isLandscape: true,
  supportsHover: true,
  hasCoarsePointer: false,
  hasFinePointer: true,
  prefersReducedMotion: false,
  prefersDarkColorScheme: false,
}

function caps(overrides: Partial<ResponsiveCapabilities>): ResponsiveCapabilities {
  return { ...desktop, ...overrides }
}

// ─── deriveBreakpointFlags ──────────────────────────────────

describe('deriveBreakpointFlags', () => {
  it('returns isXs for widths below sm', () => {
    const flags = deriveBreakpointFlags(320)
    expect(flags.isXs).toBe(true)
    expect(flags.isSm).toBe(false)
  })

  it('returns isSm at exactly sm breakpoint', () => {
    const flags = deriveBreakpointFlags(RESPONSIVE_BREAKPOINTS.sm)
    expect(flags.isSm).toBe(true)
    expect(flags.isXs).toBe(false)
    expect(flags.isMd).toBe(false)
  })

  it('returns isMd for md-range width', () => {
    const flags = deriveBreakpointFlags(768)
    expect(flags.isMd).toBe(true)
  })

  it('returns isLg for lg-range width', () => {
    const flags = deriveBreakpointFlags(1024)
    expect(flags.isLg).toBe(true)
  })

  it('returns isXl for xl-range width', () => {
    const flags = deriveBreakpointFlags(1440)
    expect(flags.isXl).toBe(true)
  })

  it('returns isXxl for ultrawide', () => {
    const flags = deriveBreakpointFlags(2560)
    expect(flags.isXxl).toBe(true)
    expect(flags.isXl).toBe(false)
  })

  it('exactly one breakpoint is true at boundary values', () => {
    for (const bp of [0, 375, 600, 900, 1200, 1800]) {
      const flags = deriveBreakpointFlags(bp)
      const trueCount = Object.values(flags).filter(Boolean).length
      expect(trueCount).toBe(1)
    }
  })

  it('is isSm at sm - 1 boundary (top of xs)', () => {
    const flags = deriveBreakpointFlags(RESPONSIVE_BREAKPOINTS.sm - 1)
    expect(flags.isXs).toBe(true)
  })
})

// ─── deriveDeviceCategory ───────────────────────────────────

describe('deriveDeviceCategory', () => {
  it('classifies small width as mobile', () => {
    expect(deriveDeviceCategory(375).isMobile).toBe(true)
    expect(deriveDeviceCategory(375).isTablet).toBe(false)
    expect(deriveDeviceCategory(375).isDesktop).toBe(false)
  })

  it('classifies md-range width as tablet', () => {
    expect(deriveDeviceCategory(768).isTablet).toBe(true)
    expect(deriveDeviceCategory(768).isMobile).toBe(false)
    expect(deriveDeviceCategory(768).isDesktop).toBe(false)
  })

  it('classifies lg+ as desktop', () => {
    expect(deriveDeviceCategory(1200).isDesktop).toBe(true)
    expect(deriveDeviceCategory(1200).isMobile).toBe(false)
  })

  it('classifies exactly md as tablet', () => {
    expect(deriveDeviceCategory(RESPONSIVE_BREAKPOINTS.md).isTablet).toBe(true)
  })

  it('classifies exactly lg as desktop', () => {
    expect(deriveDeviceCategory(RESPONSIVE_BREAKPOINTS.lg).isDesktop).toBe(true)
  })
})

// ─── deriveNavMode ──────────────────────────────────────────

describe('deriveNavMode', () => {
  it('returns bottom-tabs for mobile widths', () => {
    expect(deriveNavMode(375, false)).toBe('bottom-tabs')
    expect(deriveNavMode(375, true)).toBe('bottom-tabs')
  })

  it('returns drawer for tablet widths', () => {
    expect(deriveNavMode(768, false)).toBe('drawer')
  })

  it('returns drawer for desktop width with coarse pointer', () => {
    expect(deriveNavMode(1200, true)).toBe('drawer')
  })

  it('returns sidebar for desktop width with fine pointer', () => {
    expect(deriveNavMode(1200, false)).toBe('sidebar')
  })

  it('returns bottom-tabs below md', () => {
    expect(deriveNavMode(RESPONSIVE_BREAKPOINTS.md - 1, false)).toBe('bottom-tabs')
  })

  it('returns drawer at exactly md', () => {
    expect(deriveNavMode(RESPONSIVE_BREAKPOINTS.md, false)).toBe('drawer')
  })
})

// ─── deriveContentDensity ───────────────────────────────────

describe('deriveContentDensity', () => {
  it('returns compact for narrow viewport', () => {
    expect(deriveContentDensity(375, 800)).toBe('compact')
  })

  it('returns compact for short viewport', () => {
    expect(deriveContentDensity(1200, 400)).toBe('compact')
  })

  it('returns comfortable for mid-range viewport', () => {
    expect(deriveContentDensity(900, 700)).toBe('comfortable')
  })

  it('returns spacious for wide desktop', () => {
    expect(deriveContentDensity(1440, 900)).toBe('spacious')
  })

  it('compact threshold at height boundary', () => {
    expect(deriveContentDensity(1200, HEIGHT_THRESHOLDS.short - 1)).toBe('compact')
    expect(deriveContentDensity(1200, HEIGHT_THRESHOLDS.short)).toBe('spacious')
  })
})

// ─── deriveDialogMode ───────────────────────────────────────

describe('deriveDialogMode', () => {
  it('returns fullscreen for mobile', () => {
    expect(deriveDialogMode(375, 800)).toBe('fullscreen')
  })

  it('returns fullscreen for short viewport', () => {
    expect(deriveDialogMode(1200, 400)).toBe('fullscreen')
  })

  it('returns bottom-sheet for tablet', () => {
    expect(deriveDialogMode(768, 1024)).toBe('bottom-sheet')
  })

  it('returns centered-modal for desktop', () => {
    expect(deriveDialogMode(1200, 900)).toBe('centered-modal')
  })

  it('boundary: below md → fullscreen', () => {
    expect(deriveDialogMode(RESPONSIVE_BREAKPOINTS.md - 1, 800)).toBe('fullscreen')
  })

  it('boundary: at md → bottom-sheet', () => {
    expect(deriveDialogMode(RESPONSIVE_BREAKPOINTS.md, 800)).toBe('bottom-sheet')
  })

  it('boundary: at lg → centered-modal', () => {
    expect(deriveDialogMode(RESPONSIVE_BREAKPOINTS.lg, 800)).toBe('centered-modal')
  })
})

// ─── deriveInteractionMode ──────────────────────────────────

describe('deriveInteractionMode', () => {
  it('pure touch: coarse, no fine, no hover', () => {
    expect(deriveInteractionMode(false, true, false)).toBe('touch')
  })

  it('pure pointer: fine, hover, no coarse', () => {
    expect(deriveInteractionMode(true, false, true)).toBe('pointer-precise')
  })

  it('hybrid: coarse + hover', () => {
    expect(deriveInteractionMode(true, true, false)).toBe('hybrid')
  })

  it('hybrid: coarse + fine', () => {
    expect(deriveInteractionMode(false, true, true)).toBe('hybrid')
  })

  it('hybrid: all capabilities', () => {
    expect(deriveInteractionMode(true, true, true)).toBe('hybrid')
  })

  it('hybrid: none (edge case)', () => {
    expect(deriveInteractionMode(false, false, false)).toBe('hybrid')
  })
})

// ─── deriveGridColumns ──────────────────────────────────────

describe('deriveGridColumns', () => {
  it('1 column for xs', () => {
    expect(deriveGridColumns(320)).toBe(1)
  })

  it('1 column for sm', () => {
    expect(deriveGridColumns(400)).toBe(1)
  })

  it('2 columns for md', () => {
    expect(deriveGridColumns(768)).toBe(2)
  })

  it('3 columns for lg', () => {
    expect(deriveGridColumns(1024)).toBe(3)
  })

  it('4 columns for xl+', () => {
    expect(deriveGridColumns(1440)).toBe(4)
    expect(deriveGridColumns(2560)).toBe(4)
  })
})

// ─── deriveResponsiveState (integration) ────────────────────

describe('deriveResponsiveState', () => {
  it('small portrait phone', () => {
    const state = deriveResponsiveState(
      caps({ width: 320, height: 568, isPortrait: true, isLandscape: false }),
    )
    expect(state.isXs).toBe(true)
    expect(state.isMobile).toBe(true)
    expect(state.compactViewport).toBe(true)
    expect(state.navMode).toBe('bottom-tabs')
    expect(state.contentDensity).toBe('compact')
    expect(state.dialogMode).toBe('fullscreen')
    expect(state.fullscreenDialogPreferred).toBe(true)
    expect(state.gridColumns).toBe(1)
  })

  it('normal phone', () => {
    const state = deriveResponsiveState(
      caps({ width: 375, height: 812, isPortrait: true, isLandscape: false }),
    )
    expect(state.isSm).toBe(true)
    expect(state.isMobile).toBe(true)
    expect(state.compactViewport).toBe(true)
    expect(state.navMode).toBe('bottom-tabs')
  })

  it('phone landscape (short + narrow landscape)', () => {
    const state = deriveResponsiveState(
      caps({
        width: 568,
        height: 320,
        isPortrait: false,
        isLandscape: true,
        hasCoarsePointer: true,
        hasFinePointer: false,
        supportsHover: false,
      }),
    )
    expect(state.isSm).toBe(true)
    expect(state.isMobile).toBe(true)
    expect(state.shortViewport).toBe(true)
    expect(state.compactViewport).toBe(true)
    expect(state.touchOptimized).toBe(true)
    expect(state.interactionMode).toBe('touch')
  })

  it('tablet portrait', () => {
    const state = deriveResponsiveState(
      caps({
        width: 768,
        height: 1024,
        isPortrait: true,
        isLandscape: false,
        hasCoarsePointer: true,
        hasFinePointer: false,
        supportsHover: false,
      }),
    )
    expect(state.isMd).toBe(true)
    expect(state.isTablet).toBe(true)
    expect(state.compactViewport).toBe(false)
    expect(state.touchOptimized).toBe(true)
    expect(state.navMode).toBe('drawer')
    expect(state.dialogMode).toBe('bottom-sheet')
  })

  it('tablet landscape no hover', () => {
    const state = deriveResponsiveState(
      caps({
        width: 1024,
        height: 768,
        isPortrait: false,
        isLandscape: true,
        hasCoarsePointer: true,
        hasFinePointer: false,
        supportsHover: false,
      }),
    )
    expect(state.isLg).toBe(true)
    expect(state.isDesktop).toBe(true)
    expect(state.touchOptimized).toBe(true)
    expect(state.denseLayoutAllowed).toBe(false)
    expect(state.navMode).toBe('drawer')
    expect(state.interactionMode).toBe('touch')
  })

  it('narrow desktop browser window', () => {
    const state = deriveResponsiveState(
      caps({ width: 900, height: 700 }),
    )
    expect(state.isLg).toBe(true)
    expect(state.isDesktop).toBe(true)
    expect(state.navMode).toBe('sidebar')
    expect(state.contentDensity).toBe('comfortable')
    expect(state.dialogMode).toBe('centered-modal')
  })

  it('standard desktop', () => {
    const state = deriveResponsiveState(caps({}))
    expect(state.isXl).toBe(true)
    expect(state.isDesktop).toBe(true)
    expect(state.wideViewport).toBe(true)
    expect(state.ultrawideViewport).toBe(false)
    expect(state.denseLayoutAllowed).toBe(true)
    expect(state.navMode).toBe('sidebar')
    expect(state.contentDensity).toBe('spacious')
    expect(state.dialogMode).toBe('centered-modal')
    expect(state.interactionMode).toBe('pointer-precise')
  })

  it('ultrawide display', () => {
    const state = deriveResponsiveState(
      caps({ width: 2560, height: 1080 }),
    )
    expect(state.isXxl).toBe(true)
    expect(state.ultrawideViewport).toBe(true)
    expect(state.wideViewport).toBe(true)
    expect(state.gridColumns).toBe(4)
  })

  it('short-height laptop viewport', () => {
    const state = deriveResponsiveState(
      caps({ width: 1200, height: 400 }),
    )
    expect(state.shortViewport).toBe(true)
    expect(state.compactViewport).toBe(true)
    expect(state.contentDensity).toBe('compact')
    expect(state.dialogMode).toBe('fullscreen')
    expect(state.fullscreenDialogPreferred).toBe(true)
  })

  it('coarse pointer on large viewport', () => {
    const state = deriveResponsiveState(
      caps({
        width: 1200,
        height: 800,
        hasCoarsePointer: true,
        hasFinePointer: false,
        supportsHover: false,
      }),
    )
    expect(state.isDesktop).toBe(true)
    expect(state.touchOptimized).toBe(true)
    expect(state.denseLayoutAllowed).toBe(false)
    expect(state.navMode).toBe('drawer')
    expect(state.interactionMode).toBe('touch')
  })

  it('reduced motion enabled', () => {
    const state = deriveResponsiveState(
      caps({ prefersReducedMotion: true }),
    )
    expect(state.prefersReducedMotion).toBe(true)
  })

  it('wide width + coarse pointer (convertible laptop)', () => {
    const state = deriveResponsiveState(
      caps({
        width: 1400,
        height: 900,
        hasCoarsePointer: true,
        hasFinePointer: true,
        supportsHover: true,
      }),
    )
    expect(state.interactionMode).toBe('hybrid')
    expect(state.navMode).toBe('drawer')
    expect(state.touchOptimized).toBe(false)
  })

  it('passes through raw capability values', () => {
    const input = caps({ width: 800, height: 600, isPortrait: true })
    const state = deriveResponsiveState(input)
    expect(state.width).toBe(800)
    expect(state.height).toBe(600)
    expect(state.isPortrait).toBe(true)
    expect(state.supportsHover).toBe(true)
  })

  it('no contradictory breakpoint flags', () => {
    const widths = [0, 200, 375, 599, 600, 899, 900, 1199, 1200, 1799, 1800, 2560]
    for (const w of widths) {
      const state = deriveResponsiveState(caps({ width: w }))
      const bpFlags = [state.isXs, state.isSm, state.isMd, state.isLg, state.isXl, state.isXxl]
      const trueCount = bpFlags.filter(Boolean).length
      expect(trueCount).toBe(1)
    }
  })

  it('no contradictory device category flags', () => {
    const widths = [0, 375, 600, 900, 1200, 2560]
    for (const w of widths) {
      const state = deriveResponsiveState(caps({ width: w }))
      const catFlags = [state.isMobile, state.isTablet, state.isDesktop]
      const trueCount = catFlags.filter(Boolean).length
      expect(trueCount).toBe(1)
    }
  })
})
