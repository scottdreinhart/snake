/**
 * App — top-level game shell. Routes between menus, gameplay, and overlays.
 * Wires input handling, game hook, and sound effects.
 */

import { useGame } from '@/app/useGame'
import { useKeyboardControls } from '@/app/useKeyboardControls'
import { useSoundEffects } from '@/app/useSoundEffects'
import { useStats } from '@/app/useStats'
import { useSwipe } from '@/app/useSwipe'
import { isWasmActive } from '@/app/aiService'
import { GameCanvas } from '@/ui/atoms/GameCanvas'
import { HUD } from '@/ui/atoms/HUD'
import { OfflineIndicator } from '@/ui/atoms/OfflineIndicator'
import {
  GameOverOverlay,
  HelpOverlay,
  MainMenu,
  PauseOverlay,
  SettingsOverlay,
  SplashScreen,
  StatsOverlay,
} from '@/ui/molecules'
import { useCallback, useEffect, useMemo, useRef } from 'react'

const CELL_SIZE = 20

export default function App() {
  const {
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
  } = useGame()

  const sfx = useSoundEffects()
  const { stats, recordWin, recordLoss, resetStats } = useStats()

  // ─── Keyboard Input ──────────────────────────────────────

  const togglePause = useCallback(() => {
    if (state.phase === 'playing') {
      pause()
      sfx.onPause()
    } else if (state.phase === 'paused') {
      resume()
      sfx.onResume()
    }
  }, [state.phase, pause, resume, sfx])

  const closeOverlayToMenu = useCallback(() => {
    if (
      state.phase === 'settings' ||
      state.phase === 'help' ||
      state.phase === 'stats' ||
      state.phase === 'game-over'
    ) {
      backToMenu()
      sfx.onClick()
    }
  }, [state.phase, backToMenu, sfx])

  const keyboardBindings = useMemo(
    () => [
      {
        action: 'move-up',
        keys: ['ArrowUp', 'KeyW'],
        onTrigger: () => turn('up'),
        enabled: () => state.phase === 'playing',
      },
      {
        action: 'move-down',
        keys: ['ArrowDown', 'KeyS'],
        onTrigger: () => turn('down'),
        enabled: () => state.phase === 'playing',
      },
      {
        action: 'move-left',
        keys: ['ArrowLeft', 'KeyA'],
        onTrigger: () => turn('left'),
        enabled: () => state.phase === 'playing',
      },
      {
        action: 'move-right',
        keys: ['ArrowRight', 'KeyD'],
        onTrigger: () => turn('right'),
        enabled: () => state.phase === 'playing',
      },
      {
        action: 'toggle-pause',
        keys: ['Space'],
        onTrigger: togglePause,
        enabled: () => state.phase === 'playing' || state.phase === 'paused',
      },
      {
        action: 'escape',
        keys: ['Escape'],
        onTrigger: () => {
          if (state.phase === 'playing' || state.phase === 'paused') {
            togglePause()
            return
          }
          closeOverlayToMenu()
        },
      },
    ],
    [state.phase, turn, togglePause, closeOverlayToMenu],
  )

  useKeyboardControls(keyboardBindings)

  // ─── Touch/swipe controls ────────────────────────────────

  useSwipe(turn, state.phase === 'playing')

  // ─── Sound on game events ────────────────────────────────

  const prevOutcomeRef = useRef(state.run?.outcome ?? null)

  useEffect(() => {
    const outcome = state.run?.outcome
    if (outcome && !prevOutcomeRef.current) {
      if (outcome.kind === 'win') {
        sfx.onWin()
        recordWin()
      } else {
        sfx.onLose()
        recordLoss()
      }
    }
    prevOutcomeRef.current = outcome ?? null
  }, [state.run?.outcome, sfx, recordWin, recordLoss, prevOutcomeRef])

  // ─── Derived state ───────────────────────────────────────

  const player = state.run?.players.find((p) => p.id === 'player')
  const bestScore = state.bestScores[state.mode]

  // ─── Render ──────────────────────────────────────────────

  return (
    <div className="app">
      <OfflineIndicator />

      {state.phase === 'boot' && (
        <SplashScreen onComplete={() => setPhase('menu')} />
      )}

      {state.phase === 'menu' && (
        <MainMenu
          onPlay={() => {
            startGame()
            sfx.onConfirm()
          }}
          onSettings={() => {
            setPhase('settings')
            sfx.onClick()
          }}
          onHelp={() => {
            setPhase('help')
            sfx.onClick()
          }}
          onStats={() => {
            setPhase('stats')
            sfx.onClick()
          }}
        />
      )}

      {state.phase === 'settings' && (
        <SettingsOverlay
          mode={state.mode}
          difficulty={state.difficulty}
          wrapMode={state.board.wrapMode}
          boardWidth={state.board.width}
          boardHeight={state.board.height}
          onSetMode={(m) => {
            setMode(m)
            sfx.onSelect()
          }}
          onSetDifficulty={(d) => {
            setDifficulty(d)
            sfx.onSelect()
          }}
          onToggleWrap={() => {
            toggleWrap()
            sfx.onClick()
          }}
          onSetBoardSize={(w, h) => {
            setBoardSize(w, h)
            sfx.onSelect()
          }}
          onBack={() => {
            backToMenu()
            sfx.onClick()
          }}
        />
      )}

      {state.phase === 'help' && (
        <HelpOverlay
          onBack={() => {
            backToMenu()
            sfx.onClick()
          }}
        />
      )}

      {state.phase === 'stats' && (
        <StatsOverlay
          stats={stats}
          bestScores={state.bestScores}
          onReset={() => {
            resetStats()
            sfx.onClick()
          }}
          onBack={() => {
            backToMenu()
            sfx.onClick()
          }}
        />
      )}

      {(state.phase === 'playing' || state.phase === 'paused' || state.phase === 'game-over') &&
        state.run && (
          <div className="game-container">
            <HUD player={player} bestScore={bestScore} mode={state.mode} wasmActive={isWasmActive()} wrapMode={state.board.wrapMode} />
            <GameCanvas
              board={state.board}
              players={state.run.players}
              pickups={state.run.pickups}
              trails={state.run.trails}
              cellSize={CELL_SIZE}
            />
          </div>
        )}

      {state.phase === 'paused' && (
        <PauseOverlay
          onResume={() => {
            resume()
            sfx.onResume()
          }}
          onRestart={() => {
            restart()
            sfx.onConfirm()
          }}
          onMenu={() => {
            backToMenu()
            sfx.onClick()
          }}
        />
      )}

      {state.phase === 'game-over' && state.run?.outcome && (
        <GameOverOverlay
          outcome={state.run.outcome}
          score={player?.score ?? 0}
          bestScore={bestScore}
          mode={state.mode}
          onRestart={() => {
            restart()
            sfx.onConfirm()
          }}
          onMenu={() => {
            backToMenu()
            sfx.onClick()
          }}
        />
      )}
    </div>
  )
}
