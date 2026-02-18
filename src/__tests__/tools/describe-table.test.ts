import { DescribeTableTool } from '../../tools/describe-table.js';
import { SqlServerConnection } from '../../connection.js';

const mockQueryWithParams = jest.fn().mockResolvedValue({ recordset: [] });
const mockConnect = jest.fn().mockResolvedValue(undefined);

jest.mock('../../connection.js', () => ({
	SqlServerConnection: jest.fn().mockImplementation(() => ({
		connect: mockConnect,
		queryWithParams: mockQueryWithParams,
	})),
}));

describe('DescribeTableTool', () => {
	let tool: DescribeTableTool;

	beforeEach(() => {
		jest.clearAllMocks();
		const mockConnection = new SqlServerConnection({} as any);
		tool = new DescribeTableTool(mockConnection);
	});

	it('should have correct name and description', () => {
		expect(tool.getName()).toBe('describe_table');
		expect(tool.getDescription()).toContain('schema information');
	});

	it('should generate parameterized query with table name and default schema', async () => {
		await tool.execute({ table_name: 'Users' });

		expect(mockConnect).toHaveBeenCalled();
		expect(mockQueryWithParams).toHaveBeenCalledTimes(1);

		const [queryText, params] = mockQueryWithParams.mock.calls[0];
		expect(queryText).toContain('INFORMATION_SCHEMA.COLUMNS');
		expect(queryText).toContain('TABLE_NAME = @tableName');
		expect(queryText).toContain('TABLE_SCHEMA = @schema');
		expect(queryText).toContain('ORDER BY ORDINAL_POSITION');

		expect(params).toEqual([
			{ name: 'tableName', value: 'Users' },
			{ name: 'schema', value: 'dbo' },
		]);
	});

	it('should use custom schema when provided', async () => {
		await tool.execute({ table_name: 'Orders', schema: 'sales' });

		const [, params] = mockQueryWithParams.mock.calls[0];
		expect(params).toEqual([
			{ name: 'tableName', value: 'Orders' },
			{ name: 'schema', value: 'sales' },
		]);
	});

	it('should reject missing table_name', async () => {
		await expect(tool.execute({} as any)).rejects.toThrow('table_name parameter is required');
	});

	it('should reject invalid table names', async () => {
		await expect(tool.execute({ table_name: 'SELECT' })).rejects.toThrow();
	});

	it('should reject invalid schema names', async () => {
		await expect(tool.execute({ table_name: 'Users', schema: 'DROP' })).rejects.toThrow();
	});

	it('should have valid input schema with required table_name', () => {
		const schema = tool.getInputSchema();
		expect(schema.type).toBe('object');
		expect(schema.properties.table_name).toBeDefined();
		expect(schema.properties.schema).toBeDefined();
		expect(schema.required).toContain('table_name');
	});
});
