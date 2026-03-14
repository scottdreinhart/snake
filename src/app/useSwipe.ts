/**
 * useSwipe — touch/swipe gesture handler for mobile controls.
 * Detects directional swipes on the document and maps them to game directions.
 */

import type { Direction } from '@/domain/types'
import { useCallback, useEffect, useRef } from 'react'

const MIN_SWIPE_DISTANCE = 20

export function useSwipe(onSwipe: (direction: Direction) => void, enabled: boolean): void {
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const onSwipeRef = useRef(onSwipe)
  onSwipeRef.current = onSwipe

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
  }, [])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStart.current) {
      return
    }
    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStart.current.x
    const dy = touch.clientY - touchStart.current.y
    touchStart.current = null

    if (Math.abs(dx) < MIN_SWIPE_DISTANCE && Math.abs(dy) < MIN_SWIPE_DISTANCE) {
      return
    }

    e.preventDefault()

    if (Math.abs(dx) > Math.abs(dy)) {
      onSwipeRef.current(dx > 0 ? 'right' : 'left')
    } else {
      onSwipeRef.current(dy > 0 ? 'down' : 'up')
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      return
    }
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: false })
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, handleTouchStart, handleTouchEnd])
}
