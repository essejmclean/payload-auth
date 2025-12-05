# Payload Auth

A [Payload CMS](https://payloadcms.com) plugin that integrates [Better Auth](https://www.better-auth.com) for modern, flexible authentication.

## Features

- **Multiple Auth Methods** - Email/password, social providers (Google, GitHub, etc.), magic links, passkeys
- **Two-Factor Authentication** - TOTP-based 2FA with authenticator apps
- **Organizations & Teams** - Multi-tenant support with roles and invitations
- **Admin Panel Integration** - Custom login views, impersonation, passkey management
- **Type-Safe** - Full TypeScript inference for sessions, users, and plugins
- **Payload Native** - Works with Payload's access control, hooks, and collections

## Installation

```bash
npm install payload-auth better-auth
```

## Quick Start

```ts
// payload.config.ts
import { buildConfig } from 'payload'
import { betterAuthPlugin } from 'payload-auth/better-auth'

export default buildConfig({
  // ... your config
  plugins: [
    betterAuthPlugin({
      betterAuthOptions: {
        baseURL: process.env.NEXT_PUBLIC_SERVER_URL,
        emailAndPassword: { enabled: true },
        socialProviders: {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!
          }
        }
      },
      users: {
        roles: ['user', 'admin'],
        adminRoles: ['admin']
      }
    })
  ]
})
```

Create the auth API route:

```ts
// app/api/auth/[...all]/route.ts
import { getPayload } from 'payload'
import config from '@payload-config'

const handler = async (request: Request) => {
  const payload = await getPayload({ config })
  return payload.betterAuth.handler(request)
}

export { handler as GET, handler as POST }
```

## Documentation

See the [docs](./docs) folder for complete documentation:

- [Getting Started](./docs/getting-started.md) - Installation and setup
- [Configuration](./docs/configuration.md) - All available options
- [Collections](./docs/collections.md) - Auth collections and customization
- [Authentication](./docs/authentication.md) - Auth strategies and flows
- [Plugins](./docs/plugins.md) - Better Auth plugins (organizations, 2FA, passkeys)
- [Client Usage](./docs/client-usage.md) - React hooks and client API
- [Admin Features](./docs/admin-features.md) - Admin panel integration
- [API Reference](./docs/api-reference.md) - Exports and types
- [Migration Guide](./docs/migration-guide.md) - Migrating from Payload auth

## Supported Better Auth Plugins

| Plugin | Status | Description |
|--------|--------|-------------|
| `organization` | Full | Multi-tenant organizations with teams |
| `twoFactor` | Full | TOTP-based two-factor authentication |
| `passkey` | Full | WebAuthn passkey authentication |
| `admin` | Full | Admin features (impersonation, banning) |
| `username` | Full | Username-based login |
| `magicLink` | Full | Email magic link authentication |
| `anonymous` | Full | Anonymous user sessions |
| `apiKey` | Full | API key authentication |
| `multiSession` | Full | Multiple concurrent sessions |

## Requirements

- Payload CMS 3.x
- Better Auth 1.x
- Node.js 18+

## Packages

This monorepo contains:

| Package | Description |
|---------|-------------|
| `payload-auth` | Main plugin package |
| `demo` | Example Next.js application |

## License

MIT

