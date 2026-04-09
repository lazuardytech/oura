## ADDED Requirements

### Requirement: Threshold configuration via CLI flag
The system SHALL accept a repeatable `--threshold` flag that specifies k6 pass/fail threshold expressions. Each threshold SHALL be injected into the `thresholds` section of the k6 script's `export const options` object.

#### Scenario: Single threshold for p95 response time
- **WHEN** a user runs `oura attack -t https://example.com --threshold 'http_req_duration:p(95)<500'`
- **THEN** the generated k6 script SHALL include `thresholds: { http_req_duration: ["p(95)<500"] }` in its options

#### Scenario: Multiple thresholds
- **WHEN** a user provides multiple `--threshold` flags (e.g., one for duration and one for failure rate)
- **THEN** all thresholds SHALL be grouped by metric name in the k6 script's options object

#### Scenario: No thresholds specified
- **WHEN** a user runs an attack without any `--threshold` flag
- **THEN** the generated k6 script SHALL NOT include a `thresholds` section in options (current behavior preserved)

### Requirement: Iteration-limited attacks via CLI flag
The system SHALL accept an `--iterations <n>` flag that sets a fixed number of iterations per VU, replacing time-based duration in the k6 script options. When `--iterations` is specified, the `duration` option SHALL be omitted from the generated script for scenarios that use `vus` + `duration` (bombard).

#### Scenario: Bombard with iterations
- **WHEN** a user runs `oura attack -t https://example.com -s bombard --iterations 1000`
- **THEN** the generated k6 script SHALL include `iterations: 1000` in its options and SHALL NOT include the `duration` option

#### Scenario: Ramping with iterations
- **WHEN** a user runs `oura attack -t https://example.com -s ramping --iterations 500`
- **THEN** the generated k6 script SHALL include `iterations: 500` alongside the `stages` configuration, allowing k6 to cap total iterations per VU

#### Scenario: No iterations specified
- **WHEN** a user runs an attack without `--iterations`
- **THEN** the generated k6 script SHALL use `duration` or `stages` as before (current behavior preserved)

### Requirement: Threshold and iteration options on AttackOptions
The `AttackOptions` interface SHALL be extended with `thresholds: string[]` and `iterations: number` fields. The `attack` command SHALL parse `--threshold` flags into the `thresholds` array and `--iterations` into a number (defaulting to 0 meaning not set). Template functions SHALL receive these new fields and include them in generated scripts when non-empty/non-zero.

#### Scenario: AttackOptions carries thresholds
- **WHEN** the attack command processes CLI arguments with `--threshold` flags
- **THEN** `AttackOptions.thresholds` SHALL contain the raw threshold expression strings for template consumption

#### Scenario: AttackOptions carries iterations
- **WHEN** the attack command processes CLI arguments with `--iterations`
- **THEN** `AttackOptions.iterations` SHALL contain the integer value for template consumption