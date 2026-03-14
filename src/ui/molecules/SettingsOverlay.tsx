/**
 * SettingsOverlay — unified settings panel.
 * Combines game mode, difficulty, wrap, theme, board size, and sound.
 */

import { useSoundContext } from '@/app/SoundContext'
import { useThemeContext } from '@/app/ThemeContext'
import { BOARD_SIZES, DIFFICULTY_LABELS, MODE_LABELS } from '@/domain/constants'
import type { ColorTheme } from '@/domain/themes'
import { COLOR_THEMES } from '@/domain/themes'
import type { Difficulty, GameMode } from '@/domain/types'
import styles from './Overlay.module.css'

const MODES: GameMode[] = ['hybrid', 'classic', 'tron']
const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']

interface SettingsOverlayProps {
  mode: GameMode
  difficulty: Difficulty
  wrapMode: boolean
  boardWidth: number
  boardHeight: number
  onSetMode: (mode: GameMode) => void
  onSetDifficulty: (d: Difficulty) => void
  onToggleWrap: () => void
  onSetBoardSize: (w: number, h: number) => void
  onBack: () => void
}

export function SettingsOverlay({
  mode,
  difficulty,
  wrapMode,
  boardWidth,
  boardHeight,
  onSetMode,
  onSetDifficulty,
  onToggleWrap,
  onSetBoardSize,
  onBack,
}: SettingsOverlayProps) {
  const { colorTheme, setColorTheme } = useThemeContext()
  const { soundEnabled, toggleSound } = useSoundContext()

  return (
    <div className={styles.overlay}>
      <h1 className={styles.title}>Settings</h1>
      <div className={styles.settingsScroll}>
        <div className={styles.menu}>
          <div className={styles.label}>Game Mode</div>
          <div className={styles.selectorRow}>
            {MODES.map((m) => (
              <button
                key={m}
                className={m === mode ? styles.selectorBtnActive : styles.selectorBtn}
                onClick={() => onSetMode(m)}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          <div className={styles.label}>Difficulty</div>
          <div className={styles.selectorRow}>
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                className={d === difficulty ? styles.selectorBtnActive : styles.selectorBtn}
                onClick={() => onSetDifficulty(d)}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>

          <div className={styles.label}>Wrap Mode</div>
          <div className={styles.row}>
            <button
              className={wrapMode ? styles.toggleBtnOn : styles.toggleBtn}
              onClick={onToggleWrap}
            >
              {wrapMode ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className={styles.label}>Theme</div>
          <div className={styles.selectorRow}>
            {COLOR_THEMES.map((t) => (
              <button
                key={t}
                className={t === colorTheme ? styles.selectorBtnActive : styles.selectorBtn}
                onClick={() => setColorTheme(t as ColorTheme)}
              >
                {t}
              </button>
            ))}
          </div>

          <div className={styles.label}>Board Size</div>
          <div className={styles.selectorRow}>
            {BOARD_SIZES.map((b) => {
              const active = b.width === boardWidth && b.height === boardHeight
              return (
                <button
                  key={`${b.width}x${b.height}`}
                  className={active ? styles.selectorBtnActive : styles.selectorBtn}
                  onClick={() => onSetBoardSize(b.width, b.height)}
                >
                  {b.width}x{b.height}
                </button>
              )
            })}
          </div>

          <div className={styles.label}>Sound</div>
          <div className={styles.row}>
            <button
              className={soundEnabled ? styles.toggleBtnOn : styles.toggleBtn}
              onClick={toggleSound}
            >
              {soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <button className={styles.menuBtn} onClick={onBack}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
