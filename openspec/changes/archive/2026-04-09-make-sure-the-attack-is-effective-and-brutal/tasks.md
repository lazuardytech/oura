## 1. Input Sanitization

- [x] 1.1 Add `sanitizeForScript()` utility in `src/utils/sanitizer.ts` — uses `JSON.stringify` to escape all user-provided strings (target, payload, header values) for safe insertion into k6 script template literals
- [x] 1.2 Add `validateMethod()` utility in `src/utils/validator.ts` — allowlist of `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`, throws on invalid methods
- [x] 1.3 Call `validateMethod()` in `src/commands/attack.ts` and replace raw method interpolation
- [x] 1.4 Call `validateDuration()` and `validateVUs()` in `src/commands/attack.ts` before script compilation, with clear error messages

## 2. Unified Stealth Mode

- [x] 2.1 Move 429-adaptive-backoff logic, screen resolution pools, timezone pools, and Sec-Ch-Ua headers from `src/k6/templates/stealth.ts` into `src/k6/templates/utils/stealth.ts` — update `generateStealthHelpersScript()` to include all pools, `generateStealthHeaders()` with Sec-Ch-Ua screen resolutions, and the backoff variable + logic
- [x] 2.2 Update `src/k6/templates/bombard.ts`, `ramping.ts`, and `soak.ts` — when `--stealth` is active, include the backoff variable and 429-handling in the default function (same pattern as stealth template)
- [x] 2.3 Refactor `src/k6/templates/stealth.ts` to use `generateStealthHelpersScript()` instead of inline constants, removing all duplicated pool arrays and helper functions

## 3. Duration-Aware Soak Template

- [x] 3.1 Add `parseDuration()` utility that converts k6 duration strings (`30s`, `5m`, `2h`) to seconds
- [x] 3.2 Refactor `src/k6/templates/soak.ts` to compute stage durations proportionally from `opts.duration` while preserving the 7-stage ramp pattern; fall back to hardcoded durations when `--duration` is not provided

## 4. Real-Time Output Streaming

- [x] 4.1 Refactor `K6Runner.execute()` in `src/k6/runner.ts` — replace `execFile`/`execFileAsync` with `child_process.spawn`; pipe `stdout` and `stderr` to `process.stdout` and `process.stderr` in real-time; preserve script cleanup in `finally`-equivalent handler
- [x] 4.2 Collect exit code from spawn process events and report errors (non-zero exit, signal kill) after stream ends

## 5. Config Defaults & Persistence

- [x] 5.1 Import `loadConfig` and `saveConfig` from `src/commands/config.ts` into `src/commands/attack.ts`
- [x] 5.2 Apply config defaults (`defaultVus`, `defaultDuration`, `defaultScenario`) as fallbacks when CLI flags are not explicitly provided
- [x] 5.3 After a successful attack, save `lastTarget` to config via `saveConfig`

## 6. Thresholds & Iterations Support

- [x] 6.1 Extend `AttackOptions` interface with `thresholds: string[]` and `iterations: number` fields
- [x] 6.2 Add `--threshold` repeatable flag and `--iterations` integer flag to `src/commands/attack.ts`
- [x] 6.3 Add threshold parsing utility in `src/utils/validator.ts` — parse `'metric:condition'` strings into `{ metric, condition }` objects
- [x] 6.4 Update each template (`bombard.ts`, `ramping.ts`, `soak.ts`, `stealth.ts`) to include `thresholds` in `export const options` when `opts.thresholds` is non-empty
- [x] 6.5 Update bombard template to use `iterations` instead of `duration` when `opts.iterations > 0`; update ramping/soak templates to include `iterations` alongside `stages` when set

## 7. Remove Dead Tags Code

- [x] 7.1 Remove `--tags` flag definition and parsing from `src/commands/attack.ts`
- [x] 7.2 Remove `tags` field from the `AttackOptions`-building block if present

## 8. Verification

- [x] 8.1 Run `npm run typecheck` and fix any TypeScript errors
- [x] 8.2 Run `npm run lint` and fix any lint errors
- [x] 8.3 Run `npm run build` and verify the build succeeds