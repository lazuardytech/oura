## ADDED Requirements

### Requirement: Proxy Configuration Support
The system SHALL support routing HTTP/HTTPS traffic through user-specified proxy servers.

#### Scenario: Single proxy configured
- **WHEN** user provides a proxy URL via `--proxy` flag
- **THEN** all k6 traffic SHALL be routed through the specified proxy
- **AND** the proxy SHALL support HTTP, HTTPS, and SOCKS5 protocols

### Requirement: Proxy Environment Variable Integration
The system SHALL pass proxy configuration to k6 via environment variables for compatibility with k6's proxy support.

#### Scenario: Proxy environment variables set
- **WHEN** a proxy is configured via CLI
- **THEN** the system SHALL set the `HTTP_PROXY` and `HTTPS_PROXY` environment variables before executing k6
- **AND** k6 SHALL use these variables to route traffic

### Requirement: Proxy Validation
The system SHALL validate proxy URLs before attempting to use them.

#### Scenario: Invalid proxy URL provided
- **WHEN** user provides a malformed proxy URL
- **THEN** the system SHALL display an error message
- **AND** the attack SHALL not be executed
