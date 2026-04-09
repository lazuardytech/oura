## Context

The project uses Biome for linting. Running `npm run lint` produces 8 warnings and 17 infos across 8 source files. The issues fall into five categories:

1. **`useNodejsImportProtocol`** (11 instances) — Node.js builtins imported without `node:` prefix in `config.ts`, `report.ts`, `runner.ts`
2. **`noExplicitAny`** (4 instances) — `any` used in catch clauses (`attack.ts`, `report.ts`), dynamic config access (`config.ts`), and `includes` type narrowing (`validator.ts`)
3. **`noUnusedVariables`** (2 instances) — unused `isDefault` function and `parsedThresholds` variable in `attack.ts`
4. **`useTemplate`** (6 instances) — string concatenation with `+` instead of template literals in `bombard.ts`, `ramping.ts`, `soak.ts`
5. **`noGlobalIsNan`** (1 instance) — `isNaN()` instead of `Number.isNaN()` in `config.ts`

## Goals / Non-Goals

**Goals:**
- Achieve a zero-warning, zero-error lint pass
- Improve type safety by eliminating `any` usage
- Adopt idiomatic Node.js import conventions (`node:` protocol)
- Remove dead code (`isDefault`, `parsedThresholds`)

**Non-Goals:**
- No functional changes — all fixes are purely code quality
- No new lint rules or configuration changes
- No changes to CLI behavior, output, or k6 script generation logic

## Decisions

1. **`node:` protocol imports** — Add `node:` prefix to all builtin imports. This is the recommended approach for Node.js ≥ 16 and aligns with Biome's `useNodejsImportProtocol` rule.

2. **Catch clause typing** — Replace `catch (err: any)` with `catch (err: unknown)` and use type narrowing (`err instanceof Error ? err.message : String(err)`) for error message access. This is the TypeScript best practice for catch clauses.

3. **Dynamic config access** — Replace `(config as any)[key]` with a typed approach using a helper function or `Record<string, unknown>` assertion, avoiding `any`.

4. **`includes` type narrowing** — Replace `method.toUpperCase() as any` with a proper type guard or cast to the broader `string[]` type that `ALLOWED_METHODS` satisfies.

5. **Unused variables** — Remove `isDefault` entirely (dead code). For `parsedThresholds`, either remove it or prefix with `_` if intentionally unused for future use; given it appears to be a leftover, remove it.

6. **String concatenation** — Replace `+` concatenation with template literals in the k6 template generators.

## Risks / Trade-offs

- **Risk**: Removing `isDefault` or `parsedThresholds` could break future features if they were placeholders → **Mitigation**: These appear to be dead code with no callers; grep confirms zero usage.
- **Risk**: `catch (err: unknown)` changes error handling slightly → **Mitigation**: The new type narrowing preserves the same runtime behavior for `Error` instances and adds safety for non-Error throws.