# Commands Reference

## `oura attack`

Launch a stress test against a target URL.

### Required

| Flag | Description |
|------|-------------|
| `-t, --target <url>` | Target URL |

### Optional

| Flag | Description | Default |
|------|-------------|---------|
| `-m, --method` | HTTP method (GET, POST, PUT, DELETE) | `GET` |
| `-u, --vus` | Number of virtual users | `100` |
| `-d, --duration` | Test duration (e.g. 30s, 1m, 5m) | `30s` |
| `-s, --scenario` | Attack scenario: `bombard`, `ramping`, `soak` | `bombard` |
| `-r, --ramp-up` | Custom ramp stages (format: `"target:duration,..."`) | — |
| `-w, --payload` | Request body (string or JSON) | — |
| `-H, --headers` | Custom headers (JSON string) | — |
| `-o, --output` | Output path for k6 summary JSON | — |
| `--tags` | Tags for the test run (JSON string) | — |
| `--no-check` | Disable default response status checks | `false` |

### Examples

```bash
# Simple bombard
oura attack -t https://example.com

# Ramp up with custom stages
oura attack -t https://example.com -s ramping \
  --ramp-up "0:10s,50:30s,100:60s,50:30s,0:10s"

# POST with headers and payload
oura attack -t https://api.example.com/data \
  -m POST -u 200 -d 1m \
  --payload '{"name":"test"}' \
  --headers '{"Content-Type":"application/json"}'

# Soak test with report output
oura attack -t https://example.com -s soak -u 500 -o results.json
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
| `lastTarget` | string | `""` |

### Examples

```bash
oura config show
oura config set defaultVus 500
oura config set defaultScenario soak
oura config set k6Path /usr/local/bin/k6
oura config reset
```