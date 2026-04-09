## 1. Update AttackOptions Interface

- [x] 1.1 Add `stealth: boolean` field to AttackOptions interface in src/k6/runner.ts
- [x] 1.2 Add `proxy: string` field to AttackOptions interface in src/k6/runner.ts

## 2. Implement Stealth Utilities

- [x] 2.1 Create src/k6/templates/utils/stealth.ts with user-agent pool and rotation function
- [x] 2.2 Add browser header generators (Accept, Accept-Language, Accept-Encoding, Referer)
- [x] 2.3 Add random delay generator for timing jitter (0.5-3.0s range)

## 3. Modify Existing Templates

- [x] 3.1 Update bombard.ts to include optional stealth header generation when opts.stealth is true
- [x] 3.2 Update bombard.ts to add randomized sleep when stealth mode is enabled
- [x] 3.3 Update ramping.ts to include optional stealth features
- [x] 3.4 Update soak.ts to include optional stealth features

## 4. Create Stealth Template

- [x] 4.1 Create src/k6/templates/stealth.ts with advanced Cloudflare bypass techniques
- [x] 4.2 Implement browser fingerprint randomization (screen resolution, timezone)
- [x] 4.3 Add exponential backoff logic for HTTP 429 responses
- [x] 4.4 Register stealth template in K6Runner constructor

## 5. Add CLI Flags

- [x] 5.1 Add `--stealth` boolean flag to attack command in src/commands/attack.ts
- [x] 5.2 Add `--proxy` string flag to attack command
- [x] 5.3 Pass stealth and proxy options to AttackOptions in action handler

## 6. Implement Proxy Support

- [x] 6.1 Add proxy URL validation function in src/utils/validator.ts
- [x] 6.2 Modify K6Runner.execute to set HTTP_PROXY/HTTPS_PROXY environment variables
- [x] 6.3 Add error handling for invalid proxy URLs with clear messages

## 7. Testing and Verification

- [x] 7.1 Run npm run typecheck to verify TypeScript compilation
- [x] 7.2 Run npm run build to ensure build succeeds
- [x] 7.3 Run npm run lint to check code style
- [x] 7.4 Verify stealth headers are randomized across requests
