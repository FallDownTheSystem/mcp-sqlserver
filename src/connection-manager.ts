import { SqlServerConnection } from './connection.js';
import { ConnectionConfig } from './types.js';

export class ConnectionManager {
	private pools: Map<string, SqlServerConnection> = new Map();
	private idleTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
	private baseConfig: ConnectionConfig;
	private idleTimeoutMs: number;

	constructor(baseConfig: ConnectionConfig, idleTimeoutMs: number = 300_000) {
		this.baseConfig = baseConfig;
		this.idleTimeoutMs = idleTimeoutMs;
	}

	async getConnection(database?: string): Promise<SqlServerConnection> {
		const key = database ?? this.baseConfig.database ?? '';

		const existing = this.pools.get(key);
		if (existing) {
			this.resetIdleTimer(key);
			return existing;
		}

		const config: ConnectionConfig = database
			? { ...this.baseConfig, database }
			: { ...this.baseConfig };

		const connection = new SqlServerConnection(config);
		this.pools.set(key, connection);
		this.resetIdleTimer(key);
		return connection;
	}

	private resetIdleTimer(key: string): void {
		const defaultKey = this.baseConfig.database ?? '';
		if (key === defaultKey) {
			return;
		}

		const existing = this.idleTimers.get(key);
		if (existing) {
			clearTimeout(existing);
		}

		const timer = setTimeout(() => {
			void this.closePool(key);
		}, this.idleTimeoutMs);

		if (typeof timer === 'object' && 'unref' in timer) {
			timer.unref();
		}

		this.idleTimers.set(key, timer);
	}

	private async closePool(key: string): Promise<void> {
		const connection = this.pools.get(key);
		if (connection) {
			try {
				await connection.disconnect();
			} catch {
				// best-effort close
			}
			this.pools.delete(key);
		}
		this.idleTimers.delete(key);
	}

	async closeAll(): Promise<void> {
		for (const timer of this.idleTimers.values()) {
			clearTimeout(timer);
		}
		this.idleTimers.clear();

		const closePromises = Array.from(this.pools.values()).map(conn =>
			conn.disconnect().catch(() => {})
		);
		await Promise.all(closePromises);
		this.pools.clear();
	}
}
