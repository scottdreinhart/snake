/**
 * PauseOverlay — shown when the game is paused.
 */

import styles from './Overlay.module.css'

interface PauseOverlayProps {
  onResume: () => void
  onRestart: () => void
  onMenu: () => void
}

export function PauseOverlay({ onResume, onRestart, onMenu }: PauseOverlayProps) {
  return (
    <div className={styles.overlay}>
      <h1 className={styles.title}>Paused</h1>
      <div className={styles.menu}>
        <button className={styles.menuBtnPrimary} onClick={onResume} autoFocus>
          Resume
        </button>
        <button className={styles.menuBtn} onClick={onRestart}>
          Restart
        </button>
        <button className={styles.menuBtn} onClick={onMenu}>
          Main Menu
        </button>
      </div>
      <div className={styles.controls}>Press Space or Esc to resume</div>
    </div>
  )
}
