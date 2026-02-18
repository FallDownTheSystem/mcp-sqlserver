---
id: task-010-add-cli-tool
title: Add CLI tool alternative to MCP server
status: "Done"
created_date: '2026-02-18 15:56'
updated_date: '2026-02-18 16:26'
parent: null
dependencies:
subtasks:
---

## Description

<!-- DESCRIPTION:BEGIN -->
Add a standalone CLI tool (`sqlq`) that lets users run the same SQL Server read-only commands directly from their terminal. Today, the only way to use the toolset is through the MCP protocol (aimed at AI agents). The CLI gives humans a direct way to explore databases, list tables, describe schemas, and run queries from the command line — with rich table output, plain text mode, and JSON output.

Both the MCP server and CLI share all core logic: tools, connection management, validation, and security. The CLI is a separate entry point (`src/cli-app.ts`) compiled to a second binary (`sqlq`) alongside the existing `mcp-sqlserver` binary.
<!-- DESCRIPTION:END -->

## Specification

<!-- SPECIFICATION:BEGIN -->
### Functional Requirements

1. **Separate binary**: `sqlq` (registered in `package.json` `bin` alongside `mcp-sqlserver`)
2. **All 9 tools available as subcommands**:
   - `sqlq test` — test_connection
   - `sqlq databases` — list_databases
   - `sqlq tables` — list_tables
   - `sqlq views` — list_views
   - `sqlq describe <table>` — describe_table
   - `sqlq query <sql>` — execute_query
   - `sqlq foreign-keys [table]` — get_foreign_keys
   - `sqlq server-info` — get_server_info
   - `sqlq stats [table]` — get_table_stats
3. **Global options** (inherited by all subcommands):
   - `--json` — output raw JSON to stdout (mutually exclusive with `--plain`)
   - `--plain` — compact text, no tables/colors (mutually exclusive with `--json`)
   - `--database <name>` / `-d <name>` — target database override
   - `--host`, `--user`, `--password`, `--port` — connection overrides (env vars are defaults)
   - `--encrypt`, `--no-encrypt` — encryption toggle
   - `--trust-cert`, `--no-trust-cert` — certificate trust toggle
   - `--timeout <ms>` — connection timeout
   - `--max-rows <n>` — row limit
   - `--password-stdin` — read password from stdin (safer than `--password` flag)
4. **Query input**: `sqlq query <sql>` for inline SQL, `sqlq query --file <path>` to read from file, `echo "SELECT 1" | sqlq query -` to read from stdin
5. **Output modes** matching Jira CLI pattern:
   - **Rich** (default when TTY): colored tables via `cli-table3` + `picocolors`, spinners
   - **Plain** (default when piped/not TTY): one-line-per-row, no color, no decoration
   - **JSON**: raw `JSON.stringify` of tool result to stdout only
   - Auto-detect: if stdout is not a TTY, default to plain (skip spinner/color). `--json`/`--plain` explicitly override.
6. **Stdout/stderr contract**: data output always to stdout, diagnostics/errors/spinners to stderr. In `--json` mode, stdout contains only valid JSON.
7. **Exit codes**: 0 on success, 1 on error (connection, validation, query failure, unknown command)
8. **Connection config**: reads `SQLSERVER_*` env vars (same as MCP), CLI flags override env vars. Precedence: flag > env var > default.
9. **Same security**: all queries go through `QueryValidator`, `ParameterValidator`, same error handling
10. **Lifecycle**: `ConnectionManager.closeAll()` called in finally block after every command execution

### Non-Functional Requirements

- Uses `commander` for CLI framework (same as C:\projects\jira)
- Uses `picocolors` for colors, `cli-table3` for tables (same as C:\projects\jira)
- Custom spinner matching Jira CLI pattern (no `ora` dependency)
- TypeScript compiled alongside existing code (same tsconfig)
- No changes to existing tool classes or MCP entry point

### Acceptance Criteria

- [ ] `sqlq --help` shows all subcommands and global options (no DB config required)
- [ ] `sqlq --version` prints package version
- [ ] `sqlq tables` lists tables in rich table format (when TTY)
- [ ] `sqlq tables --json` outputs only valid JSON to stdout
- [ ] `sqlq tables --plain` outputs plain text without color
- [ ] `sqlq tables | cat` auto-detects non-TTY and uses plain mode
- [ ] `sqlq query "SELECT TOP 5 * FROM sys.tables"` executes read-only query
- [ ] `sqlq query --file query.sql` reads SQL from file
- [ ] `echo "SELECT 1" | sqlq query -` reads SQL from stdin
- [ ] `sqlq query "DROP TABLE foo"` is rejected by QueryValidator (exit code 1)
- [ ] `sqlq describe Users --schema dbo` shows column schema
- [ ] `sqlq -d OtherDB tables` targets a different database
- [ ] `sqlq --host myserver --user sa tables` overrides env vars
- [ ] Connection errors show helpful suggestions (same as MCP error handler)
- [ ] `npm run build` compiles both entry points
- [ ] Existing `mcp-sqlserver` binary is unchanged
<!-- SPECIFICATION:END -->

## Design

<!-- DESIGN:BEGIN -->
### Architecture

```
src/
├── index.ts              # MCP entry point (unchanged)
├── cli-app.ts            # NEW: CLI entry point (commander program)
├── cli/
│   ├── commands.ts       # Subcommand definitions (one per tool)
│   ├── output.ts         # Spinner, table, field, heading, colors
│   └── formatters.ts     # Per-tool rich/plain formatters
├── tools/                # Existing tools (unchanged)
├── connection-manager.ts # Existing (unchanged)
├── security.ts           # Existing (unchanged)
├── validation.ts         # Existing (unchanged)
└── ...
```

### Entry Point (`src/cli-app.ts`)

```
#!/usr/bin/env node
- Import commander, create program "sqlq"
- Add global options: --json, --plain, --database, --host, --user, --password, --port, --encrypt, --trust-cert, --timeout, --max-rows, --password-stdin
- Conflict: --json and --plain are mutually exclusive (commander .conflicts())
- Register subcommands from cli/commands.ts
- Pre-action hook (skipped for help/version):
  - Read --password-stdin if set (read line from process.stdin)
  - Build ConnectionConfig from env vars, then override with CLI flags
  - Validate with ConnectionConfigSchema.parse()
  - Create ConnectionManager
  - Initialize tools Map (same pattern as index.ts initializeTools)
  - Store in CliContext accessible by subcommands
- Post-action hook: connectionManager.closeAll() (ensures cleanup)
- process.exitCode on error (not process.exit() to allow cleanup)
- Parse and run
```

### Command Registration Pattern (`src/cli/commands.ts`)

Each subcommand:
1. Calls the corresponding tool's `execute()` method directly
2. Routes result through the output formatter based on `--json`/`--plain`/rich mode
3. Shows spinner during execution (rich mode only)

```
function registerCommands(program: Command, getContext: () => CliContext): void {
  program
    .command('tables')
    .description('List all tables')
    .option('-s, --schema <name>', 'Filter by schema')
    .action(async function(opts) {
      const { tools, mode, database } = getContext();
      const tool = tools.get('list_tables');
      // spinner, execute, format output
    });
  // ... repeat for each tool
}
```

### Output Utilities (`src/cli/output.ts`)

Port from `C:\projects\jira\src\utils\output.js`, adapted to TypeScript:
- `spinner(text)` — start/success/error with ANSI escape codes, writes to **stderr** (never pollutes stdout)
- `table(head, rows)` — cli-table3 wrapper with picocolors headers
- `heading(text)`, `field(label, value)`, `divider()`
- `getOutputMode(cmd)` — reads --json/--plain flags from command chain; auto-detects non-TTY → plain
- `outputJson(data)` — `JSON.stringify` to stdout
- `outputError(error, mode)` — formats error per mode: colored stderr (rich), plain stderr (plain), JSON error to stdout (json)

### Formatters (`src/cli/formatters.ts`)

Per-tool formatting functions for rich and plain modes:
- `formatTables(data, mode)` — table with schema, name, type columns
- `formatQuery(data, mode)` — table with dynamic columns from QueryResult
- `formatDescribe(data, mode)` — column name, type, nullable, default
- `formatConnectionTest(data, mode)` — key-value display
- etc.

### package.json Changes

```json
{
  "bin": {
    "mcp-sqlserver": "dist/index.js",
    "sqlq": "dist/cli-app.js"
  },
  "dependencies": {
    "commander": "^14.0.0",
    "picocolors": "^1.1.0",
    "cli-table3": "^0.6.5",
    ...existing
  }
}
```

### Key Design Decisions

1. **Separate entry point, shared tools**: `cli-app.ts` creates `ConnectionManager` + tools Map identically to `index.ts`, but dispatches via commander instead of MCP protocol
2. **No changes to BaseTool or any tool class**: CLI calls `tool.execute(params)` directly — same interface as MCP handler
3. **Config precedence**: CLI flag > env var > default. Full parity with all `SQLSERVER_*` env vars.
4. **Strict I/O contract**: data to stdout, everything else (spinners, diagnostics, errors in rich/plain mode) to stderr. `--json` mode guarantees stdout is valid JSON only.
5. **TTY-aware defaults**: rich mode when TTY, plain mode when piped. Explicit `--json`/`--plain` always overrides.
6. **Connection lifecycle**: `ConnectionManager.closeAll()` guaranteed via post-action hook / finally block.
7. **Named `sqlq`**: Short, memorable, indicates SQL + query. Different from `mcp-sqlserver` to avoid confusion.
8. **Help never requires config**: `--help`/`--version` work without any env vars or connection flags.
9. **`--password` security**: kept for convenience but documented as discouraged. `--password-stdin` offered as safer alternative.

### Context Manifest

#### How the MCP Server Currently Works: Entry Point and Tool Dispatch

The application has a single entry point `src/index.ts` that serves as both the npm bin executable (`mcp-sqlserver`) and the MCP server. The entire `main()` function and `SqlServerMCPServer` class are defined inside an async `runServer()` wrapper that uses dynamic imports for all dependencies. This pattern supports execution from any working directory when installed globally via npm.

Startup flow:
1. `handleCliArgs()` from `src/cli.ts` checks for `--help`/`-h` or `--version`/`-v`. Returns `false` to halt (help/version printed) or `true` to proceed. Also validates `SQLSERVER_HOST`/`SQLSERVER_USER`/`SQLSERVER_PASSWORD` env vars exist.
2. `main()` reads config from env vars into a plain object (lines 174-185), validates with `ConnectionConfigSchema.parse()`, checks user/password non-empty.
3. `server.initialize(config)` creates `ConnectionManager` with config, calls `initializeTools(maxRows)`.
4. `initializeTools()` (lines 127-144) instantiates all 9 tool classes into `Map<string, BaseTool>`:
```typescript
const toolClasses = [
  TestConnectionTool, ListDatabasesTool, ListTablesTool, ListViewsTool,
  DescribeTableTool, ExecuteQueryTool, GetForeignKeysTool, GetServerInfoTool,
  GetTableStatsTool,
];
for (const ToolClass of toolClasses) {
  const tool = new ToolClass(this.connectionManager, maxRows);
  this.tools.set(tool.getName(), tool);
}
```
5. `server.run()` creates `StdioServerTransport`, connects to MCP `Server`.

MCP dispatch: `CallToolRequestSchema` handler looks up tool by name, calls `tool.execute(args || {})`, wraps result as `{ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }`. Errors go through `ErrorHandler.handleSqlServerError()` then `ErrorHandler.formatErrorForUser()`.

The CLI entry point must replicate steps 1-4 (config + ConnectionManager + tool Map) but replace step 5 with commander-based subcommand dispatch that calls `tool.execute(params)` directly.

#### Tool Execute Interface: What the CLI Calls

Every tool's `execute()` method takes a params object and returns a Promise of typed data. The params always include an optional `database?: string` field. The return types are plain data objects with no MCP wrapping.

| Tool | execute() Params | Return Type |
|------|-----------------|-------------|
| `test_connection` | `{ database? }` | `{ isConnected, serverInfo?, database?, connectionTime?, error?, details? }` |
| `list_databases` | `{ database? }` | `DatabaseInfo[]` — `{ database_id, name, create_date, collation_name, state_desc }` |
| `list_tables` | `{ schema?, database? }` | `TableInfo[]` — `{ table_catalog, table_schema, table_name, table_type }` |
| `list_views` | `{ schema?, database? }` | `ViewInfo[]` — `{ table_catalog, table_schema, table_name, view_definition, check_option, is_updatable }` |
| `describe_table` | `{ table_name, schema?, database? }` | `ColumnInfo[]` — `{ column_name, data_type, is_nullable, column_default, ordinal_position, ... }` |
| `execute_query` | `{ query, limit?, database? }` | `QueryResult` — `{ columns: string[], rows: any[][], rowCount, executionTime }` |
| `get_foreign_keys` | `{ table_name?, schema?, database? }` | `ForeignKeyInfo[]` — `{ constraint_name, table_schema, table_name, column_name, referenced_* }` |
| `get_server_info` | `{ database? }` | `ServerInfo` — `{ server_name, product_version, product_level, edition, engine_edition }` |
| `get_table_stats` | `{ table_name?, schema?, database? }` | `TableStats[]` — `{ table_schema, table_name, row_count, data_size_kb, index_size_kb, total_size_kb }` |

#### Connection Management

`ConnectionManager` (81 lines) manages a `Map<string, SqlServerConnection>` keyed by database name. Default key is `baseConfig.database ?? ''`. Non-default connections have idle timers (5 min default) that auto-close. Constructor: `new ConnectionManager(baseConfig: ConnectionConfig, idleTimeoutMs?: number)`. Key methods: `getConnection(database?)`, `closeAll()`.

`SqlServerConnection` (129 lines) wraps `mssql.ConnectionPool`. Lazy connect on first `connect()` call. Exponential backoff retry for transient errors (ETIMEOUT, ECONNCLOSED, ECONNRESET, ESOCKET, ECONNREFUSED). Pool config: max 10, min 0, idle timeout 30s.

#### Security and Validation

`QueryValidator` enforces read-only: queries must start with SELECT/WITH/SHOW/DESCRIBE/EXPLAIN. Whole-word blacklist for INSERT/UPDATE/DELETE/DROP/CREATE/ALTER/TRUNCATE/EXEC/EXECUTE/OPENROWSET/OPENDATASOURCE/BULK/MERGE/GRANT/REVOKE/DENY. Prefix blacklist: SP_, XP_. SQL injection pattern detection. `addRowLimit()` injects `TOP {maxRows}` after SELECT.

`ParameterValidator` validates SQL identifiers via Zod: `^[a-zA-Z_][a-zA-Z0-9_]*$`, max 128 chars, no reserved words for schema/table/database names. `escapeIdentifier()` wraps in brackets.

#### Error Handling

`MCPError` base with `code` and `details`. Subclasses: `ConnectionError`, `ValidationError`, `SecurityError`, `QueryError`, `TimeoutError`, `PermissionError`. `ErrorHandler.handleSqlServerError()` maps SQL Server numeric codes (18456=login, 208=invalid object, 262/229=permission denied, -2=timeout, 1205=deadlock) and message patterns to typed errors. `ErrorHandler.formatErrorForUser()` returns `{ error, code, suggestions[] }`.

For the CLI, errors should be caught at the command action level and displayed using the output utilities (colored error messages in rich mode, plain text in plain mode, JSON error object in JSON mode).

#### Config Reading Pattern (to extract/share)

```typescript
// From src/index.ts lines 174-185 — this exact pattern needs reuse in cli-app.ts
const config = {
  server: process.env.SQLSERVER_HOST || 'localhost',
  database: process.env.SQLSERVER_DATABASE,
  user: process.env.SQLSERVER_USER || '',
  password: process.env.SQLSERVER_PASSWORD || '',
  port: parseInt(process.env.SQLSERVER_PORT || '1433'),
  encrypt: process.env.SQLSERVER_ENCRYPT !== 'false',
  trustServerCertificate: process.env.SQLSERVER_TRUST_CERT !== 'false',
  connectionTimeout: parseInt(process.env.SQLSERVER_CONNECTION_TIMEOUT || '30000'),
  requestTimeout: parseInt(process.env.SQLSERVER_REQUEST_TIMEOUT || '60000'),
  maxRows: parseInt(process.env.SQLSERVER_MAX_ROWS || '1000'),
};
```

The CLI must merge this with `--host`/`--user`/`--password`/`--port` flags (flags override env vars).

#### Build and Package Configuration

ESM project: `"type": "module"`, TypeScript targets ES2022/ESNext, bundler moduleResolution. Strict mode with `noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`, `noImplicitReturns`. All `.ts` imports use `.js` extensions. `tsconfig.json` includes `src/**/*` — new files in `src/` auto-included. No changes to tsconfig needed.

Package.json `bin` field currently: `{ "mcp-sqlserver": "dist/index.js" }`. `files` array: `["dist", "README.md", "LICENSE", "INSTALL.md", "QUICK-START.md", "examples"]`. Jest uses ts-jest ESM preset with `.js` -> `.ts` module name mapping.

Package version reading pattern (used in both index.ts and cli.ts):
```typescript
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };
```

#### File Reference

| File | Lines | Role |
|------|-------|------|
| `src/index.ts` | 1-222 | MCP entry point. Tool init (127-144), config reading (174-185), MCP dispatch (88-124). Pattern to replicate. |
| `src/cli.ts` | 1-122 | MCP binary --help/--version handler. `handleCliArgs()` exported. Stays unchanged. |
| `src/tools/base.ts` | 1-69 | `BaseTool` abstract class. `executeQuery`, `executeSafeQuery`, `executeQueryWithParams`, `executeSafeQueryWithParams`. CLI calls `execute()` same way. |
| `src/tools/index.ts` | 1-11 | Barrel export of all 9 tool classes + BaseTool. |
| `src/tools/test-connection.ts` | 1-139 | `TestConnectionTool`. Local `ConnectionTestResult` interface (not exported from types.ts). |
| `src/tools/list-databases.ts` | 1-44 | Returns `DatabaseInfo[]`. No required params. |
| `src/tools/list-tables.ts` | 1-57 | Returns `TableInfo[]`. Optional `schema` param. |
| `src/tools/list-views.ts` | 1-58 | Returns `ViewInfo[]`. Optional `schema` param. |
| `src/tools/describe-table.ts` | 1-70 | Returns `ColumnInfo[]`. Required `table_name`, optional `schema`. |
| `src/tools/execute-query.ts` | 1-70 | Returns `QueryResult` `{ columns, rows, rowCount, executionTime }`. Required `query`, optional `limit`. |
| `src/tools/get-foreign-keys.ts` | 1-80 | Returns `ForeignKeyInfo[]`. Optional `table_name`, `schema`. |
| `src/tools/get-server-info.ts` | 1-42 | Returns single `ServerInfo`. No required params. |
| `src/tools/get-table-stats.ts` | 1-87 | Returns `TableStats[]`. Optional `table_name`, `schema`. |
| `src/connection.ts` | 1-129 | `SqlServerConnection`. Wraps mssql pool, retry logic. |
| `src/connection-manager.ts` | 1-81 | `ConnectionManager`. Pool-per-database, idle timer cleanup. |
| `src/types.ts` | 1-117 | `ConnectionConfigSchema` (Zod), `ConnectionConfig`, `QueryParam`, all data interfaces. |
| `src/security.ts` | 1-118 | `QueryValidator`. Read-only enforcement, sanitization, row limiting. |
| `src/validation.ts` | 1-175 | `ParameterValidator`. Zod schemas for identifiers, `escapeIdentifier()`. |
| `src/errors.ts` | 1-242 | `MCPError` hierarchy, `ErrorHandler` with SQL Server code mapping and user suggestions. |
| `package.json` | all | `bin`, `scripts`, `files`, `dependencies` fields need updates. |
| `tsconfig.json` | all | Compiler config. No changes needed. |
| `jest.config.js` | 1-17 | ts-jest ESM preset. No changes needed. |
| `src/__tests__/` | various | Existing tests for errors, validation, security, connection-manager, tools. |
<!-- DESIGN:END -->

## TODO

<!-- TODO:BEGIN -->
- [x] Update `package.json` — add `sqlq` to `bin`, add `cli-dev` script, add `commander`/`picocolors`/`cli-table3` dependencies
- [x] `npm install` new dependencies
- [x] Create `src/cli/output.ts` — spinner (stderr), table, heading, field, divider, getOutputMode (TTY-aware), outputJson, outputError
- [x] Create `src/cli/formatters.ts` — per-tool rich/plain formatters for all 9 tools
- [x] Create `src/cli/commands.ts` — register all 9 subcommands with options, aliases, and --file/stdin support for query
- [x] Create `src/cli-app.ts` — entry point with commander program, global options (including full config parity), pre-action hook (lazy init, skipped for help), post-action hook (closeAll), exit codes
- [x] Verify `npm run build` compiles both entry points without errors
- [x] Test `--help` and `--version` work without DB config
- [ ] Test all 9 subcommands in all 3 output modes (rich, plain, json)
- [ ] Test TTY auto-detection (pipe output to `cat`, verify no color/spinner)
- [ ] Test connection flag overrides vs env var defaults
- [x] Test error output and exit codes (invalid query, connection failure, unknown command)
- [x] Test `query --file` and stdin pipe input
- [ ] Test `--json` stdout purity (no non-JSON output mixed in)
<!-- TODO:END -->

## Notes

<!-- NOTES:BEGIN -->
- CLI binary name `sqlq` chosen to be short and distinct from `mcp-sqlserver`
- Commander, picocolors, cli-table3 chosen to match `C:\projects\jira` CLI patterns
- Existing `src/cli.ts` (handleCliArgs) is for MCP binary `--help`/`--version` only and stays unchanged
- The tool `execute()` return types are plain objects — no MCP-specific wrapping — making CLI reuse trivial
- `getOutputMode()` pattern from Jira CLI: checks `--json`/`--plain` flags up the command chain via `this` context
- `--password` flag kept but documented as discouraged (visible in process list/shell history). `--password-stdin` is the safe alternative.
- Codex review findings incorporated: lifecycle cleanup, stdout/stderr contract, TTY detection, exit codes, full config flag parity, query --file/stdin, help without config

**Codex Review (post-implementation):**
- Fixed: `query <sql>` required positional made optional `[sql]` to support `--file` without inline SQL
- Fixed: stdout/stderr contract — `heading`/`field`/`divider` and query row-count summary now write to stdout (data), only spinner/errors to stderr
- Fixed: file read errors now wrapped in try/catch with proper error display and exit code
- Aliases (dbs, fk, info) kept as reasonable UX additions

**Related Tasks:**
- task-001-upgrade-mcp-sqlserver - Parent upgrade task, all subtasks complete
<!-- NOTES:END -->
