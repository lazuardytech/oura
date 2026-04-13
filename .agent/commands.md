# Commands Reference

## Global Flags

Flags available on all commands:

| Flag | Description |
|------|-------------|
| `-v, --version` | Show version number |
| `-h, --help` | Show help information |

## `oura attack`

Launch a stress test against a target URL.

### Required

| Flag | Description |
|------|-------------|
| `-t, --target <url>` | Target URL |

### Optional

| Flag | Description | Default |
|------|-------------|---------|
| `-m, --method` | HTTP method (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS) | `GET` |
| `-u, --vus` | Number of virtual users | `100` |
| `-d, --duration` | Test duration (e.g. 30s, 1m, 5m) | `30s` |
| `-s, --scenario` | Attack scenario: `bombard`, `ramping`, `soak`, `stealth`, `form-flood` | `bombard` |
| `-r, --ramp-up` | Custom ramp stages (format: `"target:duration,..."`) | — |
| `-w, --payload` | Request body (string or JSON) | — |
| `-H, --headers` | Custom headers (JSON string) | — |
| `-o, --output` | Output path for k6 summary JSON | — |
| `--threshold` | Pass/fail thresholds (repeatable, e.g. `http_req_duration:p(95)<500`) | — |
| `--iterations` | Iterations per VU (overrides duration for bombard) | — |
| `--no-check` | Disable default response status checks | `false` |
| `--stealth` | Enable stealth mode with rotating headers and random delays | `false` |
| `--proxy` | Proxy URL (HTTP/HTTPS/SOCKS5) | — |
| `--proxy-file` | Path to file with proxy list (one proxy per line) | — |
| `--origin` | Origin server IP to bypass CDN (e.g. 1.2.3.4) | — |
| `--rps` | Requests per second per VU | `1000` |
| `--scan-url` | URL to scan for form fields (for form-flood scenario) | — |

### Examples

```bash
# Simple bombard
oura attack -t https://example.com

# Ramp up with custom stages
oura attack -t https://example.com -s ramping \
  -r "0:10s,50:30s,100:60s,50:30s,0:10s"

# POST with headers and payload
oura attack -t https://api.example.com/data \
  -m POST -u 200 -d 1m \
  -w '{"name":"test"}' \
  -H '{"Content-Type":"application/json"}'

# Soak test with report output
oura attack -t https://example.com -s soak -u 500 -o results.json

# Stealth mode
oura attack -t https://example.com -s stealth -u 50 -d 1m

# Stealth flag on bombard
oura attack -t https://example.com --stealth

# Form flood with auto-detection
oura attack -t https://example.com/submit -s form-flood -u 100 -d 30s

# Form flood with separate scan URL
oura attack -t https://example.com/submit -s form-flood \
  --scan-url https://example.com/form-page

# Proxy support
oura attack -t https://example.com --proxy http://proxy:8080
oura attack -t https://example.com --proxy-file proxies.txt

# CDN bypass
oura attack -t https://example.com --origin 1.2.3.4

# Custom thresholds
oura attack -t https://example.com \
  --threshold 'http_req_duration:p(95)<500' \
  --threshold 'http_req_failed:rate<0.1'

# Fixed iterations
oura attack -t https://example.com --iterations 1000
```

---

## `oura scan`

Scan a frontend URL for API endpoints, WebSockets, webhooks, SSE, and GraphQL.

| Flag | Description | Default |
|------|-------------|---------|
| `-t, --target <url>` | Target URL (required) | — |
| `-k, --insecure` | Skip SSL certificate validation | `false` |

### Detection

- API Endpoints (fetch, axios, XMLHttpRequest, jQuery AJAX, env variables)
- Webhook Endpoints (`/webhook`, `/hook/`, `/callback/`, `/event/`, `/trigger/`)
- WebSocket Endpoints (`new WebSocket()`, `ws://`, `wss://`)
- Server-Sent Events (`new EventSource()`)
- GraphQL Endpoints (`/graphql`, query/mutation/subscription keywords)

### Examples

```bash
oura scan -t https://example.com
oura scan -t https://example.com -k
```

---

## `oura report`

View results from a previous test run.

| Flag | Description |
|------|-------------|
| `-f, --file <path>` | Path to k6 summary JSON (required) |
| `--detail` | Show full metrics dump |

### Examples

```bash
oura report -f results.json
oura report -f results.json --detail
```

---

## `oura config`

Manage configuration stored at `~/.oura/config.json`.

### Subcommands

| Command | Description |
|---------|-------------|
| `config show` | Display current configuration |
| `config set <key> <value>` | Set a configuration value |
| `config reset` | Reset to defaults |

### Config Keys

| Key | Type | Default |
|-----|------|---------|
| `k6Path` | string | `"k6"` |
| `defaultVus` | number | `100` |
| `defaultDuration` | string | `"30s"` |
| `defaultScenario` | string | `"bombard"` |
| `defaultRpsPerVu` | number | `1000` |
| `lastTarget` | string | `""` |

### Examples

```bash
oura config show
oura config set defaultVus 500
oura config set defaultScenario stealth
oura config set defaultRpsPerVu 50
oura config set k6Path /usr/local/bin/k6
oura config reset
```
