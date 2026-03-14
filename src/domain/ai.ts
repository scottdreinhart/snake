/**
 * AI move selection — CPU player logic.
 * Pure functions: given a board state, return the best move.
 *
 * Strategy by difficulty:
 * - Easy: random valid move, occasional mistakes
 * - Normal: prefer safe moves, pursue food opportunistically
 * - Hard: flood-fill space evaluation, food pursuit, trapping
 */

import { addVec, isInBounds, posKey, wrapPos } from './board'
import {
  AI_MISTAKE_RATE,
  AI_REACTION_DELAY,
  DIRECTION_VECTORS,
  OPPOSITE_DIRECTION,
} from './constants'
import type {
  BoardConfig,
  Difficulty,
  Direction,
  ModeConfig,
  Pickup,
  PlayerEntity,
  RunState,
  Vec2,
} from './types'

// ─── Types ──────────────────────────────────────────────────

const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right']

interface MoveCandidate {
  direction: Direction
  pos: Vec2
  safe: boolean
  foodDist: number
  space: number
}

// ─── Danger Check ───────────────────────────────────────────

function isCellDangerous(
  pos: Vec2,
  board: BoardConfig,
  config: ModeConfig,
  occupied: ReadonlySet<string>,
): boolean {
  if (config.wallIsFatal && !board.wrapMode && !isInBounds(pos, board)) {
    return true
  }
  return occupied.has(posKey(pos))
}

function getOccupied(
  run: RunState,
  board: BoardConfig,
  selfId?: string,
): ReadonlySet<string> {
  const set = new Set<string>(run.trails)
  for (const p of run.players) {
    for (const seg of p.segments) {
      set.add(posKey(seg))
    }
    // Mark opponent's likely next head positions as occupied so the AI
    // avoids head-on collisions and doesn't run into the opponent's path.
    if (selfId && p.id !== selfId && p.alive) {
      const head = p.segments[0]
      const dir = p.directionQueue.length > 0 ? p.directionQueue[0] : p.direction
      for (const d of DIRECTIONS) {
        if (d === (OPPOSITE_DIRECTION[dir] as Direction)) {
          continue
        }
        const delta = DIRECTION_VECTORS[d]
        let next = addVec(head, delta)
        if (board.wrapMode) {
          next = wrapPos(next, board)
        }
        set.add(posKey(next))
      }
    }
  }
  return set
}

// ─── Manhattan Distance ─────────────────────────────────────

function manhattan(a: Vec2, b: Vec2): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

// ─── Flood Fill (space evaluation) ──────────────────────────

function floodFill(
  start: Vec2,
  board: BoardConfig,
  occupied: ReadonlySet<string>,
  maxDepth: number = 50,
): number {
  const visited = new Set<string>()
  const queue: Vec2[] = [start]
  visited.add(posKey(start))
  let count = 0

  while (queue.length > 0 && count < maxDepth) {
    const current = queue.shift()!
    count++

    for (const dir of DIRECTIONS) {
      const delta = DIRECTION_VECTORS[dir]
      let next: Vec2 = addVec(current, delta)
      if (board.wrapMode) {
        next = wrapPos(next, board)
      }

      const key = posKey(next)
      if (visited.has(key)) {
        continue
      }
      if (!isInBounds(next, board)) {
        continue
      }
      if (occupied.has(key)) {
        continue
      }

      visited.add(key)
      queue.push(next)
    }
  }

  return count
}

// ─── Nearest Food Distance ──────────────────────────────────

function nearestFoodDist(pos: Vec2, pickups: readonly Pickup[]): number {
  const foods = pickups.filter((p) => p.kind === 'food')
  if (foods.length === 0) {
    return Infinity
  }
  return Math.min(...foods.map((f) => manhattan(pos, f.pos)))
}

// ─── AI Decision ────────────────────────────────────────────

export function computeAIMove(
  player: PlayerEntity,
  run: RunState,
  board: BoardConfig,
  config: ModeConfig,
  difficulty: Difficulty,
): Direction {
  const head = player.segments[0]
  const occupied = getOccupied(run, board, player.id)
  const currentDir = player.direction
  const opposite = OPPOSITE_DIRECTION[currentDir] as Direction

  // Evaluate candidates
  const candidates: MoveCandidate[] = DIRECTIONS.filter((d) => d !== opposite).map((direction) => {
    const delta = DIRECTION_VECTORS[direction]
    let pos = addVec(head, delta)
    if (board.wrapMode) {
      pos = wrapPos(pos, board)
    }

    const safe = !isCellDangerous(pos, board, config, occupied)
    const foodDist = nearestFoodDist(pos, run.pickups)
    const space = safe ? floodFill(pos, board, occupied, difficulty === 'hard' ? 80 : 30) : 0

    return { direction, pos, safe, foodDist, space }
  })

  const safeMoves = candidates.filter((c) => c.safe)

  // Delayed reaction for easy mode
  if (difficulty === 'easy' && run.tick % (AI_REACTION_DELAY.easy + 1) !== 0) {
    return currentDir
  }

  // Random mistake
  if (Math.random() < AI_MISTAKE_RATE[difficulty]) {
    const validMoves = candidates.filter((c) => c.direction !== opposite)
    if (validMoves.length > 0) {
      return validMoves[Math.floor(Math.random() * validMoves.length)].direction
    }
  }

  if (safeMoves.length === 0) {
    // No safe move — pick any non-opposite
    return candidates.length > 0 ? candidates[0].direction : currentDir
  }

  // Hard: prefer most open space, break ties with food distance
  if (difficulty === 'hard') {
    safeMoves.sort((a, b) => {
      const spaceDiff = b.space - a.space
      if (Math.abs(spaceDiff) > 3) {
        return spaceDiff
      }
      return a.foodDist - b.foodDist
    })
    return safeMoves[0].direction
  }

  // Normal: prefer food, then space
  if (difficulty === 'normal') {
    safeMoves.sort((a, b) => {
      if (a.foodDist !== b.foodDist) {
        return a.foodDist - b.foodDist
      }
      return b.space - a.space
    })
    return safeMoves[0].direction
  }

  // Easy: random safe move
  return safeMoves[Math.floor(Math.random() * safeMoves.length)].direction
}

// ─── Apply AI Moves to Run State ────────────────────────────

export function applyAIMoves(
  run: RunState,
  board: BoardConfig,
  config: ModeConfig,
  difficulty: Difficulty,
): RunState {
  const updatedPlayers = run.players.map((p) => {
    if (!p.isAI || !p.alive) {
      return p
    }
    const dir = computeAIMove(p, run, board, config, difficulty)
    return {
      ...p,
      directionQueue: [dir],
    }
  })

  return { ...run, players: updatedPlayers }
}
