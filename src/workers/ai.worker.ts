/**
 * AI Web Worker — off-main-thread AI computation.
 *
 * Strategy: WASM-first with pure-JS fallback.
 * Receives serialised board state, computes moves for all AI players,
 * posts back a direction map.
 *
 * Message protocol
 *   → { type: 'init' }
 *   ← { type: 'ready', wasm: boolean }
 *   → { type: 'compute', ...ComputeRequest }
 *   ← { type: 'moves', moves: Record<string, number> }
 */

import type { WasmAIExports } from '@/wasm/wasm-loader'
import { AI_WASM_BASE64 } from '@/wasm/ai-wasm'

// ─── WASM instance (loaded once on init) ────────────────────

let wasm: WasmAIExports | null = null

// ─── Direction vectors (JS fallback) ────────────────────────

const DX = [0, 0, -1, 1]
const DY = [-1, 1, 0, 0]
const OPP = [1, 0, 3, 2]

// ─── Types ──────────────────────────────────────────────────

interface AIPlayer {
  id: string
  headX: number
  headY: number
  dir: number
  alive: boolean
}

interface ComputeRequest {
  type: 'compute'
  width: number
  height: number
  wrapMode: boolean
  grid: number[] // flat, 0=empty, 1=occupied
  foods: number[] // [x0,y0, x1,y1, …]
  players: AIPlayer[]
  difficulty: number // 0-2
  tick: number
}

// ─── JS fallback BFS ────────────────────────────────────────

function jsBfs(
  sx: number,
  sy: number,
  w: number,
  h: number,
  grid: number[],
  wrapMode: boolean,
  maxDepth: number,
): number {
  const vis = new Uint8Array(w * h)
  const wrapC = (v: number, m: number): number => ((v % m) + m) % m
  if (wrapMode) {
    sx = wrapC(sx, w)
    sy = wrapC(sy, h)
  }
  if (sx < 0 || sx >= w || sy < 0 || sy >= h || grid[sy * w + sx] !== 0) {
    return 0
  }
  vis[sy * w + sx] = 1
  const qx: number[] = [sx]
  const qy: number[] = [sy]
  let head = 0
  let count = 0
  while (head < qx.length && count < maxDepth) {
    const cx = qx[head]
    const cy = qy[head]
    head++
    count++
    for (let d = 0; d < 4; d++) {
      let nx = cx + DX[d]
      let ny = cy + DY[d]
      if (wrapMode) {
        nx = wrapC(nx, w)
        ny = wrapC(ny, h)
      }
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) {
        continue
      }
      const idx = ny * w + nx
      if (vis[idx] || grid[idx] !== 0) {
        continue
      }
      vis[idx] = 1
      qx.push(nx)
      qy.push(ny)
    }
  }
  return count
}

function jsComputeMove(
  headX: number,
  headY: number,
  currentDir: number,
  difficulty: number,
  tick: number,
  w: number,
  h: number,
  grid: number[],
  wrapMode: boolean,
  foods: number[],
): number {
  const opp = OPP[currentDir]
  const cands: { d: number; safe: boolean; food: number; space: number }[] = []

  const wrapC = (v: number, m: number): number => ((v % m) + m) % m

  for (let d = 0; d < 4; d++) {
    if (d === opp) {
      continue
    }
    let nx = headX + DX[d]
    let ny = headY + DY[d]
    if (wrapMode) {
      nx = wrapC(nx, w)
      ny = wrapC(ny, h)
    }
    const inB = nx >= 0 && nx < w && ny >= 0 && ny < h
    const safe = inB && grid[ny * w + nx] === 0
    const depth = difficulty === 2 ? 80 : 30
    const space = safe ? jsBfs(nx, ny, w, h, grid, wrapMode, depth) : 0

    let bestFood = 9999
    for (let i = 0; i < foods.length; i += 2) {
      const dist = Math.abs(nx - foods[i]) + Math.abs(ny - foods[i + 1])
      if (dist < bestFood) {
        bestFood = dist
      }
    }
    cands.push({ d, safe, food: bestFood, space })
  }

  if (cands.length === 0) {
    return currentDir
  }
  const safeCands = cands.filter((c) => c.safe)
  if (difficulty === 0 && tick % 4 !== 0) {
    return currentDir
  }
  if (safeCands.length === 0) {
    return cands[0].d
  }
  if (difficulty === 0) {
    return safeCands[tick % safeCands.length].d
  }
  if (difficulty === 2) {
    safeCands.sort((a, b) => {
      const sd = b.space - a.space
      if (Math.abs(sd) > 3) {
        return sd
      }
      return a.food - b.food
    })
  } else {
    safeCands.sort((a, b) => {
      if (a.food !== b.food) {
        return a.food - b.food
      }
      return b.space - a.space
    })
  }
  return safeCands[0].d
}

// ─── Worker message handler ─────────────────────────────────

async function initWasm(): Promise<boolean> {
  if (wasm) {
    return true
  }
  if (!AI_WASM_BASE64 || typeof WebAssembly === 'undefined') {
    return false
  }
  try {
    const bin = atob(AI_WASM_BASE64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i)
    }
    const { instance } = await WebAssembly.instantiate(bytes, {
      env: { abort: () => {} },
    })
    wasm = instance.exports as unknown as WasmAIExports
    return true
  } catch {
    return false
  }
}

function computeWithWasm(req: ComputeRequest): Record<string, number> {
  const w = wasm!
  w.setBoard(req.width, req.height, req.wrapMode ? 1 : 0)

  // Fill grid
  for (let y = 0; y < req.height; y++) {
    for (let x = 0; x < req.width; x++) {
      const val = req.grid[y * req.width + x]
      if (val) {
        w.setCell(x, y, val)
      }
    }
  }

  // Set food
  w.clearFood()
  for (let i = 0; i < req.foods.length; i += 2) {
    w.addFood(req.foods[i], req.foods[i + 1])
  }

  // Compute moves
  const moves: Record<string, number> = {}
  for (const p of req.players) {
    if (!p.alive) {
      continue
    }
    moves[p.id] = w.computeMove(p.headX, p.headY, p.dir, req.difficulty, req.tick)
  }
  return moves
}

function computeWithJS(req: ComputeRequest): Record<string, number> {
  const moves: Record<string, number> = {}
  for (const p of req.players) {
    if (!p.alive) {
      continue
    }
    moves[p.id] = jsComputeMove(
      p.headX,
      p.headY,
      p.dir,
      req.difficulty,
      req.tick,
      req.width,
      req.height,
      req.grid,
      req.wrapMode,
      req.foods,
    )
  }
  return moves
}

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data

  if (msg.type === 'init') {
    const ok = await initWasm()
    self.postMessage({ type: 'ready', wasm: ok })
    return
  }

  if (msg.type === 'compute') {
    const req = msg as ComputeRequest
    const moves = wasm ? computeWithWasm(req) : computeWithJS(req)
    self.postMessage({ type: 'moves', moves })
  }
}

export {}
