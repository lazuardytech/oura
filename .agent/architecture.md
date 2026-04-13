# Architecture

## Overview

Oura is a CLI wrapper around [k6](https://k6.io/) that generates k6 scripts from templates and executes stress tests against web targets.

## Flow

```
User → CLI (Commander.js)
         ↓
    attack/scan/report/config command
         ↓
    [attack] K6Runner.compileScript(AttackOptions)
         ↓
    Template function → k6 JS script string
    (form-flood: scanFormFields() → formFloodTemplate())
         ↓
    Write to ~/.oura/scripts/attack-<timestamp>.js
         ↓
    Execute: k6 run <script> [--summary-export <path>]
    (env: HTTP_PROXY, HTTPS_PROXY, PROXY_LIST)
         ↓
    Read stdout/stderr → Display results (filter Grafana banner)
         ↓
    Delete ephemeral script

    [scan] fetchWithNode(target) → regex pattern matching
         ↓
    Fetch inline + external scripts (up to 20)
         ↓
    Detect: API, Webhook, WebSocket, SSE, GraphQL endpoints
```

## Module Responsibilities

### `src/index.ts`
Entry point. Registers all Commander commands and parses argv.

### `src/commands/attack.ts`
Primary command. Validates inputs, builds `AttackOptions`, delegates to `K6Runner`.

### `src/commands/scan.ts`
Scans a frontend URL for API endpoints, WebSockets, webhooks, SSE, and GraphQL. Fetches page HTML and external scripts, applies regex pattern matching, displays categorized results.

### `src/commands/report.ts`
Reads a k6 `--summary-export` JSON file and prints a formatted summary of metrics (request count, duration percentiles, failure rate).

### `src/commands/config.ts`
Manages `~/.oura/config.json`. Provides `show`, `set <key> <value>`, and `reset` subcommands.

### `src/k6/runner.ts`
Core engine. Contains `K6Runner` class with:
- `compileScript(opts)` — selects template by scenario name, generates k6 JS. Form-flood is handled specially (calls `scanFormFields()` first).
- `execute(script, opts)` — writes script to disk, runs `k6 run`, sets proxy env vars, cleans up
- `findK6()` — locates k6 binary on PATH or common locations

### `src/k6/templates/*.ts`
Each export a function `(AttackOptions) → string` producing k6-compatible JavaScript:
- **bombard** — constant VUs, constant duration (supports iterations)
- **ramping** — staged VU ramps (parsed from `--ramp-up` or sensible defaults)
- **soak** — progressively increasing load over a long duration
- **stealth** — rotating headers, User-Agents, spoofed IPs, random delays
- **form-flood** — auto-detect form fields and flood with realistic data

### `src/k6/templates/utils/stealth.ts`
Shared stealth helpers: USER_AGENTS array, header generation, IP spoofing, backoff logic. Used by stealth template and `--stealth` flag.

### `src/k6/templates/utils/form-scanner.ts`
HTML form field detection. Parses HTML to identify input/select/textarea elements with types and names.

### `src/utils/logger.ts`
Colored console output utility (ANSI escape codes).

### `src/utils/validator.ts`
Input validation: URL format, protocol restrictions, localhost rejection, duration/VU format, HTTP method, proxy URL, threshold parsing.

### `src/utils/sanitizer.ts`
Script injection sanitization via `JSON.stringify()` for safe value embedding in generated k6 scripts.

### `src/utils/fetcher.ts`
Pure Node.js HTTP/HTTPS fetcher. Handles redirects, supports insecure mode (skip TLS), 10-second timeout. No external dependencies.

## Data Model

```typescript
interface AttackOptions {
  target: string;
  method: string;
  vus: number;
  duration: string;
  scenario: string;      // bombard | ramping | soak | stealth | form-flood
  payload: string;
  headers: Record<string, string>;
  rampUp: string;
  output: string;
  noCheck: boolean;
  stealth: boolean;
  proxy: string;
  proxyList: string[];
  origin: string;
  rps: number;
  iterations: number;
  thresholds: ParsedThreshold[];
  scanUrl: string;
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
