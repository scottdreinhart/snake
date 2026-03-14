/**
 * UI layout constants — sizes, breakpoints, timing values.
 * Breakpoint values derived from the central responsive system.
 */

import { RESPONSIVE_BREAKPOINTS } from '@/domain/responsive'

export const BREAKPOINTS = {
  sm: RESPONSIVE_BREAKPOINTS.sm,
  md: RESPONSIVE_BREAKPOINTS.md,
  lg: RESPONSIVE_BREAKPOINTS.lg,
  xl: RESPONSIVE_BREAKPOINTS.xl,
} as const
