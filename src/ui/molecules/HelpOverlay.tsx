/**
 * HelpOverlay — game rules and controls reference.
 */

import styles from './Overlay.module.css'

interface HelpOverlayProps {
  onBack: () => void
}

export function HelpOverlay({ onBack }: HelpOverlayProps) {
  return (
    <div className={styles.overlay}>
      <h1 className={styles.title}>How to Play</h1>
      <div className={styles.helpText}>
        <h3>Controls</h3>
        <ul>
          <li>
            <kbd>Arrow keys</kbd> or <kbd>WASD</kbd> to steer
          </li>
          <li>
            <kbd>Space</kbd> to pause/resume
          </li>
          <li>
            <kbd>Escape</kbd> to pause or return to menu
          </li>
          <li>
            <kbd>Enter</kbd> to confirm selections
          </li>
        </ul>

        <h3>Classic Snake</h3>
        <ul>
          <li>Eat food to grow and score points</li>
          <li>Avoid hitting walls and your own body</li>
          <li>Speed increases as you eat more</li>
        </ul>

        <h3>Tron Light Cycle</h3>
        <ul>
          <li>Your cycle leaves a permanent trail</li>
          <li>Hitting any trail or wall eliminates you</li>
          <li>Outlast the AI opponent to win the round</li>
        </ul>

        <h3>Hybrid Mode</h3>
        <ul>
          <li>Combines Snake growth with Tron trails</li>
          <li>Collect power-ups for temporary abilities:</li>
          <li>
            <strong>Shield</strong> — absorb one collision
          </li>
          <li>
            <strong>Phase</strong> — pass through trails
          </li>
          <li>
            <strong>Boost</strong> — temporary speed increase
          </li>
        </ul>

        <h3>Tips</h3>
        <ul>
          <li>Hug walls to keep the center open</li>
          <li>Use zig-zag patterns when your trail is long</li>
          <li>Plan turns ahead — the queue buffers 2 inputs</li>
        </ul>
      </div>
      <div className={styles.menu} style={{ marginTop: '1.5rem' }}>
        <button className={styles.menuBtn} onClick={onBack} autoFocus>
          Back
        </button>
      </div>
    </div>
  )
}
