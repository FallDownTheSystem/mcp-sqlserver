import { BaseTool } from './base.js';
import { TableInfo, QueryParam } from '../types.js';
import { ParameterValidator } from '../validation.js';

export class ListTablesTool extends BaseTool {
	getName(): string {
		return 'list_tables';
	}

	getDescription(): string {
		return 'List all tables in the current database or specified schema';
	}

	getInputSchema(): any {
		return {
			type: 'object',
			properties: {
				schema: {
					type: 'string',
					description: 'Schema name to filter tables (optional)',
				},
			},
			required: [],
		};
	}

	async execute(params: { schema?: string }): Promise<TableInfo[]> {
		const validatedParams = ParameterValidator.validateListTablesParameters(params);
		const { schema } = validatedParams;

		const queryParams: QueryParam[] = [];

		let query = `
			SELECT
				TABLE_CATALOG as table_catalog,
				TABLE_SCHEMA as table_schema,
				TABLE_NAME as table_name,
				TABLE_TYPE as table_type
			FROM INFORMATION_SCHEMA.TABLES
			WHERE TABLE_TYPE = 'BASE TABLE'
		`;

		if (schema) {
			query += ` AND TABLE_SCHEMA = @schema`;
			queryParams.push({ name: 'schema', value: schema });
		}

		query += ' ORDER BY TABLE_SCHEMA, TABLE_NAME';

		return await this.executeSafeQueryWithParams<TableInfo>(query, queryParams);
	}
}