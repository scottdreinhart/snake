/**
 * AI Service — manages Web Worker lifecycle and provides async AI move
 * computation.  Falls back to the synchronous JS implementation when
 * the worker or WASM is unavailable.
 */

import type { Difficulty, Direction, ModeConfig, RunState } from '@/domain/types'
import { applyAIMoves as jsApplyAIMoves } from '@/domain/ai'
import type { BoardConfig } from '@/domain/types'

// ─── Direction mapping ──────────────────────────────────────

const DIR_TO_INT: Record<string, number> = { up: 0, down: 1, left: 2, right: 3 }
const INT_TO_DIR: Direction[] = ['up', 'down', 'left', 'right']

// ─── Worker management ─────────────────────────────────────

let worker: Worker | null = null
let workerReady = false
let wasmAvailable = false
let pending: ((moves: Record<string, number>) => void) | null = null

function getWorker(): Worker | null {
  if (worker) {
    return worker
  }
  try {
    worker = new Worker(new URL('../workers/ai.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data
      if (msg.type === 'ready') {
        workerReady = true
        wasmAvailable = msg.wasm
      } else if (msg.type === 'moves' && pending) {
        const resolve = pending
        pending = null
        resolve(msg.moves)
      }
    }
    worker.onerror = () => {
      workerReady = false
      worker = null
    }
    worker.postMessage({ type: 'init' })
    return worker
  } catch {
    return null
  }
}

// ─── Serialise RunState → flat compute request ──────────────

function serialiseForWorker(
  run: RunState,
  board: BoardConfig,
  _config: ModeConfig,
  difficulty: Difficulty,
) {
  const w = board.width
  const h = board.height
  const grid = new Array<number>(w * h).fill(0)

  // Mark all occupied cells (trails + segments)
  for (const key of run.trails) {
    const [sx, sy] = key.split(',')
    const x = parseInt(sx, 10)
    const y = parseInt(sy, 10)
    if (x >= 0 && x < w && y >= 0 && y < h) {
      grid[y * w + x] = 1
    }
  }
  for (const p of run.players) {
    for (const seg of p.segments) {
      if (seg.x >= 0 && seg.x < w && seg.y >= 0 && seg.y < h) {
        grid[seg.y * w + seg.x] = 1
      }
    }
  }

  // Collect food positions
  const foods: number[] = []
  for (const pk of run.pickups) {
    if (pk.kind === 'food') {
      foods.push(pk.pos.x, pk.pos.y)
    }
  }

  // Collect AI players
  const players = run.players
    .filter((p) => p.isAI)
    .map((p) => ({
      id: p.id,
      headX: p.segments[0].x,
      headY: p.segments[0].y,
      dir: DIR_TO_INT[p.direction] ?? 0,
      alive: p.alive,
    }))

  const diffMap: Record<Difficulty, number> = { easy: 0, normal: 1, hard: 2 }

  return {
    type: 'compute' as const,
    width: w,
    height: h,
    wrapMode: board.wrapMode,
    grid,
    foods,
    players,
    difficulty: diffMap[difficulty],
    tick: run.tick,
  }
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Initialise the AI worker eagerly.  Safe to call multiple times.
 */
export function initAI(): void {
  getWorker()
}

/**
 * Returns true once the worker is ready (WASM loaded or JS fallback active).
 */
export function isAIReady(): boolean {
  return workerReady
}

/**
 * Returns true if WASM acceleration is in use.
 */
export function isWasmActive(): boolean {
  return wasmAvailable
}

/**
 * Compute AI moves asynchronously via the Web Worker.
 * Falls back to synchronous JS if the worker isn't available.
 */
export function computeAIMovesAsync(
  run: RunState,
  board: BoardConfig,
  config: ModeConfig,
  difficulty: Difficulty,
): Promise<RunState> {
  const w = getWorker()

  // Fallback: synchronous JS
  if (!w || !workerReady) {
    return Promise.resolve(jsApplyAIMoves(run, board, config, difficulty))
  }

  const req = serialiseForWorker(run, board, config, difficulty)

  return new Promise<RunState>((resolve) => {
    // Timeout: allow up to 80% of the current tick speed before falling back
    const timeoutMs = Math.max(30, Math.floor(run.speed * 0.8))
    const timer = setTimeout(() => {
      pending = null
      resolve(jsApplyAIMoves(run, board, config, difficulty))
    }, timeoutMs)

    pending = (moves) => {
      clearTimeout(timer)
      // Apply moves to run state
      const updatedPlayers = run.players.map((p) => {
        if (!p.isAI || !p.alive || !(p.id in moves)) {
          return p
        }
        const dir = INT_TO_DIR[moves[p.id]] ?? p.direction
        return { ...p, directionQueue: [dir] as readonly Direction[] }
      })
      resolve({ ...run, players: updatedPlayers })
    }

    w.postMessage(req)
  })
}

/**
 * Clean up the worker.
 */
export function terminateAI(): void {
  if (worker) {
    worker.terminate()
    worker = null
    workerReady = false
    pending = null
  }
}
