---
id: task-001-upgrade-mcp-sqlserver
title: Upgrade and fix MCP SQL Server
status: "To Do"
created_date: '2026-02-18 13:41'
updated_date: '2026-02-18 15:16'
dependencies:
subtasks:
  - task-002-upgrade-mcp-sdk
  - task-003-add-parameterized-queries
  - task-004-fix-bracket-escaping
  - task-005-fix-execute-query-race
  - task-006-add-retry-logic
  - task-007-fix-version-mismatch
  - task-008-add-tests
  - task-009-add-database-parameter
---

## Description

The MCP SQL Server project (cloned from bilims/mcp-sqlserver, forked to FallDownTheSystem/mcp-sqlserver) has 8 confirmed issues ranging from critical bugs to maintenance gaps. This parent task tracks the full upgrade effort: bumping the MCP SDK from v0.5.0 to v1.27.0, fixing broken bracket escaping in WHERE clauses, standardizing on parameterized queries, fixing a race condition, adding retry logic, fixing version mismatch, and adding tests.

## Specification

All subtasks must pass `npm run build` and `npm run lint`. The final state should have no known bugs from ISSUES.md, use MCP SDK ^1.27.0, and have basic test coverage.

## Design

### Context Manifest
- `src/index.ts` - Server setup, tool registration, MCP SDK imports
- `src/connection.ts` - SQL Server connection pool, query execution
- `src/security.ts` - Query validation, sanitization
- `src/validation.ts` - Parameter validation, escapeIdentifier()
- `src/errors.ts` - Error hierarchy
- `src/types.ts` - Zod schemas, TypeScript interfaces
- `src/cli.ts` - CLI argument handling, version display
- `src/tools/base.ts` - BaseTool abstract class
- `src/tools/list-tables.ts` - Broken bracket escaping (Issue 1)
- `src/tools/describe-table.ts` - Broken bracket escaping (Issue 1)
- `src/tools/execute-query.ts` - Race condition (Issue 5)
- `src/tools/list-views.ts` - Quote escaping (Issue 4)
- `src/tools/get-foreign-keys.ts` - Quote escaping (Issue 4)
- `src/tools/get-table-stats.ts` - Quote escaping (Issue 4)
- `src/tools/list-databases.ts` - No user input, no escaping issues
- `src/tools/get-server-info.ts` - No user input, no escaping issues
- `src/tools/test-connection.ts` - No user input, no escaping issues
- `package.json` - SDK version, dependencies

### Architecture

Split into 7 subtasks ordered by dependency:
1. **SDK Upgrade** (task-002) - Foundation: bump SDK and Zod, verify build
2. **Parameterized Queries** (task-003) - Add `queryWithParams()` to connection layer
3. **Fix Bracket Escaping** (task-004) - Migrate all tools to parameterized queries (depends on task-003)
4. **Fix Execute Query Race** (task-005) - Pass maxRows as param instead of mutating state
5. **Add Retry Logic** (task-006) - Transient error retry with backoff in connection.ts
6. **Fix Version Mismatch** (task-007) - Read version from package.json at runtime
7. **Add Tests** (task-008) - Unit tests for validators, security, and tool query generation

## TODO
- [ ] Complete all 7 subtasks
- [ ] Final integration test
- [ ] Push to fork

## Notes

**Repository:**
- Origin: https://github.com/bilims/mcp-sqlserver
- Fork: https://github.com/FallDownTheSystem/mcp-sqlserver

**Issue Validation:** All 8 issues from ISSUES.md confirmed real by Codex code review.

**MCP SDK Research:** v1.27.0 is latest stable. The `Server` class API is backwards-compatible. `StdioServerTransport`, `setRequestHandler`, `ListToolsRequestSchema`, `CallToolRequestSchema` all unchanged. Only Zod needs bump to ^3.25.0 for peer dependency compatibility. Optional migration to `McpServer` high-level API available but not required.
