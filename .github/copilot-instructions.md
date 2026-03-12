# Copilot Runtime Policy — Snake

> **Authority**: This file is subordinate to `AGENTS.md`. If any rule here conflicts, `AGENTS.md` wins.

Default development shell for this repository: **Bash (WSL Ubuntu)**.

Do not default to PowerShell unless the task is specifically a Windows packaging workflow such as `electron:build:win`.

---

## Package Manager

**pnpm only.** Never use npm, npx, yarn, or generate non-pnpm lockfiles.

---

## Architecture (CLEAN + Atomic Design)

| Layer | Path | May Import |
|---|---|---|
| Domain | `src/domain/` | `domain/` only |
| App | `src/app/` | `domain/`, `app/` |
| UI | `src/ui/` | `domain/`, `app/`, `ui/` |
| Workers | `src/workers/` | `domain/` only |
| Themes | `src/themes/` | nothing (pure CSS) |

**Component hierarchy**: `atoms/ → molecules/ → organisms/`
**Data flow**: Hooks → Organism → Molecules → Atoms (unidirectional)

---

## Import Rules

- Use path aliases: `@/domain/...`, `@/app/...`, `@/ui/...`.
- Import from barrel `index.ts` files, not internal modules.
- Never use `../../` cross-layer relative imports.

---

## Key Scripts

| Task | Script |
|---|---|
| Dev server | `pnpm start` or `pnpm dev` |
| Build | `pnpm build` |
| Quality gate | `pnpm check` |
| Auto-fix | `pnpm fix` |
| Full validation | `pnpm validate` |
| Clean | `pnpm clean` / `pnpm clean:node` / `pnpm clean:all` / `pnpm reinstall` |

---

## Shell Routing

Default to **Bash (WSL: Ubuntu)** for all development work.

Use **PowerShell** only for: `pnpm run electron:build:win`
Use **macOS** only for: `pnpm run electron:build:mac`, iOS Capacitor tasks
Use **Android SDK** only for: Android Capacitor tasks

---

## Language Guardrails

Approved languages: HTML, CSS, JavaScript, TypeScript, AssemblyScript, WebAssembly.
Do not introduce orphaned helper scripts or alternate runtimes.

---

## Behavioral Rules

1. **Minimal change** — modify only what was requested.
2. **Preserve style** — match existing conventions.
3. **Cite governance** — name the rule and suggest alternatives.
4. **No new top-level directories** without explicit instruction.
5. **Use existing scripts** from `package.json` before inventing CLI commands.
