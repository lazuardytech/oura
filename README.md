# 🐍 oura

No system is really safe.

> CLI tool for stress-testing web targets using [k6](https://k6.io/).<br/>
> **Internal security research tool.** Only use against targets you have authorization to test.

## Install

```bash
npm i -g @lazuardytech/oura
```

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [k6](https://k6.io/docs/get-started/installation/) installed and available in `$PATH`

After linking, the `oura` command is available globally.

## Usage

### Attack

Launch a stress test against a target:

```bash
# Basic bombard with 100 VUs for 30 seconds
oura attack -t https://example.com

# Custom VUs, duration, and scenario
oura attack -t https://example.com -u 500 -d 1m -s ramping

# POST request with JSON payload and custom headers
oura attack -t https://api.example.com/endpoint \
  -m POST \
  -u 200 \
  -d 45s \
  -w '{"key":"value"}' \
  -H '{"Content-Type":"application/json"}'

# Ramping scenario with custom stages
oura attack -t https://example.com -s ramping \
  -r "0:10s,50:30s,100:60s,50:30s,0:10s"

# Soak test (long duration) and save report
oura attack -t https://example.com -s soak -u 200 -d 10m -o result.json

# Stealth mode with rotating headers and random delays
oura attack -t https://example.com -s stealth -u 50 -d 1m

# Stealth flag on any scenario
oura attack -t https://example.com -s bombard --stealth

# Form flood — auto-detect and fill form fields
oura attack -t https://example.com/submit -s form-flood -u 100 -d 30s

# Form flood with separate scan URL
oura attack -t https://example.com/submit -s form-flood \
  --scan-url https://example.com/form-page

# Proxy support
oura attack -t https://example.com --proxy http://proxy:8080
oura attack -t https://example.com --proxy-file proxies.txt

# CDN bypass via origin IP
oura attack -t https://example.com --origin 1.2.3.4

# Custom thresholds
oura attack -t https://example.com \
  --threshold 'http_req_duration:p(95)<500' \
  --threshold 'http_req_failed:rate<0.1'

# Fixed iterations instead of duration
oura attack -t https://example.com --iterations 1000

# Rate limiting per VU
oura attack -t https://example.com --rps 50
```

#### Attack Options

| Flag | Description | Default |
| --- | --- | --- |
| `-t, --target` | Target URL (required) | — |
| `-m, --method` | HTTP method (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS) | `GET` |
| `-u, --vus` | Number of virtual users | `100` |
| `-d, --duration` | Test duration (`30s`, `1m`, `5m`) | `30s` |
| `-r, --ramp-up` | Custom ramp-up stages | — |
| `-w, --payload` | Request body (JSON string) | — |
| `-H, --headers` | Custom headers (JSON string) | — |
| `-s, --scenario` | Attack scenario | `bombard` |
| `-o, --output` | Output path for k6 summary JSON | — |
| `--threshold` | Pass/fail thresholds (repeatable) | — |
| `--iterations` | Iterations per VU (overrides duration for bombard) | — |
| `--no-check` | Disable default response checks | `false` |
| `--stealth` | Enable stealth mode (rotating headers, random delays) | `false` |
| `--proxy` | Proxy URL (HTTP/HTTPS/SOCKS5) | — |
| `--proxy-file` | Path to proxy list file (one per line) | — |
| `--origin` | Origin server IP to bypass CDN | — |
| `--rps` | Requests per second per VU | `1000` |
| `--scan-url` | URL to scan for form fields (form-flood scenario) | — |

#### Scenarios

- **bombard** — Constant load with fixed VUs for the entire duration
- **ramping** — Gradually increases and decreases load (default stages if `--ramp-up` not provided)
- **soak** — Prolonged test with progressive load increase to find breaking points
- **stealth** — Rotating User-Agents, headers, spoofed IPs, and random delays to mimic real traffic
- **form-flood** — Auto-detect HTML form fields and flood with realistic data

### Scan

Scan a frontend URL for API endpoints, WebSockets, webhooks, SSE, and GraphQL:

```bash
oura scan -t https://example.com
oura scan -t https://example.com -k    # skip SSL verification
```

| Flag | Description | Default |
| --- | --- | --- |
| `-t, --target` | Target URL (required) | — |
| `-k, --insecure` | Skip SSL certificate validation | `false` |

### Report

View results from a previous test run:

```bash
oura report -f result.json
oura report -f result.json --detail
```

| Flag | Description |
| --- | --- |
| `-f, --file` | Path to k6 summary JSON (required) |
| `--detail` | Show detailed metrics per endpoint |

### Config

Manage oura configuration:

```bash
oura config show
oura config set defaultVus 200
oura config set defaultDuration 1m
oura config set defaultScenario stealth
oura config set defaultRpsPerVu 50
oura config reset
```

| Key | Type | Default |
| --- | --- | --- |
| `k6Path` | string | `"k6"` |
| `defaultVus` | number | `100` |
| `defaultDuration` | string | `"30s"` |
| `defaultScenario` | string | `"bombard"` |
| `defaultRpsPerVu` | number | `1000` |
| `lastTarget` | string | `""` |

## Architecture

```
src/
├── index.ts              # CLI entry point
├── commands/
│   ├── attack.ts         # Attack command
│   ├── report.ts         # Report command
│   ├── config.ts         # Config management
│   └── scan.ts           # Frontend API scanner
├── k6/
│   ├── runner.ts         # k6 script compilation & execution
│   └── templates/
│       ├── bombard.ts     # Constant-load template
│       ├── ramping.ts     # Progressive-ramp template
│       ├── soak.ts        # Long-duration soak template
│       ├── stealth.ts     # Stealth mode template
│       ├── form-flood.ts  # Form auto-detection & flood template
│       └── utils/
│           ├── stealth.ts     # Stealth helpers (User-Agents, headers, IP spoofing)
│           └── form-scanner.ts # Form field detection from HTML
└── utils/
    ├── logger.ts          # Colored console output
    ├── validator.ts       # Input validation
    ├── sanitizer.ts       # Script injection sanitization
    └── fetcher.ts         # Node.js HTTP/HTTPS fetcher
```

## Development

```bash
npm install
npm run build
npm link
npm run dev       # Watch mode build
npm run typecheck # Type checking
npm run lint      # Lint
npm run format    # Format
```

## License

MIT
