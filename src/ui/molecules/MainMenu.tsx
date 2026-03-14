/**
 * MainMenu — title screen with Play button and hamburger menu.
 */

import { useState } from 'react'
import styles from './Overlay.module.css'

interface MainMenuProps {
  onPlay: () => void
  onSettings: () => void
  onHelp: () => void
  onStats: () => void
}

export function MainMenu({ onPlay, onSettings, onHelp, onStats }: MainMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className={styles.overlay}>
      <button
        className={styles.hamburger}
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Menu"
        aria-expanded={menuOpen}
      >
        <span className={styles.hamburgerBar} />
        <span className={styles.hamburgerBar} />
        <span className={styles.hamburgerBar} />
      </button>

      {menuOpen && (
        <div className={styles.dropdownMenu}>
          <button className={styles.dropdownItem} onClick={() => { setMenuOpen(false); onSettings() }}>
            Settings
          </button>
          <button className={styles.dropdownItem} onClick={() => { setMenuOpen(false); onHelp() }}>
            How to Play
          </button>
          <button className={styles.dropdownItem} onClick={() => { setMenuOpen(false); onStats() }}>
            Stats
          </button>
        </div>
      )}

      <h1 className={styles.title}>SNAKE</h1>
      <p className={styles.subtitle}>Snake + Tron Light Cycle Arcade</p>
      <div className={styles.menu}>
        <button className={styles.menuBtnPrimary} onClick={onPlay} autoFocus>
          Play
        </button>
      </div>
      <div className={styles.controls}>
        Arrow keys or WASD to move &middot; Space to pause &middot; Esc for menu
      </div>
    </div>
  )
}
