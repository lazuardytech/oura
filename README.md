# Oura

CLI tool for stress-testing web targets using [k6](https://k6.io/).

> **Internal security research tool.** Only use against targets you have authorization to test.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [k6](https://k6.io/docs/get-started/installation/) installed and available in `$PATH`

## Install

```bash
npm install
npm run build
npm link
```

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
  --payload '{"key":"value"}' \
  --headers '{"Content-Type":"application/json"}'

# Ramping scenario with custom stages
oura attack -t https://example.com -s ramping \
  --ramp-up "0:10s,50:30s,100:60s,50:30s,0:10s"

# Soak test (long duration) and save report
oura attack -t https://example.com -s soak -u 200 -d 10m -o result.json
```

#### Attack Options

| Flag               | Description                           | Default     |
| ------------------ | ------------------------------------- | ----------- |
| `-t, --target`     | Target URL (required)                 | —           |
| `-m, --method`     | HTTP method                           | `GET`       |
| `-u, --vus`        | Number of virtual users               | `100`       |
| `-d, --duration`   | Test duration (`30s`, `1m`, `5m`)     | `30s`       |
| `-r, --ramp-up`    | Custom ramp-up stages                 | —           |
| `-w, --payload`    | Request body (JSON string)            | —           |
| `-H, --headers`    | Custom headers (JSON string)          | —           |
| `-s, --scenario`   | Attack scenario (`bombard`, `ramping`, `soak`) | `bombard` |
| `-o, --output`     | Output path for k6 summary JSON       | —           |
| `--no-check`       | Disable default response checks       | `false`     |

#### Scenarios

- **bombard** — Constant load with fixed VUs for the entire duration
- **ramping** — Gradually increases and decreases load (default stages if `--ramp-up` not provided)
- **soak** — Prolonged test with progressive load increase to find breaking points

### Report

View results from a previous test run:

```bash
oura report -f result.json
oura report -f result.json --detail
```

### Config

Manage oura configuration:

```bash
oura config show
oura config set defaultVus 200
oura config set defaultDuration 1m
oura config reset
```

## Architecture

```
src/
├── index.ts              # CLI entry point
├── commands/
│   ├── attack.ts         # Attack command
│   ├── report.ts         # Report command
│   └── config.ts         # Config management
├── k6/
│   ├── runner.ts         # k6 script compilation & execution
│   └── templates/
│       ├── bombard.ts     # Constant-load template
│       ├── ramping.ts     # Progressive-ramp template
│       └── soak.ts        # Long-duration soak template
└── utils/
    ├── logger.ts          # Colored console output
    └── validator.ts       # Input validation
```

## Development

```bash
npm run dev       # Watch mode build
npm run typecheck # Type checking
npm run lint      # Lint
```

## License

MIT