# Admin Features

This guide covers the Payload admin panel features provided by payload-auth, including custom login views, impersonation, and UI components.

## Admin Authentication Modes

### Default Mode (Dual Auth)

By default, payload-auth keeps Payload's built-in authentication working alongside Better Auth:

- **Admin Panel**: Uses Payload's native authentication
- **Frontend**: Uses Better Auth
- **Passwords**: Synced between both systems automatically

This mode is useful when you want to maintain Payload's admin UX while using Better Auth for your frontend.

### Better Auth Mode

Set `disableDefaultPayloadAuth: true` to use Better Auth for everything:

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
- Social provider login for admins
- Two-factor authentication in admin
- Passkey login for admin
- Better session management

## Custom Admin Views

When `disableDefaultPayloadAuth: true`, these custom views replace Payload's defaults:

### Login View

Located at `/admin/login`, provides:
- Email/password form
- Social provider buttons (based on `loginMethods`)
- Passkey login button
- Forgot password link

### Create First Admin View

Located at `/admin/create-first-user`, shown when no admin users exist:
- Sign up form for the first admin
- Assigns the `defaultAdminRole` automatically

### Forgot Password View

Located at `/admin/forgot-password`:
- Email input to request password reset
- Sends reset link via configured email handler

### Reset Password View

Located at `/admin/reset-password`:
- Password reset form
- Validates token from email link

### Two-Factor Verify View

Located at `/admin/two-factor-verify`:
- TOTP code input
- Shown after sign in when 2FA is enabled

## Login Methods

Configure which authentication methods appear on the admin login page:

```ts
betterAuthPlugin({
  disableDefaultPayloadAuth: true,
  admin: {
    loginMethods: ['email', 'google', 'github', 'passkey']
  }
})
```

### Available Methods

| Method | Description | Requirements |
|--------|-------------|--------------|
| `email` | Email and password | `emailAndPassword.enabled: true` |
| `google` | Google OAuth | Google social provider configured |
| `github` | GitHub OAuth | GitHub social provider configured |
| `discord` | Discord OAuth | Discord social provider configured |
| `twitter` | Twitter OAuth | Twitter social provider configured |
| `apple` | Apple OAuth | Apple social provider configured |
| `microsoft` | Microsoft OAuth | Microsoft social provider configured |
| `passkey` | WebAuthn passkey | `passkey()` plugin enabled |
| `magic-link` | Magic link email | `magicLink()` plugin enabled |

## Admin UI Components

### Invite Button

Appears in the users collection list view. Allows admins to invite new users:

1. Click "Invite User" button
2. Enter email and select role
3. Generate or send invitation

```ts
// The component is automatically added, but you can customize roles:
betterAuthPlugin({
  users: {
    roles: ['user', 'editor', 'admin'],
    adminRoles: ['admin']
  }
})
```

### Impersonate Button

When the `admin()` plugin is enabled, an "Impersonate" button appears in user edit views:

1. Navigate to a user in the admin panel
2. Click "Impersonate User"
3. You're now logged in as that user
4. A banner shows you're impersonating
5. Click "Stop Impersonating" to return

```ts
import { admin } from 'better-auth/plugins'

betterAuthPlugin({
  betterAuthOptions: {
    plugins: [admin()]
  }
})
```

### Two-Factor Auth Toggle

When the `twoFactor()` plugin is enabled, a 2FA toggle field appears in user edit views:

- Shows current 2FA status
- Allows enabling/disabling 2FA
- Provides QR code for authenticator setup

```ts
import { twoFactor } from 'better-auth/plugins'

betterAuthPlugin({
  betterAuthOptions: {
    plugins: [
      twoFactor({
        issuer: 'My Application'
      })
    ]
  }
})
```

### Passkey Manager

When the `passkey()` plugin is enabled, a passkey management field appears in user edit views:

- Lists registered passkeys
- Shows passkey names and registration dates
- Allows deleting passkeys

```ts
import { passkey } from 'better-auth/plugins/passkey'

betterAuthPlugin({
  betterAuthOptions: {
    plugins: [
      passkey({
        rpID: 'localhost',
        rpName: 'My Application',
        origin: process.env.NEXT_PUBLIC_SERVER_URL
      })
    ]
  }
})
```

## Admin Invitations

The admin invitation system allows existing admins to invite new users:

### Configuration

```ts
betterAuthPlugin({
  adminInvitations: {
    slug: 'admin-invitations',

    // Custom URL generator
    generateInviteUrl: ({ payload, token }) => {
      return `${process.env.NEXT_PUBLIC_SERVER_URL}/admin/accept-invite?token=${token}`
    },

    // Email sender
    sendInviteEmail: async ({ payload, email, url }) => {
      await payload.sendEmail({
        to: email,
        subject: 'You\'ve been invited to join as an admin',
        html: `
          <h1>Admin Invitation</h1>
          <p>You've been invited to join the team.</p>
          <a href="${url}">Accept Invitation</a>
        `
      })
      return { success: true }
    }
  }
})
```

### Invitation Flow

1. Admin clicks "Invite User" in user list
2. Enters email and selects role
3. System creates invitation record
4. Invitation email is sent
5. New user clicks link and completes sign up
6. User is created with assigned role

### Invite-Only Sign Up

To require invitations for all sign ups:

```ts
betterAuthPlugin({
  requireAdminInviteForSignUp: true
})
```

This:
- Blocks public sign ups (email/password and social)
- Only allows sign ups with valid invitation token
- Existing users can still sign in
- Admins can still create users via Payload UI

## Role-Based Admin Access

### Configuring Admin Roles

```ts
betterAuthPlugin({
  users: {
    roles: ['user', 'editor', 'moderator', 'admin', 'super-admin'],
    adminRoles: ['moderator', 'admin', 'super-admin']
  }
})
```

Users with any role in `adminRoles` can:
- Access the Payload admin panel
- Manage auth collections (based on access rules)

### Access Control

The plugin sets up access control automatically:

**Admin-only operations:**
- Creating users
- Managing sessions
- Viewing verifications

**Self + Admin operations:**
- Reading own profile
- Updating allowed fields on own profile
- Deleting own account

### Custom Access Rules

Override access in collection overrides:

```ts
betterAuthPlugin({
  users: {
    collectionOverrides: ({ collection }) => ({
      ...collection,
      access: {
        ...collection.access,
        // Only super-admins can delete users
        delete: ({ req }) => {
          return req.user?.role?.includes('super-admin') ?? false
        }
      }
    })
  }
})
```

## Session Management in Admin

### Viewing Sessions

The sessions collection shows all active sessions:
- User reference
- IP address and user agent
- Expiration time
- Whether it's an impersonation session
- Active organization (if applicable)

### Ending Sessions

Admins can delete session records to force logout:
1. Navigate to Sessions collection
2. Find the session to end
3. Delete the record

## Impersonation

### How It Works

1. Admin initiates impersonation from user edit view
2. Better Auth creates a new session with `impersonatedBy` set
3. Original admin session is preserved
4. Admin sees the app as the impersonated user
5. Session shows impersonation status
6. Admin can stop impersonating to return to their session

### API Access

```ts
// Server-side check for impersonation
const session = await payload.betterAuth.api.getSession({ headers })

if (session?.session.impersonatedBy) {
  console.log('This session is impersonated by:', session.session.impersonatedBy)
}
```

### Client-Side

```tsx
function ImpersonationBanner() {
  const { data: session } = authClient.useSession()

  if (!session?.session.impersonatedBy) {
    return null
  }

  return (
    <div className="impersonation-banner">
      You are currently impersonating this user.
      <button onClick={() => authClient.admin.stopImpersonating()}>
        Stop Impersonating
      </button>
    </div>
  )
}
```

## Customizing Admin Components

### Collection Admin Config

```ts
betterAuthPlugin({
  users: {
    collectionOverrides: ({ collection }) => ({
      ...collection,
      admin: {
        ...collection.admin,
        // Custom columns in list view
        defaultColumns: ['email', 'name', 'role', 'emailVerified', 'createdAt'],
        // Enable list search
        listSearchableFields: ['email', 'name'],
        // Custom description
        description: 'Manage application users'
      }
    })
  }
})
```

### Hiding Collections

Hide auth collections from non-admin users:

```ts
betterAuthPlugin({
  hidePluginCollections: true, // Hide plugin collections (org, members, etc.)
  sessions: { hidden: true },
  verifications: { hidden: true },
  accounts: { hidden: true }
})
```

### Admin Group

Group auth collections together:

```ts
betterAuthPlugin({
  collectionAdminGroup: 'Authentication' // Default: 'Auth'
})
```

## Debugging

Enable debug mode to see auth operations:

```ts
betterAuthPlugin({
  debug: {
    enableDebugLogs: true,
    logTables: true // Log schema on startup
  }
})
```

Logs include:
- Session validation
- Login attempts
- Token operations
- Database queries
