---
id: task-008-add-tests
title: Add unit tests for validators, security, and tool query generation
status: "Done"
created_date: '2026-02-18 13:41'
updated_date: '2026-02-18 14:37'
parent: task-001-upgrade-mcp-sqlserver
dependencies:
  - task-003-add-parameterized-queries
  - task-004-fix-bracket-escaping
  - task-005-fix-execute-query-race
---

## Description

Jest is configured in `package.json` but no test files exist. The bracket escaping bug (Issue 1) would have been caught by a basic test. Adding unit tests provides regression protection for all the fixes in this upgrade effort.

## Specification

- Tests for `QueryValidator`: allowed/forbidden queries, sanitization, row limit injection, SQL injection detection
- Tests for `ParameterValidator`: valid/invalid identifiers, escapeIdentifier behavior, reserved word rejection, parameter validation methods
- Tests for `ErrorHandler`: SQL Server error code mapping, user-facing error formatting
- Tests for tool query generation: verify tools produce correct parameterized queries (mock the connection)
- `npm test` passes with all tests green
- Configure Jest for ESM (`ts-jest` with `useESM: true` or `@swc/jest`)

## Design

Key files to create:
- `src/__tests__/security.test.ts` - QueryValidator tests
- `src/__tests__/validation.test.ts` - ParameterValidator tests
- `src/__tests__/errors.test.ts` - ErrorHandler tests
- `src/__tests__/tools/list-tables.test.ts` - ListTablesTool query generation
- `src/__tests__/tools/describe-table.test.ts` - DescribeTableTool query generation

Dev dependencies to add:
- `ts-jest` or `@swc/jest` for TypeScript support
- `@types/jest` for type definitions

Jest config in package.json or `jest.config.ts`:
```json
{
  "preset": "ts-jest/presets/default-esm",
  "moduleNameMapper": {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  }
}
```

Test approach: Unit test pure logic (validators, security, errors). For tools, mock `SqlServerConnection` to capture generated SQL and params, verifying correct parameterized query construction.

## TODO

- [x] Configure Jest for ESM TypeScript
- [x] Add `ts-jest` and `@types/jest` dev dependencies
- [x] Write `security.test.ts` for QueryValidator
- [x] Write `validation.test.ts` for ParameterValidator
- [x] Write `errors.test.ts` for ErrorHandler
- [x] Write tool query generation tests (mock connection)
- [x] Run `npm test` and verify all pass

## Notes

- Used `jest.config.js` (ESM export) instead of `.ts` to avoid `ts-node` dependency
- Jest config uses `ts-jest/presets/default-esm` with `useESM: true` and `.js` → no-extension module mapper
- 111 tests across 5 test suites, all passing
- Codex review found 2 issues, both fixed:
  1. Replaced `require('zod')` with top-level ESM import for module consistency
  2. Tightened `validateParameters` test to assert field paths in error message (regex match)
