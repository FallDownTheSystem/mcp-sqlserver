# Usage Examples

This document provides examples of how to use the MCP SQL Server tools through different AI clients.

## Tool Examples

### Schema Discovery

#### List Databases
```json
{
  "tool": "list_databases",
  "arguments": {}
}
```

**Response:**
```json
[
  {
    "database_id": 1,
    "name": "master",
    "create_date": "2023-01-01T00:00:00.000Z",
    "collation_name": "SQL_Latin1_General_CP1_CI_AS",
    "state_desc": "ONLINE"
  },
  {
    "database_id": 5,
    "name": "AdventureWorks",
    "create_date": "2023-01-15T10:30:00.000Z",
    "collation_name": "SQL_Latin1_General_CP1_CI_AS", 
    "state_desc": "ONLINE"
  }
]
```

#### List Tables
```json
{
  "tool": "list_tables",
  "arguments": {
    "schema": "dbo"
  }
}
```

**Response:**
```json
[
  {
    "table_catalog": "AdventureWorks",
    "table_schema": "dbo",
    "table_name": "Users",
    "table_type": "BASE TABLE"
  },
  {
    "table_catalog": "AdventureWorks", 
    "table_schema": "dbo",
    "table_name": "Orders",
    "table_type": "BASE TABLE"
  }
]
```

#### Describe Table Schema
```json
{
  "tool": "describe_table",
  "arguments": {
    "table_name": "Users",
    "schema": "dbo"
  }
}
```

**Response:**
```json
[
  {
    "table_catalog": "AdventureWorks",
    "table_schema": "dbo", 
    "table_name": "Users",
    "column_name": "UserId",
    "ordinal_position": 1,
    "column_default": null,
    "is_nullable": "NO",
    "data_type": "int",
    "character_maximum_length": null,
    "numeric_precision": 10,
    "numeric_scale": 0
  },
  {
    "table_catalog": "AdventureWorks",
    "table_schema": "dbo",
    "table_name": "Users", 
    "column_name": "Username",
    "ordinal_position": 2,
    "column_default": null,
    "is_nullable": "NO",
    "data_type": "nvarchar",
    "character_maximum_length": 255,
    "numeric_precision": null,
    "numeric_scale": null
  }
]
```

### Relationship Analysis

#### Get Foreign Keys
```json
{
  "tool": "get_foreign_keys", 
  "arguments": {
    "table_name": "Orders"
  }
}
```

**Response:**
```json
[
  {
    "constraint_name": "FK_Orders_Users",
    "table_schema": "dbo",
    "table_name": "Orders",
    "column_name": "UserId", 
    "referenced_table_schema": "dbo",
    "referenced_table_name": "Users",
    "referenced_column_name": "UserId"
  }
]
```

#### Get Table Statistics
```json
{
  "tool": "get_table_stats",
  "arguments": {
    "table_name": "Users"
  }
}
```

**Response:**
```json
[
  {
    "table_schema": "dbo",
    "table_name": "Users",
    "row_count": 10523,
    "data_size_kb": 2048,
    "index_size_kb": 512,
    "total_size_kb": 2560
  }
]
```

### Data Exploration

#### Execute Query
```json
{
  "tool": "execute_query",
  "arguments": {
    "query": "SELECT TOP 5 UserId, Username, Email FROM Users WHERE Active = 1",
    "limit": 5
  }
}
```

**Response:**
```json
{
  "columns": ["UserId", "Username", "Email"],
  "rows": [
    [1, "john_doe", "john@example.com"],
    [2, "jane_smith", "jane@example.com"], 
    [3, "bob_wilson", "bob@example.com"],
    [4, "alice_brown", "alice@example.com"],
    [5, "charlie_davis", "charlie@example.com"]
  ],
  "rowCount": 5,
  "executionTime": 156
}
```

#### Get Server Information
```json
{
  "tool": "get_server_info",
  "arguments": {}
}
```

**Response:**
```json
{
  "server_name": "SQL-SERVER-01",
  "product_version": "Microsoft SQL Server 2022 (RTM) - 16.0.1000.6",
  "product_level": "RTM",
  "edition": "Developer Edition (64-bit)",
  "engine_edition": 3
}
```

## Common Use Cases

### Database Schema Exploration
```javascript
// 1. List all databases
const databases = await callTool("list_databases", {});

// 2. For each database, list tables  
const tables = await callTool("list_tables", { schema: "dbo" });

// 3. Get detailed schema for important tables
const userSchema = await callTool("describe_table", { 
  table_name: "Users", 
  schema: "dbo" 
});

// 4. Understand relationships
const foreignKeys = await callTool("get_foreign_keys", {});
```

### Data Analysis
```javascript
// Get table statistics to understand data volume
const stats = await callTool("get_table_stats", {});

// Sample data from key tables
const sampleUsers = await callTool("execute_query", {
  query: "SELECT TOP 10 * FROM Users ORDER BY CreatedDate DESC",
  limit: 10
});

// Analyze data patterns
const usersByStatus = await callTool("execute_query", {
  query: "SELECT Status, COUNT(*) as Count FROM Users GROUP BY Status",
  limit: 100
});
```

### Finding Related Data
```javascript
// Find all tables related to a specific entity
const orderTables = await callTool("execute_query", {
  query: `
    SELECT TABLE_NAME 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_NAME LIKE '%Order%' 
    AND TABLE_TYPE = 'BASE TABLE'
  `
});

// Get foreign key relationships for understanding joins
const relationships = await callTool("get_foreign_keys", {
  table_name: "Orders"
});

// Find potential lookup tables (small reference tables)
const lookupTables = await callTool("execute_query", {
  query: `
    SELECT 
      t.TABLE_SCHEMA,
      t.TABLE_NAME,
      COUNT(c.COLUMN_NAME) as ColumnCount
    FROM INFORMATION_SCHEMA.TABLES t
    JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME
    WHERE t.TABLE_TYPE = 'BASE TABLE'
    GROUP BY t.TABLE_SCHEMA, t.TABLE_NAME
    HAVING COUNT(c.COLUMN_NAME) <= 5
    ORDER BY ColumnCount
  `
});
```

## Error Handling Examples

### Invalid Query (Security Violation)
```json
{
  "tool": "execute_query",
  "arguments": {
    "query": "DELETE FROM Users WHERE Active = 0"
  }
}
```

**Error Response:**
```
Tool execution failed: Query validation failed: Forbidden keyword detected: DELETE
```

### SQL Injection Attempt
```json
{
  "tool": "execute_query", 
  "arguments": {
    "query": "SELECT * FROM Users WHERE Username = 'admin' OR '1'='1'"
  }
}
```

**Error Response:**
```
Tool execution failed: Query validation failed: Potential SQL injection pattern detected
```

### Table Not Found
```json
{
  "tool": "describe_table",
  "arguments": {
    "table_name": "NonExistentTable"
  }
}
```

**Error Response:**
```
Tool execution failed: Database query failed: Invalid object name 'NonExistentTable'
```

## Performance Tips

1. **Use LIMIT parameter** for large result sets:
   ```json
   {
     "tool": "execute_query",
     "arguments": {
       "query": "SELECT * FROM LargeTable",
       "limit": 100
     }
   }
   ```

2. **Filter by schema** when exploring:
   ```json
   {
     "tool": "list_tables",
     "arguments": {
       "schema": "dbo"
     }
   }
   ```

3. **Use specific table queries** instead of broad searches:
   ```json
   {
     "tool": "get_foreign_keys",
     "arguments": {
       "table_name": "SpecificTable"
     }
   }
   ```

## Security Best Practices

- All queries are automatically validated for read-only operations
- Row limits are enforced to prevent memory issues
- Connection timeouts prevent hanging queries
- Only SELECT-based operations are allowed
- SQL injection patterns are detected and blocked

## Integration Examples

### With Claude Desktop
Ask questions like:
- "What tables are in this database?"
- "Show me the schema for the Users table"
- "How are Orders and Users tables related?"
- "Give me a sample of recent orders"

### With Claude Code CLI
Use for development tasks:
- Database schema documentation generation
- Data modeling and relationship analysis
- Query development and testing
- Performance analysis

### With VSCode
Integrate for:
- Code completion based on database schema
- Query validation and suggestions
- Database documentation in README files
- Data model visualization