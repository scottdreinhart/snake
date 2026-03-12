# Electron Instructions

> **Scope**: Electron desktop app development, builds, preview, and packaging.
> Subordinate to `AGENTS.md` §5 (shell routing).

---

## Overview

Electron wraps the Vite web app in a native desktop window.
- **Main process**: `electron/main.js`
- **Preload script**: `electron/preload.js`

---

## Scripts

| Script | What It Does |
|---|---|
| `pnpm electron:dev` | Launches Vite + Electron together |
| `pnpm electron:preview` | Builds Vite → opens Electron on `dist/` |
| `pnpm electron:build` | Vite build + electron-builder → `release/` |
| `pnpm electron:build:win` | Windows build → `release/` |
| `pnpm electron:build:linux` | Linux `.AppImage` → `release/` |
| `pnpm electron:build:mac` | macOS `.dmg` → `release/` |

---

## Environment Routing

| Script | Required Shell |
|---|---|
| `pnpm electron:dev` | Bash (WSL: Ubuntu) |
| `pnpm electron:preview` | Bash (WSL: Ubuntu) |
| `pnpm electron:build:win` | **PowerShell** |
| `pnpm electron:build:linux` | Bash (WSL: Ubuntu) |
| `pnpm electron:build:mac` | **macOS / Apple** |

---

## Packaging Configuration

| Field | Value |
|---|---|
| `appId` | `com.scottreinhart.snake` |
| `productName` | `Snake` |
| `directories.output` | `release` |
| `win.target` | `portable` |
| `mac.target` | `dmg` |
| `linux.target` | `AppImage` |

---

## Language Guardrails

Electron scripts use **JavaScript**. Do not introduce orphaned helper scripts.
