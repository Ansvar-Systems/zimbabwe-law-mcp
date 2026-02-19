# Zimbabwe Law MCP Server -- Developer Guide

## Git Workflow

- **Never commit directly to `main`.** Always create a feature branch and open a Pull Request.
- Branch protection requires: verified signatures, PR review, and status checks to pass.
- Use conventional commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`, etc.

## Project Overview

Zimbabwe Law MCP server providing Zimbabwean federal legislation search via Model Context Protocol. Strategy A deployment (Vercel, bundled SQLite DB).

## Architecture

- **Transport:** Dual-channel -- stdio (npm package) + Streamable HTTP (Vercel serverless)
- **Database:** SQLite + FTS5 via `@ansvar/mcp-sqlite` (WASM-compatible, no WAL mode)
- **Entry points:** `src/index.ts` (stdio), `api/mcp.ts` (Vercel HTTP)
- **Tool registry:** `src/tools/registry.ts` -- shared between both transports
- **Capability gating:** `src/capabilities.ts` -- detects available DB tables at runtime

## Key Conventions

- All database queries use parameterized statements (never string interpolation)
- FTS5 queries go through `buildFtsQueryVariants()` with primary + fallback strategy
- User input is sanitized via `sanitizeFtsInput()` before FTS5 queries
- Every tool returns `ToolResponse<T>` with `results` + `_metadata` (freshness, disclaimer)
- Tool descriptions are written for LLM agents -- explain WHEN and WHY to use each tool
- Capability-gated tools only appear in `tools/list` when their DB tables exist

## Testing

- Unit tests: `tests/` (vitest, in-memory SQLite fixtures)
- Contract tests: `__tests__/contract/golden.test.ts` with `fixtures/golden-tests.json`
- Nightly mode: `CONTRACT_MODE=nightly` enables network assertions
- Run: `npm test` (unit), `npm run test:contract` (golden), `npm run validate` (both)

## Database

- Schema defined inline in `scripts/build-db.ts`
- Journal mode: DELETE (not WAL -- required for Vercel serverless)
- Runtime: copied to `/tmp/database.db` on Vercel cold start
- Metadata: `db_metadata` table stores tier, schema_version, built_at, builder

## Data Pipeline

1. `scripts/ingest.ts` -> fetches from ZimLII -> JSON seed files in `data/seed/`
2. `scripts/build-db.ts` -> seed JSON -> SQLite database in `data/database.db`
3. `scripts/drift-detect.ts` -> verifies upstream content hasn't changed

## Data Source

- **ZimLII** (zimlii.org) -- Zimbabwe Legal Information Institute, hosted by AfricanLII
- **License:** Free Access (AfricanLII); government legislation is public domain under Zimbabwean law
- **Languages:** English (en) -- official language of legislation
- **Coverage:** All Acts of Parliament, Statutory Instruments, selected case law

## Zimbabwe Citation Formats

- **Full section:** `Section N, [Act Title Year]` (e.g., "Section 29, Cyber and Data Protection Act 2021")
- **Short section:** `s N` (e.g., "s 29")
- **Chapter reference:** `Chapter N:NN` (e.g., "Chapter 9:23" for Criminal Law Act)
- **Act identifier:** Act title + year (e.g., "Cyber and Data Protection Act 2021")

## Deployment

- Vercel Strategy A: DB bundled in `data/database.db`, included via `vercel.json` includeFiles
- npm package: `@ansvar/zimbabwe-law-mcp` with bin entry for stdio
