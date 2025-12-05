# Getting Started

This guide walks you through installing and configuring payload-auth in your Payload CMS project.

## Prerequisites

- Payload CMS 3.x project
- Node.js 18 or later
- A supported database (PostgreSQL recommended, MongoDB also supported)

## Installation

Install the package and peer dependencies:

```bash
# npm
npm install payload-auth better-auth

# pnpm
pnpm add payload-auth better-auth

# yarn
yarn add payload-auth better-auth
```

## Quick Start

### 1. Add the Plugin to Payload Config

```ts
// payload.config.ts
import { buildConfig } from 'payload'
import { betterAuthPlugin } from 'payload-auth/better-auth'

export default buildConfig({
  // Your existing config...
  collections: [
    // Your collections (users collection will be created/modified by the plugin)
  ],
  plugins: [
    betterAuthPlugin({
      betterAuthOptions: {
        baseURL: process.env.NEXT_PUBLIC_SERVER_URL,
        emailAndPassword: {
          enabled: true
        }
      }
    })
  ]
})
```

### 2. Create the Auth API Route

For Next.js App Router:

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

### 3. Set Up the Auth Client

Create a client for use in your React components:

```ts
// lib/auth-client.ts
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL
})

// Export hooks for convenience
export const { useSession, signIn, signUp, signOut } = authClient
```

### 4. Add Environment Variables

```env
# .env
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
```

Generate a secure secret:

```bash
openssl rand -base64 32
```

## Basic Usage

### Sign Up a User

```tsx
'use client'
import { authClient } from '@/lib/auth-client'

export function SignUpForm() {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const { data, error } = await authClient.signUp.email({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      name: formData.get('name') as string
    })

    if (error) {
      console.error('Sign up failed:', error.message)
    } else {
      console.log('Signed up:', data.user)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      <button type="submit">Sign Up</button>
    </form>
  )
}
```

### Sign In

```tsx
'use client'
import { authClient } from '@/lib/auth-client'

export function SignInForm() {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const { data, error } = await authClient.signIn.email({
      email: formData.get('email') as string,
      password: formData.get('password') as string
    })

    if (error) {
      console.error('Sign in failed:', error.message)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      <button type="submit">Sign In</button>
    </form>
  )
}
```

### Get Current Session

```tsx
'use client'
import { authClient } from '@/lib/auth-client'

export function UserProfile() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) return <div>Loading...</div>
  if (!session) return <div>Not signed in</div>

  return (
    <div>
      <p>Welcome, {session.user.name}</p>
      <p>Email: {session.user.email}</p>
      <button onClick={() => authClient.signOut()}>Sign Out</button>
    </div>
  )
}
```

### Server-Side Session Access

```ts
// In a server component or API route
import { getPayload } from 'payload'
import { headers } from 'next/headers'
import config from '@payload-config'

export async function getCurrentUser() {
  const payload = await getPayload({ config })
  const headersList = await headers()

  const session = await payload.betterAuth.api.getSession({
    headers: headersList
  })

  return session?.user ?? null
}
```

## Next Steps

- [Configuration](./configuration.md) - Learn about all available options
- [Collections](./collections.md) - Customize auth collections
- [Plugins](./plugins.md) - Add social login, organizations, passkeys, and more
- [Admin Features](./admin-features.md) - Replace Payload's admin authentication

## Common Patterns

### Protecting Pages (Middleware)

```ts
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Check for session cookie
  const sessionCookie = request.cookies.get('better-auth.session_token')

  if (!sessionCookie && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/sign-in', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*']
}
```

### Server-Side Auth Check

```ts
// lib/auth.ts
import { getPayload } from 'payload'
import { headers, cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import config from '@payload-config'

export async function requireAuth() {
  const payload = await getPayload({ config })
  const headersList = await headers()

  const session = await payload.betterAuth.api.getSession({
    headers: headersList
  })

  if (!session) {
    redirect('/auth/sign-in')
  }

  return session
}

// Usage in a page
export default async function DashboardPage() {
  const session = await requireAuth()

  return <div>Welcome, {session.user.name}</div>
}
```

### Role-Based Access

```ts
export async function requireAdmin() {
  const session = await requireAuth()

  if (!session.user.role?.includes('admin')) {
    redirect('/unauthorized')
  }

  return session
}
```
