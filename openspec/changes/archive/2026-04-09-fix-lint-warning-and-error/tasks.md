## 1. Node.js Import Protocol

- [x] 1.1 Add `node:` prefix to all builtin imports in `src/commands/config.ts` (`fs` → `node:fs`, `path` → `node:path`, `os` → `node:os`)
- [x] 1.2 Add `node:` prefix to all builtin imports in `src/commands/report.ts` (`fs` → `node:fs`, `path` → `node:path`)
- [x] 1.3 Add `node:` prefix to all builtin imports in `src/k6/runner.ts` (`child_process` → `node:child_process`, `util` → `node:util`, `fs` → `node:fs`, `path` → `node:path`, `os` → `node:os`)

## 2. Replace `any` Types

- [x] 2.1 Replace `catch (err: any)` with `catch (err: unknown)` and type narrowing in `src/commands/attack.ts`
- [x] 2.2 Replace `catch (err: any)` with `catch (err: unknown)` and type narrowing in `src/commands/report.ts`
- [x] 2.3 Replace `(config as any)[key]` with proper typed access in `src/commands/config.ts`
- [x] 2.4 Replace `method.toUpperCase() as any` with proper type narrowing in `src/utils/validator.ts`

## 3. Remove Unused Variables

- [x] 3.1 Remove the unused `isDefault` function from `src/commands/attack.ts`
- [x] 3.2 Remove or underscore the unused `parsedThresholds` variable from `src/commands/attack.ts`

## 4. Template Literals

- [x] 4.1 Replace string concatenation with template literals in `src/k6/templates/bombard.ts` (lines 38 and 57)
- [x] 4.2 Replace string concatenation with template literals in `src/k6/templates/ramping.ts` (lines 38 and 57)
- [x] 4.3 Replace string concatenation with template literals in `src/k6/templates/soak.ts` (lines 100 and 119)

## 5. Global isNaN

- [x] 5.1 Replace `isNaN()` with `Number.isNaN()` in `src/commands/config.ts`

## 6. Verification

- [x] 6.1 Run `npm run lint` and confirm zero warnings/errors
- [x] 6.2 Run `npm run typecheck` and confirm no type errors
- [x] 6.3 Run `npm run build` and confirm successful build