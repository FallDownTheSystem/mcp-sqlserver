import { BaseTool } from './base.js';
import { DatabaseInfo } from '../types.js';
import { ParameterValidator } from '../validation.js';

export class ListDatabasesTool extends BaseTool {
	getName(): string {
		return 'list_databases';
	}

	getDescription(): string {
		return 'List all databases on the SQL Server instance';
	}

	getInputSchema(): any {
		return {
			type: 'object',
			properties: {
				database: {
					type: 'string',
					description: 'Target database name (optional, uses default if not specified)',
				},
			},
			required: [],
		};
	}

	async execute(params: { database?: string }): Promise<DatabaseInfo[]> {
		const database = params.database ? ParameterValidator.validateDatabaseName(params.database) : undefined;

		const query = `
			SELECT
				database_id,
				name,
				create_date,
				collation_name,
				state_desc
			FROM sys.databases
			WHERE state_desc = 'ONLINE'
			ORDER BY name
		`;

		return await this.executeSafeQuery<DatabaseInfo>(query, undefined, database);
	}
}
