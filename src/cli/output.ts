import pc from 'picocolors';
import Table from 'cli-table3';

export type OutputMode = 'rich' | 'plain' | 'json';

const HIDE_CURSOR = '\x1B[?25l';
const SHOW_CURSOR = '\x1B[?25h';
const CLEAR_LINE = '\x1B[2K\r';

export function getOutputMode(options: { json?: boolean; plain?: boolean }): OutputMode {
	if (options.json) return 'json';
	if (options.plain) return 'plain';
	if (!process.stdout.isTTY) return 'plain';
	return 'rich';
}

export function spinner(text: string) {
	return {
		start() {
			process.stderr.write(`${HIDE_CURSOR}${pc.dim('\u2013')} ${text}`);
			return this;
		},
		success(msg?: string) {
			process.stderr.write(`${CLEAR_LINE}${pc.green('\u2713')} ${msg || text}${SHOW_CURSOR}\n`);
			return this;
		},
		error(msg?: string) {
			process.stderr.write(`${CLEAR_LINE}${pc.red('\u2717')} ${msg || text}${SHOW_CURSOR}\n`);
			return this;
		},
	};
}

export function table(head: string[], rows: string[][]): string {
	const t = new Table({
		head: head.map(h => pc.bold(pc.cyan(h))),
		style: { head: [], border: [] },
		wordWrap: true,
	});
	for (const row of rows) {
		t.push(row);
	}
	return t.toString();
}

export function heading(text: string): void {
	process.stdout.write(`\n${pc.bold(pc.cyan(text))}\n`);
}

export function field(label: string, value: unknown): void {
	if (value === undefined || value === null || value === '') return;
	process.stdout.write(`  ${pc.dim(label + ':')} ${value}\n`);
}

export function divider(): void {
	process.stdout.write(pc.dim('\u2500'.repeat(60)) + '\n');
}

export function outputJson(data: unknown): void {
	process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

export function outputPlain(text: string): void {
	process.stdout.write(text + '\n');
}

export function outputTable(text: string): void {
	process.stdout.write(text + '\n');
}

export function outputError(error: { error: string; code: string; suggestions?: string[] }, mode: OutputMode): void {
	if (mode === 'json') {
		process.stdout.write(JSON.stringify(error, null, 2) + '\n');
		return;
	}

	if (mode === 'plain') {
		process.stderr.write(`Error [${error.code}]: ${error.error}\n`);
		if (error.suggestions?.length) {
			for (const s of error.suggestions) {
				process.stderr.write(`  - ${s}\n`);
			}
		}
		return;
	}

	process.stderr.write(`\n${pc.red('\u2717')} ${pc.bold(error.error)}\n`);
	process.stderr.write(`  ${pc.dim('Code:')} ${error.code}\n`);
	if (error.suggestions?.length) {
		process.stderr.write(`  ${pc.dim('Suggestions:')}\n`);
		for (const s of error.suggestions) {
			process.stderr.write(`    ${pc.yellow('\u2022')} ${s}\n`);
		}
	}
	process.stderr.write('\n');
}

export { pc };
