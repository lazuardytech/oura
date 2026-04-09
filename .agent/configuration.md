# Configuration

Oura stores configuration in `~/.oura/config.json`.

## Default Config

```json
{
  "k6Path": "k6",
  "defaultVus": 100,
  "defaultDuration": "30s",
  "defaultScenario": "bombard",
  "lastTarget": ""
}
```

## Managing Config

```bash
oura config show           # Display current config
oura config set k6Path /usr/local/bin/k6
oura config set defaultVus 200
oura config set defaultDuration 1m
oura config set defaultScenario soak
oura config reset           # Reset to defaults
```

## Config Keys

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `k6Path` | string | `"k6"` | Path to k6 binary |
| `defaultVus` | number | `100` | Default number of virtual users |
| `defaultDuration` | string | `"30s"` | Default test duration |
| `defaultScenario` | string | `"bombard"` | Default attack scenario |
| `lastTarget` | string | `""` | Last tested target URL |

## File Locations

| Path | Purpose |
|------|---------|
| `~/.oura/config.json` | Configuration file |
| `~/.oura/scripts/` | Ephemeral k6 script storage (auto-cleaned) |

## k6 Binary Discovery

The runner searches for k6 in this order:
1. Configured `k6Path` (from config)
2. System `$PATH` (`k6`)
3. Hardcoded common paths:
   - `/usr/local/bin/k6`
   - `/usr/bin/k6`
   - `~/.local/bin/k6`

If k6 is not found, the command fails with an installation prompt.