# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Read-only MCP (Model Context Protocol) server for Microsoft SQL Server. Exposes SQL Server databases to AI agents via the MCP SDK over stdio transport. All queries are validated to be read-only (SELECT/WITH/SHOW/DESCRIBE/EXPLAIN only).

## Commands

```bash
npm run build          # TypeScript compile (tsc) → dist/
npm run dev            # Run with tsx (no build needed)
npm start              # Run compiled output (dist/index.js)
npm run lint           # ESLint on src/**/*.ts
npm test               # Jest (no tests exist yet)
```

## Architecture

**ESM project** — uses `"type": "module"` with `.js` extensions in imports. TypeScript targets ES2022 with ESNext modules.

### Entry Point & Server Setup

`src/index.ts` — Contains the `SqlServerMCPServer` class and `main()`. Uses dynamic imports for all dependencies. Reads config from environment variables, validates with Zod, creates the MCP `Server` with stdio transport, and registers `ListToolsRequest` / `CallToolRequest` handlers. Connection to SQL Server is deferred until first tool use (not at startup).

### Tool System

All tools extend `BaseTool` (`src/tools/base.ts`) which provides:
- `executeQuery()` — validates via `QueryValidator`, sanitizes, adds TOP row limit, runs query
- `executeSafeQuery()` — wraps `executeQuery` with lazy connection and error handling

Each tool implements four abstract methods: `getName()`, `getDescription()`, `getInputSchema()`, `execute()`. Tools are registered in a `Map<string, BaseTool>` keyed by tool name.

To add a new tool: create a file in `src/tools/`, extend `BaseTool`, export from `src/tools/index.ts`, and add the class to the `toolClasses` array in `src/index.ts:initializeTools()`.

### Security Layers

1. **QueryValidator** (`src/security.ts`) — Whitelist of allowed statement prefixes, blacklist of forbidden keywords (INSERT/UPDATE/DELETE/DROP/EXEC etc.), SQL injection pattern detection, query sanitization, automatic TOP clause injection
2. **ParameterValidator** (`src/validation.ts`) — Zod schemas for identifiers (schema/table/column/database names), bracket-escaping via `escapeIdentifier()`, reserved word rejection
3. **Error hierarchy** (`src/errors.ts`) — `MCPError` base with typed subclasses (`ConnectionError`, `SecurityError`, `ValidationError`, `QueryError`, `TimeoutError`, `PermissionError`). `ErrorHandler` maps SQL Server error codes to these types with user-facing suggestions.

### Key Types

`src/types.ts` — `ConnectionConfigSchema` (Zod), `ConnectionConfig`, and interfaces for all SQL Server metadata shapes (`TableInfo`, `ColumnInfo`, `ForeignKeyInfo`, `ViewInfo`, `DatabaseInfo`, `ServerInfo`, `QueryResult`, `TableStats`).

## Environment Variables

Required: `SQLSERVER_HOST`, `SQLSERVER_USER`, `SQLSERVER_PASSWORD`
Optional: `SQLSERVER_DATABASE`, `SQLSERVER_PORT` (1433), `SQLSERVER_ENCRYPT` (true), `SQLSERVER_TRUST_CERT` (true), `SQLSERVER_CONNECTION_TIMEOUT` (30000), `SQLSERVER_REQUEST_TIMEOUT` (60000), `SQLSERVER_MAX_ROWS` (1000)

## Conventions

- Strict TypeScript (`noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`, `noImplicitReturns`)
- Tool names use snake_case (`list_tables`, `execute_query`)
- SQL queries in tools use `INFORMATION_SCHEMA` views for metadata
- Identifiers are bracket-escaped (`[name]`) before interpolation into SQL
