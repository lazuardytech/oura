## ADDED Requirements

### Requirement: All user inputs are safely interpolated into k6 scripts
The system SHALL sanitize all user-supplied values before interpolating them into generated k6 JavaScript strings. This includes `target`, `payload`, `headers` values, and any other string that originates from CLI input. The system SHALL use `JSON.stringify` on each value to ensure proper escaping of quotes, backticks, newlines, and special characters.

#### Scenario: Target URL with special characters
- **WHEN** a user provides a target URL containing double quotes (e.g., `http://example.com/path?q="hello"`)
- **THEN** the generated k6 script SHALL be syntactically valid JavaScript and SHALL NOT contain unescaped quotes or injection vectors

#### Scenario: Payload with template literal syntax
- **WHEN** a user provides a payload containing backticks or `${...}` expressions
- **THEN** the generated k6 script SHALL NOT execute the embedded expressions and SHALL treat them as literal strings

#### Scenario: Header value with special characters
- **WHEN** a user provides header values containing quotes, newlines, or escape sequences
- **THEN** each header value SHALL be safely interpolated as a proper JavaScript string in the generated script

### Requirement: HTTP method allowlist enforcement
The system SHALL validate the `--method` flag against an allowlist of permitted HTTP methods: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`. Any other value SHALL be rejected with a clear error message.

#### Scenario: Valid HTTP method
- **WHEN** a user provides `--method POST`
- **THEN** the system SHALL accept the method and generate a script using `http.post()`

#### Scenario: Invalid HTTP method
- **WHEN** a user provides `--method EVIL`
- **THEN** the system SHALL reject the input and exit with an error message listing allowed methods

### Requirement: Duration and VU validation before script compilation
The system SHALL call `validateDuration()` and `validateVUs()` before compiling the k6 script. Invalid values SHALL produce clear error messages rather than cryptic k6 failures.

#### Scenario: Invalid duration format
- **WHEN** a user provides `--duration abc`
- **THEN** the system SHALL reject the input with an error message indicating the expected format (e.g., `30s`, `5m`, `1h`)

#### Scenario: Invalid VU count
- **WHEN** a user provides `--vus 0` or `--vus -1`
- **THEN** the system SHALL reject the input with an error message indicating VUs must be a positive integer

#### Scenario: NaN VU value
- **WHEN** a user provides `--vus abc`
- **THEN** the system SHALL reject the input with an error message indicating VUs must be a positive integer