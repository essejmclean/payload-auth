# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

This is a **fork** of an existing library that integrates [Better Auth](https://better-auth.com) with [Payload CMS](https://payloadcms.com). The original library reportedly works but has essentially no documentation.

**Current state (verified working):**
- Demo app runs successfully at localhost:3000
- Tests pass (49/51, 2 skipped) - adapter tests work
- The `/docs` folder is a direct copy of Better Auth's generic docs - not useful for this plugin
- `plugins-tests.ts` is empty - needs implementation

**Goals for this fork:**
1. Document the existing code thoroughly
2. Implement comprehensive tests
3. Create real documentation specific to this plugin
4. Verify everything works end-to-end
5. Potentially contribute improvements back upstream

## Local Development Setup

```bash
# Start Postgres via Docker
docker compose up -d

# This creates two databases:
# - payload_auth_demo (for demo app)
# - pba_tests (for tests)
```

The demo app `.env` is configured for:
- `DATABASE_URI=postgres://postgres:postgres@localhost:5432/payload_auth_demo`

## Build & Development Commands

```bash
# Install dependencies (uses pnpm workspaces)
pnpm install

# Build the payload-auth package
pnpm build

# Run development mode (watches payload-auth package + demo app)
pnpm dev

# Format code
pnpm format

# Run tests (inside packages/payload-auth)
cd packages/payload-auth && pnpm test

# Run a single test file
cd packages/payload-auth && pnpm test -- --run src/better-auth/adapter/tests/adapter.test.ts

# Generate Better Auth types (run after changing BA plugins)
cd packages/payload-auth && pnpm generate:better-auth-types

# Clean everything (node_modules, dist, etc)
pnpm clean-all
```

## Architecture Overview

Turborepo monorepo with three workspaces:

- `packages/payload-auth/` - Main library published as `payload-auth`
- `demo/` - Demo Payload + Next.js app for development/testing
- `docs/` - Documentation site (currently just Better Auth docs copy)

### Core Library (`packages/payload-auth/src/`)

Two main components:

**1. Database Adapter (`/better-auth/adapter/`)**
- Implements Better Auth's `DBAdapter` interface using Payload's database layer
- `index.ts` - Main `payloadAdapter()` function
- `transform/` - Converts BA queries to Payload query format
- `generate-schema/` - Creates Payload collection configs from BA schemas
- Tests are in `/tests/` - requires running Payload instance

**2. Payload Plugin (`/better-auth/plugin/`)**
- `index.ts` - Main `betterAuthPlugin()` function and `withPayloadAuth()`
- `lib/build-collections/` - Generates Payload collections from BA schemas
- `lib/sanitize-better-auth-options/` - Prepares options for BA init
- `helpers/` - Schema building and syncing utilities
- `payload/` - Admin UI components, views, and RSC/client exports
- `types.ts` - All TypeScript interfaces (`BetterAuthPluginOptions`, etc.)

**Shared utilities (`/shared/`):**
- `components/` - Reusable UI components
- `form/` - Form handling utilities
- `payload/fields/` - Shared Payload field definitions

### Export Paths

```
payload-auth                         # Main (re-exports better-auth)
payload-auth/better-auth             # Adapter + plugin exports
payload-auth/better-auth/adapter     # Just the DB adapter
payload-auth/better-auth/plugin      # Just the Payload plugin
payload-auth/better-auth/plugin/client  # Client-side auth utilities
payload-auth/better-auth/plugin/rsc     # React Server Components
payload-auth/shared/payload/fields      # Shared field utilities
```

### Key Types to Know

- `BetterAuthPluginOptions` - Main plugin config (in `plugin/types.ts`)
- `BetterAuthReturn<O>` - What `payload.betterAuth` returns
- `PayloadRequestWithBetterAuth<O>` - Extended PayloadRequest type
- `BetterAuthSchemas` - Map of model keys to schema definitions

### How the Plugin Works

1. `betterAuthPlugin(options)` returns a Payload config modifier
2. On config load: builds collections from BA schemas, syncs field mappings
3. On `payload.onInit`: calls `initBetterAuth()` which attaches `payload.betterAuth`
4. The adapter translates all BA database calls to Payload operations

### Test Infrastructure

Tests in `packages/payload-auth/src/better-auth/adapter/tests/`:
- Uses `pba_tests` database (auto-created by docker-compose)
- `dev/index.ts` - Test Payload config with `push: true` for auto-schema
- `base-collections-tests.ts` - Comprehensive adapter tests from Better Auth
- `plugins-tests.ts` - Empty, needs implementation

```bash
# Run all tests
cd packages/payload-auth && pnpm test -- --run

# Run in watch mode
cd packages/payload-auth && pnpm test
```

### Adapter API

The `payloadAdapter()` function signature:
```ts
payloadAdapter({
  payloadClient: BasePayload | Promise<BasePayload> | (() => Promise<BasePayload>),
  adapterConfig: {
    idType: 'number' | 'text',
    enableDebugLogs?: boolean
  }
})
```
