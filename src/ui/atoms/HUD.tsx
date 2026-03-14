/**
 * HUD — heads-up display showing score, best score, and active power-ups.
 */

import { MODE_LABELS } from '@/domain/constants'
import type { GameMode, PlayerEntity } from '@/domain/types'
import styles from './HUD.module.css'

interface HUDProps {
  player: PlayerEntity | undefined
  bestScore: number
  mode: GameMode
  wasmActive?: boolean
  wrapMode?: boolean
}

export function HUD({ player, bestScore, mode, wasmActive, wrapMode }: HUDProps) {
  const score = player?.score ?? 0

  return (
    <div className={styles.hud}>
      <div>
        <span className={styles.label}>Score</span>
        <div className={styles.score}>{score}</div>
      </div>

      <div className={styles.modeLabel}>
        {MODE_LABELS[mode]}
        {wrapMode && <span className={styles.wrapBadge}>WRAP</span>}
        {wasmActive && <span className={styles.wasmBadge}>WASM</span>}
      </div>

      <div>
        {player && player.shield > 0 && (
          <span className={`${styles.powerUp} ${styles.shield}`}>Shield {player.shield}</span>
        )}
        {player && player.phase > 0 && (
          <span className={`${styles.powerUp} ${styles.phase}`}>Phase {player.phase}</span>
        )}
        {player && player.boost > 0 && (
          <span className={`${styles.powerUp} ${styles.boost}`}>Boost {player.boost}</span>
        )}
      </div>

      <div>
        <span className={styles.label}>Best</span>
        <div className={styles.score}>{bestScore}</div>
      </div>
    </div>
  )
}
