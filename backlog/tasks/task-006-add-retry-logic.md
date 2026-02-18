---
id: task-006-add-retry-logic
title: Add retry logic for transient connection errors
status: "Done"
created_date: '2026-02-18 13:41'
updated_date: '2026-02-18 14:17'
parent: task-001-upgrade-mcp-sqlserver
dependencies:
---

## Description

Transient errors (`ETIMEOUT`, `ECONNCLOSED`, `ECONNRESET`) cause immediate failure with no retry or reconnection logic. For a long-running MCP server that maintains a connection pool, transient network issues should be retried with exponential backoff rather than immediately surfaced as errors.

## Specification

- Transient error codes trigger automatic retry: `ETIMEOUT`, `ECONNCLOSED`, `ECONNRESET`, `ESOCKET`, `ECONNREFUSED`
- Max 3 retry attempts with exponential backoff (100ms, 400ms, 900ms)
- On connection-level failure, recreate the connection pool before retrying
- Non-transient errors are thrown immediately without retry
- Retry behavior is encapsulated in the connection layer, transparent to tools
- `npm run build` passes

## Design

Key files:
- `src/connection.ts` - Add retry wrapper around `query()` and `queryWithParams()`

Approach: Add a private `isTransientError()` check and a `withRetry()` wrapper:

```typescript
private static readonly TRANSIENT_ERRORS = new Set([
  'ETIMEOUT', 'ECONNCLOSED', 'ECONNRESET', 'ESOCKET', 'ECONNREFUSED'
]);

private isTransientError(error: any): boolean {
  return SqlServerConnection.TRANSIENT_ERRORS.has(error?.code);
}

private async withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries || !this.isTransientError(error)) {
        throw error;
      }
      const delay = Math.pow(attempt + 1, 2) * 100;
      await new Promise(resolve => setTimeout(resolve, delay));
      // Reconnect on connection-level errors
      this.pool = null;
      await this.connect();
    }
  }
  throw new Error('Retry logic failed unexpectedly');
}
```

## TODO

- [x] Add `TRANSIENT_ERRORS` set and `isTransientError()` to `SqlServerConnection`
- [x] Add `withRetry()` private method
- [x] Wrap `query()` internals with `withRetry()`
- [x] Wrap `queryWithParams()` internals with `withRetry()`
- [x] Verify build passes

## Notes

Codex review found two issues, both fixed:
1. Pool was dropped without closing — added best-effort `pool.close()` before nulling
2. Reconnect failures aborted remaining retries — wrapped `connect()` in try/catch so remaining attempts continue
