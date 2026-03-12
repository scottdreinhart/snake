# Capacitor Instructions

> **Scope**: Capacitor mobile/tablet app development.
> Subordinate to `AGENTS.md` §5 (shell routing).

---

## Overview

Capacitor wraps the Vite `dist/` output in native Android and iOS app shells.
Configuration: `capacitor.config.ts`.

---

## Scripts

| Script | What It Does |
|---|---|
| `pnpm cap:init:android` | Add Android project |
| `pnpm cap:init:ios` | Add iOS project |
| `pnpm cap:sync` | Vite build + sync to native projects |
| `pnpm cap:open:android` | Open in Android Studio |
| `pnpm cap:open:ios` | Open in Xcode |
| `pnpm cap:run:android` | Deploy to Android |
| `pnpm cap:run:ios` | Deploy to iOS |

---

## Environment Routing

| Script | Required Environment |
|---|---|
| `pnpm cap:sync` | Bash (WSL: Ubuntu) |
| `pnpm cap:init:ios` | **macOS / Apple** |
| `pnpm cap:open:ios` | **macOS / Apple** |
| `pnpm cap:run:ios` | **macOS / Apple** |
| `pnpm cap:run:android` | Android SDK |

**iOS builds require Apple hardware.**

---

## Language Guardrails

Capacitor config uses **TypeScript**. Do not introduce orphaned scripts.
