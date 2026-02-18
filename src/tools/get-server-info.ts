import { BaseTool } from './base.js';
import { ServerInfo } from '../types.js';
import { ParameterValidator } from '../validation.js';

export class GetServerInfoTool extends BaseTool {
	getName(): string {
		return 'get_server_info';
	}

	getDescription(): string {
		return 'Get SQL Server instance information including version, edition, and configuration';
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

	async execute(params: { database?: string }): Promise<ServerInfo> {
		const database = params.database ? ParameterValidator.validateDatabaseName(params.database) : undefined;

		const query = `
			SELECT
				@@SERVERNAME as server_name,
				@@VERSION as product_version,
				SERVERPROPERTY('ProductLevel') as product_level,
				SERVERPROPERTY('Edition') as edition,
				SERVERPROPERTY('EngineEdition') as engine_edition
		`;

		const result = await this.executeSafeQuery<ServerInfo>(query, undefined, database);
		return result[0];
	}
}
