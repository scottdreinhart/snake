/**
 * Game rules — movement, collision, win/loss detection, game tick.
 * Pure functions operating on domain types only.
 */

import {
  buildTrailSet,
  createRunState,
  getOccupiedSet,
  isInBounds,
  maybeSpawnPowerUp,
  posEqual,
  posKey,
  spawnPickup,
  tickPickups,
  wrapPos,
} from './board'
import {
  BOOST_DURATION,
  BOOST_SPEED_FACTOR,
  DIRECTION_VECTORS,
  GROWTH_PER_FOOD,
  MIN_TICK_MS,
  MODE_CONFIGS,
  OPPOSITE_DIRECTION,
  PHASE_DURATION,
  POWERUP_SPAWN_CHANCE,
  SHIELD_DURATION,
  SPEED_INCREMENT,
} from './constants'
import type {
  BoardConfig,
  Direction,
  GameAction,
  GameState,
  ModeConfig,
  PlayerEntity,
  RoundOutcome,
  RunState,
  Vec2,
} from './types'

// ─── Direction Validation ───────────────────────────────────

export function isValidTurn(current: Direction, next: Direction): boolean {
  return OPPOSITE_DIRECTION[current] !== next
}

export function enqueueDirection(player: PlayerEntity, direction: Direction): PlayerEntity {
  const lastQueued =
    player.directionQueue.length > 0
      ? player.directionQueue[player.directionQueue.length - 1]
      : player.direction

  if (!isValidTurn(lastQueued, direction) || lastQueued === direction) {
    return player
  }

  // Buffer up to 2 turns
  if (player.directionQueue.length >= 2) {
    return player
  }

  return { ...player, directionQueue: [...player.directionQueue, direction] }
}

// ─── Movement ───────────────────────────────────────────────

function consumeDirection(player: PlayerEntity): PlayerEntity {
  if (player.directionQueue.length === 0) {
    return player
  }
  const [next, ...rest] = player.directionQueue
  return { ...player, direction: next, directionQueue: rest }
}

export function moveHead(
  player: PlayerEntity,
  board: BoardConfig,
  config: ModeConfig,
): { player: PlayerEntity; newHead: Vec2 } {
  const p = consumeDirection(player)
  const delta = DIRECTION_VECTORS[p.direction]
  let newHead: Vec2 = { x: p.segments[0].x + delta.x, y: p.segments[0].y + delta.y }

  if (!config.wallIsFatal || board.wrapMode) {
    newHead = wrapPos(newHead, board)
  }

  return { player: p, newHead }
}

// ─── Collision Detection ────────────────────────────────────

export function checkWallCollision(pos: Vec2, board: BoardConfig, config: ModeConfig): boolean {
  if (board.wrapMode || !config.wallIsFatal) {
    return false
  }
  return !isInBounds(pos, board)
}

export function checkSelfCollision(pos: Vec2, segments: readonly Vec2[]): boolean {
  // Check against all body segments (skip head at index 0)
  return segments.slice(1).some((seg) => posEqual(seg, pos))
}

export function checkTrailCollision(
  pos: Vec2,
  trails: ReadonlySet<string>,
  segments: readonly Vec2[],
  isPhasing: boolean,
): boolean {
  if (isPhasing) {
    return false
  }
  const key = posKey(pos)
  if (trails.has(key)) {
    return true
  }
  // Also check other players' head positions handled separately
  // Check own body
  return segments.slice(1).some((seg) => posEqual(seg, pos))
}

export function checkPlayerCollision(
  pos: Vec2,
  allPlayers: readonly PlayerEntity[],
  selfId: string,
): boolean {
  for (const other of allPlayers) {
    if (other.id === selfId || !other.alive) {
      continue
    }
    // Collision with other player's body
    if (other.segments.some((seg) => posEqual(seg, pos))) {
      return true
    }
  }
  return false
}

// ─── Tick Single Player ─────────────────────────────────────

function tickPlayer(
  player: PlayerEntity,
  board: BoardConfig,
  config: ModeConfig,
  allPlayers: readonly PlayerEntity[],
  trails: ReadonlySet<string>,
  growthAmount: number,
): PlayerEntity {
  if (!player.alive) {
    return player
  }

  const { player: p, newHead } = moveHead(player, board, config)

  // Check fatal collisions
  const shielded = p.shield > 0
  const phasing = p.phase > 0
  const wallHit = checkWallCollision(newHead, board, config)
  const trailHit = config.trailIsFatal && checkTrailCollision(newHead, trails, p.segments, phasing)
  const playerHit = checkPlayerCollision(newHead, allPlayers, p.id)

  if (wallHit || (!shielded && (trailHit || playerHit))) {
    return { ...p, alive: false }
  }

  // Move: add new head
  const newSegments = [newHead, ...p.segments]

  // Remove tail if not growing
  const finalSegments = growthAmount > 0 ? newSegments : newSegments.slice(0, -1)

  return {
    ...p,
    segments: finalSegments,
    shield: Math.max(0, p.shield - 1),
    phase: Math.max(0, p.phase - 1),
    boost: Math.max(0, p.boost - 1),
  }
}

// ─── Pickup Collection ──────────────────────────────────────

function collectPickups(run: RunState, board: BoardConfig, config: ModeConfig): RunState {
  const { players, pickups } = run
  const collected: number[] = []

  const updatedPlayers = players.map((p) => {
    if (!p.alive) {
      return p
    }
    const head = p.segments[0]
    let updated = p

    for (let i = 0; i < pickups.length; i++) {
      if (posEqual(head, pickups[i].pos)) {
        collected.push(i)
        const pk = pickups[i]
        switch (pk.kind) {
          case 'food':
            updated = {
              ...updated,
              score: updated.score + 10,
            }
            break
          case 'shield':
            updated = { ...updated, shield: updated.shield + SHIELD_DURATION }
            break
          case 'phase':
            updated = { ...updated, phase: updated.phase + PHASE_DURATION }
            break
          case 'boost':
            updated = { ...updated, boost: updated.boost + BOOST_DURATION }
            break
        }
      }
    }
    return updated
  })

  const remaining = pickups.filter((_, i) => !collected.includes(i))

  // Respawn food if collected
  const foodCollected = collected.some((i) => pickups[i].kind === 'food')
  let finalPickups = remaining
  if (foodCollected && config.foodEnabled) {
    const occupied = getOccupiedSet({ ...run, players: updatedPlayers, pickups: remaining })
    const food = spawnPickup('food', board, occupied)
    if (food) {
      finalPickups = [...remaining, food]
    }
  }

  return { ...run, players: updatedPlayers, pickups: finalPickups }
}

// ─── Determine Outcome ─────────────────────────────────────

function determineOutcome(
  players: readonly PlayerEntity[],
  config: ModeConfig,
): RoundOutcome | null {
  const alive = players.filter((p) => p.alive)
  const humanPlayer = players.find((p) => p.id === 'player')

  if (config.aiCount === 0) {
    // Single player: loss when dead
    if (humanPlayer && !humanPlayer.alive) {
      return { kind: 'loss' }
    }
    return null
  }

  // Multi-player modes
  if (alive.length === 0) {
    return { kind: 'draw' }
  }

  if (alive.length === 1) {
    if (alive[0].id === 'player') {
      return { kind: 'win', winnerId: 'player' }
    }
    return { kind: 'loss' }
  }

  // Human dead but AI alive
  if (humanPlayer && !humanPlayer.alive) {
    return { kind: 'loss' }
  }

  return null
}

// ─── Game Tick ───────────────────────────────────────────────

export function gameTick(run: RunState, board: BoardConfig, config: ModeConfig): RunState {
  if (run.outcome) {
    return run
  }

  // Calculate growth: in classic/hybrid, food gives growth; in tron, trail always extends
  const foodPickups = run.pickups.filter((p) => p.kind === 'food')
  const growthByPlayer = new Map<string, number>()

  for (const p of run.players) {
    if (!p.alive) {
      continue
    }
    const head = p.segments[0]
    const delta = DIRECTION_VECTORS[p.directionQueue.length > 0 ? p.directionQueue[0] : p.direction]
    const nextHead = board.wrapMode
      ? wrapPos({ x: head.x + delta.x, y: head.y + delta.y }, board)
      : { x: head.x + delta.x, y: head.y + delta.y }

    const eatsFood = config.growOnEat && foodPickups.some((f) => posEqual(f.pos, nextHead))
    const tronGrowth = config.mode === 'tron' ? 1 : 0

    growthByPlayer.set(p.id, eatsFood ? GROWTH_PER_FOOD : tronGrowth)
  }

  // Move all players simultaneously
  const trails = buildTrailSet(run.players)
  // In tron mode, all existing segments are trail
  const fullTrails =
    config.mode === 'tron'
      ? new Set([
          ...trails,
          ...run.players.filter((p) => p.alive).flatMap((p) => p.segments.map(posKey)),
        ])
      : trails

  const movedPlayers = run.players.map((p) =>
    tickPlayer(p, board, config, run.players, fullTrails, growthByPlayer.get(p.id) ?? 0),
  )

  let nextRun: RunState = {
    ...run,
    tick: run.tick + 1,
    players: movedPlayers,
    trails: buildTrailSet(movedPlayers),
  }

  // Collect pickups
  nextRun = collectPickups(nextRun, board, config)

  // Tick pickup timers
  nextRun = { ...nextRun, pickups: tickPickups(nextRun.pickups) }

  // Speed increase from eating food
  if (config.speedIncrease) {
    const totalScore = nextRun.players.reduce((sum, p) => sum + p.score, 0)
    const prevScore = run.players.reduce((sum, p) => sum + p.score, 0)
    if (totalScore > prevScore) {
      const newSpeed = Math.max(MIN_TICK_MS, nextRun.speed - SPEED_INCREMENT)
      nextRun = { ...nextRun, speed: newSpeed }
    }
  }

  // Boost speed modifier
  const anyBoosted = nextRun.players.some((p) => p.alive && p.boost > 0 && p.id === 'player')
  if (anyBoosted) {
    nextRun = {
      ...nextRun,
      speed: Math.max(MIN_TICK_MS, Math.floor(nextRun.baseSpeed * BOOST_SPEED_FACTOR)),
    }
  }

  // Maybe spawn power-up
  if (config.powerUpsEnabled) {
    nextRun = maybeSpawnPowerUp(nextRun, board, POWERUP_SPAWN_CHANCE)
  }

  // Check outcome
  const outcome = determineOutcome(nextRun.players, config)
  if (outcome) {
    nextRun = { ...nextRun, outcome }
  }

  return nextRun
}

// ─── Game Reducer ───────────────────────────────────────────

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_MODE': {
      const { mode } = action
      return { ...state, mode, modeConfig: MODE_CONFIGS[mode] }
    }

    case 'SET_DIFFICULTY':
      return { ...state, difficulty: action.difficulty }

    case 'SET_BOARD_SIZE':
      return {
        ...state,
        board: { ...state.board, width: action.width, height: action.height },
      }

    case 'TOGGLE_WRAP':
      return {
        ...state,
        board: { ...state.board, wrapMode: !state.board.wrapMode },
      }

    case 'SET_PHASE':
      return { ...state, phase: action.phase }

    case 'START_GAME': {
      const run = createRunState(state.mode, state.difficulty, state.board)
      return {
        ...state,
        phase: 'playing',
        run,
        round: state.mode === 'tron' ? state.round + 1 : 1,
      }
    }

    case 'PAUSE':
      if (state.phase !== 'playing') {
        return state
      }
      return { ...state, phase: 'paused' }

    case 'RESUME':
      if (state.phase !== 'paused') {
        return state
      }
      return { ...state, phase: 'playing' }

    case 'RESTART': {
      const run = createRunState(state.mode, state.difficulty, state.board)
      return { ...state, phase: 'playing', run }
    }

    case 'BACK_TO_MENU':
      return {
        ...state,
        phase: 'menu',
        run: null,
        round: 0,
        roundWins: {},
      }

    case 'TURN': {
      if (!state.run || state.phase !== 'playing') {
        return state
      }
      const updatedPlayers = state.run.players.map((p) =>
        p.id === action.playerId ? enqueueDirection(p, action.direction) : p,
      )
      return {
        ...state,
        run: { ...state.run, players: updatedPlayers },
      }
    }

    case 'TICK': {
      if (!state.run || state.phase !== 'playing') {
        return state
      }
      const nextRun = gameTick(state.run, state.board, state.modeConfig)

      let nextState = { ...state, run: nextRun }

      // Update best scores
      if (nextRun.outcome) {
        const playerScore = nextRun.players.find((p) => p.id === 'player')?.score ?? 0
        if (playerScore > state.bestScores[state.mode]) {
          nextState = {
            ...nextState,
            bestScores: { ...state.bestScores, [state.mode]: playerScore },
          }
        }

        // Update round wins for tron
        if (nextRun.outcome.kind === 'win' && 'winnerId' in nextRun.outcome) {
          const wid = nextRun.outcome.winnerId
          nextState = {
            ...nextState,
            roundWins: {
              ...state.roundWins,
              [wid]: (state.roundWins[wid] ?? 0) + 1,
            },
          }
        }

        nextState = { ...nextState, phase: 'game-over' }
      }

      return nextState
    }

    default:
      return state
  }
}
