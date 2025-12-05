# Authentication

This guide covers how authentication works with payload-auth, including strategies, session management, and auth flows.

## Authentication Strategy

The plugin adds a custom Payload authentication strategy called `better-auth`. When a request comes in:

1. Payload's auth system calls the strategy's `authenticate()` method
2. The strategy calls Better Auth's `getSession()` API
3. If a valid session exists, the user is fetched from Payload
4. The user is returned to Payload's auth system with `_strategy: 'better-auth'`

```
Request with session cookie
       ↓
Payload calls authenticate()
       ↓
Better Auth validates session
       ↓
Fetch user from Payload
       ↓
Return authenticated user
```

## Session Management

### How Sessions Work

Better Auth uses cookie-based sessions:

1. **Sign In** - Creates a session record in the database and sets a session cookie
2. **Request** - Cookie is validated against the sessions collection
3. **Refresh** - Sessions can be refreshed to extend expiration
4. **Sign Out** - Session is deleted from database and cookie is cleared

### Session Configuration

```ts
betterAuthPlugin({
  betterAuthOptions: {
    session: {
      // How long sessions last (in seconds)
      expiresIn: 60 * 60 * 24 * 7, // 7 days

      // How often to refresh the session
      updateAge: 60 * 60 * 24, // Update if older than 1 day

      // Cookie caching for performance
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60 // Cache for 5 minutes
      }
    }
  }
})
```

### Getting the Current Session

**Server-side (API routes, server components):**

```ts
import { getPayload } from 'payload'
import { headers } from 'next/headers'
import config from '@payload-config'

export async function getCurrentSession() {
  const payload = await getPayload({ config })
  const headersList = await headers()

  const session = await payload.betterAuth.api.getSession({
    headers: headersList
  })

  return session
}
```

**Client-side (React components):**

```tsx
'use client'
import { authClient } from '@/lib/auth-client'

function MyComponent() {
  const { data: session, isPending, error } = authClient.useSession()

  if (isPending) return <div>Loading...</div>
  if (!session) return <div>Not authenticated</div>

  return <div>Hello, {session.user.name}</div>
}
```

### Session Data Structure

```ts
interface Session {
  session: {
    id: string
    userId: string
    token: string
    expiresAt: Date
    ipAddress?: string
    userAgent?: string
    // With organization plugin:
    activeOrganizationId?: string
    activeTeamId?: string
    // With admin plugin:
    impersonatedBy?: string
  }
  user: {
    id: string
    email: string
    name?: string
    image?: string
    emailVerified: boolean
    role: string[]
    // Additional fields from plugins...
  }
}
```

## Authentication Flows

### Email and Password

**Sign Up:**

```ts
const { data, error } = await authClient.signUp.email({
  email: 'user@example.com',
  password: 'secure-password',
  name: 'John Doe'
})
```

**Sign In:**

```ts
const { data, error } = await authClient.signIn.email({
  email: 'user@example.com',
  password: 'secure-password'
})
```

**Sign Out:**

```ts
await authClient.signOut()
```

### Social Providers

**Sign In with Google:**

```ts
await authClient.signIn.social({
  provider: 'google',
  callbackURL: '/dashboard'
})
```

**Sign In with GitHub:**

```ts
await authClient.signIn.social({
  provider: 'github',
  callbackURL: '/dashboard'
})
```

### Magic Link

Requires the `magicLink()` plugin.

```ts
// Send magic link
await authClient.signIn.magicLink({
  email: 'user@example.com',
  callbackURL: '/dashboard'
})
```

### Passkeys

Requires the `passkey()` plugin.

**Register a passkey:**

```ts
await authClient.passkey.addPasskey({
  name: 'My MacBook'
})
```

**Sign in with passkey:**

```ts
await authClient.signIn.passkey()
```

### Two-Factor Authentication

Requires the `twoFactor()` plugin.

**Enable 2FA:**

```ts
// Get TOTP URI for authenticator app
const { data } = await authClient.twoFactor.getTOTPUri()
// data.uri contains the otpauth:// URI
// data.qrCode contains a data URL for QR code

// Verify and enable
await authClient.twoFactor.enable({
  password: 'user-password',
  code: '123456' // From authenticator app
})
```

**Sign in with 2FA:**

```ts
// First, sign in normally
const { data, error } = await authClient.signIn.email({
  email: 'user@example.com',
  password: 'secure-password'
})

// If 2FA is required, error.code will be 'TWO_FACTOR_REQUIRED'
if (error?.code === 'TWO_FACTOR_REQUIRED') {
  // Prompt for TOTP code, then:
  await authClient.twoFactor.verifyTOTP({
    code: '123456'
  })
}
```

## Password Management

### Password Reset

```ts
// Request reset email
await authClient.forgetPassword({
  email: 'user@example.com',
  redirectTo: '/reset-password'
})

// Reset with token (from email link)
await authClient.resetPassword({
  newPassword: 'new-secure-password',
  token: 'reset-token-from-url'
})
```

### Change Password

```ts
await authClient.changePassword({
  currentPassword: 'old-password',
  newPassword: 'new-password'
})
```

## Email Verification

### Configuration

```ts
betterAuthPlugin({
  betterAuthOptions: {
    emailAndPassword: {
      requireEmailVerification: true
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      async sendVerificationEmail({ user, url }) {
        await sendEmail({
          to: user.email,
          subject: 'Verify your email',
          html: `<a href="${url}">Verify Email</a>`
        })
      }
    }
  }
})
```

### Resend Verification

```ts
await authClient.sendVerificationEmail({
  email: 'user@example.com'
})
```

## Account Linking

Allow users to link multiple auth providers to one account:

```ts
betterAuthPlugin({
  betterAuthOptions: {
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ['google', 'github']
      }
    }
  }
})
```

When a user signs in with a trusted provider using an email that already exists, the accounts are automatically linked.

## Payload Admin Authentication

### Default Mode

By default, the plugin keeps Payload's built-in auth working alongside Better Auth:

- Admin panel uses Payload's native auth
- Frontend uses Better Auth
- User passwords are synced between both systems

### Better Auth for Admin

Set `disableDefaultPayloadAuth: true` to use Better Auth everywhere:

```ts
betterAuthPlugin({
  disableDefaultPayloadAuth: true,
  admin: {
    loginMethods: ['email', 'google', 'passkey']
  }
})
```

This enables:
- Custom login/signup views in admin
- Social provider buttons on admin login
- Two-factor authentication for admin
- Passkey login for admin

## Role-Based Access

### Defining Roles

```ts
betterAuthPlugin({
  users: {
    roles: ['user', 'editor', 'moderator', 'admin'],
    adminRoles: ['moderator', 'admin'], // Can access admin panel
    defaultRole: 'user',
    defaultAdminRole: 'admin'
  }
})
```

### Checking Roles

**Server-side:**

```ts
const session = await payload.betterAuth.api.getSession({ headers })

if (session?.user.role?.includes('admin')) {
  // User is admin
}
```

**Client-side:**

```tsx
const { data: session } = authClient.useSession()

if (session?.user.role?.includes('admin')) {
  // Show admin features
}
```

### Protecting Routes

```ts
// lib/auth.ts
export async function requireRole(role: string) {
  const session = await getCurrentSession()

  if (!session) {
    redirect('/auth/sign-in')
  }

  if (!session.user.role?.includes(role)) {
    redirect('/unauthorized')
  }

  return session
}

// Usage in page
export default async function AdminPage() {
  const session = await requireRole('admin')
  // ...
}
```

## API Authentication

### Using Better Auth Headers

```ts
// Server-side
const session = await payload.betterAuth.api.getSession({
  headers: request.headers
})
```

### Using Payload's Auth

```ts
// In collection hooks or endpoints
async function handler({ req }) {
  // req.user is populated by Payload using the better-auth strategy
  if (req.user) {
    console.log('Authenticated as:', req.user.email)
  }
}
```

## Error Handling

Better Auth returns typed errors:

```ts
const { data, error } = await authClient.signIn.email({
  email: 'user@example.com',
  password: 'wrong-password'
})

if (error) {
  switch (error.code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
      // Handle invalid credentials
      break
    case 'EMAIL_NOT_VERIFIED':
      // Prompt to verify email
      break
    case 'USER_BANNED':
      // Handle banned user
      break
    case 'TWO_FACTOR_REQUIRED':
      // Prompt for 2FA code
      break
    default:
      console.error(error.message)
  }
}
```

## Security Best Practices

1. **Use HTTPS in production** - Session cookies are secure by default
2. **Set strong passwords** - Configure minimum password length
3. **Enable email verification** - Prevent fake accounts
4. **Use 2FA for admins** - Extra protection for sensitive accounts
5. **Implement rate limiting** - Prevent brute force attacks
6. **Keep secrets secure** - Use environment variables for `BETTER_AUTH_SECRET`
