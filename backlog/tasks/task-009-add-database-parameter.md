---
id: task-009-add-database-parameter
title: Add per-tool database parameter with pool-per-database connection manager
status: "Done"
created_date: '2026-02-18 15:16'
updated_date: '2026-02-18 15:29'
parent: task-001-upgrade-mcp-sqlserver
dependencies:
  - task-003-add-parameterized-queries
subtasks:
---

## Description

<!-- DESCRIPTION:BEGIN -->
Currently the MCP server connects to a single database specified by the `SQLSERVER_DATABASE` environment variable. All tools operate against that one database for the lifetime of the process. AI agents that need to explore or query multiple databases on the same SQL Server instance must restart the server with a different config, which is impractical.

This task adds an optional `database` parameter to every tool so the agent can specify which database to target per-call. A connection manager maintains a pool-per-database cache so switching databases does not require reconnecting on every request.
<!-- DESCRIPTION:END -->

## Specification

<!-- SPECIFICATION:BEGIN -->
- Every tool gains an optional `database` input parameter (string, valid SQL Server database name)
- When `database` is provided, the tool executes against that database instead of the default
- When `database` is omitted, behavior is unchanged (uses `SQLSERVER_DATABASE` or server default)
- A `ConnectionManager` class maintains a `Map<string, SqlServerConnection>` keyed by database name
- Pools are created lazily on first use and reused on subsequent calls
- Idle pools are closed after a configurable timeout (default: 5 minutes)
- The `database` parameter is validated through `ParameterValidator` (same rules as schema/table identifiers)
- `npm run build` passes
- `npm run lint` passes (once ESLint config is fixed or lint is skipped for pre-existing issues)
<!-- SPECIFICATION:END -->

## Design

<!-- DESIGN:BEGIN -->
### Context Manifest
- `src/connection.ts` - Current `SqlServerConnection` class; add `ConnectionManager` here or in new file
- `src/tools/base.ts` - `BaseTool`; update `executeSafeQuery` / `executeSafeQueryWithParams` to accept optional database
- `src/tools/*.ts` - All tool files; add `database` to `getInputSchema()` and pass through in `execute()`
- `src/validation.ts` - `ParameterValidator`; reuse identifier validation for database name
- `src/types.ts` - Add `ConnectionManager` interface if needed
- `src/index.ts` - Wire `ConnectionManager` instead of single `SqlServerConnection`

### Architecture

**ConnectionManager** (new class, in `src/connection.ts` or `src/connection-manager.ts`):
```
class ConnectionManager {
  private pools: Map<string, SqlServerConnection>
  private defaultDatabase: string | undefined
  private idleTimers: Map<string, NodeJS.Timeout>
  private idleTimeoutMs: number  // default 300_000 (5 min)

  getConnection(database?: string): Promise<SqlServerConnection>
  closeAll(): Promise<void>
}
```

- `getConnection(database?)` returns existing pool or creates a new one by cloning the base config with the requested database name
- Default database (no param) reuses the original pool from `SQLSERVER_DATABASE`
- Each non-default pool gets an idle timer; reset on use, closed on expiry

**Tool changes** (mechanical, same pattern for all tools):
1. Add `database: { type: "string", description: "..." }` to `getInputSchema().properties`
2. In `execute()`, extract `database` from args and pass to `executeSafeQuery` / `executeSafeQueryWithParams`
3. `BaseTool` routes through `ConnectionManager.getConnection(database)` instead of using a single connection

**Validation:**
- Database name validated via `ParameterValidator.validateIdentifier()` (reuse existing logic)
- Reject reserved words, bracket-escape before any use in non-parameterized contexts
<!-- DESIGN:END -->

## TODO

<!-- TODO:BEGIN -->
- [x] Create `ConnectionManager` class with pool-per-database caching
- [x] Add idle timeout logic to close unused pools
- [x] Update `BaseTool` to accept optional `database` parameter and route through `ConnectionManager`
- [x] Add `database` parameter to `getInputSchema()` for all tools
- [x] Update `execute()` in all tools to pass `database` through
- [x] Add database name validation in `ParameterValidator`
- [x] Wire `ConnectionManager` into `src/index.ts` replacing single connection
- [x] Verify `npm run build` passes
- [x] Add ConnectionManager unit tests
- [x] Update existing tool tests for new mock shape
<!-- TODO:END -->

## Notes

<!-- NOTES:BEGIN -->
- Depends on task-003 (parameterized queries) because the per-database connection must support both `query()` and `queryWithParams()` paths.
- The `list_databases` tool already queries `sys.databases` which works server-wide. It still accepts the `database` parameter for consistency but the query itself does not change.
- `test_connection` tests the specified database if provided, default otherwise.
- `ConnectionManager` created in `src/connection-manager.ts` (separate file from `connection.ts`).
- Database name validation reuses existing `ParameterValidator.validateDatabaseName()` — already existed in validation.ts.
- Default pool is never subject to idle timeout eviction. Only non-default pools have idle timers.
- Codex review flagged redundant `getConnection()` calls in base.ts execution paths (safe/non-safe both look up). Accepted as-is: Map lookups are O(1) and the alternative adds structural complexity.
- ESLint config is a pre-existing issue (no eslint.config.js for ESLint v9). Not in scope.
- 120 tests pass (8 new for ConnectionManager, 112 existing).
<!-- NOTES:END -->
