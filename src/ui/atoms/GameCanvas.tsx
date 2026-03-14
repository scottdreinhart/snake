/**
 * GameCanvas — renders the game board using HTML5 Canvas for performance.
 * Pure rendering component — all state comes via props.
 */

import type { BoardConfig, Pickup, PlayerEntity, Vec2 } from '@/domain/types'
import { useEffect, useRef } from 'react'

interface GameCanvasProps {
  board: BoardConfig
  players: readonly PlayerEntity[]
  pickups: readonly Pickup[]
  trails: ReadonlySet<string>
  cellSize: number
}

const COLORS = {
  background: 'var(--board-bg, #111)',
  grid: 'var(--board-grid, rgba(255,255,255,0.04))',
  wall: 'var(--board-wall, rgba(255,255,255,0.15))',
  playerHead: 'var(--player-head, #00ff88)',
  playerBody: 'var(--player-body, #00cc66)',
  playerTrail: 'var(--player-trail, rgba(0,255,136,0.25))',
  aiHead: 'var(--ai-head, #ff4488)',
  aiBody: 'var(--ai-body, #cc3366)',
  aiTrail: 'var(--ai-trail, rgba(255,68,136,0.25))',
  food: 'var(--pickup-food, #ffcc00)',
  shield: 'var(--pickup-shield, #00bbff)',
  phase: 'var(--pickup-phase, #aa66ff)',
  boost: 'var(--pickup-boost, #ff6600)',
  deadPlayer: 'var(--dead-player, #555)',
}

function resolveColor(el: HTMLCanvasElement, cssVar: string): string {
  const style = getComputedStyle(el)
  const match = cssVar.match(/var\(([^,)]+)(?:,\s*([^)]+))?\)/)
  if (!match) {
    return cssVar
  }
  const resolved = style.getPropertyValue(match[1]).trim()
  return resolved || match[2] || cssVar
}

export function GameCanvas({ board, players, pickups, trails, cellSize }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const colorsRef = useRef<Record<string, string>>({})
  const gridCacheRef = useRef<{ canvas: OffscreenCanvas; key: string } | null>(null)
  // Resolve CSS custom properties (re-resolve on theme change via MutationObserver)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const resolve = () => {
      const resolved: Record<string, string> = {}
      for (const [key, val] of Object.entries(COLORS)) {
        resolved[key] = resolveColor(canvas, val)
      }
      colorsRef.current = resolved
      // Invalidate grid cache on theme change
      gridCacheRef.current = null
    }
    resolve()
    let debounceTimer: ReturnType<typeof setTimeout>
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(resolve, 16)
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => {
      clearTimeout(debounceTimer)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    const c = colorsRef.current
    const w = board.width * cellSize
    const h = board.height * cellSize
    canvas.width = w
    canvas.height = h

    // Build or reuse cached grid
    const gridKey = `${w}:${h}:${c.background}:${c.grid}:${c.wall}:${board.wrapMode}`
    let gridCache = gridCacheRef.current
    if (!gridCache || gridCache.key !== gridKey) {
      const offscreen = new OffscreenCanvas(w, h)
      const oc = offscreen.getContext('2d')!
      oc.fillStyle = c.background || '#111'
      oc.fillRect(0, 0, w, h)
      oc.strokeStyle = c.grid || 'rgba(255,255,255,0.04)'
      oc.lineWidth = 0.5
      for (let x = 0; x <= board.width; x++) {
        oc.beginPath()
        oc.moveTo(x * cellSize, 0)
        oc.lineTo(x * cellSize, h)
        oc.stroke()
      }
      for (let y = 0; y <= board.height; y++) {
        oc.beginPath()
        oc.moveTo(0, y * cellSize)
        oc.lineTo(w, y * cellSize)
        oc.stroke()
      }
      if (!board.wrapMode) {
        oc.strokeStyle = c.wall || 'rgba(255,255,255,0.15)'
        oc.lineWidth = 2
        oc.strokeRect(1, 1, w - 2, h - 2)
      } else {
        // Dashed border hints at wrapping
        oc.strokeStyle = c.wall || 'rgba(255,255,255,0.15)'
        oc.lineWidth = 1
        oc.setLineDash([6, 4])
        oc.strokeRect(1, 1, w - 2, h - 2)
        oc.setLineDash([])
      }
      gridCache = { canvas: offscreen, key: gridKey }
      gridCacheRef.current = gridCache
    }
    ctx.drawImage(gridCache.canvas, 0, 0)

    // Trails
    // Pre-compute which trail cells belong to AI players for O(1) lookup
    const aiCells = new Set<string>()
    for (const p of players) {
      if (p.isAI) {
        for (const seg of p.segments) {
          aiCells.add(`${seg.x},${seg.y}`)
        }
      }
    }

    for (const key of trails) {
      const [sx, sy] = key.split(',').map(Number)
      const isAI = aiCells.has(key)
      ctx.fillStyle = isAI
        ? c.aiTrail || 'rgba(255,68,136,0.25)'
        : c.playerTrail || 'rgba(0,255,136,0.25)'
      ctx.fillRect(sx * cellSize + 1, sy * cellSize + 1, cellSize - 2, cellSize - 2)
    }

    // Pickups
    for (const pk of pickups) {
      const px = pk.pos.x * cellSize
      const py = pk.pos.y * cellSize
      const colorKey = pk.kind as string
      ctx.fillStyle = c[colorKey] || '#fff'

      // Flash when about to expire (last 15 ticks)
      if (pk.ticksRemaining > 0 && pk.ticksRemaining <= 15) {
        ctx.globalAlpha = pk.ticksRemaining % 2 === 0 ? 0.3 : 1
      }

      if (pk.kind === 'food') {
        // Draw circle for food
        ctx.beginPath()
        ctx.arc(px + cellSize / 2, py + cellSize / 2, cellSize / 2 - 2, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // Draw diamond for power-ups
        const cx = px + cellSize / 2
        const cy = py + cellSize / 2
        const r = cellSize / 2 - 2
        ctx.beginPath()
        ctx.moveTo(cx, cy - r)
        ctx.lineTo(cx + r, cy)
        ctx.lineTo(cx, cy + r)
        ctx.lineTo(cx - r, cy)
        ctx.closePath()
        ctx.fill()
      }

      ctx.globalAlpha = 1
    }

    // Players
    for (const player of players) {
      const isAI = player.isAI
      const dead = !player.alive
      const headColor = dead
        ? c.deadPlayer || '#555'
        : isAI
          ? c.aiHead || '#ff4488'
          : c.playerHead || '#00ff88'
      const bodyColor = dead
        ? c.deadPlayer || '#555'
        : isAI
          ? c.aiBody || '#cc3366'
          : c.playerBody || '#00cc66'

      // Body segments (skip head)
      for (let i = player.segments.length - 1; i >= 1; i--) {
        const seg = player.segments[i]
        ctx.fillStyle = bodyColor
        ctx.fillRect(seg.x * cellSize + 1, seg.y * cellSize + 1, cellSize - 2, cellSize - 2)
      }

      // Head
      if (player.segments.length > 0) {
        const head = player.segments[0]
        ctx.fillStyle = headColor
        ctx.fillRect(head.x * cellSize, head.y * cellSize, cellSize, cellSize)

        // Direction indicator (eyes)
        if (player.alive) {
          ctx.fillStyle = '#000'
          const hx = head.x * cellSize
          const hy = head.y * cellSize
          const eyeSize = Math.max(2, cellSize / 5)
          const eyeOffset = cellSize / 4

          let e1: Vec2, e2: Vec2
          switch (player.direction) {
            case 'up':
              e1 = { x: hx + eyeOffset, y: hy + eyeOffset }
              e2 = { x: hx + cellSize - eyeOffset - eyeSize, y: hy + eyeOffset }
              break
            case 'down':
              e1 = { x: hx + eyeOffset, y: hy + cellSize - eyeOffset - eyeSize }
              e2 = {
                x: hx + cellSize - eyeOffset - eyeSize,
                y: hy + cellSize - eyeOffset - eyeSize,
              }
              break
            case 'left':
              e1 = { x: hx + eyeOffset, y: hy + eyeOffset }
              e2 = { x: hx + eyeOffset, y: hy + cellSize - eyeOffset - eyeSize }
              break
            case 'right':
              e1 = { x: hx + cellSize - eyeOffset - eyeSize, y: hy + eyeOffset }
              e2 = {
                x: hx + cellSize - eyeOffset - eyeSize,
                y: hy + cellSize - eyeOffset - eyeSize,
              }
              break
          }
          ctx.fillRect(e1.x, e1.y, eyeSize, eyeSize)
          ctx.fillRect(e2.x, e2.y, eyeSize, eyeSize)
        }

        // Shield glow (pulsing)
        if (player.shield > 0) {
          const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 150)
          ctx.strokeStyle = c.shield || '#00bbff'
          ctx.lineWidth = 2 + pulse
          ctx.globalAlpha = 0.6 + 0.4 * pulse
          ctx.strokeRect(head.x * cellSize - 1, head.y * cellSize - 1, cellSize + 2, cellSize + 2)
          ctx.globalAlpha = 1
        }

        // Phase indicator
        if (player.phase > 0) {
          ctx.globalAlpha = 0.5
          ctx.fillStyle = c.phase || '#aa66ff'
          ctx.fillRect(head.x * cellSize, head.y * cellSize, cellSize, cellSize)
          ctx.globalAlpha = 1
        }
      }
    }
  }, [board, players, pickups, trails, cellSize])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        imageRendering: 'pixelated',
        maxWidth: '100%',
        height: 'auto',
        aspectRatio: `${board.width} / ${board.height}`,
      }}
      width={board.width * cellSize}
      height={board.height * cellSize}
      aria-label="Game board"
    />
  )
}
