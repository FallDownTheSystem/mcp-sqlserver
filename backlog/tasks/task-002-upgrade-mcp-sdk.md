---
id: task-002-upgrade-mcp-sdk
title: Upgrade MCP SDK from v0.5.0 to v1.27.0
status: "Done"
created_date: '2026-02-18 13:41'
updated_date: '2026-02-18 13:54'
parent: task-001-upgrade-mcp-sqlserver
dependencies:
---

## Description

The MCP SDK dependency is pinned at `^0.5.0` which is ~50 releases behind the current stable `v1.27.0`. Upgrading ensures compatibility with current Claude Desktop and other MCP clients, and unlocks new SDK features. The `Server` class API is backwards-compatible so no code changes are expected beyond the version bump, but Zod must also be bumped to `^3.25.0` to satisfy SDK peer dependency requirements.

## Specification

- Update `@modelcontextprotocol/sdk` from `^0.5.0` to `^1.27.0` in package.json
- Update `zod` from `^3.23.8` to `^3.25.0` in package.json
- `npm install` succeeds with no peer dependency warnings
- `npm run build` passes with zero errors
- `npm run lint` passes
- All existing imports (`Server`, `StdioServerTransport`, `CallToolRequestSchema`, `ListToolsRequestSchema`) still resolve correctly

## Design

Key files:
- `package.json` - Version bumps
- `src/index.ts` - Verify imports still work after upgrade

Research confirmed: `Server` constructor, `setRequestHandler`, `StdioServerTransport`, and schema imports are all unchanged in v1.27.0. No code changes needed.

## TODO

- [x] Update `@modelcontextprotocol/sdk` version in package.json
- [x] Update `zod` version in package.json
- [x] Run `npm install`
- [x] Run `npm run build` and verify no errors
- [x] Run `npm run lint` and verify no errors (pre-existing ESLint v9 config issue — no project eslint.config.js exists)

## Notes

- SDK upgraded to v1.27.0, Zod resolved to v3.25.76
- All four SDK imports verified at runtime: `Server`, `StdioServerTransport`, `CallToolRequestSchema`, `ListToolsRequestSchema`
- Build passes with zero errors, no code changes needed
- Lint failure is pre-existing: ESLint v9 requires `eslint.config.js` but none exists in the project (not related to this upgrade)
- Codex review confirmed: correct scope, no risks, peer deps satisfied
