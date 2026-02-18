import { BaseTool } from './base.js';
import { ViewInfo, QueryParam } from '../types.js';
import { ParameterValidator } from '../validation.js';

export class ListViewsTool extends BaseTool {
	getName(): string {
		return 'list_views';
	}

	getDescription(): string {
		return 'List all views in the current database or specified schema';
	}

	getInputSchema(): any {
		return {
			type: 'object',
			properties: {
				schema: {
					type: 'string',
					description: 'Schema name to filter views (optional)',
				},
				database: {
					type: 'string',
					description: 'Target database name (optional, uses default if not specified)',
				},
			},
			required: [],
		};
	}

	async execute(params: { schema?: string; database?: string }): Promise<ViewInfo[]> {
		const database = params.database ? ParameterValidator.validateDatabaseName(params.database) : undefined;
		const { schema } = params;

		const queryParams: QueryParam[] = [];

		let query = `
			SELECT
				TABLE_CATALOG as table_catalog,
				TABLE_SCHEMA as table_schema,
				TABLE_NAME as table_name,
				VIEW_DEFINITION as view_definition,
				CHECK_OPTION as check_option,
				IS_UPDATABLE as is_updatable
			FROM INFORMATION_SCHEMA.VIEWS
		`;

		if (schema) {
			ParameterValidator.validateSchemaName(schema);
			query += ` WHERE TABLE_SCHEMA = @schema`;
			queryParams.push({ name: 'schema', value: schema });
		}

		query += ' ORDER BY TABLE_SCHEMA, TABLE_NAME';

		return await this.executeSafeQueryWithParams<ViewInfo>(query, queryParams, database);
	}
}
