# Client Usage

This guide covers how to use Better Auth's client-side API with payload-auth, including React hooks, authentication methods, and common patterns.

## Setting Up the Client

### Basic Client

```ts
// lib/auth-client.ts
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL
})
```

### With Plugins

```ts
// lib/auth-client.ts
import { createAuthClient } from 'better-auth/react'
import {
  organizationClient,
  twoFactorClient,
  passkeyClient,
  adminClient
} from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL,
  plugins: [
    organizationClient(),
    twoFactorClient(),
    passkeyClient(),
    adminClient()
  ]
})

// Export commonly used methods
export const {
  useSession,
  signIn,
  signUp,
  signOut,
  organization,
  twoFactor,
  passkey
} = authClient
```

## React Hooks

### useSession

Get the current session with automatic updates:

```tsx
'use client'
import { authClient } from '@/lib/auth-client'

function UserProfile() {
  const {
    data: session,    // Session data or null
    isPending,        // Loading state
    error,            // Error if any
    refetch           // Manually refetch session
  } = authClient.useSession()

  if (isPending) {
    return <div>Loading...</div>
  }

  if (!session) {
    return <div>Not signed in</div>
  }

  return (
    <div>
      <h1>Welcome, {session.user.name}</h1>
      <p>Email: {session.user.email}</p>
      <p>Verified: {session.user.emailVerified ? 'Yes' : 'No'}</p>
      <p>Roles: {session.user.role?.join(', ')}</p>
    </div>
  )
}
```

### Session Data Structure

```ts
interface SessionData {
  session: {
    id: string
    userId: string
    token: string
    expiresAt: Date
    ipAddress?: string
    userAgent?: string
    // With organization plugin:
    activeOrganizationId?: string
  }
  user: {
    id: string
    email: string
    name?: string
    image?: string
    emailVerified: boolean
    role: string[] | null
    // Additional fields based on plugins...
  }
}
```

## Authentication Methods

### Sign Up

```tsx
'use client'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'

function SignUpForm() {
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(undefined)

    const formData = new FormData(e.currentTarget)

    const { data, error } = await authClient.signUp.email({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      name: formData.get('name') as string
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    // Redirect on success
    window.location.href = '/dashboard'
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Signing up...' : 'Sign Up'}
      </button>
    </form>
  )
}
```

### Sign In

```tsx
'use client'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'

function SignInForm() {
  const [error, setError] = useState<string>()
  const [needs2FA, setNeeds2FA] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const { data, error } = await authClient.signIn.email({
      email: formData.get('email') as string,
      password: formData.get('password') as string
    })

    if (error) {
      if (error.code === 'TWO_FACTOR_REQUIRED') {
        setNeeds2FA(true)
        return
      }
      setError(error.message)
      return
    }

    window.location.href = '/dashboard'
  }

  if (needs2FA) {
    return <TwoFactorForm />
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      {error && <p className="error">{error}</p>}
      <button type="submit">Sign In</button>
    </form>
  )
}
```

### Sign Out

```tsx
'use client'
import { authClient } from '@/lib/auth-client'

function SignOutButton() {
  async function handleSignOut() {
    await authClient.signOut()
    window.location.href = '/'
  }

  return (
    <button onClick={handleSignOut}>
      Sign Out
    </button>
  )
}
```

### Social Sign In

```tsx
'use client'
import { authClient } from '@/lib/auth-client'

function SocialButtons() {
  return (
    <div>
      <button
        onClick={() => authClient.signIn.social({
          provider: 'google',
          callbackURL: '/dashboard'
        })}
      >
        Continue with Google
      </button>

      <button
        onClick={() => authClient.signIn.social({
          provider: 'github',
          callbackURL: '/dashboard'
        })}
      >
        Continue with GitHub
      </button>
    </div>
  )
}
```

## Password Management

### Forgot Password

```tsx
'use client'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'

function ForgotPasswordForm() {
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    await authClient.forgetPassword({
      email: formData.get('email') as string,
      redirectTo: '/auth/reset-password'
    })

    setSent(true)
  }

  if (sent) {
    return <p>Check your email for a reset link.</p>
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" placeholder="Email" required />
      <button type="submit">Send Reset Link</button>
    </form>
  )
}
```

### Reset Password

```tsx
'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const { error } = await authClient.resetPassword({
      newPassword: formData.get('password') as string,
      token: token!
    })

    if (!error) {
      setSuccess(true)
    }
  }

  if (success) {
    return <p>Password reset! <a href="/auth/sign-in">Sign in</a></p>
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="password"
        type="password"
        placeholder="New Password"
        required
      />
      <button type="submit">Reset Password</button>
    </form>
  )
}
```

## Organization Management

With the organization plugin:

```tsx
'use client'
import { authClient } from '@/lib/auth-client'

function OrganizationSelector() {
  const { data: session } = authClient.useSession()
  const [orgs, setOrgs] = useState([])

  useEffect(() => {
    authClient.organization.list().then(({ data }) => {
      setOrgs(data || [])
    })
  }, [])

  async function selectOrg(orgId: string) {
    await authClient.organization.setActive({
      organizationId: orgId
    })
    // Session will update automatically
  }

  return (
    <div>
      <h3>Your Organizations</h3>
      {orgs.map((org) => (
        <button
          key={org.id}
          onClick={() => selectOrg(org.id)}
          className={org.id === session?.session.activeOrganizationId ? 'active' : ''}
        >
          {org.name}
        </button>
      ))}
    </div>
  )
}
```

### Create Organization

```tsx
async function createOrganization() {
  const { data, error } = await authClient.organization.create({
    name: 'My Company',
    slug: 'my-company'
  })

  if (data) {
    // Automatically sets as active
    console.log('Created:', data.id)
  }
}
```

### Invite Members

```tsx
async function inviteMember(email: string, role: string) {
  const { data: session } = authClient.useSession()

  await authClient.organization.inviteMember({
    email,
    role,
    organizationId: session?.session.activeOrganizationId!
  })
}
```

## Two-Factor Authentication

### Enable 2FA

```tsx
'use client'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'

function Enable2FA() {
  const [qrCode, setQrCode] = useState<string>()
  const [secret, setSecret] = useState<string>()

  async function generateQR() {
    const { data } = await authClient.twoFactor.getTOTPUri()
    if (data) {
      setQrCode(data.qrCode)
      setSecret(data.secret)
    }
  }

  async function enable(code: string, password: string) {
    const { error } = await authClient.twoFactor.enable({
      code,
      password
    })

    if (!error) {
      alert('2FA enabled!')
    }
  }

  return (
    <div>
      {!qrCode ? (
        <button onClick={generateQR}>Enable 2FA</button>
      ) : (
        <div>
          <img src={qrCode} alt="Scan with authenticator app" />
          <p>Secret: {secret}</p>
          <form onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            enable(fd.get('code') as string, fd.get('password') as string)
          }}>
            <input name="code" placeholder="Code from app" />
            <input name="password" type="password" placeholder="Your password" />
            <button type="submit">Verify & Enable</button>
          </form>
        </div>
      )}
    </div>
  )
}
```

### Verify 2FA on Sign In

```tsx
function TwoFactorForm() {
  async function verify(code: string) {
    const { error } = await authClient.twoFactor.verifyTOTP({ code })

    if (!error) {
      window.location.href = '/dashboard'
    }
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      const code = new FormData(e.currentTarget).get('code') as string
      verify(code)
    }}>
      <input name="code" placeholder="6-digit code" maxLength={6} />
      <button type="submit">Verify</button>
    </form>
  )
}
```

## Passkey Management

```tsx
'use client'
import { authClient } from '@/lib/auth-client'

function PasskeyManager() {
  const [passkeys, setPasskeys] = useState([])

  useEffect(() => {
    loadPasskeys()
  }, [])

  async function loadPasskeys() {
    const { data } = await authClient.passkey.listPasskeys()
    setPasskeys(data || [])
  }

  async function addPasskey() {
    await authClient.passkey.addPasskey({
      name: 'My Device'
    })
    loadPasskeys()
  }

  async function deletePasskey(id: string) {
    await authClient.passkey.deletePasskey({ id })
    loadPasskeys()
  }

  return (
    <div>
      <h3>Your Passkeys</h3>
      {passkeys.map((pk) => (
        <div key={pk.id}>
          <span>{pk.name}</span>
          <button onClick={() => deletePasskey(pk.id)}>Delete</button>
        </div>
      ))}
      <button onClick={addPasskey}>Add Passkey</button>
    </div>
  )
}
```

## Error Handling

Better Auth returns typed errors:

```ts
const { data, error } = await authClient.signIn.email({
  email: 'user@example.com',
  password: 'wrong'
})

if (error) {
  // error.code - Machine-readable error code
  // error.message - Human-readable message

  switch (error.code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
      showError('Invalid email or password')
      break
    case 'EMAIL_NOT_VERIFIED':
      showError('Please verify your email first')
      break
    case 'USER_BANNED':
      showError(`Account banned: ${error.message}`)
      break
    case 'TWO_FACTOR_REQUIRED':
      // Show 2FA input
      break
    case 'RATE_LIMIT_EXCEEDED':
      showError('Too many attempts. Try again later.')
      break
    default:
      showError('An error occurred')
  }
}
```

## TypeScript Types

### Inferring Session Types

```ts
// Get session type from your auth client
type Session = typeof authClient.$Infer.Session

// Use in components
function ProfilePage({ session }: { session: Session }) {
  return <div>{session.user.name}</div>
}
```

### Type-Safe API Calls

```ts
import type { authClient } from '@/lib/auth-client'

// Types are automatically inferred
async function example() {
  const { data } = await authClient.signIn.email({
    email: 'test@example.com',
    password: 'password'
  })

  // data.user is fully typed
  console.log(data?.user.email)
}
```

## Common Patterns

### Auth Provider

Wrap your app to provide auth context:

```tsx
// components/providers.tsx
'use client'
import { createContext, useContext } from 'react'
import { authClient } from '@/lib/auth-client'

const AuthContext = createContext<typeof authClient | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={authClient}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

### Protected Component

```tsx
'use client'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

function ProtectedContent({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession()
  const router = useRouter()

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/auth/sign-in')
    }
  }, [session, isPending, router])

  if (isPending) {
    return <div>Loading...</div>
  }

  if (!session) {
    return null
  }

  return <>{children}</>
}
```

### Role Guard

```tsx
function AdminOnly({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) return <div>Loading...</div>

  if (!session?.user.role?.includes('admin')) {
    return <div>Access denied</div>
  }

  return <>{children}</>
}
```
