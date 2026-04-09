## Why

There are 8 lint warnings and 17 infos across the codebase that should be cleaned up. These fall into clear categories: missing `node:` import protocols, `noExplicitAny` usage, unused variables, string concatenation instead of template literals, and use of global `isNaN` instead of `Number.isNaN`. Fixing these improves code quality, eliminates type-safety gaps, and achieves a clean lint pass.

## What Changes

- Add `node:` protocol prefix to all Node.js builtin imports (`fs`, `path`, `os`, `child_process`, `util`) across `src/commands/config.ts`, `src/commands/report.ts`, and `src/k6/runner.ts`
- Replace `any` type annotations with proper types in `src/commands/attack.ts` (catch clause), `src/commands/config.ts` (dynamic config key access), `src/commands/report.ts` (catch clause), and `src/utils/validator.ts` (`includes` type narrowing)
- Remove unused `isDefault` function and unused `parsedThresholds` variable from `src/commands/attack.ts`
- Replace string concatenation (`+`) with template literals in `src/k6/templates/bombard.ts`, `src/k6/templates/ramping.ts`, and `src/k6/templates/soak.ts`
- Replace `isNaN()` with `Number.isNaN()` in `src/commands/config.ts`

## Capabilities

### New Capabilities

<!-- No new capabilities introduced -->

### Modified Capabilities

<!-- No spec-level behavior changes — these are code quality fixes with no functional impact -->

## Impact

- Files modified: `src/commands/attack.ts`, `src/commands/config.ts`, `src/commands/report.ts`, `src/k6/runner.ts`, `src/k6/templates/bombard.ts`, `src/k6/templates/ramping.ts`, `src/k6/templates/soak.ts`, `src/utils/validator.ts`
- No API, dependency, or behavioral changes
- Lint pass should produce zero warnings/errors after fix