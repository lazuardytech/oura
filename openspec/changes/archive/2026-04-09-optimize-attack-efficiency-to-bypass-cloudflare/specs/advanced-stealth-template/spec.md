## ADDED Requirements

### Requirement: Advanced Stealth Template
The system SHALL provide a new attack scenario `stealth` that combines all evasion techniques optimized specifically for Cloudflare bypass.

#### Scenario: Stealth scenario executed
- **WHEN** user selects the `stealth` scenario via `-s stealth`
- **THEN** the attack SHALL use advanced evasion techniques including rotating user-agents, randomized timing, and complete browser fingerprinting
- **AND** the scenario SHALL be pre-configured with optimal stealth settings

### Requirement: Browser Fingerprint Randomization
The system SHALL randomize complete browser fingerprints including screen resolution, timezone, and other browser-specific parameters.

#### Scenario: Full fingerprint randomization
- **WHEN** the stealth scenario is active
- **THEN** each request SHALL have randomized browser fingerprint parameters
- **AND** the fingerprint SHALL appear consistent per virtual user session

### Requirement: Request Timing Jitter with Exponential Backoff
The system SHALL implement sophisticated timing patterns including exponential backoff on rate-limited responses.

#### Scenario: Adaptive timing on rate limiting
- **WHEN** the server returns rate-limit responses (HTTP 429)
- **THEN** the system SHALL exponentially increase delays between requests
- **AND** the system SHALL resume normal timing after successful responses
