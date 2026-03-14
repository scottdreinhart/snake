/**
 * GameOverOverlay — shown when a round ends.
 */

import { MODE_LABELS } from '@/domain/constants'
import type { GameMode, RoundOutcome } from '@/domain/types'
import styles from './Overlay.module.css'

interface GameOverProps {
  outcome: RoundOutcome
  score: number
  bestScore: number
  mode: GameMode
  onRestart: () => void
  onMenu: () => void
}

export function GameOverOverlay({
  outcome,
  score,
  bestScore,
  mode,
  onRestart,
  onMenu,
}: GameOverProps) {
  const heading =
    outcome.kind === 'win' ? 'You Win!' : outcome.kind === 'draw' ? 'Draw!' : 'Game Over'

  const isNewBest = score >= bestScore && score > 0

  return (
    <div className={styles.overlay}>
      <h1 className={styles.title}>{heading}</h1>
      <p className={styles.subtitle}>{MODE_LABELS[mode]}</p>

      <div className={styles.scoreDisplay}>{score}</div>

      <div className={styles.statsRow}>
        <span>Best: {bestScore}</span>
        {isNewBest && <span style={{ color: 'var(--accent, #667eea)' }}>New Best!</span>}
      </div>

      <div className={styles.menu} style={{ marginTop: '1.5rem' }}>
        <button className={styles.menuBtnPrimary} onClick={onRestart} autoFocus>
          Play Again
        </button>
        <button className={styles.menuBtn} onClick={onMenu}>
          Main Menu
        </button>
      </div>
    </div>
  )
}
