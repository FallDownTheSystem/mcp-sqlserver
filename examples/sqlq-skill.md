---
name: sqlq
description: >
  SQL Server database explorer using the sqlq CLI. Discovers databases, tables,
  columns, relationships, indexes, and runs read-only queries.
  Use when the user asks about SQL Server schema, tables, columns,
  foreign keys, or wants to query a SQL Server database.
argument-hint: "[databases|tables|describe <table>|foreign-keys|search <term>|query <SQL>|test]"
allowed-tools: Bash(sqlq *)
---

# SQL Server Database Explorer (sqlq)

Explore MS SQL Server databases using the `sqlq` CLI tool. Read-only — never modify data or schema.

## Connection

`sqlq` reads connection config from environment variables or a `.env` file in the current working directory.

Required env vars:
```
SQLSERVER_HOST=your-server
SQLSERVER_USER=your-username
SQLSERVER_PASSWORD=your-password
```

Optional:
```
SQLSERVER_DATABASE=your-database
SQLSERVER_PORT=1433
SQLSERVER_ENCRYPT=true
SQLSERVER_TRUST_CERT=true
```

CLI flags override env vars: `sqlq --host myserver --user sa --password secret tables`

For secure password input: `sqlq --password-stdin tables`

## Schema Awareness

Databases often have multiple schemas (dbo, sales, auth, etc.). All discovery commands include schema names. For unqualified table names:
1. Check if it exists in multiple schemas, if ambiguous, ask user
2. Use `-s/--schema` flag to filter
3. Always display schema prefix in output

## Commands

Route based on $ARGUMENTS or determine intent from natural language.

### `test` — Test Connection

```bash
sqlq test
sqlq test --json
```

### `databases` — List Databases

```bash
sqlq databases
sqlq databases --json
```

### `tables` — List Tables

```bash
sqlq tables
sqlq tables --schema dbo
sqlq tables -d OtherDB
sqlq tables --json
```

### `views` — List Views

```bash
sqlq views
sqlq views --schema dbo
```

### `describe <table>` — Describe Table Schema

```bash
sqlq describe Users
sqlq describe Users --schema dbo
sqlq describe Users -d OtherDB
sqlq describe Users --json
```

### `query <sql>` — Execute Read-Only Query

```bash
sqlq query "SELECT TOP 10 * FROM Users"
sqlq query "SELECT * FROM Orders" --limit 50
sqlq query --file query.sql
echo "SELECT 1" | sqlq query -
sqlq query "SELECT TOP 5 * FROM sys.tables" --json
```

### `foreign-keys [table]` — Get Foreign Key Relationships

```bash
sqlq foreign-keys
sqlq foreign-keys Users
sqlq foreign-keys Users --schema dbo
sqlq fk Users
```

### `server-info` — Server Version and Edition

```bash
sqlq server-info
sqlq info
```

### `stats [table]` — Table Statistics

```bash
sqlq stats
sqlq stats Users
sqlq stats Users --schema dbo
```

### `search <term>` — Search Tables and Columns

Search is done via query:

Tables matching a term:
```bash
sqlq query "SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME LIKE '%<TERM>%' ORDER BY TABLE_SCHEMA, TABLE_NAME"
```

Columns matching a term:
```bash
sqlq query "SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE COLUMN_NAME LIKE '%<TERM>%' ORDER BY TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME"
```

### `schema` — Full Schema Discovery

Run `tables` then `describe` for each table. If >20 tables, ask user for full schema or subset.

## Output Modes

- **Rich** (default in TTY): colored tables, spinners
- **Plain** (`--plain` or piped): tab-separated, no color
- **JSON** (`--json`): raw JSON to stdout only

All diagnostics (spinners, errors) go to stderr. Data goes to stdout.

For piping: `sqlq tables --json | jq '.[] | .table_name'`

## Global Options

| Flag | Description |
|------|-------------|
| `--json` | Output raw JSON to stdout |
| `--plain` | Plain text, no tables/colors |
| `-d, --database <name>` | Target database override |
| `--host <host>` | Server hostname |
| `--user <user>` | Username |
| `--password <pw>` | Password (discouraged, use env or --password-stdin) |
| `--port <port>` | Port number |
| `--encrypt` / `--no-encrypt` | Encryption toggle |
| `--trust-cert` / `--no-trust-cert` | Certificate trust toggle |
| `--timeout <ms>` | Connection timeout |
| `--max-rows <n>` | Row limit |

## Safety Rules

Strictly read-only. `sqlq` validates all queries: only SELECT/WITH/SHOW/DESCRIBE/EXPLAIN allowed. INSERT/UPDATE/DELETE/DROP/CREATE/ALTER/TRUNCATE/EXEC and other modifying statements are rejected.

If user asks to modify data, explain read-only constraint.

## Errors

| Error | Cause |
|-------|-------|
| Authentication failed | Wrong credentials or no access |
| Server not found | Wrong hostname, SQL Server not running, firewall |
| SSL/Certificate error | Set `SQLSERVER_TRUST_CERT=true` or `--trust-cert` |
| Timeout | Add `--limit`, `TOP N`, or `WHERE` clause |
| Permission denied | Contact DBA for SELECT access |
