/**
 * Application layer barrel export.
 * Re-exports all React hooks and services.
 *
 * Usage: import { useGame, useSoundEffects } from '@/app'
 */

export * from './aiService'
export * from './haptics'
export * from './crashLogger'
export { SoundProvider, useSoundContext } from './SoundContext'
export * from './storageService'
export { ThemeProvider, useThemeContext } from './ThemeContext'
export { useGame } from './useGame'
export { useOnlineStatus } from './useOnlineStatus'
export { useSoundEffects } from './useSoundEffects'
export { useStats } from './useStats'
export { useSwipe } from './useSwipe'
export { useMediaQuery } from './useMediaQuery'
export { useWindowSize } from './useWindowSize'
export type { WindowSize } from './useWindowSize'
export { useResponsiveState } from './useResponsiveState'
export { useKeyboardControls } from './useKeyboardControls'
export { useDeviceInfo } from './useDeviceInfo'
export { useAppScreens } from './useAppScreens'
export { useServiceLoader } from './useServiceLoader'

// ── Governance: Web Vitals & Performance Monitoring ──
export { usePerformanceMetrics, logWebVitals } from './usePerformanceMetrics'
