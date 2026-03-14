// =======================================================================
// AI Engine for Snake / Tron — WebAssembly (AssemblyScript)
//
// Provides high-performance flood-fill space evaluation and AI move
// selection. Board state is pushed in via setBoard/setCell/addFood,
// then computeMove returns the best direction for a single AI player.
//
// Direction encoding: 0 = up, 1 = down, 2 = left, 3 = right
// Compile: pnpm wasm:build
// =======================================================================

// ─── Board state ────────────────────────────────────────────

// Maximum supported board: 30 × 30 = 900 cells
const MAX_CELLS: i32 = 900
const MAX_FOOD: i32 = 16

// Flat grid — 0 = empty, 1 = occupied / wall
const grid = new StaticArray<u8>(MAX_CELLS)

// Food position storage
const foodX = new StaticArray<i32>(MAX_FOOD)
const foodY = new StaticArray<i32>(MAX_FOOD)
let foodCount: i32 = 0

// Board dimensions
let boardW: i32 = 20
let boardH: i32 = 20
let wrap: i32 = 0

// ─── Direction vectors ──────────────────────────────────────
//   0=up  1=down  2=left  3=right

const DX: StaticArray<i32> = [0, 0, -1, 1]
const DY: StaticArray<i32> = [-1, 1, 0, 0]
const OPP: StaticArray<i32> = [1, 0, 3, 2]

// ─── BFS scratch buffers ────────────────────────────────────

const vis = new StaticArray<u8>(MAX_CELLS)
const qx = new StaticArray<i32>(MAX_CELLS)
const qy = new StaticArray<i32>(MAX_CELLS)

// ─── Move candidate scratch (max 3 non-opposite directions) ─

const cDir = new StaticArray<i32>(3)
const cSafe = new StaticArray<i32>(3)
const cFood = new StaticArray<i32>(3)
const cSpace = new StaticArray<i32>(3)

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

/** Initialise board dimensions and clear grid. */
export function setBoard(w: i32, h: i32, wrapMode: i32): void {
  boardW = w
  boardH = h
  wrap = wrapMode
  clearBoard()
}

/** Zero all grid cells and reset food list. */
export function clearBoard(): void {
  for (let i: i32 = 0; i < MAX_CELLS; i++) {
    unchecked((grid[i] = 0))
  }
  foodCount = 0
}

/** Mark a cell as occupied. */
export function setCell(x: i32, y: i32, val: u8): void {
  if (x >= 0 && x < boardW && y >= 0 && y < boardH) {
    unchecked((grid[y * boardW + x] = val))
  }
}

/** Register a food position. */
export function addFood(x: i32, y: i32): void {
  if (foodCount < MAX_FOOD) {
    unchecked((foodX[foodCount] = x))
    unchecked((foodY[foodCount] = y))
    foodCount++
  }
}

/** Clear food list (call before addFood sequence). */
export function clearFood(): void {
  foodCount = 0
}

/**
 * Run a flood-fill from (startX, startY) and return the number of reachable
 * empty cells, capped at maxDepth.  Useful for space evaluation.
 */
export function floodFill(startX: i32, startY: i32, maxDepth: i32): i32 {
  return bfs(startX, startY, maxDepth)
}

/**
 * Compute the best direction for an AI player.
 *
 * @param headX      head column
 * @param headY      head row
 * @param currentDir current direction (0–3)
 * @param difficulty 0 = easy, 1 = normal, 2 = hard
 * @param tick       current game tick (used for easy-mode reaction delay)
 * @returns          best direction (0–3)
 */
export function computeMove(
  headX: i32,
  headY: i32,
  currentDir: i32,
  difficulty: i32,
  tick: i32,
): i32 {
  const opp = unchecked(OPP[currentDir])
  let n: i32 = 0

  // Evaluate up to 3 non-opposite directions
  for (let d: i32 = 0; d < 4; d++) {
    if (d == opp) {
      continue
    }
    let nx: i32 = headX + unchecked(DX[d])
    let ny: i32 = headY + unchecked(DY[d])
    if (wrap) {
      nx = wrapCoord(nx, boardW)
      ny = wrapCoord(ny, boardH)
    }

    const safe: bool = inBounds(nx, ny) && unchecked(grid[ny * boardW + nx]) == 0
    const depth: i32 = difficulty == 2 ? 80 : 30
    const space: i32 = safe ? bfs(nx, ny, depth) : 0
    const food: i32 = closestFood(nx, ny)

    unchecked((cDir[n] = d))
    unchecked((cSafe[n] = safe ? 1 : 0))
    unchecked((cFood[n] = food))
    unchecked((cSpace[n] = space))
    n++
  }

  if (n == 0) {
    return currentDir
  }

  // Count safe candidates
  let safeN: i32 = 0
  for (let i: i32 = 0; i < n; i++) {
    if (unchecked(cSafe[i])) {
      safeN++
    }
  }

  // Easy: delayed reaction every few ticks
  if (difficulty == 0 && tick % 4 != 0) {
    return currentDir
  }

  // No safe moves — return first non-opposite
  if (safeN == 0) {
    return unchecked(cDir[0])
  }

  // Easy: deterministic "pseudo-random" safe pick based on tick
  if (difficulty == 0) {
    let idx: i32 = tick % safeN
    let seen: i32 = 0
    for (let i: i32 = 0; i < n; i++) {
      if (unchecked(cSafe[i])) {
        if (seen == idx) {
          return unchecked(cDir[i])
        }
        seen++
      }
    }
    return currentDir
  }

  // Sort and return best
  if (difficulty == 2) {
    sortSpaceFood(n)
  } else {
    sortFoodSpace(n)
  }

  // First safe candidate after sort
  for (let i: i32 = 0; i < n; i++) {
    if (unchecked(cSafe[i])) {
      return unchecked(cDir[i])
    }
  }
  return currentDir
}

// ═══════════════════════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════════════════════

function wrapCoord(v: i32, max: i32): i32 {
  return ((v % max) + max) % max
}

function inBounds(x: i32, y: i32): bool {
  return x >= 0 && x < boardW && y >= 0 && y < boardH
}

/** BFS flood-fill returning reachable-cell count, capped at maxDepth. */
function bfs(sx: i32, sy: i32, maxDepth: i32): i32 {
  const cells: i32 = boardW * boardH
  for (let i: i32 = 0; i < cells; i++) {
    unchecked((vis[i] = 0))
  }

  if (wrap) {
    sx = wrapCoord(sx, boardW)
    sy = wrapCoord(sy, boardH)
  }
  if (!inBounds(sx, sy) || unchecked(grid[sy * boardW + sx]) != 0) {
    return 0
  }

  unchecked((vis[sy * boardW + sx] = 1))
  unchecked((qx[0] = sx))
  unchecked((qy[0] = sy))
  let head: i32 = 0
  let tail: i32 = 1
  let count: i32 = 0

  while (head < tail && count < maxDepth) {
    const cx: i32 = unchecked(qx[head])
    const cy: i32 = unchecked(qy[head])
    head++
    count++

    for (let d: i32 = 0; d < 4; d++) {
      let nx: i32 = cx + unchecked(DX[d])
      let ny: i32 = cy + unchecked(DY[d])
      if (wrap) {
        nx = wrapCoord(nx, boardW)
        ny = wrapCoord(ny, boardH)
      }
      if (!inBounds(nx, ny)) {
        continue
      }
      const idx: i32 = ny * boardW + nx
      if (unchecked(vis[idx]) || unchecked(grid[idx]) != 0) {
        continue
      }
      unchecked((vis[idx] = 1))
      unchecked((qx[tail] = nx))
      unchecked((qy[tail] = ny))
      tail++
    }
  }
  return count
}

function manhattan(x1: i32, y1: i32, x2: i32, y2: i32): i32 {
  const dx: i32 = x1 > x2 ? x1 - x2 : x2 - x1
  const dy: i32 = y1 > y2 ? y1 - y2 : y2 - y1
  return dx + dy
}

function closestFood(x: i32, y: i32): i32 {
  if (foodCount == 0) {
    return 9999
  }
  let best: i32 = 9999
  for (let i: i32 = 0; i < foodCount; i++) {
    const d: i32 = manhattan(x, y, unchecked(foodX[i]), unchecked(foodY[i]))
    if (d < best) {
      best = d
    }
  }
  return best
}

// ─── Sorting (bubble sort, max 3 elements) ──────────────────

function swap(j: i32): void {
  let t: i32
  t = unchecked(cDir[j])
  unchecked((cDir[j] = unchecked(cDir[j + 1])))
  unchecked((cDir[j + 1] = t))
  t = unchecked(cSafe[j])
  unchecked((cSafe[j] = unchecked(cSafe[j + 1])))
  unchecked((cSafe[j + 1] = t))
  t = unchecked(cFood[j])
  unchecked((cFood[j] = unchecked(cFood[j + 1])))
  unchecked((cFood[j + 1] = t))
  t = unchecked(cSpace[j])
  unchecked((cSpace[j] = unchecked(cSpace[j + 1])))
  unchecked((cSpace[j + 1] = t))
}

/** Sort: safe first → most space → closest food. */
function sortSpaceFood(n: i32): void {
  for (let i: i32 = 0; i < n - 1; i++) {
    for (let j: i32 = 0; j < n - i - 1; j++) {
      let doSwap: bool = false
      const sa: i32 = unchecked(cSafe[j])
      const sb: i32 = unchecked(cSafe[j + 1])
      if (sa < sb) {
        doSwap = true
      } else if (sa == sb && sa != 0) {
        const diff: i32 = unchecked(cSpace[j + 1]) - unchecked(cSpace[j])
        if (diff > 3) {
          doSwap = true
        } else if (diff >= -3 && unchecked(cFood[j]) > unchecked(cFood[j + 1])) {
          doSwap = true
        }
      }
      if (doSwap) {
        swap(j)
      }
    }
  }
}

/** Sort: safe first → closest food → most space. */
function sortFoodSpace(n: i32): void {
  for (let i: i32 = 0; i < n - 1; i++) {
    for (let j: i32 = 0; j < n - i - 1; j++) {
      let doSwap: bool = false
      const sa: i32 = unchecked(cSafe[j])
      const sb: i32 = unchecked(cSafe[j + 1])
      if (sa < sb) {
        doSwap = true
      } else if (sa == sb && sa != 0) {
        const fa: i32 = unchecked(cFood[j])
        const fb: i32 = unchecked(cFood[j + 1])
        if (fa > fb) {
          doSwap = true
        } else if (fa == fb && unchecked(cSpace[j]) < unchecked(cSpace[j + 1])) {
          doSwap = true
        }
      }
      if (doSwap) {
        swap(j)
      }
    }
  }
}
