# Architecture

## Overview

Oura is a CLI wrapper around [k6](https://k6.io/) that generates k6 scripts from templates and executes stress tests against web targets.

## Flow

```
User → CLI (Commander.js)
         ↓
    attack/report/config command
         ↓
    K6Runner.compileScript(AttackOptions)
         ↓
    Template function → k6 JS script string
         ↓
    Write to ~/.oura/scripts/attack-<timestamp>.js
         ↓
    Execute: k6 run <script> [--summary-export <path>]
         ↓
    Read stdout/stderr → Display results
         ↓
    Delete ephemeral script
```

## Module Responsibilities

### `src/index.ts`
Entry point. Registers all Commander commands and parses argv.

### `src/commands/attack.ts`
Primary command. Validates inputs, builds `AttackOptions`, delegates to `K6Runner`.

### `src/commands/report.ts`
Reads a k6 `--summary-export` JSON file and prints a formatted summary of metrics (request count, duration percentiles, failure rate).

### `src/commands/config.ts`
Manages `~/.oura/config.json`. Provides `show`, `set <key> <value>`, and `reset` subcommands.

### `src/k6/runner.ts`
Core engine. Contains `K6Runner` class with:
- `compileScript(opts)` — selects template by scenario name, generates k6 JS
- `execute(script, opts)` — writes script to disk, runs `k6 run`, cleans up
- `findK6()` — locates k6 binary on PATH or common locations

### `src/k6/templates/*.ts`
Each export a function `(AttackOptions) → string` producing k6-compatible JavaScript:
- **bombard** — constant VUs, constant duration
- **ramping** — staged VU ramps (parsed from `--ramp-up` or sensible defaults)
- **soak** — progressively increasing load over a long duration

### `src/utils/logger.ts`
Colored console output utility.

### `src/utils/validator.ts`
Input validation: URL format, protocol restrictions, localhost rejection, duration/VU format.

## Data Model

```typescript
interface AttackOptions {
  target: string;       // URL to test
  method: string;       // HTTP method
  vus: number;          // Virtual users
  duration: string;     // k6 duration string
  scenario: string;    // bombard | ramping | soak
  payload: string;     // Request body
  headers: Record<string, string>;
  rampUp: string;       // Custom ramp stages
  output: string;       // Path for k6 summary JSON
  noCheck: boolean;    // Disable response checks
}
```

## File System

| Path | Purpose |
|------|---------|
| `~/.oura/config.json` | Persistent configuration |
| `~/.oura/scripts/` | Ephemeral k6 scripts (created/deleted per run) |

## External Dependencies

- **k6** — must be pre-installed. Not bundled.
- **Node.js >= 20** — runtime for oura CLI