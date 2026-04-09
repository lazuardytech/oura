## ADDED Requirements

### Requirement: All imports use node: protocol for Node.js builtins
All source files SHALL import Node.js builtin modules using the `node:` protocol prefix (e.g., `node:fs`, `node:path`, `node:os`, `node:child_process`, `node:util`).

#### Scenario: Runner imports builtins with node: protocol
- **WHEN** `src/k6/runner.ts` is linted
- **THEN** no `useNodejsImportProtocol` diagnostics are reported for `child_process`, `util`, `fs`, `path`, or `os` imports

#### Scenario: Config command imports builtins with node: protocol
- **WHEN** `src/commands/config.ts` is linted
- **THEN** no `useNodejsImportProtocol` diagnostics are reported for `fs`, `path`, or `os` imports

#### Scenario: Report command imports builtins with node: protocol
- **WHEN** `src/commands/report.ts` is linted
- **THEN** no `useNodejsImportProtocol` diagnostics are reported for `fs` or `path` imports

### Requirement: No explicit any types in source code
No source file SHALL use the `any` type. Catch clauses SHALL use `unknown` with type narrowing. Dynamic config access and type narrowing SHALL use proper TypeScript patterns instead of `any`.

#### Scenario: Attack command catch clause uses unknown
- **WHEN** `src/commands/attack.ts` is linted
- **THEN** no `noExplicitAny` diagnostics are reported and the catch clause uses `err: unknown` with proper type narrowing to access `.message`

#### Scenario: Report command catch clause uses unknown
- **WHEN** `src/commands/report.ts` is linted
- **THEN** no `noExplicitAny` diagnostics are reported and the catch clause uses `err: unknown` with proper type narrowing

#### Scenario: Config command dynamic access avoids any
- **WHEN** `src/commands/config.ts` is linted
- **THEN** no `noExplicitAny` diagnostics are reported for dynamic property access on config objects

#### Scenario: Validator method check avoids any
- **WHEN** `src/utils/validator.ts` is linted
- **THEN** no `noExplicitAny` diagnostics are reported for the `includes` type narrowing in `validateMethod`

### Requirement: No unused variables or functions
All declared variables and functions SHALL be used. Dead code SHALL be removed rather than suppressed.

#### Scenario: isDefault function removed
- **WHEN** `src/commands/attack.ts` is linted
- **THEN** no `noUnusedVariables` diagnostics are reported and the `isDefault` function is removed

#### Scenario: parsedThresholds variable removed or used
- **WHEN** `src/commands/attack.ts` is linted
- **THEN** no `noUnusedVariables` diagnostics are reported for `parsedThresholds`

### Requirement: Template literals used instead of string concatenation
All string building in k6 template generators SHALL use template literals (backticks) instead of `+` concatenation.

#### Scenario: Bombard template uses template literals
- **WHEN** `src/k6/templates/bombard.ts` is linted
- **THEN** no `useTemplate` diagnostics are reported

#### Scenario: Ramping template uses template literals
- **WHEN** `src/k6/templates/ramping.ts` is linted
- **THEN** no `useTemplate` diagnostics are reported

#### Scenario: Soak template uses template literals
- **WHEN** `src/k6/templates/soak.ts` is linted
- **THEN** no `useTemplate` diagnostics are reported

### Requirement: Number.isNaN used instead of global isNaN
The codebase SHALL use `Number.isNaN()` instead of the global `isNaN()` function.

#### Scenario: Config command uses Number.isNaN
- **WHEN** `src/commands/config.ts` is linted
- **THEN** no `noGlobalIsNan` diagnostics are reported