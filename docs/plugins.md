# Better Auth Plugins

The payload-auth plugin supports most Better Auth plugins. This guide covers how to configure and use the most popular ones.

## Supported Plugins

| Plugin | Status | Description |
|--------|--------|-------------|
| `organization` | Full support | Multi-tenant organizations with teams |
| `twoFactor` | Full support | TOTP-based two-factor authentication |
| `passkey` | Full support | WebAuthn passkey authentication |
| `admin` | Full support | Admin features like impersonation |
| `username` | Full support | Username-based login |
| `magicLink` | Full support | Email magic link authentication |
| `emailOTP` | Full support | Email OTP verification |
| `phoneNumber` | Full support | Phone number authentication |
| `anonymous` | Full support | Anonymous user sessions |
| `apiKey` | Full support | API key authentication |
| `multiSession` | Full support | Multiple concurrent sessions |
| `openAPI` | Full support | OpenAPI spec generation |

## Organization Plugin

Add multi-tenant organizations with members, roles, and teams.

### Installation

```ts
import { organization } from 'better-auth/plugins'

betterAuthPlugin({
  betterAuthOptions: {
    plugins: [
      organization({
        // Enable teams within organizations
        teams: {
          enabled: true
        },
        // Custom invitation email
        async sendInvitationEmail(data) {
          const inviteLink = `${process.env.NEXT_PUBLIC_SERVER_URL}/accept-invitation/${data.id}`
          await sendEmail({
            to: data.email,
            subject: `You've been invited to ${data.organization.name}`,
            html: `<a href="${inviteLink}">Accept Invitation</a>`
          })
        }
      })
    ]
  }
})
```

### Client Setup

```ts
import { createAuthClient } from 'better-auth/react'
import { organizationClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL,
  plugins: [organizationClient()]
})
```

### Usage

**Create an organization:**

```ts
const { data: org } = await authClient.organization.create({
  name: 'Acme Corp',
  slug: 'acme'
})
```

**Invite a member:**

```ts
await authClient.organization.inviteMember({
  email: 'user@example.com',
  role: 'member',
  organizationId: org.id
})
```

**List organizations:**

```ts
const { data } = await authClient.organization.list()
```

**Set active organization:**

```ts
await authClient.organization.setActive({
  organizationId: org.id
})
```

**Get current organization from session:**

```ts
const { data: session } = authClient.useSession()
// session.session.activeOrganizationId
```

### Adding Custom Fields

Use `additionalFields` to extend organization schema:

```ts
organization({
  schema: {
    organization: {
      additionalFields: {
        industry: {
          type: 'string',
          required: false,
          input: true
        },
        maxSeats: {
          type: 'number',
          required: false,
          input: true
        }
      }
    },
    member: {
      additionalFields: {
        department: {
          type: 'string',
          required: false,
          input: true
        }
      }
    }
  }
})
```

### Collection Customization

```ts
betterAuthPlugin({
  pluginCollectionOverrides: {
    organization: ({ collection }) => ({
      ...collection,
      admin: {
        ...collection.admin,
        useAsTitle: 'name',
        defaultColumns: ['name', 'slug', 'createdAt']
      }
    })
  }
})
```

## Two-Factor Authentication

Add TOTP-based 2FA (Google Authenticator, Authy, etc.).

### Installation

```ts
import { twoFactor } from 'better-auth/plugins'

betterAuthPlugin({
  betterAuthOptions: {
    plugins: [
      twoFactor({
        // Issuer shown in authenticator app
        issuer: 'My Application',
        // Optional: Send backup codes via email
        otpOptions: {
          async sendOTP({ user, otp }) {
            await sendEmail({
              to: user.email,
              subject: 'Your verification code',
              html: `Your code is: ${otp}`
            })
          }
        }
      })
    ]
  }
})
```

### Client Setup

```ts
import { twoFactorClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL,
  plugins: [twoFactorClient()]
})
```

### Usage

**Enable 2FA:**

```tsx
function Enable2FA() {
  const [qrCode, setQrCode] = useState<string>()
  const [code, setCode] = useState('')

  async function generateQR() {
    const { data } = await authClient.twoFactor.getTOTPUri()
    setQrCode(data.qrCode) // Data URL for QR code image
  }

  async function enable() {
    const { error } = await authClient.twoFactor.enable({
      password: 'user-password',
      code // 6-digit code from authenticator
    })
    if (!error) {
      alert('2FA enabled!')
    }
  }

  return (
    <div>
      <button onClick={generateQR}>Generate QR Code</button>
      {qrCode && <img src={qrCode} alt="2FA QR Code" />}
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter code from authenticator"
      />
      <button onClick={enable}>Enable 2FA</button>
    </div>
  )
}
```

**Sign in with 2FA:**

```ts
const { data, error } = await authClient.signIn.email({
  email: 'user@example.com',
  password: 'password'
})

if (error?.code === 'TWO_FACTOR_REQUIRED') {
  // Show 2FA input, then:
  const { error: totpError } = await authClient.twoFactor.verifyTOTP({
    code: '123456'
  })
}
```

**Disable 2FA:**

```ts
await authClient.twoFactor.disable({
  password: 'user-password'
})
```

### Admin Panel Integration

The plugin adds a 2FA toggle component to the user edit view. Users can enable/disable 2FA directly from the Payload admin.

## Passkey Plugin

Add WebAuthn passkey authentication for passwordless login.

### Installation

```ts
import { passkey } from 'better-auth/plugins/passkey'

betterAuthPlugin({
  betterAuthOptions: {
    plugins: [
      passkey({
        rpID: 'localhost', // Your domain (without protocol)
        rpName: 'My Application', // Shown in browser prompt
        origin: process.env.NEXT_PUBLIC_SERVER_URL // Full URL with protocol
      })
    ]
  }
})
```

### Client Setup

```ts
import { passkeyClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL,
  plugins: [passkeyClient()]
})
```

### Usage

**Register a passkey:**

```ts
await authClient.passkey.addPasskey({
  name: 'My MacBook' // Optional name for the passkey
})
```

**Sign in with passkey:**

```ts
await authClient.signIn.passkey()
```

**List user's passkeys:**

```ts
const { data: passkeys } = await authClient.passkey.listPasskeys()
```

**Delete a passkey:**

```ts
await authClient.passkey.deletePasskey({
  id: 'passkey-id'
})
```

### Admin Panel Integration

The plugin adds a passkey management field to user edit views. Admins can see and delete user passkeys.

## Admin Plugin

Add admin-specific features like user impersonation and banning.

### Installation

```ts
import { admin } from 'better-auth/plugins'

betterAuthPlugin({
  betterAuthOptions: {
    plugins: [
      admin({
        // Default role for new users
        defaultRole: 'user',
        // Roles that can access admin features
        adminRoles: ['admin']
      })
    ]
  }
})
```

### Client Setup

```ts
import { adminClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL,
  plugins: [adminClient()]
})
```

### Usage

**Impersonate a user:**

```ts
await authClient.admin.impersonateUser({
  userId: 'user-to-impersonate'
})
```

**Stop impersonating:**

```ts
await authClient.admin.stopImpersonating()
```

**Ban a user:**

```ts
await authClient.admin.banUser({
  userId: 'user-id',
  reason: 'Violation of terms',
  expiresAt: new Date('2024-12-31') // Optional
})
```

**Unban a user:**

```ts
await authClient.admin.unbanUser({
  userId: 'user-id'
})
```

### Admin Panel Integration

The plugin adds an "Impersonate" button to user edit views, allowing admins to impersonate users directly from Payload.

## Username Plugin

Allow users to sign in with username instead of email.

### Installation

```ts
import { username } from 'better-auth/plugins'

betterAuthPlugin({
  betterAuthOptions: {
    plugins: [username()]
  }
})
```

### Usage

**Sign up with username:**

```ts
await authClient.signUp.email({
  email: 'user@example.com',
  password: 'password',
  username: 'johndoe',
  name: 'John Doe'
})
```

**Sign in with username:**

```ts
await authClient.signIn.username({
  username: 'johndoe',
  password: 'password'
})
```

## Magic Link Plugin

Passwordless authentication via email links.

### Installation

```ts
import { magicLink } from 'better-auth/plugins'

betterAuthPlugin({
  betterAuthOptions: {
    plugins: [
      magicLink({
        async sendMagicLink({ email, token, url }) {
          await sendEmail({
            to: email,
            subject: 'Sign in to My App',
            html: `<a href="${url}">Click here to sign in</a>`
          })
        }
      })
    ]
  }
})
```

### Usage

```ts
await authClient.signIn.magicLink({
  email: 'user@example.com',
  callbackURL: '/dashboard'
})
```

## Anonymous Plugin

Support anonymous users that can later be linked to real accounts.

### Installation

```ts
import { anonymous } from 'better-auth/plugins'

betterAuthPlugin({
  betterAuthOptions: {
    plugins: [
      anonymous({
        emailDomainName: 'myapp.com', // Domain for generated emails
        async onLinkAccount({ anonymousUser, newUser }) {
          // Migrate data from anonymous to real user
        }
      })
    ]
  }
})
```

### Usage

**Create anonymous session:**

```ts
await authClient.signIn.anonymous()
```

**Link to real account:**

```ts
// User signs in with real credentials
// Anonymous data is automatically linked
await authClient.signIn.email({
  email: 'real@example.com',
  password: 'password'
})
```

## API Key Plugin

Allow API key authentication for programmatic access.

### Installation

```ts
import { apiKey } from 'better-auth/plugins'

betterAuthPlugin({
  betterAuthOptions: {
    plugins: [apiKey()]
  }
})
```

### Usage

**Create an API key:**

```ts
const { data } = await authClient.apiKey.create({
  name: 'Production API Key',
  expiresAt: new Date('2025-12-31') // Optional
})
// data.key is the API key (shown only once)
```

**Authenticate with API key:**

```ts
// Include in request header
fetch('/api/data', {
  headers: {
    'x-api-key': 'your-api-key'
  }
})
```

**List keys:**

```ts
const { data: keys } = await authClient.apiKey.list()
```

**Revoke a key:**

```ts
await authClient.apiKey.delete({
  id: 'key-id'
})
```

## Phone Number Plugin

Add phone number authentication with OTP.

### Installation

```ts
import { phoneNumber } from 'better-auth/plugins'

betterAuthPlugin({
  betterAuthOptions: {
    plugins: [
      phoneNumber({
        async sendOTP({ phoneNumber, code }) {
          // Send SMS with Twilio, etc.
          await twilioClient.messages.create({
            to: phoneNumber,
            body: `Your code is: ${code}`
          })
        }
      })
    ]
  }
})
```

### Usage

**Send OTP:**

```ts
await authClient.phoneNumber.sendOTP({
  phoneNumber: '+1234567890'
})
```

**Verify OTP:**

```ts
await authClient.phoneNumber.verify({
  phoneNumber: '+1234567890',
  code: '123456'
})
```

## Multi-Session Plugin

Allow users to have multiple concurrent sessions.

### Installation

```ts
import { multiSession } from 'better-auth/plugins'

betterAuthPlugin({
  betterAuthOptions: {
    plugins: [multiSession()]
  }
})
```

### Usage

**List sessions:**

```ts
const { data: sessions } = await authClient.multiSession.listSessions()
```

**Revoke a session:**

```ts
await authClient.multiSession.revokeSession({
  sessionId: 'session-id'
})
```

**Revoke all other sessions:**

```ts
await authClient.multiSession.revokeOtherSessions()
```

## Combining Plugins

You can use multiple plugins together:

```ts
import {
  organization,
  twoFactor,
  passkey,
  admin,
  username,
  multiSession
} from 'better-auth/plugins'
import { passkey as passkeyPlugin } from 'better-auth/plugins/passkey'

betterAuthPlugin({
  betterAuthOptions: {
    plugins: [
      organization({ teams: { enabled: true } }),
      twoFactor({ issuer: 'My App' }),
      passkeyPlugin({
        rpID: 'localhost',
        rpName: 'My App',
        origin: 'http://localhost:3000'
      }),
      admin(),
      username(),
      multiSession()
    ]
  }
})
```

Remember to add corresponding client plugins:

```ts
import {
  organizationClient,
  twoFactorClient,
  passkeyClient,
  adminClient,
  multiSessionClient
} from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL,
  plugins: [
    organizationClient(),
    twoFactorClient(),
    passkeyClient(),
    adminClient(),
    multiSessionClient()
  ]
})
```
