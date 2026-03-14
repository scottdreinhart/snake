/**
 * Game constants — magic numbers & config extracted to a single source of truth.
 */

import type { BoardConfig, Difficulty, GameMode, GameStats, ModeConfig, Vec2 } from './types'

// ─── Timing ─────────────────────────────────────────────────

export const CPU_DELAY_MS = 400

/** Base tick speed per difficulty (ms per tick) */
export const SPEED_BY_DIFFICULTY: Readonly<Record<Difficulty, number>> = {
  easy: 160,
  normal: 120,
  hard: 85,
}

/** Min speed cap (fastest possible tick) */
export const MIN_TICK_MS = 50

/** Speed decrease per food eaten (ms) */
export const SPEED_INCREMENT = 2

// ─── Board Presets ──────────────────────────────────────────

export const BOARD_SIZES: readonly BoardConfig[] = [
  { width: 15, height: 15, wrapMode: false },
  { width: 20, height: 20, wrapMode: false },
  { width: 25, height: 25, wrapMode: false },
  { width: 30, height: 30, wrapMode: false },
]

export const DEFAULT_BOARD: BoardConfig = { width: 20, height: 20, wrapMode: false }

// ─── Mode Configs ───────────────────────────────────────────

export const MODE_CONFIGS: Readonly<Record<GameMode, ModeConfig>> = {
  classic: {
    mode: 'classic',
    growOnEat: true,
    trailIsFatal: true,
    wallIsFatal: true,
    foodEnabled: true,
    powerUpsEnabled: false,
    speedIncrease: true,
    aiCount: 0,
  },
  tron: {
    mode: 'tron',
    growOnEat: false,
    trailIsFatal: true,
    wallIsFatal: true,
    foodEnabled: false,
    powerUpsEnabled: false,
    speedIncrease: false,
    aiCount: 1,
  },
  hybrid: {
    mode: 'hybrid',
    growOnEat: true,
    trailIsFatal: true,
    wallIsFatal: true,
    foodEnabled: true,
    powerUpsEnabled: true,
    speedIncrease: true,
    aiCount: 1,
  },
}

// ─── Power-up Durations (ticks) ─────────────────────────────

export const SHIELD_DURATION = 30
export const PHASE_DURATION = 20
export const BOOST_DURATION = 25
export const BOOST_SPEED_FACTOR = 0.6

// ─── Pickup Spawn ───────────────────────────────────────────

export const FOOD_SPAWN_INTERVAL = 1 // always one food on board
export const POWERUP_SPAWN_CHANCE = 0.08 // per tick when no power-up exists
export const POWERUP_LIFETIME = 60 // ticks before despawn

// ─── Growth ─────────────────────────────────────────────────

export const GROWTH_PER_FOOD = 1

// ─── AI ─────────────────────────────────────────────────────

export const AI_REACTION_DELAY: Readonly<Record<Difficulty, number>> = {
  easy: 3, // ticks of delayed reaction
  normal: 1,
  hard: 0,
}

export const AI_MISTAKE_RATE: Readonly<Record<Difficulty, number>> = {
  easy: 0.15,
  normal: 0.05,
  hard: 0.01,
}

// ─── Tron ───────────────────────────────────────────────────

export const TRON_ROUNDS_TO_WIN = 3

// ─── Directions ─────────────────────────────────────────────

export const DIRECTION_VECTORS: Readonly<Record<string, Vec2>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

export const OPPOSITE_DIRECTION: Readonly<Record<string, string>> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

// ─── Starting Positions ─────────────────────────────────────

export function getStartPositions(
  board: BoardConfig,
  count: number,
): readonly { pos: Vec2; direction: 'up' | 'down' | 'left' | 'right' }[] {
  const cx = Math.floor(board.width / 2)
  const cy = Math.floor(board.height / 2)
  const starts: { pos: Vec2; direction: 'up' | 'down' | 'left' | 'right' }[] = []

  if (count >= 1) {
    starts.push({ pos: { x: cx, y: cy + 3 }, direction: 'up' })
  }
  if (count >= 2) {
    starts.push({ pos: { x: cx, y: cy - 3 }, direction: 'down' })
  }
  if (count >= 3) {
    starts.push({ pos: { x: cx - 5, y: cy }, direction: 'right' })
  }
  if (count >= 4) {
    starts.push({ pos: { x: cx + 5, y: cy }, direction: 'left' })
  }

  return starts
}

// ─── Stats ──────────────────────────────────────────────────

export const DEFAULT_STATS: GameStats = {
  wins: 0,
  losses: 0,
  streak: 0,
  bestStreak: 0,
}

// ─── Display Labels ─────────────────────────────────────────

export const MODE_LABELS: Readonly<Record<GameMode, string>> = {
  classic: 'Classic Snake',
  tron: 'Tron Light Cycle',
  hybrid: 'Hybrid',
}

export const DIFFICULTY_LABELS: Readonly<Record<Difficulty, string>> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
}
