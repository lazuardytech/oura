## Why

The current attack system has several gaps that undermine both raw destructive power and operational reliability: input values are interpolated unsafely into k6 scripts (enabling injection/malformed scripts), the soak template ignores the `--duration` flag entirely, stealth mode is split across two inconsistent codepaths (the dedicated stealth scenario has 429-backoff and richer fingerprints while `--stealth` on other scenarios does not), real test options like thresholds, iterations, and tags are missing or dead, config defaults are disconnected from the attack command, and all output is buffered until completion — making long-running attacks invisible to the operator. These issues mean attacks can break silently, produce deceptive results, or fail to push targets to their actual limits.

## What Changes

- **BREAKING**: Sanitize all user inputs (target, payload, headers, method) before interpolating into k6 script strings to prevent injection and malformed scripts
- Unify stealth mode: move 429-adaptive-backoff and full browser fingerprint rotation into the shared stealth utilities so `--stealth` on any scenario gets the same capabilities as the dedicated stealth template
- Fix soak template to respect the `--duration` flag instead of ignoring it
- Wire config defaults (`defaultVus`, `defaultDuration`, `defaultScenario`, `lastTarget`) into the attack command so `~/.oura/config.json` values actually apply
- Add `--threshold` flag for k6 pass/fail thresholds (e.g., `--threshold 'http_req_duration:p(95)<500'`)
- Add `--iterations` flag to set a fixed iteration cap per VU instead of time-based duration
- Remove dead `--tags` flag plumbing (parsed but never passed to k6) — either wire it to k6 `--tag` or remove it
- Validate `--vus` and `--duration` inputs before script compilation (validators exist but are not called)
- Stream k6 stdout/stderr in real-time using `child_process.spawn` instead of buffering via `execFile` — critical for soak and long-running attacks
- Save `lastTarget` to config after each successful attack run

## Capabilities

### New Capabilities
- `input-sanitization`: Safe handling of all user-supplied values interpolated into k6 scripts (target, payload, headers, method)
- `realtime-output`: Stream k6 process output to the console in real-time during attacks instead of buffering
- `attack-thresholds`: Per-run pass/fail threshold configuration via `--threshold` flag

### Modified Capabilities
<!-- No existing specs to modify -->

## Impact

- **`src/k6/runner.ts`**: Switch from `execFile` to `spawn` for real-time output; sanitize all interpolated values; support new options (`iterations`, `thresholds`); save `lastTarget` to config after runs
- **`src/k6/templates/bombard.ts`**, **`ramping.ts`**, **`soak.ts`**: Consume unified stealth helpers with 429-backoff; soak template must accept and use `duration`
- **`src/k6/templates/stealth.ts`**: Deduplicate — the dedicated stealth scenario should use the same unified helpers
- **`src/k6/templates/utils/stealth.ts`**: Expand to include 429-backoff logic, screen resolutions, timezones, and Sec-Ch-Ua headers that currently only exist in the dedicated stealth template
- **`src/commands/attack.ts`**: Wire config defaults; add `--threshold` and `--iterations` flags; call `validateDuration`/`validateVUs`; fix `--tags` (wire or remove); save `lastTarget` after success
- **`src/utils/validator.ts`**: Integrate `validateDuration` and `validateVUs` into the attack flow