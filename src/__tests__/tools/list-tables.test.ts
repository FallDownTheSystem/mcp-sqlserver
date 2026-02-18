import { ListTablesTool } from '../../tools/list-tables.js';
import { SqlServerConnection } from '../../connection.js';

const mockQueryWithParams = jest.fn().mockResolvedValue({ recordset: [] });
const mockConnect = jest.fn().mockResolvedValue(undefined);

jest.mock('../../connection.js', () => ({
	SqlServerConnection: jest.fn().mockImplementation(() => ({
		connect: mockConnect,
		queryWithParams: mockQueryWithParams,
	})),
}));

describe('ListTablesTool', () => {
	let tool: ListTablesTool;

	beforeEach(() => {
		jest.clearAllMocks();
		const mockConnection = new SqlServerConnection({} as any);
		tool = new ListTablesTool(mockConnection);
	});

	it('should have correct name and description', () => {
		expect(tool.getName()).toBe('list_tables');
		expect(tool.getDescription()).toContain('List all tables');
	});

	it('should generate query without schema filter', async () => {
		await tool.execute({});

		expect(mockConnect).toHaveBeenCalled();
		expect(mockQueryWithParams).toHaveBeenCalledTimes(1);

		const [queryText, params] = mockQueryWithParams.mock.calls[0];
		expect(queryText).toContain('INFORMATION_SCHEMA.TABLES');
		expect(queryText).toContain("TABLE_TYPE = 'BASE TABLE'");
		expect(queryText).toContain('ORDER BY TABLE_SCHEMA, TABLE_NAME');
		expect(queryText).not.toContain('@schema');
		expect(params).toEqual([]);
	});

	it('should generate query with schema filter and parameter', async () => {
		await tool.execute({ schema: 'dbo' });

		expect(mockQueryWithParams).toHaveBeenCalledTimes(1);

		const [queryText, params] = mockQueryWithParams.mock.calls[0];
		expect(queryText).toContain('TABLE_SCHEMA = @schema');
		expect(params).toEqual([{ name: 'schema', value: 'dbo' }]);
	});

	it('should reject invalid schema names', async () => {
		await expect(tool.execute({ schema: 'SELECT' })).rejects.toThrow();
	});

	it('should have valid input schema', () => {
		const schema = tool.getInputSchema();
		expect(schema.type).toBe('object');
		expect(schema.properties.schema).toBeDefined();
		expect(schema.required).toEqual([]);
	});
});
