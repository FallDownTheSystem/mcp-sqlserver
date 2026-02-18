import { SqlServerConnection } from '../connection.js';
import { QueryValidator } from '../security.js';
import { ErrorHandler } from '../errors.js';
import { QueryParam } from '../types.js';

export abstract class BaseTool {
  protected connection: SqlServerConnection;
  protected maxRows: number;

  constructor(connection: SqlServerConnection, maxRows: number = 1000) {
    this.connection = connection;
    this.maxRows = maxRows;
  }

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

  protected async executeSafeQuery<T = any>(query: string, maxRowsOverride?: number): Promise<T[]> {
    try {
      await this.connection.connect();
      return await this.executeQuery<T>(query, maxRowsOverride);
    } catch (error) {
      const mcpError = ErrorHandler.handleSqlServerError(error);
      throw mcpError;
    }
  }

  protected async executeQueryWithParams<T = any>(query: string, params: QueryParam[]): Promise<T[]> {
    const validation = QueryValidator.validateQuery(query);
    if (!validation.isValid) {
      throw new Error(`Query validation failed: ${validation.error}`);
    }

    const sanitizedQuery = QueryValidator.sanitizeQuery(query);
    const limitedQuery = QueryValidator.addRowLimit(sanitizedQuery, this.maxRows);

    const result = await this.connection.queryWithParams<T>(limitedQuery, params);
    return result.recordset;
  }

  protected async executeSafeQueryWithParams<T = any>(query: string, params: QueryParam[]): Promise<T[]> {
    try {
      await this.connection.connect();
      return await this.executeQueryWithParams<T>(query, params);
    } catch (error) {
      const mcpError = ErrorHandler.handleSqlServerError(error);
      throw mcpError;
    }
  }

  abstract getName(): string;
  abstract getDescription(): string;
  abstract getInputSchema(): any;
  abstract execute(params: any): Promise<any>;
}