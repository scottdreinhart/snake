/**
 * Central type definitions — pure domain types, no framework dependencies.
 */

// ─── Geometry ───────────────────────────────────────────────

export interface Vec2 {
  readonly x: number
  readonly y: number
}

// ─── Direction ──────────────────────────────────────────────

export type Direction = 'up' | 'down' | 'left' | 'right'

// ─── Game Modes ─────────────────────────────────────────────

export type GameMode = 'classic' | 'tron' | 'hybrid'

export type Difficulty = 'easy' | 'normal' | 'hard'

export type AppPhase =
  | 'boot'
  | 'menu'
  | 'mode-select'
  | 'difficulty-select'
  | 'settings'
  | 'playing'
  | 'paused'
  | 'game-over'
  | 'stats'
  | 'help'

// ─── Entities ───────────────────────────────────────────────

export interface PlayerEntity {
  readonly id: string
  readonly segments: readonly Vec2[]
  readonly direction: Direction
  readonly directionQueue: readonly Direction[]
  readonly alive: boolean
  readonly score: number
  readonly shield: number // ticks remaining
  readonly phase: number // ticks remaining (pass through trails)
  readonly boost: number // ticks remaining
  readonly isAI: boolean
}

// ─── Pickups ────────────────────────────────────────────────

export type PickupKind = 'food' | 'shield' | 'phase' | 'boost'

export interface Pickup {
  readonly pos: Vec2
  readonly kind: PickupKind
  readonly ticksRemaining: number // 0 = permanent until collected
}

// ─── Board & Arena ──────────────────────────────────────────

export interface BoardConfig {
  readonly width: number
  readonly height: number
  readonly wrapMode: boolean
}

// ─── Run State (single game session) ────────────────────────

export interface RunState {
  readonly tick: number
  readonly players: readonly PlayerEntity[]
  readonly pickups: readonly Pickup[]
  readonly trails: ReadonlySet<string> // serialized "x,y" for O(1) lookup
  readonly speed: number // ms per tick
  readonly baseSpeed: number // initial speed
  readonly outcome: RoundOutcome | null
}

export type RoundOutcome =
  | { readonly kind: 'win'; readonly winnerId: string }
  | { readonly kind: 'loss' }
  | { readonly kind: 'draw' }

// ─── Mode Config ────────────────────────────────────────────

export interface ModeConfig {
  readonly mode: GameMode
  readonly growOnEat: boolean
  readonly trailIsFatal: boolean
  readonly wallIsFatal: boolean
  readonly foodEnabled: boolean
  readonly powerUpsEnabled: boolean
  readonly speedIncrease: boolean
  readonly aiCount: number
}

// ─── Full Game State ────────────────────────────────────────

export interface GameState {
  readonly phase: AppPhase
  readonly mode: GameMode
  readonly difficulty: Difficulty
  readonly board: BoardConfig
  readonly modeConfig: ModeConfig
  readonly run: RunState | null
  readonly bestScores: Readonly<Record<GameMode, number>>
  readonly soundEnabled: boolean
  readonly round: number // for Tron: current round number
  readonly roundWins: Readonly<Record<string, number>> // playerId -> wins
}

// ─── Statistics (persisted) ─────────────────────────────────

export interface GameStats {
  wins: number
  losses: number
  streak: number
  bestStreak: number
}

// ─── Input Event ────────────────────────────────────────────

export type GameAction =
  | { type: 'TURN'; direction: Direction; playerId: string }
  | { type: 'TICK' }
  | { type: 'START_GAME' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESTART' }
  | { type: 'BACK_TO_MENU' }
  | { type: 'SET_MODE'; mode: GameMode }
  | { type: 'SET_DIFFICULTY'; difficulty: Difficulty }
  | { type: 'SET_BOARD_SIZE'; width: number; height: number }
  | { type: 'TOGGLE_WRAP' }
  | { type: 'SET_PHASE'; phase: AppPhase }
