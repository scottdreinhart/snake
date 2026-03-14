/**
 * useGame — main game loop hook.
 * Coordinates domain logic, tick loop, AI (WASM + worker), input buffering.
 * React integration layer — all rules live in src/domain.
 */

import { applyAIMoves } from '@/domain/ai'
import { createInitialGameState, createRunState } from '@/domain/board'
import { MODE_CONFIGS } from '@/domain/constants'
import { enqueueDirection, gameTick } from '@/domain/rules'
import type {
  AppPhase,
  BoardConfig,
  Difficulty,
  Direction,
  GameMode,
  GameState,
  RunState,
} from '@/domain/types'
import { useCallback, useEffect, useRef, useState } from 'react'
import { computeAIMovesAsync, initAI, terminateAI } from './aiService'
import { load, save } from './storageService'

const SETTINGS_KEY = 'snake-game-settings'
const BEST_SCORES_KEY = 'snake-best-scores'

interface PersistedSettings {
  mode: GameMode
  difficulty: Difficulty
  board: BoardConfig
  soundEnabled: boolean
}

export function useGame() {
  const [state, setState] = useState<GameState>(() => {
    const initial = createInitialGameState()
    const settings = load<Partial<PersistedSettings>>(SETTINGS_KEY, {})
    const bestScores = load(BEST_SCORES_KEY, initial.bestScores)
    return {
      ...initial,
      mode: settings.mode ?? initial.mode,
      difficulty: settings.difficulty ?? initial.difficulty,
      board: settings.board ?? initial.board,
      modeConfig: MODE_CONFIGS[settings.mode ?? initial.mode],
      bestScores,
    }
  })

  const stateRef = useRef(state)
  stateRef.current = state

  const tickTimerRef = useRef<number | null>(null)
  const pendingAIRef = useRef<RunState | null>(null)

  // ─── Initialise AI worker on mount ──────────────────────

  useEffect(() => {
    initAI()
    return terminateAI
  }, [])

  // ─── Persist settings on change ─────────────────────────

  const { mode, difficulty, board } = state
  useEffect(() => {
    save(SETTINGS_KEY, { mode, difficulty, board })
  }, [mode, difficulty, board])

  useEffect(() => {
    save(BEST_SCORES_KEY, state.bestScores)
  }, [state.bestScores])

  // ─── Tick Loop ──────────────────────────────────────────

  const stopTick = useCallback(() => {
    if (tickTimerRef.current !== null) {
      clearTimeout(tickTimerRef.current)
      tickTimerRef.current = null
    }
  }, [])

  const scheduleTick = useCallback(() => {
    stopTick()
    const s = stateRef.current
    if (s.phase !== 'playing' || !s.run) {
      return
    }

    const speed = s.run.speed
    tickTimerRef.current = window.setTimeout(() => {
      const prev = stateRef.current
      if (prev.phase !== 'playing' || !prev.run) {
        return
      }

      // Use pre-computed AI moves if available, else sync JS fallback
      let run: RunState = prev.run
      if (pendingAIRef.current) {
        // Merge AI direction queues into current state (preserving player input)
        const precomputed = pendingAIRef.current
        run = {
          ...prev.run,
          players: prev.run.players.map((p) => {
            if (!p.isAI) {
              return p
            }
            const aiP = precomputed.players.find((ap) => ap.id === p.id)
            return aiP ? { ...p, directionQueue: aiP.directionQueue } : p
          }),
        }
        pendingAIRef.current = null
      } else if (prev.modeConfig.aiCount > 0) {
        // Sync JS fallback when no pre-computed moves arrived
        run = applyAIMoves(run, prev.board, prev.modeConfig, prev.difficulty)
      }

      const nextRun = gameTick(run, prev.board, prev.modeConfig)

      let nextState: GameState = { ...prev, run: nextRun }

      if (nextRun.outcome) {
        const playerScore = nextRun.players.find((p) => p.id === 'player')?.score ?? 0
        if (playerScore > prev.bestScores[prev.mode]) {
          nextState = {
            ...nextState,
            bestScores: { ...prev.bestScores, [prev.mode]: playerScore },
          }
        }
        if (nextRun.outcome.kind === 'win' && 'winnerId' in nextRun.outcome) {
          const wid = nextRun.outcome.winnerId
          nextState = {
            ...nextState,
            roundWins: {
              ...prev.roundWins,
              [wid]: (prev.roundWins[wid] ?? 0) + 1,
            },
          }
        }
        nextState = { ...nextState, phase: 'game-over' }
      }

      setState(nextState)

      // Pre-compute AI moves for the *next* tick asynchronously
      if (!nextRun.outcome && nextState.modeConfig.aiCount > 0 && nextRun) {
        computeAIMovesAsync(
          nextRun,
          nextState.board,
          nextState.modeConfig,
          nextState.difficulty,
        ).then((runWithAI) => {
          pendingAIRef.current = runWithAI
        })
      }

      // Schedule next tick
      scheduleTick()
    }, speed)
  }, [stopTick])

  // Start/stop tick loop based on phase
  useEffect(() => {
    if (state.phase === 'playing') {
      scheduleTick()
    } else {
      stopTick()
    }
    return stopTick
  }, [state.phase, scheduleTick, stopTick])

  // ─── Actions ────────────────────────────────────────────

  const turn = useCallback((direction: Direction) => {
    setState((prev) => {
      if (prev.phase !== 'playing' || !prev.run) {
        return prev
      }
      const updatedPlayers = prev.run.players.map((p) =>
        p.id === 'player' ? enqueueDirection(p, direction) : p,
      )
      return { ...prev, run: { ...prev.run, players: updatedPlayers } }
    })
  }, [])

  const startGame = useCallback(() => {
    setState((prev) => {
      const run = createRunState(prev.mode, prev.difficulty, prev.board)
      return {
        ...prev,
        phase: 'playing' as AppPhase,
        run,
        round: prev.mode === 'tron' ? prev.round + 1 : 1,
      }
    })
  }, [])

  const pause = useCallback(() => {
    setState((prev) => (prev.phase === 'playing' ? { ...prev, phase: 'paused' } : prev))
  }, [])

  const resume = useCallback(() => {
    setState((prev) => (prev.phase === 'paused' ? { ...prev, phase: 'playing' } : prev))
  }, [])

  const restart = useCallback(() => {
    setState((prev) => {
      const run = createRunState(prev.mode, prev.difficulty, prev.board)
      return { ...prev, phase: 'playing' as AppPhase, run }
    })
  }, [])

  const backToMenu = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: 'menu' as AppPhase,
      run: null,
      round: 0,
      roundWins: {},
    }))
  }, [])

  const setMode = useCallback((mode: GameMode) => {
    setState((prev) => ({
      ...prev,
      mode,
      modeConfig: MODE_CONFIGS[mode],
    }))
  }, [])

  const setDifficulty = useCallback((difficulty: Difficulty) => {
    setState((prev) => ({ ...prev, difficulty }))
  }, [])

  const setBoardSize = useCallback((width: number, height: number) => {
    setState((prev) => ({
      ...prev,
      board: { ...prev.board, width, height },
    }))
  }, [])

  const toggleWrap = useCallback(() => {
    setState((prev) => ({
      ...prev,
      board: { ...prev.board, wrapMode: !prev.board.wrapMode },
    }))
  }, [])

  const setPhase = useCallback((phase: AppPhase) => {
    setState((prev) => ({ ...prev, phase }))
  }, [])

  return {
    state,
    turn,
    startGame,
    pause,
    resume,
    restart,
    backToMenu,
    setMode,
    setDifficulty,
    setBoardSize,
    toggleWrap,
    setPhase,
  }
}
