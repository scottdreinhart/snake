/**
 * StatsOverlay — high scores and session statistics.
 */

import { MODE_LABELS } from '@/domain/constants'
import type { GameMode, GameStats } from '@/domain/types'
import styles from './Overlay.module.css'

interface StatsOverlayProps {
  stats: GameStats
  bestScores: Readonly<Record<GameMode, number>>
  onReset: () => void
  onBack: () => void
}

const MODES: GameMode[] = ['hybrid', 'classic', 'tron']

export function StatsOverlay({ stats, bestScores, onReset, onBack }: StatsOverlayProps) {
  return (
    <div className={styles.overlay}>
      <h1 className={styles.title}>Stats</h1>

      <div className={styles.statsRow}>
        <span>Wins: {stats.wins}</span>
        <span>Losses: {stats.losses}</span>
        <span>Streak: {stats.streak}</span>
        <span>Best Streak: {stats.bestStreak}</span>
      </div>

      <div className={styles.label} style={{ marginTop: '1.5rem' }}>
        Best Scores
      </div>
      <div className={styles.statsRow}>
        {MODES.map((m) => (
          <span key={m}>
            {MODE_LABELS[m]}: {bestScores[m]}
          </span>
        ))}
      </div>

      <div className={styles.menu} style={{ marginTop: '1.5rem' }}>
        <button className={styles.menuBtn} onClick={onReset}>
          Reset Stats
        </button>
        <button className={styles.menuBtn} onClick={onBack} autoFocus>
          Back
        </button>
      </div>
    </div>
  )
}
