## Context

Oura is a CLI stress-testing tool that generates k6 scripts from templates. Currently, all three attack scenarios (bombard, ramping, soak) use static headers and predictable request patterns. When testing Cloudflare-protected targets, these patterns are easily detected and blocked, preventing legitimate stress testing of applications behind such protection.

The goal is to add stealth capabilities that make traffic appear more human-like while maintaining the ability to generate significant load. This requires balancing stealth with performance - too much randomization may reduce throughput, while too little won't bypass detection.

## Goals / Non-Goals

**Goals:**
- Enable Oura to bypass Cloudflare's basic bot detection for legitimate stress testing
- Add `--stealth` flag for easy enable/disable of evasion features
- Support proxy configuration for traffic routing
- Create a new `stealth` scenario with advanced evasion techniques
- Maintain backward compatibility - existing behavior unchanged without flags

**Non-Goals:**
- Bypassing Cloudflare's advanced security challenges (CAPTCHA, JavaScript challenges)
- Adding proxy rotation within a single attack (out of scope for initial implementation)
- Changing k6 runtime behavior (we work within k6's capabilities)
- Implementing actual browser automation (we remain an HTTP load testing tool)

## Decisions

### Decision: Use k6's built-in random functions for header rotation
**Rationale**: k6 provides `Math.random()` and crypto utilities that work within the VU (virtual user) context. This avoids external dependencies and keeps scripts self-contained.
**Alternatives considered**: External JavaScript libraries (rejected - would require npm imports that complicate k6 script generation)

### Decision: Pass proxy via environment variables rather than modifying k6 scripts
**Rationale**: k6 natively supports `HTTP_PROXY` and `HTTPS_PROXY` environment variables. This is the standard approach and requires no changes to the generated scripts.
**Alternatives considered**: Adding proxy params to k6 HTTP calls (rejected - k6 http module doesn't support per-request proxy, only global env vars)

### Decision: Add stealth as optional feature flag rather than default behavior
**Rationale**: Stealth features add overhead (random delays reduce throughput). Users doing internal testing don't need evasion. Making it opt-in preserves performance for simple use cases.
**Alternatives considered**: Making stealth default (rejected - would surprise existing users and reduce baseline performance)

### Decision: Implement stealth techniques as template modifications rather than new templates
**Rationale**: The core request logic (method, payload, target) remains the same across all scenarios. Modifying existing templates with conditional stealth blocks avoids code duplication.
**Alternatives considered**: Creating entirely separate stealth versions of each template (rejected - would duplicate ~80% of code and increase maintenance burden)

## Risks / Trade-offs

**[Risk] Reduced throughput due to randomized delays** → **Mitigation**: Stealth mode is opt-in. Users who need maximum throughput can run without `--stealth`. The new `stealth` scenario is specifically for when evasion matters more than raw RPS.

**[Risk] Detection despite evasion attempts** → **Mitigation**: Document that this targets "basic" bot detection. Advanced Cloudflare settings (aggressive mode, custom rules) may still block traffic. Users should test against their specific Cloudflare configuration.

**[Risk] Proxy configuration errors breaking tests** → **Mitigation**: Add proxy URL validation before k6 execution. Provide clear error messages for common misconfigurations (missing protocol, invalid format).

**[Risk] Added complexity in template generation** → **Mitigation**: Keep stealth logic modular with clear helper functions. Use TypeScript's type safety to ensure stealth options are properly handled.

## Migration Plan

No migration needed - this is a purely additive change. Existing users will see no behavior change unless they opt-in to new flags.

## Open Questions

1. Should we provide a `--stealth-level` option (basic vs aggressive) to balance stealth vs performance?
2. Do we need a built-in proxy list or is single proxy configuration sufficient for initial release?
3. Should stealth mode automatically enable on Cloudflare-detected domains, or keep it strictly manual?
