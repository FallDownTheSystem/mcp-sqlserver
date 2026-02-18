import { ConnectionManager } from '../connection-manager.js';
import { SqlServerConnection } from '../connection.js';
import { ConnectionConfig } from '../types.js';

jest.mock('../connection.js');

const MockedSqlServerConnection = SqlServerConnection as jest.MockedClass<typeof SqlServerConnection>;

const baseConfig: ConnectionConfig = {
	server: 'localhost',
	database: 'defaultDb',
	user: 'sa',
	password: 'password',
	port: 1433,
	encrypt: true,
	trustServerCertificate: true,
	connectionTimeout: 30000,
	requestTimeout: 60000,
	maxRows: 1000,
};

describe('ConnectionManager', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
		MockedSqlServerConnection.mockImplementation((config: ConnectionConfig) => ({
			connect: jest.fn().mockResolvedValue(undefined),
			disconnect: jest.fn().mockResolvedValue(undefined),
			query: jest.fn(),
			queryWithParams: jest.fn(),
			testConnection: jest.fn(),
			isConnected: jest.fn().mockReturnValue(false),
			getConfig: jest.fn().mockReturnValue(config),
		}) as unknown as SqlServerConnection);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('should return the same connection for the default database', async () => {
		const manager = new ConnectionManager(baseConfig);
		const conn1 = await manager.getConnection();
		const conn2 = await manager.getConnection();

		expect(conn1).toBe(conn2);
		expect(MockedSqlServerConnection).toHaveBeenCalledTimes(1);
	});

	it('should return the same connection when database matches default', async () => {
		const manager = new ConnectionManager(baseConfig);
		const conn1 = await manager.getConnection();
		const conn2 = await manager.getConnection('defaultDb');

		expect(conn1).toBe(conn2);
		expect(MockedSqlServerConnection).toHaveBeenCalledTimes(1);
	});

	it('should create separate connections for different databases', async () => {
		const manager = new ConnectionManager(baseConfig);
		const connDefault = await manager.getConnection();
		const connOther = await manager.getConnection('otherDb');

		expect(connDefault).not.toBe(connOther);
		expect(MockedSqlServerConnection).toHaveBeenCalledTimes(2);

		const otherConfig = MockedSqlServerConnection.mock.calls[1][0];
		expect(otherConfig.database).toBe('otherDb');
	});

	it('should reuse cached non-default connections', async () => {
		const manager = new ConnectionManager(baseConfig);
		const conn1 = await manager.getConnection('otherDb');
		const conn2 = await manager.getConnection('otherDb');

		expect(conn1).toBe(conn2);
		expect(MockedSqlServerConnection).toHaveBeenCalledTimes(1);
	});

	it('should close idle non-default pools after timeout', async () => {
		const manager = new ConnectionManager(baseConfig, 1000);
		const conn = await manager.getConnection('otherDb');

		jest.advanceTimersByTime(1000);
		await Promise.resolve();

		expect(conn.disconnect).toHaveBeenCalled();
	});

	it('should not close the default pool on idle timeout', async () => {
		const manager = new ConnectionManager(baseConfig, 1000);
		const conn = await manager.getConnection();

		jest.advanceTimersByTime(5000);

		expect(conn.disconnect).not.toHaveBeenCalled();
	});

	it('should reset idle timer on reuse', async () => {
		const manager = new ConnectionManager(baseConfig, 1000);
		const conn = await manager.getConnection('otherDb');

		jest.advanceTimersByTime(800);
		await manager.getConnection('otherDb');
		jest.advanceTimersByTime(800);

		expect(conn.disconnect).not.toHaveBeenCalled();

		jest.advanceTimersByTime(200);
		expect(conn.disconnect).toHaveBeenCalled();
	});

	it('should close all pools on closeAll', async () => {
		const manager = new ConnectionManager(baseConfig);
		const connDefault = await manager.getConnection();
		const connOther = await manager.getConnection('otherDb');

		await manager.closeAll();

		expect(connDefault.disconnect).toHaveBeenCalled();
		expect(connOther.disconnect).toHaveBeenCalled();
	});
});
