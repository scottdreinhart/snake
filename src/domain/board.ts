/**
 * Board operations — pure functions for creating and manipulating game state.
 * No React, no DOM — purely functional transformations.
 */

import {
  DEFAULT_BOARD,
  DIRECTION_VECTORS,
  getStartPositions,
  MODE_CONFIGS,
  POWERUP_LIFETIME,
  SPEED_BY_DIFFICULTY,
} from './constants'
import type {
  BoardConfig,
  Difficulty,
  GameMode,
  GameState,
  Pickup,
  PickupKind,
  PlayerEntity,
  RunState,
  Vec2,
} from './types'

// ─── Helpers ────────────────────────────────────────────────

export const posKey = (p: Vec2): string => `${p.x},${p.y}`

export const posEqual = (a: Vec2, b: Vec2): boolean => a.x === b.x && a.y === b.y

export function addVec(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function wrapPos(pos: Vec2, board: BoardConfig): Vec2 {
  return {
    x: ((pos.x % board.width) + board.width) % board.width,
    y: ((pos.y % board.height) + board.height) % board.height,
  }
}

export function isInBounds(pos: Vec2, board: BoardConfig): boolean {
  return pos.x >= 0 && pos.x < board.width && pos.y >= 0 && pos.y < board.height
}

// ─── Entity Creation ────────────────────────────────────────

export function createPlayer(
  id: string,
  pos: Vec2,
  direction: 'up' | 'down' | 'left' | 'right',
  isAI: boolean,
  initialLength: number = 3,
): PlayerEntity {
  const tailDir =
    DIRECTION_VECTORS[
      direction === 'up'
        ? 'down'
        : direction === 'down'
          ? 'up'
          : direction === 'left'
            ? 'right'
            : 'left'
    ]
  const segments: Vec2[] = []
  for (let i = 0; i < initialLength; i++) {
    segments.push({ x: pos.x + tailDir.x * i, y: pos.y + tailDir.y * i })
  }
  return {
    id,
    segments,
    direction,
    directionQueue: [],
    alive: true,
    score: 0,
    shield: 0,
    phase: 0,
    boost: 0,
    isAI,
  }
}

// ─── Trail Building ────────────────────────────────────────

export function buildTrailSet(players: readonly PlayerEntity[]): ReadonlySet<string> {
  const set = new Set<string>()
  for (const p of players) {
    // all segments except head are trail
    for (let i = 1; i < p.segments.length; i++) {
      set.add(posKey(p.segments[i]))
    }
  }
  return set
}

// ─── Random Position ────────────────────────────────────────

export function randomFreePos(
  board: BoardConfig,
  occupied: ReadonlySet<string>,
  rng: () => number = Math.random,
): Vec2 | null {
  const totalCells = board.width * board.height
  if (occupied.size >= totalCells) {
    return null
  }

  // Try random placement up to 100 times, then fallback to scan
  for (let i = 0; i < 100; i++) {
    const pos: Vec2 = {
      x: Math.floor(rng() * board.width),
      y: Math.floor(rng() * board.height),
    }
    if (!occupied.has(posKey(pos))) {
      return pos
    }
  }

  // Exhaustive fallback
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const pos: Vec2 = { x, y }
      if (!occupied.has(posKey(pos))) {
        return pos
      }
    }
  }
  return null
}

// ─── Pickup Spawning ────────────────────────────────────────

export function spawnPickup(
  kind: PickupKind,
  board: BoardConfig,
  occupied: ReadonlySet<string>,
  lifetime: number = 0,
): Pickup | null {
  const pos = randomFreePos(board, occupied)
  if (!pos) {
    return null
  }
  return { pos, kind, ticksRemaining: lifetime }
}

// ─── Occupied cells for spawning ────────────────────────────

export function getOccupiedSet(run: RunState): ReadonlySet<string> {
  const set = new Set<string>(run.trails)
  for (const p of run.players) {
    for (const seg of p.segments) {
      set.add(posKey(seg))
    }
  }
  for (const pk of run.pickups) {
    set.add(posKey(pk.pos))
  }
  return set
}

// ─── Initial Run State ──────────────────────────────────────

export function createRunState(
  mode: GameMode,
  difficulty: Difficulty,
  board: BoardConfig,
): RunState {
  const config = MODE_CONFIGS[mode]
  const totalPlayers = 1 + config.aiCount
  const starts = getStartPositions(board, totalPlayers)
  const players: PlayerEntity[] = []

  for (let i = 0; i < totalPlayers; i++) {
    const start = starts[i]
    players.push(
      createPlayer(
        i === 0 ? 'player' : `ai-${i}`,
        start.pos,
        start.direction,
        i > 0,
        mode === 'tron' ? 1 : 3,
      ),
    )
  }

  const speed = SPEED_BY_DIFFICULTY[difficulty]
  const run: RunState = {
    tick: 0,
    players,
    pickups: [],
    trails: buildTrailSet(players),
    speed,
    baseSpeed: speed,
    outcome: null,
  }

  // Spawn initial food if enabled
  if (config.foodEnabled) {
    const occupied = getOccupiedSet(run)
    const food = spawnPickup('food', board, occupied)
    if (food) {
      return { ...run, pickups: [food] }
    }
  }

  return run
}

// ─── Initial Game State ─────────────────────────────────────

export function createInitialGameState(): GameState {
  return {
    phase: 'boot',
    mode: 'hybrid',
    difficulty: 'normal',
    board: DEFAULT_BOARD,
    modeConfig: MODE_CONFIGS.hybrid,
    run: null,
    bestScores: { classic: 0, tron: 0, hybrid: 0 },
    soundEnabled: true,
    round: 0,
    roundWins: {},
  }
}

// ─── Pickup Tick (decrement timers, remove expired) ─────────

export function tickPickups(pickups: readonly Pickup[]): readonly Pickup[] {
  return pickups
    .map((p) => (p.ticksRemaining > 0 ? { ...p, ticksRemaining: p.ticksRemaining - 1 } : p))
    .filter((p) => p.ticksRemaining !== 0 || p.kind === 'food')
}

// ─── Maybe spawn a power-up ────────────────────────────────

export function maybeSpawnPowerUp(run: RunState, board: BoardConfig, chance: number): RunState {
  const hasPowerUp = run.pickups.some((p) => p.kind !== 'food')
  if (hasPowerUp) {
    return run
  }

  if (Math.random() >= chance) {
    return run
  }

  const kinds: PickupKind[] = ['shield', 'phase', 'boost']
  const kind = kinds[Math.floor(Math.random() * kinds.length)]
  const occupied = getOccupiedSet(run)
  const pickup = spawnPickup(kind, board, occupied, POWERUP_LIFETIME)
  if (!pickup) {
    return run
  }

  return { ...run, pickups: [...run.pickups, pickup] }
}
