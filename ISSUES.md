# Known Issues

## Critical — Broken Functionality

### 1. Bracket escaping used as string comparison in WHERE clauses

**Files:** `src/tools/list-tables.ts:43`, `src/tools/describe-table.ts:56-57`

`ParameterValidator.escapeIdentifier()` wraps values in brackets (`[dbo]`), but these are used in WHERE clauses for string comparison:

```sql
WHERE TABLE_SCHEMA = [dbo]
```

MSSQL interprets `[dbo]` as a column reference, not the string literal `'dbo'`. This causes "Invalid column name" errors. The `describe_table` and `list_tables` (with schema filter) tools are broken.

**Fix:** Replace with parameterized queries using `request.input()` from the `mssql` library, or use quoted string literals (`'dbo'`) with proper escaping.

### 2. MCP SDK version is outdated

**File:** `package.json:52`

The SDK dependency is `@modelcontextprotocol/sdk: ^0.5.0`. Current Claude Code expects SDK 1.x. The server constructor API changed from `new Server()` to `new McpServer()`, and transport setup may differ.

**Fix:** Bump to `^1.6.0` and adapt any breaking API changes.

## High — Security / Correctness

### 3. No parameterized query support in connection layer

**File:** `src/connection.ts:47-53`

The `query()` method only accepts raw SQL strings. The `mssql` library supports `request.input(name, type, value)` for parameterized queries, but it is never used. All identifier/value injection is done via string manipulation.

**Fix:** Add a `queryWithParams()` method that accepts parameters and uses `request.input()`.

### 4. Inconsistent escaping across tools

Some tools use `ParameterValidator.escapeIdentifier()` (bracket escaping — broken for WHERE values), others use `.replace(/'/g, "''")` (quote escaping — works but fragile):

- **Bracket escaping:** `list-tables.ts`, `describe-table.ts`
- **Quote escaping:** `list-views.ts:41`, `get-foreign-keys.ts:51-56`, `get-table-stats.ts:55-59`

**Fix:** Standardize on parameterized queries for all user-supplied values.

### 5. Mutating shared state in execute-query tool

**File:** `src/tools/execute-query.ts:46-52`

Temporarily swaps `this.maxRows` on the instance to override the row limit per query, then restores it. If two queries execute concurrently, one will see the other's limit.

**Fix:** Pass `maxRows` as a parameter to `executeQuery()` instead of mutating instance state.

## Medium — Maintenance

### 6. No retry logic for transient connection errors

**File:** `src/connection.ts`

Transient errors (`ETIMEOUT`, `ECONNCLOSED`, `ECONNRESET`) cause immediate failure. No retry or reconnection logic exists.

**Fix:** Add retry with backoff for transient error codes. Re-create the connection pool on connection-level failures.

### 7. Hardcoded version mismatch

`src/cli.ts:66` reports version `'2.0.1'`, `package.json` says `'2.0.3'`.

**Fix:** Read version from `package.json` at runtime, or keep a single source of truth.

### 8. No tests

Jest is configured in `package.json` but no test files exist. The bracket escaping bug would have been caught by a basic integration test.
