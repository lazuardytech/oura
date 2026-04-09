## ADDED Requirements

### Requirement: Real-time streaming of k6 output during attacks
The system SHALL stream k6's stdout and stderr to the console in real-time as the attack runs, rather than buffering all output until k6 exits. The system SHALL use `child_process.spawn` to execute k6 instead of `execFile`.

#### Scenario: Long-running soak test
- **WHEN** a user starts a soak test with `--duration 30m`
- **THEN** k6 progress output and iteration metrics SHALL appear on the console continuously as they are produced, not only after the test completes

#### Scenario: Attack completes successfully
- **WHEN** a k6 attack finishes with exit code 0
- **THEN** all output SHALL have been displayed in real-time during execution, and the system SHALL exit cleanly

#### Scenario: Attack fails mid-run
- **WHEN** a k6 process exits with a non-zero code
- **THEN** the system SHALL have streamed all available output before exit and SHALL report the exit code as an error

### Requirement: Ephemeral script cleanup on process errors
The system SHALL delete the temporary k6 script file in all cases: successful completion, error from k6, spawn failure, or process signal. The cleanup SHALL occur in a `finally`-equivalent handler on the spawn process.

#### Scenario: k6 crashes or is killed
- **WHEN** the k6 process is killed by a signal or crashes
- **THEN** the temporary script file at `~/.oura/scripts/` SHALL be deleted

#### Scenario: Spawn failure
- **WHEN** spawning the k6 process fails (e.g., k6 binary not found)
- **THEN** the temporary script file SHALL still be cleaned up if it was written