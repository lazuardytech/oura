# Development Guide

## Setup

```bash
npm install
npm run build
npm link
```

After linking, `oura` is available as a global CLI command.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run build` | Build with tsup (ESM output to `dist/`) |
| `npm run dev` | Watch-mode build |
| `npm run typecheck` | TypeScript type checking (`tsc --noEmit`) |
| `npm run lint` | ESLint |
| `npm start` | Run built CLI (`node dist/index.js`) |

## Project Structure

```
oura/
├── src/
│   ├── index.ts                # CLI entry, shebang, command registration
│   ├── commands/
│   │   ├── attack.ts           # oura attack
│   │   ├── report.ts           # oura report
│   │   └── config.ts           # oura config (show/set/reset)
│   ├── k6/
│   │   ├── runner.ts           # K6Runner class
│   │   └── templates/
│   │       ├── bombard.ts      # Constant-load template
│   │       ├── ramping.ts      # Progressive-ramp template
│   │       └── soak.ts         # Long-duration soak template
│   └── utils/
│       ├── logger.ts           # Colored console output
│       └── validator.ts        # URL and input validation
├── .agent/                     # Agent documentation
├── AGENTS.md                   # AI agent instructions
├── README.md                   # Project documentation
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Making Changes

### Adding a new attack scenario

1. Create `src/k6/templates/<name>.ts`
2. Export a function `(opts: AttackOptions) => string` returning k6 JS
3. Register in `src/k6/runner.ts` → `K6Runner.templates`
4. The scenario name becomes the `--scenario` option value

### Adding a new CLI command

1. Create `src/commands/<name>.ts`
2. Export a Commander `Command` instance
3. Import and register in `src/index.ts` via `program.addCommand()`

### Modifying k6 script generation

- Templates are in `src/k6/templates/`
- Each template is a pure function receiving `AttackOptions` and returning a JavaScript string
- The generated script must use k6's ES module API (`import http from "k6/http"`)
- Include response checks unless `--no-check` is set

### Modifying validation

- All input validation is in `src/utils/validator.ts`
- Current rules: valid URL, http/https only, no localhost

## Build Output

- tsup produces ESM output in `dist/`
- Entry file includes shebang `#!/usr/bin/env node`
- Source maps are enabled
- `dist/` is gitignored and should never be committed

## Testing Changes

1. `npm run typecheck` — verify no type errors
2. `npm run build` — compile to `dist/`
3. Run CLI: `node dist/index.js attack -t https://httpbin.org/get -u 5 -d 5s`
4. Ensure k6 is installed: `k6 version`