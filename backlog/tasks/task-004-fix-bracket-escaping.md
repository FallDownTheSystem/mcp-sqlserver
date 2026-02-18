---
id: task-004-fix-bracket-escaping
title: Fix bracket escaping bug and standardize on parameterized queries
status: "Done"
created_date: '2026-02-18 13:41'
updated_date: '2026-02-18 14:04'
parent: task-001-upgrade-mcp-sqlserver
dependencies:
  - task-003-add-parameterized-queries
---

## Description

`ParameterValidator.escapeIdentifier()` wraps values in brackets (`[dbo]`), but these bracketed values are used in WHERE clauses for string comparison against `INFORMATION_SCHEMA` columns. SQL Server interprets `[dbo]` as a column reference, not the string literal `'dbo'`, causing "Invalid column name" errors. This breaks `describe_table` and `list_tables` (with schema filter). Additionally, other tools (`list_views`, `get_foreign_keys`, `get_table_stats`) use ad-hoc `.replace(/'/g, "''")` escaping which is inconsistent and fragile.

The fix is to migrate all tools to use parameterized queries (from task-003) for user-supplied WHERE clause values. Bracket escaping remains valid only for identifiers in FROM/ORDER BY clauses (column/table names in SQL syntax position), not for string comparisons.

## Specification

- `list_tables` uses parameterized query for schema filter: `WHERE TABLE_SCHEMA = @schema`
- `describe_table` uses parameterized queries for table_name and schema: `WHERE TABLE_NAME = @tableName AND TABLE_SCHEMA = @schema`
- `list_views` uses parameterized query for schema filter (replacing quote escaping)
- `get_foreign_keys` uses parameterized queries for table_name and schema (replacing quote escaping)
- `get_table_stats` uses parameterized queries for table_name and schema (replacing quote escaping)
- No tool uses string interpolation for WHERE clause values
- `npm run build` passes

## Design

Key files to modify:
- `src/tools/list-tables.ts` - Replace `escapeIdentifier(schema)` in WHERE with `@schema` param
- `src/tools/describe-table.ts` - Replace `escapeIdentifier()` in WHERE with `@tableName`, `@schema` params
- `src/tools/list-views.ts` - Replace `.replace(/'/g, "''")` with `@schema` param
- `src/tools/get-foreign-keys.ts` - Replace quote escaping with `@tableName`, `@schema` params
- `src/tools/get-table-stats.ts` - Replace quote escaping with `@tableName`, `@schema` params

Each tool switches from `executeSafeQuery(query)` to `executeSafeQueryWithParams(query, params)`.

Example for list-tables.ts:
```typescript
if (schema) {
  query += ` AND TABLE_SCHEMA = @schema`;
  params.push({ name: 'schema', value: schema });
}
return await this.executeSafeQueryWithParams<TableInfo>(query, params);
```

## TODO

- [x] Fix `list-tables.ts` to use parameterized query for schema
- [x] Fix `describe-table.ts` to use parameterized queries for table_name and schema
- [x] Fix `list-views.ts` to use parameterized query for schema
- [x] Fix `get-foreign-keys.ts` to use parameterized queries for table_name and schema
- [x] Fix `get-table-stats.ts` to use parameterized queries for table_name and schema
- [x] Remove unused `escapeIdentifier` calls for WHERE values (keep for FROM clause identifiers if needed)
- [x] Verify build passes

## Notes

Codex review flagged that `get-foreign-keys.ts` and `get-table-stats.ts` originally defaulted `schema` to `'dbo'` via destructuring (`const { schema = 'dbo' } = params`), but `validateForeignKeyParameters` doesn't apply that default. Fixed by passing `schema: params.schema ?? 'dbo'` to the validator, preserving original behavior.
