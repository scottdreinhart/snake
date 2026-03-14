/**
 * WASM Loader — decodes base64 WASM binary and instantiates the AI module.
 * Provides a typed wrapper and handles environments without WASM support.
 */

import { AI_WASM_BASE64 } from './ai-wasm'

// ─── Direction mapping (WASM i32 ↔ domain string) ───────────

const DIR_TO_INT: Record<string, number> = { up: 0, down: 1, left: 2, right: 3 }
const INT_TO_DIR = ['up', 'down', 'left', 'right'] as const

export type WasmDirection = (typeof INT_TO_DIR)[number]

export function dirToInt(dir: string): number {
  return DIR_TO_INT[dir] ?? 0
}

export function intToDir(n: number): WasmDirection {
  return INT_TO_DIR[n] ?? 'up'
}

// ─── WASM exports interface ─────────────────────────────────

export interface WasmAIExports {
  setBoard(w: number, h: number, wrapMode: number): void
  clearBoard(): void
  setCell(x: number, y: number, val: number): void
  addFood(x: number, y: number): void
  clearFood(): void
  floodFill(startX: number, startY: number, maxDepth: number): number
  computeMove(
    headX: number,
    headY: number,
    currentDir: number,
    difficulty: number,
    tick: number,
  ): number
}

// ─── Singleton instance ─────────────────────────────────────

let cachedInstance: WasmAIExports | null = null
let loadAttempted = false

/**
 * Decode base64 → Uint8Array (works in browsers and workers).
 */
function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i)
  }
  return bytes
}

/**
 * Asynchronously load and instantiate the WASM AI module.
 * Returns null if WASM is unavailable or the binary is empty.
 */
export async function loadWasmAI(): Promise<WasmAIExports | null> {
  if (loadAttempted) {
    return cachedInstance
  }
  loadAttempted = true

  if (!AI_WASM_BASE64 || typeof WebAssembly === 'undefined') {
    return null
  }

  try {
    const bytes = decodeBase64(AI_WASM_BASE64)
    const module = await WebAssembly.compile(bytes.buffer as ArrayBuffer)
    const instance = await WebAssembly.instantiate(module, {
      env: { abort: () => {} },
    })
    cachedInstance = instance.exports as unknown as WasmAIExports
    return cachedInstance
  } catch {
    return null
  }
}

/**
 * Synchronously return the cached WASM instance (null if not yet loaded).
 */
export function getWasmAI(): WasmAIExports | null {
  return cachedInstance
}
