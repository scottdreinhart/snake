# Frontend Instructions — React / Vite / UI

> **Scope**: Frontend stack, CLEAN architecture layers, component hierarchy, styling.
> Subordinate to `AGENTS.md` §3 (architecture) and §4 (path discipline).

---

## Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI library |
| TypeScript | 5.9 | Static type checking |
| Vite | 7 | Build tool + dev server |
| ESLint | 10 | Linting |
| Prettier | 3 | Code formatting |
| CSS Modules | — | Scoped component styling |

---

## Architecture — CLEAN Layers

| Layer | Path | May Import | Must Not Import |
|---|---|---|---|
| **Domain** | `src/domain/` | `domain/` only | `app/`, `ui/`, React |
| **App** | `src/app/` | `domain/`, `app/` | `ui/` |
| **UI** | `src/ui/` | `domain/`, `app/`, `ui/` | — |
| **Workers** | `src/workers/` | `domain/` only | everything else |
| **Themes** | `src/themes/` | nothing | everything |

Boundaries enforced by `eslint-plugin-boundaries`.

### Domain Layer: Pure game logic. Barrel `index.ts`.
### App Layer: Hooks, context, services. Barrel `index.ts`.
### UI Layer: atoms/ → molecules/ → organisms/. Barrel `index.ts`.

---

## Import Conventions

- Path aliases: `@/domain/...`, `@/app/...`, `@/ui/...`.
- Barrel imports only. No cross-layer relative imports.

---

## Entry Point

`src/index.tsx`: ThemeProvider > SoundProvider > ErrorBoundary > App

---

## Styling

Global styles in `src/styles.css`. Themes in `src/themes/`. Component-scoped via CSS Modules.

---

## Quality Workflow

All commands run in **Bash (WSL: Ubuntu)**. Run `pnpm validate` before pushing.

---

## Language Guardrails

Frontend code uses **TypeScript** for logic and **CSS** for styling.
Do not introduce orphaned helper scripts or alternate runtimes.
