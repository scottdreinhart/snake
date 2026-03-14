/**
 * Sound effect hooks — integrates sounds.ts with SoundContext.
 * Respects prefers-reduced-motion via SoundProvider guard.
 */

import { useCallback } from 'react'

import { useSoundContext } from './SoundContext'
import {
  playClick,
  playConfirm,
  playCrash,
  playEat,
  playLose,
  playPause,
  playPowerUp,
  playResume,
  playSelect,
  playWin,
} from './sounds'

export interface SoundEffects {
  onSelect: () => void
  onConfirm: () => void
  onEat: () => void
  onPowerUp: () => void
  onCrash: () => void
  onWin: () => void
  onLose: () => void
  onClick: () => void
  onPause: () => void
  onResume: () => void
}

export function useSoundEffects(): SoundEffects {
  const { playSound } = useSoundContext()

  return {
    onSelect: useCallback(() => playSound(playSelect), [playSound]),
    onConfirm: useCallback(() => playSound(playConfirm), [playSound]),
    onEat: useCallback(() => playSound(playEat), [playSound]),
    onPowerUp: useCallback(() => playSound(playPowerUp), [playSound]),
    onCrash: useCallback(() => playSound(playCrash), [playSound]),
    onWin: useCallback(() => playSound(playWin), [playSound]),
    onLose: useCallback(() => playSound(playLose), [playSound]),
    onClick: useCallback(() => playSound(playClick), [playSound]),
    onPause: useCallback(() => playSound(playPause), [playSound]),
    onResume: useCallback(() => playSound(playResume), [playSound]),
  }
}
