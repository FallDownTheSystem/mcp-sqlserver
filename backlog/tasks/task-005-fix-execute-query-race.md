---
id: task-005-fix-execute-query-race
title: Fix race condition in execute-query tool
status: "Done"
created_date: '2026-02-18 13:41'
updated_date: '2026-02-18 14:06'
parent: task-001-upgrade-mcp-sqlserver
dependencies:
---

## Description

The `ExecuteQueryTool.execute()` method temporarily swaps `this.maxRows` on the shared instance to override the row limit per query, then restores it after execution. If two queries execute concurrently, one will see the other's limit. This is a race condition on shared mutable state.

## Specification

- `ExecuteQueryTool.execute()` no longer mutates `this.maxRows`
- The per-query limit is passed as a parameter through the query execution chain
- Concurrent calls with different limits produce correct results
- `npm run build` passes

## Design

Key files:
- `src/tools/execute-query.ts` - Pass `maxRows` override to `executeQuery()` instead of swapping instance field
- `src/tools/base.ts` - Add optional `maxRows` parameter to `executeQuery()`

Approach: Add an optional `maxRowsOverride` parameter to `BaseTool.executeQuery()`:

```typescript
// base.ts
protected async executeQuery<T = any>(query: string, maxRowsOverride?: number): Promise<T[]> {
  const validation = QueryValidator.validateQuery(query);
  if (!validation.isValid) {
    throw new Error(`Query validation failed: ${validation.error}`);
  }
  const sanitizedQuery = QueryValidator.sanitizeQuery(query);
  const limitedQuery = QueryValidator.addRowLimit(sanitizedQuery, maxRowsOverride ?? this.maxRows);
  const result = await this.connection.query<T>(limitedQuery);
  return result.recordset;
}

// execute-query.ts
const result = await this.executeQuery(query, maxRows);
```

## TODO

- [x] Add optional `maxRowsOverride` parameter to `BaseTool.executeQuery()`
- [x] Update `ExecuteQueryTool.execute()` to pass limit as parameter
- [x] Remove the `this.maxRows` swap logic
- [x] Verify build passes
