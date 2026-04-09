## Why

Modern web applications are increasingly protected by Cloudflare and similar WAF/CDN services that detect and block automated traffic patterns. Oura's current attack templates use static headers and predictable request patterns, causing tests to be blocked before reaching the actual target infrastructure. This limits the tool's effectiveness for legitimate stress testing scenarios where users need to test their own Cloudflare-protected applications or understand real-world resilience.

## What Changes

- **Add Cloudflare evasion mechanisms** to all attack templates (bombard, ramping, soak):
  - Rotating user-agent strings from a realistic browser pool
  - Randomized request timing to avoid detection patterns
  - Realistic browser headers (Accept-Language, Accept-Encoding, Referer, etc.)
  - Per-request header randomization
- **Add `--stealth` flag** to attack command for easy enable/disable of evasion
- **Add `--proxy` flag** for proxy rotation support (HTTP/HTTPS/SOCKS5)
- **New `stealth` attack template** optimized specifically for Cloudflare bypass with advanced techniques

## Capabilities

### New Capabilities
- `stealth-mode`: Core evasion capability with rotating user-agents, randomized delays, and realistic browser headers
- `proxy-rotation`: Support for routing traffic through proxy chains
- `advanced-stealth-template`: New attack scenario optimized specifically for Cloudflare bypass with request timing jitter, header randomization, and realistic browser fingerprinting

### Modified Capabilities
<!-- No existing spec requirements are changing - only implementation details -->

## Impact

- **Templates**: `src/k6/templates/bombard.ts`, `src/k6/templates/ramping.ts`, `src/k6/templates/soak.ts` - will be modified to include optional stealth features
- **New Template**: `src/k6/templates/stealth.ts` - new advanced stealth scenario
- **Runner**: `src/k6/runner.ts` - add support for proxy configuration in AttackOptions
- **CLI**: `src/commands/attack.ts` - add `--stealth` and `--proxy` flags
- **Dependencies**: No new npm dependencies; k6 handles proxy via environment variables
- **Config**: Optional `~/.oura/config.json` fields for default stealth mode and proxy settings
