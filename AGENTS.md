# AGENTS.md — Repository Governance Constitution

> **Scope**: Repository-wide. This file is the top-level authority for every AI agent,
> IDE assistant, CLI tool, and CI pipeline operating in this repository.
> All other governance files inherit from and must not contradict this document.

---

## 1. Governance Precedence

1. **AGENTS.md** (this file) — supreme authority; overrides all other governance files.
2. `.github/copilot-instructions.md` — repo-wide Copilot runtime policy.
3. `.github/instructions/*.instructions.md` — scoped, numbered instruction files.
4. `docs/**` — human-readable reference documents (informational, not directive).

If any scoped file contradicts AGENTS.md, AGENTS.md wins.

---

## 2. Absolute Package-Manager Rule

This repository uses **pnpm exclusively**.

| Field | Value |
|---|---|
| `packageManager` | `pnpm@10.31.0` |
| `engines.node` | `24.14.0` |
| `engines.pnpm` | `10.31.0` |

### Mandatory

- Use `pnpm install`, `pnpm add`, `pnpm remove`, `pnpm update`, `pnpm exec`, `pnpm run <script>`.
- Preserve `pnpm-lock.yaml` and `pnpm-workspace.yaml`.

### Forbidden

- Never use `npm`, `npx`, `yarn`, or any non-pnpm package manager.
- Never generate `package-lock.json` or `yarn.lock`.
- Never suggest `npm install`, `npm run`, `npx`, or Yarn workflows.

---

## 3. Architecture Preservation

This project enforces **CLEAN Architecture** with three layers:

| Layer | Path | May Import | Must Not Import |
|---|---|---|---|
| **Domain** | `src/domain/` | `domain/` only | `app/`, `ui/`, React, any framework |
| **App** | `src/app/` | `domain/`, `app/` | `ui/` |
| **UI** | `src/ui/` | `domain/`, `app/`, `ui/` | — |
| **Workers** | `src/workers/` | `domain/` only | `app/`, `ui/`, React |
| **Themes** | `src/themes/` | nothing (pure CSS) | everything |

### Component Hierarchy (Atomic Design)

ui/atoms/ → ui/molecules/ → ui/organisms/

Data flows unidirectionally: **Hooks → Organism → Molecules → Atoms**.

### Import Conventions

- Use path aliases: `@/domain`, `@/app`, `@/ui` (configured in `tsconfig.json` and `vite.config.js`).
- Every directory exposes a barrel `index.ts`. Import from the barrel, not internal files.
- Never introduce `../../` cross-layer relative imports.

---

## 4. Path Discipline

| Path | Purpose |
|---|---|
| `src/domain/` | Pure, framework-agnostic game logic |
| `src/app/` | React hooks, context providers, services |
| `src/ui/atoms/` | Smallest reusable UI primitives |
| `src/ui/molecules/` | Composed atom groups |
| `src/ui/organisms/` | Full feature components |
| `src/themes/` | Lazy-loaded CSS theme files |
| `src/wasm/` | WASM AI loader + fallback |
| `src/workers/` | Web Worker entry points |
| `electron/` | Electron main + preload |
| `assembly/` | AssemblyScript source |
| `scripts/` | Build-time Node scripts |
| `public/` | Static assets (manifest, SW, offline page) |
| `dist/` | Vite build output (gitignored) |
| `release/` | Electron Builder output (gitignored) |
| `docs/` | Human-readable documentation |

Do not invent new top-level directories without explicit user instruction.

---

## 5. Cross-platform shell governance

### Linux builds and development

Use **Bash** (WSL: Ubuntu / native Linux / CI) for all general development:
- `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm check`, `pnpm fix`, `pnpm validate`
- `pnpm wasm:build`, `pnpm electron:dev`, `pnpm electron:build:linux`, `pnpm cap:sync`
- linting, formatting, typechecking, cleanup, documentation

### Windows builds

**PowerShell** only for: `pnpm run electron:build:win`

### macOS and iOS builds

**macOS** only for: `pnpm run electron:build:mac`, `pnpm run cap:init:ios`, `pnpm run cap:open:ios`, `pnpm run cap:run:ios`

### Android builds

**Android SDK** only for: `pnpm run cap:init:android`, `pnpm run cap:open:android`, `pnpm run cap:run:android`

### Shell routing summary

| Environment | Tasks |
|---|---|
| **Bash** (WSL / Linux / CI) | All general development, builds, quality checks, WASM, Electron dev, Linux packaging, Capacitor sync |
| **PowerShell** | `electron:build:win` only |
| **macOS** | `electron:build:mac`, iOS Capacitor tasks |
| **Android SDK** | Android Capacitor tasks |

### Hard-stop rules

Never default to PowerShell for routine development. Never claim iOS tasks can run from Windows/WSL.

---

## 6. Language, Syntax, and Script Governance

### Approved languages

HTML, CSS, JavaScript, TypeScript, AssemblyScript, WebAssembly

### Priority: TypeScript > JavaScript > HTML > CSS > AssemblyScript > WebAssembly

### Rules

- Do not create orphaned scripts in random languages.
- Do not create parallel toolchains.
- New files must live in existing directories.
- Prefer repository-native tooling.

### Anti-orphan-script policy

Every new script must: solve a real need, belong to approved languages, fit existing structure, not duplicate tooling.

---

## 7. Minimal-Change Principle

Modify only what was requested. Do not refactor beyond scope. Preserve existing style.

---

## 8. Response Contract

1. Use pnpm. 2. Respect layer boundaries. 3. Use path aliases. 4. Use existing scripts. 5. Target correct shell. 6. Cite governance.

---

## 9. Self-Check Before Every Response

- [ ] Using pnpm? Layer boundaries? Path aliases? Correct shell? Approved language? No orphaned scripts? Minimal change? Existing scripts?
