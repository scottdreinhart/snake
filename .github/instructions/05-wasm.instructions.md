# WASM Instructions — AssemblyScript / WebAssembly

> **Scope**: AssemblyScript source, WASM build pipeline, runtime loader, worker integration.
> Subordinate to `AGENTS.md` §6 (language governance).

---

## Overview

AssemblyScript compiles to WebAssembly, embedded as base64 and loaded at runtime in a Web Worker.

---

## Architecture

| Path | Purpose |
|---|---|
| `assembly/index.ts` | AssemblyScript source |
| `assembly/tsconfig.json` | AS compiler config |
| `scripts/build-wasm.js` | Build: AS → WASM → base64 → `src/wasm/ai-wasm.ts` |
| `src/wasm/ai-wasm.ts` | Auto-generated base64 WASM module (do not edit) |
| `src/workers/ai.worker.ts` | Web Worker — WASM-first with JS fallback |

---

## Scripts

| Script | Shell |
|---|---|
| `pnpm wasm:build` | Bash (WSL: Ubuntu) |
| `pnpm wasm:build:debug` | Bash (WSL: Ubuntu) |

---

## Language Boundaries

- **AssemblyScript** for WASM source.
- **JavaScript** for build script.
- **TypeScript** for runtime loader and worker.

Do not introduce other WASM-capable languages. Do not manually edit `src/wasm/ai-wasm.ts`.

---

## Anti-Orphan-Script Policy

Single build path: `pnpm wasm:build` → `scripts/build-wasm.js`. Do not create additional build scripts.
