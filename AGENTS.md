# AGENTS.md

This file provides guidance for AI agents working on this project.

## Project Overview

Oura is a CLI tool for stress-testing web targets using k6. It compiles k6 test scripts from templates, executes them, and reports on the results.

## Tech Stack

- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js >= 20
- **Build**: tsup (ESM output)
- **CLI Framework**: Commander.js
- **External Dependency**: [k6](https://k6.io/) must be installed on the host machine
- **Package Manager**: npm

## Commands

```bash
npm run build      # Build with tsup
npm run dev        # Watch-mode build
npm run typecheck  # TypeScript type checking (tsc --noEmit)
npm run lint       # Biome lint
npm run format     # Biome format --write
npm start          # Run built CLI
```

## Code Conventions

- ESM modules throughout (`"type": "module"` implied by tsup config)
- All source files under `src/`
- Compiled output goes to `dist/`
- k6 script templates return string literals (not files on disk)
- Templates receive `AttackOptions` and produce k6-compatible JavaScript
- Entry point includes shebang `#!/usr/bin/env node`

## Key Files

| Path | Purpose |
|------|---------|
| `src/index.ts` | CLI entry point, registers commands |
| `src/commands/attack.ts` | Primary attack command |
| `src/commands/scan.ts` | Frontend API/WebSocket/webhook scanner |
| `src/commands/report.ts` | Parses and displays k6 summary JSON |
| `src/commands/config.ts` | Manages `~/.oura/config.json` |
| `src/k6/runner.ts` | Compiles scripts from templates and executes k6 |
| `src/k6/templates/bombard.ts` | Constant-load scenario |
| `src/k6/templates/ramping.ts` | Progressive-ramp scenario |
| `src/k6/templates/soak.ts` | Long-duration soak scenario |
| `src/k6/templates/stealth.ts` | Stealth mode scenario (rotating headers, delays) |
| `src/k6/templates/form-flood.ts` | Form auto-detection and flood scenario |
| `src/k6/templates/utils/stealth.ts` | Shared stealth helpers (User-Agents, headers, IP spoofing, backoff) |
| `src/k6/templates/utils/form-scanner.ts` | HTML form field detection |
| `src/utils/logger.ts` | Colored console output |
| `src/utils/validator.ts` | URL, method, proxy, duration, threshold validation |
| `src/utils/sanitizer.ts` | Script injection sanitization |
| `src/utils/fetcher.ts` | Node.js HTTP/HTTPS fetcher (no external deps) |

## Architecture Notes

- The `K6Runner` class in `src/k6/runner.ts` is the core engine. It compiles a k6 script string from a template, writes it to `~/.oura/scripts/`, runs `k6 run <script>`, then cleans up.
- Templates are plain functions that take `AttackOptions` and return a k6 JavaScript string.
- The `form-flood` scenario is handled specially: `K6Runner.compileScript()` calls `scanFormFields()` first, then passes detected fields to the template.
- The `scan` command uses `fetchWithNode()` from `src/utils/fetcher.ts` to fetch pages without external HTTP dependencies.
- The CLI does not bundle k6; it expects k6 to be available on the system `$PATH` or at common install paths.
- Config is stored at `~/.oura/config.json`.
- Generated scripts are ephemeral — written before execution, deleted after.

## Making Changes

1. Always run `npm run typecheck` after modifying TypeScript files.
2. Always run `npm run lint` and `npm run format` before committing.
3. Always run `npm run build` before testing changes.
4. When adding new attack scenarios, create a new template in `src/k6/templates/` and register it in `K6Runner.templates` in `src/k6/runner.ts`.
5. When adding new CLI commands, create a file in `src/commands/` and register it in `src/index.ts`.
6. Never commit contents of `dist/` or `node_modules/`.

## Pre-Push Checklist

Before pushing to GitHub, **always** run:

```bash
bun run lint
bun run format
```

Both must pass with zero errors. Do not push if either fails.
