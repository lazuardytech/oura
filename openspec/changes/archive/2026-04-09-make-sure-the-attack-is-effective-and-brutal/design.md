## Context

Oura is a CLI tool that compiles k6 test scripts from templates and executes them. The current attack pipeline has several reliability and effectiveness gaps:

- **Unsafe interpolation**: Target URLs, payloads, and header values are interpolated directly into k6 JavaScript strings via template literals (`"${opts.target}"`). Any quote or backtick in user input breaks the generated script or enables injection.
- **Fragmented stealth**: The dedicated `stealth` scenario has richer behavior (429-adaptive-backoff, screen resolutions, timezones, Sec-Ch-Ua headers) than the `--stealth` flag on other scenarios, which uses a simpler shared helper. Two codepaths produce inconsistent behavior.
- **Soak ignores duration**: The soak template hardcodes stage durations (`2m`, `5m`, `3m`) regardless of `--duration`, making the flag misleading.
- **Buffered output**: `K6Runner.execute()` uses `child_process.execFile` which buffers all stdout/stderr until k6 exits. For long-running tests, the user sees nothing until completion.
- **Disconnected config**: The `config` command stores `defaultVus`, `defaultDuration`, `defaultScenario`, and `lastTarget` but the `attack` command never reads these values.
- **Dead `--tags` code**: Parsed but never passed to k6.
- **Unused validators**: `validateDuration` and `validateVUs` exist in `validator.ts` but are never called.
- **No thresholds or iterations**: k6 supports pass/fail thresholds and iteration-based execution, but Oura exposes neither.

## Goals / Non-Goals

**Goals:**

- Ensure generated k6 scripts are always syntactically valid regardless of user input content
- Unify stealth behavior so `--stealth` on any scenario produces the same attack profile as the dedicated stealth scenario
- Make soak template honor `--duration` with scaled stages
- Stream k6 output in real-time so operators can observe long-running attacks
- Wire config defaults and `lastTarget` persistence into the attack flow
- Expose k6 thresholds and iterations as CLI options
- Remove or wire the `--tags` flag
- Validate VUs and duration before script compilation

**Non-Goals:**

- Running k6 in distributed/clustered mode
- Adding new attack scenario types beyond the existing four
- Removing or replacing the localhost restriction in `validateTarget`
- Adding a web UI or dashboard
- Storing attack history in a database

## Decisions

### D1: Input sanitization via JSON.stringify

**Decision**: Sanitize all user-supplied values by passing them through `JSON.stringify()` before interpolation into k6 script strings. For `method`, validate against a strict allowlist of HTTP methods.

**Rationale**: `JSON.stringify` correctly escapes quotes, backticks, newlines, and other special characters without manual escaping logic. The allowlist for methods (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`) prevents arbitrary function calls in `http.${method}`.

**Alternatives considered**: Manual character escaping (error-prone), using k6 environment variables to pass values at runtime (complex, requires changes to all templates), generating scripts via an AST builder (overkill).

### D2: Unified stealth in shared helpers

**Decision**: Move all stealth logic (429-adaptive-backoff, screen resolutions, timezones, Sec-Ch-Ua headers) into `utils/stealth.ts`'s `generateStealthHelpersScript()`. Remove the inline implementations from `stealth.ts` template — it now calls the shared helper. All four scenarios produce identical stealth behavior when `--stealth` is active.

**Rationale**: One source of truth for stealth behavior. The dedicated stealth scenario's extra pools (resolutions, timezones) and 429-backoff are genuinely useful for evasion and should be available everywhere.

**Alternatives considered**: Keeping two codepaths and documenting the difference (confusing for users), removing the dedicated stealth scenario entirely (loses the ramping-stage wrapper that's useful).

### D3: Spawn-based streaming output

**Decision**: Replace `execFile` with `child_process.spawn` in `K6Runner.execute()`. Pipe k6's stdout and stderr to the parent process streams in real-time.

**Rationale**: For soak tests running 20+ minutes, buffered output is untenable. `spawn` streams data as it arrives and avoids the 50MB `maxBuffer` constraint. The `finally` cleanup block is preserved via process event handlers.

**Alternatives considered**: Keeping `execFile` but increasing `maxBuffer` (still delayed), using a temporary file and tailing it (complex, race conditions).

### D4: Duration-aware soak template

**Decision**: Parse the `--duration` value (e.g. `30m`) into total seconds, then proportionally scale the existing soak stage durations to fit within that total. If `--duration` is not provided, fall back to current hardcoded durations.

**Rationale**: The current 7-stage soak pattern (ramp up → hold → ramp up → hold → full → hold → ramp down) is a good pattern. Proportional scaling preserves it while respecting user intent.

**Alternatives considered**: Making soak a simple flat-duration like bombard (loses the multi-stage value), requiring the user to manually specify stages with `--ramp-up` (poor UX for a soak).

### D5: Config defaults override hierarchy

**Decision**: Load config defaults first, then overlay any explicitly-provided CLI flags. Commander's `.option()` calls keep CLI defaults as fallback, and we detect "explicitly provided" by checking if the raw argv differs from the default.

**Rationale**: This gives users persistent configuration without surprising overrides. A flag explicitly passed on the command line always wins over the config file.

**Alternatives considered**: Commander middleware (fragile), separate config resolution step before Commander parsing (duplicates logic).

### D6: Thresholds as k6 script `options.thresholds`

**Decision**: Add `--threshold` flag (repeatable) that injects threshold entries into the k6 script's `export const options = { thresholds: { ... } }` block. Each `--threshold 'metric:condition'` maps to a k6 threshold expression.

**Rationale**: Thresholds are a core k6 feature for defining pass/fail criteria. Injecting them into the compiled script is simpler and more portable than trying to pass them via k6 CLI flags.

**Alternatives considered**: Using k6's `--threshold` CLI flag (doesn't exist; thresholds are script-only), storing threshold presets in config (scope creep).

### D7: Iterations via `options.iterations`

**Decision**: Add `--iterations <n>` flag. When set, include `iterations: n` in the k6 script options instead of `duration`. This enables fixed-iteration testing independent of time.

**Rationale**: k6 natively supports `iterations` as a top-level option. It is mutually exclusive with `duration` for the `bombard` scenario but compatible with `stages` in `ramping`/`soak`.

**Alternatives considered**: Exposing both simultaneously (k6 doesn't support it for VU-level iteration counts), only supporting `--iterations` for bombard (too limited).

### D8: Remove the `--tags` flag

**Decision**: Remove the `--tags` CLI flag and related dead code from `attack.ts`. k6's `--tag` flag is a runtime execution tag, not a script-level concern, and the current implementation is entirely unused.

**Rationale**: Dead code is confusing. If we want test tagging in the future, it should be designed properly as a k6 execution flag, not an unused parsed-but-ignored parameter.

**Alternatives considered**: Wiring `--tags` to k6's `--tag` CLI flag (possible but the current JSON-string interface doesn't match k6's `key=value` format, would need redesign).

### D9: Pre-compilation validation

**Decision**: Call `validateDuration()` and `validateVUs()` in the attack command before compiling the script. Throw clear errors for invalid inputs rather than letting k6 fail with cryptic messages.

**Rationale**: The validators already exist and are correct. They just aren't called.

**Alternatives considered**: Letting k6 handle validation (poor UX, cryptic errors).

## Risks / Trade-offs

- **[Risk] JSON.stringify changes template output format** → The generated scripts will use single-quoted strings with escaped characters rather than double-quoted strings. This is valid JavaScript and functionally identical. All existing tests should pass.
- **[Risk] Unifying stealth may change bombard/ramping/soak behavior** → The `--stealth` flag on those templates will now include 429-backoff, which adds sleeps on rate-limited responses. This makes stealth mode more evasive but slightly less aggressive. Acceptable tradeoff for a stealth mode.
- **[Risk] Spawn-based output changes error handling** → `spawn` doesn't buffer output, so the `err.stdout`/`err.stderr` pattern in the catch block needs restructuring. We'll collect stderr separately for error reporting while streaming it live.
- **[Risk] Duration parsing for soak is approximate** → Proportional scaling of soak stages based on parsed duration means very short durations (e.g. `10s`) produce tiny stages. Mitigate by enforcing a minimum soak duration (e.g. 5 minutes) and documenting it.
- **[Risk] Config override detection with Commander** → Detecting "was this flag explicitly provided?" requires checking `process.argv` or using Commander's `.optsWithGlobals()`. This is fragile across Commander versions. Mitigate by using a simple comparison of the parsed value against the default.