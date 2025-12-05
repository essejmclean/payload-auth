# Migration Guide

This guide helps you migrate from Payload's built-in authentication to payload-auth with Better Auth.

## Overview

Migrating to payload-auth involves:

1. Installing the package
2. Adding the plugin to your Payload config
3. Creating the auth API route
4. Setting up the client
5. Migrating existing users (optional)
6. Updating your frontend code

## Migration Modes

### Gradual Migration (Recommended)

Keep Payload's native auth working alongside Better Auth:

```ts
betterAuthPlugin({
  disableDefaultPayloadAuth: false // Default
})
```

Benefits:
- Admin panel continues to work unchanged
- Frontend can use Better Auth
- Passwords sync automatically
- No user migration required

### Full Migration

Replace Payload's auth entirely:

```ts
betterAuthPlugin({
  disableDefaultPayloadAuth: true
})
```

Benefits:
- Unified auth system
- Social login in admin
- Advanced features (2FA, passkeys) everywhere
- Modern session management

## Step-by-Step Migration

### 1. Install Dependencies

```bash
pnpm add payload-auth better-auth
```

### 2. Add Environment Variables

```env
BETTER_AUTH_SECRET=your-32-character-secret-key
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

Generate a secret:
```bash
openssl rand -base64 32
```

### 3. Update Payload Config

**Before (Payload native auth):**
```ts
// payload.config.ts
export default buildConfig({
  collections: [
    {
      slug: 'users',
      auth: true,
      fields: [
        { name: 'name', type: 'text' },
        { name: 'role', type: 'select', options: ['user', 'admin'] }
      ]
    }
  ]
})
```

**After (with payload-auth):**
```ts
// payload.config.ts
import { betterAuthPlugin } from 'payload-auth/better-auth'

export default buildConfig({
  collections: [
    // Users collection is now managed by the plugin
    // You can still customize it via plugin options
  ],
  plugins: [
    betterAuthPlugin({
      betterAuthOptions: {
        baseURL: process.env.NEXT_PUBLIC_SERVER_URL,
        emailAndPassword: {
          enabled: true
        }
      },
      users: {
        roles: ['user', 'admin'],
        adminRoles: ['admin'],
        collectionOverrides: ({ collection }) => ({
          ...collection,
          fields: [
            ...collection.fields,
            // Add back any custom fields you had
          ]
        })
      }
    })
  ]
})
```

### 4. Create Auth API Route

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

### 5. Set Up Auth Client

```ts
// lib/auth-client.ts
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL
})
```

### 6. Run Migrations

Create and run database migrations for new tables:

```bash
pnpm payload migrate:create
pnpm payload migrate
```

### 7. Update Frontend Code

**Before (using Payload REST API):**
```ts
// Sign in
await fetch('/api/users/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
})

// Get current user
const res = await fetch('/api/users/me')
const { user } = await res.json()

// Sign out
await fetch('/api/users/logout', { method: 'POST' })
```

**After (using Better Auth client):**
```ts
import { authClient } from '@/lib/auth-client'

// Sign in
await authClient.signIn.email({ email, password })

// Get current session (React hook)
const { data: session } = authClient.useSession()
const user = session?.user

// Sign out
await authClient.signOut()
```

## Migrating Existing Users

If you have existing users and want them to continue working:

### Option 1: Password Sync (Gradual Migration)

With `disableDefaultPayloadAuth: false` (default), passwords are automatically synced:

1. Users sign in with their existing credentials via Payload
2. Plugin creates a Better Auth account with the same password
3. Future logins work with both systems

### Option 2: Password Reset (Full Migration)

If migrating fully to Better Auth:

1. Trigger password reset for all users
2. Users set new passwords via Better Auth flow
3. This creates proper Better Auth accounts

```ts
// Script to send password reset to all users
import { getPayload } from 'payload'
import config from '@payload-config'

async function migrateUsers() {
  const payload = await getPayload({ config })

  const users = await payload.find({
    collection: 'users',
    pagination: false
  })

  for (const user of users.docs) {
    // Trigger password reset email
    await payload.betterAuth.api.forgetPassword({
      body: { email: user.email }
    })
  }
}
```

### Option 3: Create Accounts Programmatically

Create Better Auth accounts for existing users:

```ts
import { getPayload } from 'payload'
import config from '@payload-config'
import { hash } from 'bcryptjs' // or your hashing library

async function createAccountsForExistingUsers() {
  const payload = await getPayload({ config })

  const users = await payload.find({
    collection: 'users',
    pagination: false
  })

  for (const user of users.docs) {
    // Check if account already exists
    const existingAccount = await payload.find({
      collection: 'accounts',
      where: {
        userId: { equals: user.id },
        providerId: { equals: 'credential' }
      }
    })

    if (existingAccount.docs.length === 0) {
      // Create credential account
      // Note: You'd need access to the original password hash
      await payload.create({
        collection: 'accounts',
        data: {
          userId: user.id,
          accountId: user.id,
          providerId: 'credential',
          password: user.hash // Original password hash
        }
      })
    }
  }
}
```

## Migrating Custom Fields

### User Fields

Custom fields on the users collection should be added via `collectionOverrides`:

**Before:**
```ts
{
  slug: 'users',
  auth: true,
  fields: [
    { name: 'phone', type: 'text' },
    { name: 'bio', type: 'textarea' },
    { name: 'avatar', type: 'upload', relationTo: 'media' }
  ]
}
```

**After:**
```ts
betterAuthPlugin({
  users: {
    collectionOverrides: ({ collection }) => ({
      ...collection,
      fields: [
        ...collection.fields,
        { name: 'phone', type: 'text' },
        { name: 'bio', type: 'textarea' },
        { name: 'avatar', type: 'upload', relationTo: 'media' }
      ]
    })
  }
})
```

### Role Migration

Map your existing roles to the new role system:

**Before:**
```ts
{
  name: 'role',
  type: 'select',
  options: ['user', 'editor', 'admin'],
  defaultValue: 'user'
}
```

**After:**
```ts
betterAuthPlugin({
  users: {
    roles: ['user', 'editor', 'admin'],
    adminRoles: ['admin'],
    defaultRole: 'user'
  }
})
```

## Migrating Access Control

### Collection Access

**Before:**
```ts
access: {
  read: ({ req: { user } }) => {
    if (user?.role === 'admin') return true
    return { id: { equals: user?.id } }
  }
}
```

**After:**
Access control works the same, but roles are now arrays:
```ts
betterAuthPlugin({
  users: {
    collectionOverrides: ({ collection }) => ({
      ...collection,
      access: {
        read: ({ req: { user } }) => {
          if (user?.role?.includes('admin')) return true
          return { id: { equals: user?.id } }
        }
      }
    })
  }
})
```

### Field-Level Access

Field-level access works unchanged, just update role checks:

```ts
{
  name: 'secretField',
  type: 'text',
  access: {
    read: ({ req: { user } }) => user?.role?.includes('admin') ?? false
  }
}
```

## Migrating Hooks

### Login/Logout Hooks

**Before (Payload hooks):**
```ts
{
  slug: 'users',
  hooks: {
    afterLogin: [
      async ({ user }) => {
        console.log('User logged in:', user.email)
      }
    ]
  }
}
```

**After:**
```ts
betterAuthPlugin({
  users: {
    collectionOverrides: ({ collection }) => ({
      ...collection,
      hooks: {
        ...collection.hooks,
        afterLogin: [
          ...(collection.hooks?.afterLogin ?? []),
          async ({ user }) => {
            console.log('User logged in:', user.email)
          }
        ]
      }
    })
  }
})
```

## API Endpoint Changes

| Action | Payload Native | Better Auth |
|--------|---------------|-------------|
| Sign up | `POST /api/users` | `POST /api/auth/sign-up/email` |
| Sign in | `POST /api/users/login` | `POST /api/auth/sign-in/email` |
| Sign out | `POST /api/users/logout` | `POST /api/auth/sign-out` |
| Get session | `GET /api/users/me` | `GET /api/auth/get-session` |
| Reset password | `POST /api/users/forgot-password` | `POST /api/auth/forget-password` |

## Common Issues

### "User not found" after migration

Ensure the users collection slug matches:
```ts
betterAuthPlugin({
  users: {
    slug: 'users' // Must match your existing collection
  }
})
```

### Passwords don't work

In gradual migration mode, users may need to sign in once via Payload's native auth to sync their password to Better Auth.

### Missing fields in session

Ensure fields are saved to JWT:
```ts
betterAuthPlugin({
  users: {
    collectionOverrides: ({ collection }) => ({
      ...collection,
      fields: collection.fields.map(field => {
        if (field.name === 'customField') {
          return { ...field, saveToJWT: true }
        }
        return field
      })
    })
  }
})
```

### Admin panel login fails

If using `disableDefaultPayloadAuth: true`, ensure:
1. You have at least one user with an admin role
2. The `loginMethods` includes a valid method
3. Email handlers are configured for password reset

## Rollback Plan

If you need to roll back:

1. Remove the plugin from config
2. Restore your original users collection config
3. Keep the migration (accounts, sessions tables won't hurt)
4. Users can continue using their existing passwords

```ts
// Temporary config during rollback
export default buildConfig({
  collections: [
    {
      slug: 'users',
      auth: true,
      // Your original config
    }
  ]
  // No betterAuthPlugin
})
```
