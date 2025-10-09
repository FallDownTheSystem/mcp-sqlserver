import { BaseTool } from './base.js';
import { ColumnInfo } from '../types.js';
import { ParameterValidator } from '../validation.js';

export class DescribeTableTool extends BaseTool {
  getName(): string {
    return 'describe_table';
  }

  getDescription(): string {
    return 'Get detailed schema information for a specific table including columns, data types, and constraints';
  }

  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        table_name: {
          type: 'string',
          description: 'Name of the table to describe',
        },
        schema: {
          type: 'string',
          description: 'Schema name (optional, defaults to dbo)',
          default: 'dbo',
        },
      },
      required: ['table_name'],
    };
  }

  async execute(params: { table_name: string; schema?: string }): Promise<ColumnInfo[]> {
    const validatedParams = ParameterValidator.validateTableDescriptionParameters(params);
    const { table_name, schema } = validatedParams;

    const escapedTableName = ParameterValidator.escapeIdentifier(table_name);
    const escapedSchema = ParameterValidator.escapeIdentifier(schema);

    const query = `
      SELECT 
        TABLE_CATALOG as table_catalog,
        TABLE_SCHEMA as table_schema,
        TABLE_NAME as table_name,
        COLUMN_NAME as column_name,
        ORDINAL_POSITION as ordinal_position,
        COLUMN_DEFAULT as column_default,
        IS_NULLABLE as is_nullable,
        DATA_TYPE as data_type,
        CHARACTER_MAXIMUM_LENGTH as character_maximum_length,
        CHARACTER_OCTET_LENGTH as character_octet_length,
        NUMERIC_PRECISION as numeric_precision,
        NUMERIC_PRECISION_RADIX as numeric_precision_radix,
        NUMERIC_SCALE as numeric_scale,
        DATETIME_PRECISION as datetime_precision
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = ${escapedTableName}
        AND TABLE_SCHEMA = ${escapedSchema}
      ORDER BY ORDINAL_POSITION
    `;

    return await this.executeSafeQuery<ColumnInfo>(query);
  }
}