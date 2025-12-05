# payload-auth Documentation

This documentation covers the `payload-auth` package, which integrates [Better Auth](https://better-auth.com) with [Payload CMS](https://payloadcms.com).

## What is payload-auth?

payload-auth is a Payload CMS plugin that replaces or augments Payload's built-in authentication system with Better Auth. This gives you:

- **Modern authentication flows** - Email/password, social providers, magic links, passkeys, two-factor auth
- **Flexible session management** - Cookie-based sessions with configurable expiration
- **Organization support** - Multi-tenant apps with teams, roles, and invitations
- **Admin panel integration** - Custom login views, impersonation, passkey management
- **Type-safe API** - Full TypeScript inference for sessions, users, and plugins

## Documentation Structure

### Getting Started
- [Installation](./getting-started.md) - Install and configure the plugin
- [Quick Start](./getting-started.md#quick-start) - Minimal setup example

### Configuration
- [Plugin Options](./configuration.md) - All available configuration options
- [Better Auth Options](./configuration.md#better-auth-options) - Configuring Better Auth features
- [Collection Customization](./collections.md) - Customizing auth collections

### Core Concepts
- [Collections](./collections.md) - Understanding auth collections (users, sessions, accounts, etc.)
- [Authentication](./authentication.md) - Auth strategies, flows, and session management
- [Plugins](./plugins.md) - Supported Better Auth plugins and configuration

### Features
- [Admin Features](./admin-features.md) - Admin panel components and views
- [Client Usage](./client-usage.md) - React hooks and client-side API

### Reference
- [API Reference](./api-reference.md) - Exported functions and types
- [Migration Guide](./migration-guide.md) - Migrating from Payload's built-in auth

## Quick Example

```ts
// payload.config.ts
import { buildConfig } from 'payload'
import { betterAuthPlugin } from 'payload-auth/better-auth'

export default buildConfig({
  // ... your config
  plugins: [
    betterAuthPlugin({
      betterAuthOptions: {
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

## Key Concepts

### Collections Created

The plugin automatically creates and manages these Payload collections:

| Collection | Description |
|------------|-------------|
| `users` | User accounts with roles and profile data |
| `sessions` | Active authentication sessions |
| `accounts` | OAuth provider connections and credentials |
| `verifications` | Email verification and password reset tokens |

With plugins like `organization()`, additional collections are created:

| Collection | Plugin |
|------------|--------|
| `organizations` | organization |
| `members` | organization |
| `invitations` | organization |
| `teams` | organization (with teams enabled) |
| `passkeys` | passkey |
| `api-keys` | apiKey |

### Runtime Access

After initialization, Better Auth is available on the Payload instance:

```ts
const payload = await getPayload({ config })

// Get current session
const session = await payload.betterAuth.api.getSession({
  headers: request.headers
})

// Access user
const user = session?.user
```

## Requirements

- Payload CMS 3.x
- Better Auth 1.x
- Node.js 18+

## Links

- [GitHub Repository](https://github.com/payload-auth/payload-auth)
- [Better Auth Documentation](https://better-auth.com/docs)
- [Payload CMS Documentation](https://payloadcms.com/docs)
