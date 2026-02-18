# MCP SQL Server

A read-only [MCP](https://modelcontextprotocol.io/) server for Microsoft SQL Server. Gives AI agents safe access to explore and query your databases.

> Forked from [`@bilims/mcp-sqlserver`](https://github.com/AhmedBilims/mcp-sqlserver) by Onur Keskin. This fork adds per-tool database targeting, a connection pool manager, and the `sqlq` CLI.

## Install

```bash
npm install -g @falldownthesystem/mcp-sqlserver
```

Or run it directly:

```bash
npx @falldownthesystem/mcp-sqlserver
```

This gives you two commands: `mcp-sqlserver` (the MCP server) and `sqlq` (a standalone CLI for querying from your terminal).

## Configure

Connection is configured through environment variables or CLI flags. At minimum you need a host, user, and password.

```bash
export SQLSERVER_HOST="your-server.database.windows.net"
export SQLSERVER_USER="your-username"
export SQLSERVER_PASSWORD="your-password"
export SQLSERVER_DATABASE="your-database"
```

You can also set these optional variables:

| Variable | Default | Description |
|---|---|---|
| `SQLSERVER_PORT` | `1433` | Port number |
| `SQLSERVER_ENCRYPT` | `true` | TLS encryption |
| `SQLSERVER_TRUST_CERT` | `true` | Trust the server certificate (set `false` for Azure) |
| `SQLSERVER_CONNECTION_TIMEOUT` | `30000` | Connection timeout (ms) |
| `SQLSERVER_REQUEST_TIMEOUT` | `60000` | Query timeout (ms) |
| `SQLSERVER_MAX_ROWS` | `1000` | Max rows returned per query |

## MCP Integration

### Claude Desktop

Add this to your `claude_desktop_config.json`:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "sqlserver": {
      "command": "mcp-sqlserver",
      "env": {
        "SQLSERVER_HOST": "your-server.database.windows.net",
        "SQLSERVER_USER": "your-username",
        "SQLSERVER_PASSWORD": "your-password",
        "SQLSERVER_DATABASE": "your-database"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add sqlserver mcp-sqlserver \
  -e SQLSERVER_HOST=your-server \
  -e SQLSERVER_USER=your-username \
  -e SQLSERVER_PASSWORD=your-password
```

## Available Tools

All queries are validated to be read-only. SELECT, WITH, SHOW, DESCRIBE, and EXPLAIN are allowed. Everything else is blocked.

| Tool | What it does |
|---|---|
| `list_databases` | List all databases on the server |
| `list_tables` | List tables in a database or schema |
| `list_views` | List views in a database or schema |
| `describe_table` | Column names, types, nullability, defaults |
| `get_foreign_keys` | Foreign key relationships for a table |
| `get_table_stats` | Row counts and size info |
| `execute_query` | Run a read-only SELECT query |
| `get_server_info` | Server version, edition, config |

Every tool accepts an optional `database` parameter, so you can target a specific database without changing your connection config.

## sqlq CLI

`sqlq` is a standalone command-line tool that wraps the same MCP tools into a terminal interface. It connects to your SQL Server using the same environment variables and lets you explore databases, inspect schemas, and run queries directly from your shell.

### As an Agent Skill

If you'd rather not run an MCP server, you can use `sqlq` through an [Agent Skill](https://agentskills.io) instead. A SKILL.md file gives any compatible coding agent the same database access by calling the CLI directly. The repo includes a reference skill at [`examples/sqlq-skill.md`](examples/sqlq-skill.md) that covers all commands, output modes, connection options, and error handling. Copy it into your project or global skills directory.

### Usage

```bash
# Connection uses the same SQLSERVER_* env vars, or you can override with flags
sqlq --host myserver --user sa --password secret -d mydb <command>
```

### Commands

```bash
sqlq databases              # List all databases (alias: dbs)
sqlq tables                 # List tables (-s to filter by schema)
sqlq views                  # List views (-s to filter by schema)
sqlq describe <table>       # Show column details for a table
sqlq foreign-keys [table]   # Show foreign key relationships (alias: fk)
sqlq stats [table]          # Row counts and table sizes
sqlq server-info            # Server version and edition (alias: info)
sqlq test                   # Test your connection
sqlq query "SELECT ..."     # Run a read-only query
sqlq query -f query.sql     # Run SQL from a file
sqlq config                 # Show resolved connection config
```

### Output Formats

By default, `sqlq` renders colored tables in your terminal. You can change this:

```bash
sqlq tables --json          # Raw JSON (good for piping to jq)
sqlq tables --plain         # Tab-separated plain text (good for scripting)
```

When stdout isn't a TTY (piped or redirected), it automatically falls back to plain text.

### Global Flags

```
-d, --database <name>    Target database
--host <host>            Override SQLSERVER_HOST
--user <user>            Override SQLSERVER_USER
--password <password>    Override SQLSERVER_PASSWORD
--password-stdin         Read password from stdin
--port <port>            Override SQLSERVER_PORT
--encrypt / --no-encrypt Toggle TLS encryption
--trust-cert / --no-trust-cert  Toggle certificate trust
--timeout <ms>           Connection timeout
--max-rows <n>           Max rows returned
--json                   JSON output
--plain                  Plain text output
```

### Examples

```bash
# List tables in the dbo schema
sqlq -d AdventureWorks tables -s dbo

# Describe a table
sqlq -d AdventureWorks describe Product

# Run a query and pipe to jq
sqlq -d AdventureWorks query "SELECT TOP 5 Name, ListPrice FROM Production.Product" --json | jq '.rows'

# Pipe password securely
echo "$DB_PASSWORD" | sqlq --password-stdin databases

# Read SQL from a file
sqlq -d mydb query -f reports/monthly.sql
```

## Security

All queries go through multiple validation layers before reaching the database:

- Only SELECT/WITH/SHOW/DESCRIBE/EXPLAIN statements are allowed
- Dangerous keywords (INSERT, UPDATE, DELETE, DROP, EXEC, etc.) are blocked
- SQL injection patterns are detected and rejected
- A TOP clause is automatically added to queries that don't have one
- TLS encryption is on by default

The user account only needs `CONNECT` and `SELECT` permissions.

## Development

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm run dev          # Run MCP server with tsx
npm run cli-dev      # Run sqlq CLI with tsx
npm run lint         # ESLint
npm test             # Jest
```

## Troubleshooting

If you can't connect, check these things first:

1. Verify the hostname and port are correct
2. Make sure your encryption settings match the server (Azure needs `SQLSERVER_ENCRYPT=true`, `SQLSERVER_TRUST_CERT=false`)
3. Confirm the user has `CONNECT` and `SELECT` permissions
4. Test with SQL Server Management Studio or `sqlcmd` to rule out network issues

## License

MIT
