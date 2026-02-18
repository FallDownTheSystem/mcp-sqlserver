---
id: task-003-add-parameterized-queries
title: Add parameterized query support to connection layer
status: "Done"
created_date: '2026-02-18 13:41'
updated_date: '2026-02-18 13:58'
parent: task-001-upgrade-mcp-sqlserver
dependencies:
---

## Description

The connection layer (`src/connection.ts`) only supports raw SQL string queries. The `mssql` library supports `request.input(name, type, value)` for parameterized queries, but this is never used. All user-supplied values are injected via string manipulation (bracket escaping or quote escaping), which is both buggy (Issue 1) and a security risk (Issue 3). Adding a parameterized query method enables tools to safely pass user input without string interpolation.

## Specification

- Add `queryWithParams<T>(queryText: string, params: QueryParam[]): Promise<sql.IResult<T>>` method to `SqlServerConnection`
- `QueryParam` type: `{ name: string; type?: sql.ISqlType; value: unknown }`
- Each param is bound via `request.input(name, type, value)` before execution
- If `type` is omitted, let `mssql` infer the type (it supports auto-detection)
- Existing `query()` method remains unchanged for backwards compatibility
- Add corresponding `executeQueryWithParams()` to `BaseTool` that validates the query, sanitizes it, adds row limits, then calls `queryWithParams()`
- `npm run build` passes

## Design

Key files:
- `src/connection.ts` - Add `queryWithParams()` method
- `src/tools/base.ts` - Add `executeQueryWithParams()` and `executeSafeQueryWithParams()` methods
- `src/types.ts` - Add `QueryParam` interface

Pattern: Follow existing `query()` / `executeQuery()` / `executeSafeQuery()` chain, adding parallel methods that accept params.

```typescript
// connection.ts
interface QueryParam {
  name: string;
  type?: sql.ISqlType;
  value: unknown;
}

async queryWithParams<T = any>(queryText: string, params: QueryParam[]): Promise<sql.IResult<T>> {
  if (!this.pool) {
    throw new Error('Database connection not established');
  }
  const request = this.pool.request();
  for (const param of params) {
    if (param.type) {
      request.input(param.name, param.type, param.value);
    } else {
      request.input(param.name, param.value);
    }
  }
  return await request.query(queryText);
}
```

## TODO

- [x] Add `QueryParam` interface to `src/types.ts`
- [x] Add `queryWithParams()` method to `SqlServerConnection`
- [x] Add `executeQueryWithParams()` to `BaseTool`
- [x] Add `executeSafeQueryWithParams()` to `BaseTool`
- [x] Verify build passes

## Notes

- Used `import type { ISqlType } from 'mssql'` (type-only import) in `types.ts` instead of runtime `import sql from 'mssql'` to avoid unnecessary runtime coupling — flagged and fixed during Codex review.
- ESLint config is broken (ESLint 9 without `eslint.config.js`) — pre-existing, not related to this task.
