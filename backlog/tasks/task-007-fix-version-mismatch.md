---
id: task-007-fix-version-mismatch
title: Fix hardcoded version mismatch between CLI and package.json
status: "Done"
created_date: '2026-02-18 13:41'
updated_date: '2026-02-18 14:30'
parent: task-001-upgrade-mcp-sqlserver
dependencies:
---

## Description

`src/cli.ts:65` hardcodes the version as `'2.0.1'` while `package.json` declares `'2.0.3'`. The version should be read from `package.json` at runtime to maintain a single source of truth.

## Specification

- `showVersion()` in `src/cli.ts` reads version from `package.json` at runtime
- No hardcoded version strings in `src/cli.ts`
- The version in `src/index.ts` Server constructor also reads from `package.json` (currently hardcoded as `'2.0.3'`)
- `npm run build` passes

## Design

Key files:
- `src/cli.ts` - Replace hardcoded version with dynamic read
- `src/index.ts` - Replace hardcoded version in Server constructor

Approach: Use `createRequire` or `fs.readFileSync` to read `package.json` at runtime. Since this is an ESM project, use `import.meta.url` to resolve the path:

```typescript
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
const version = pkg.version;
```

Alternatively, use a simpler approach with `createRequire`:
```typescript
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { version } = require('../package.json');
```

## TODO

- [x] Update `src/cli.ts` `showVersion()` to read version from package.json
- [x] Update `src/index.ts` Server constructor to use dynamic version
- [x] Remove all hardcoded version strings
- [x] Verify build passes

## Notes

Used `createRequire(import.meta.url)` approach (simpler alternative from Design section) in both files. Path `../package.json` resolves correctly from both `src/` (dev via tsx) and `dist/` (built output). Codex review: 0 critical issues, no scope creep. Minor note that `package.json` must exist at runtime — not a concern since it's included in npm package `files` array.
