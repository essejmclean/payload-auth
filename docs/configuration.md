# Configuration

This guide covers all configuration options available in the payload-auth plugin.

## Plugin Options

The `betterAuthPlugin` function accepts a `BetterAuthPluginOptions` object:

```ts
betterAuthPlugin({
  // Plugin-level options
  disabled?: boolean
  disableDefaultPayloadAuth?: boolean
  hidePluginCollections?: boolean
  collectionAdminGroup?: string
  requireAdminInviteForSignUp?: boolean
  debug?: { enableDebugLogs?: boolean, logTables?: boolean }

  // Better Auth configuration
  betterAuthOptions?: BetterAuthOptions

  // Collection configurations
  users?: UsersCollectionOptions
  accounts?: AccountsCollectionOptions
  sessions?: SessionsCollectionOptions
  verifications?: VerificationsCollectionOptions
  adminInvitations?: AdminInvitationsCollectionOptions

  // Admin panel options
  admin?: { loginMethods?: LoginMethod[] }

  // Plugin collection overrides
  pluginCollectionOverrides?: PluginCollectionOverrides
})
```

## Core Options

### `disabled`

Completely disable the plugin. The Payload config will remain unmodified.

```ts
betterAuthPlugin({
  disabled: process.env.NODE_ENV === 'test'
})
```

### `disableDefaultPayloadAuth`

Replace Payload's built-in admin authentication with Better Auth.

When enabled:
- Custom login/signup views are used in the admin panel
- Better Auth handles all authentication flows
- Social provider buttons can be shown on login
- Two-factor authentication works in the admin

```ts
betterAuthPlugin({
  disableDefaultPayloadAuth: true,
  admin: {
    loginMethods: ['email', 'google'] // Show these on admin login
  }
})
```

**Default:** `false`

### `hidePluginCollections`

Hide collections created by Better Auth plugins (organizations, members, etc.) from the admin UI.

```ts
betterAuthPlugin({
  hidePluginCollections: true
})
```

**Default:** `false`

### `collectionAdminGroup`

Set the admin panel group name for auth collections.

```ts
betterAuthPlugin({
  collectionAdminGroup: 'Authentication' // Instead of default "Auth"
})
```

**Default:** `"Auth"`

### `requireAdminInviteForSignUp`

Require a valid admin invitation for any public sign-up. Useful for private applications.

- Applies to email/password and social provider flows
- Existing users can still sign in
- Admins can create users via Payload UI

```ts
betterAuthPlugin({
  requireAdminInviteForSignUp: true
})
```

**Default:** `false`

### `debug`

Enable debugging features:

```ts
betterAuthPlugin({
  debug: {
    enableDebugLogs: true,  // Log auth operations
    logTables: true         // Log table schemas on init
  }
})
```

## Better Auth Options

The `betterAuthOptions` object configures Better Auth itself. Most options from Better Auth are supported, except those managed internally by the plugin.

### Basic Options

```ts
betterAuthPlugin({
  betterAuthOptions: {
    // App name shown in emails and 2FA apps
    appName: 'My App',

    // Base URL for your application
    baseURL: process.env.NEXT_PUBLIC_SERVER_URL,

    // API base path (default: /api/auth)
    basePath: '/api/auth',

    // Origins allowed to make auth requests
    trustedOrigins: ['https://myapp.com']
  }
})
```

### Email and Password

```ts
betterAuthPlugin({
  betterAuthOptions: {
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,

      // Send password reset emails
      async sendResetPassword({ user, url }) {
        await sendEmail({
          to: user.email,
          subject: 'Reset your password',
          html: `<a href="${url}">Reset Password</a>`
        })
      }
    }
  }
})
```

### Email Verification

```ts
betterAuthPlugin({
  betterAuthOptions: {
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

### Social Providers

```ts
betterAuthPlugin({
  betterAuthOptions: {
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!
      },
      discord: {
        clientId: process.env.DISCORD_CLIENT_ID!,
        clientSecret: process.env.DISCORD_CLIENT_SECRET!
      }
    }
  }
})
```

### Session Configuration

```ts
betterAuthPlugin({
  betterAuthOptions: {
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60 // Cache for 5 minutes
      },
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24      // Update session daily
    }
  }
})
```

### Account Linking

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

### User Deletion

```ts
betterAuthPlugin({
  betterAuthOptions: {
    user: {
      deleteUser: {
        enabled: true,
        async sendDeleteAccountVerification({ user, url, token }) {
          // Send confirmation email
        },
        async beforeDelete(user) {
          // Clean up user data
        },
        async afterDelete(user) {
          // Post-deletion cleanup
        }
      },
      changeEmail: {
        enabled: true,
        async sendChangeEmailVerification({ user, newEmail, url }) {
          // Send verification to new email
        }
      }
    }
  }
})
```

### Better Auth Plugins

Add Better Auth plugins for additional functionality:

```ts
import { organization, twoFactor, passkey, admin } from 'better-auth/plugins'

betterAuthPlugin({
  betterAuthOptions: {
    plugins: [
      organization({
        teams: { enabled: true }
      }),
      twoFactor({
        issuer: 'My App'
      }),
      passkey({
        rpID: 'localhost',
        rpName: 'My App',
        origin: 'http://localhost:3000'
      }),
      admin()
    ]
  }
})
```

See [Plugins](./plugins.md) for detailed plugin documentation.

## Users Collection Options

Configure the users collection:

```ts
betterAuthPlugin({
  users: {
    // Collection slug
    slug: 'users', // default

    // Role configuration
    roles: ['user', 'editor', 'admin'],
    adminRoles: ['admin'],
    defaultRole: 'user',
    defaultAdminRole: 'admin',

    // Fields users can edit on their own profile
    allowedFields: ['name', 'image'],

    // Hide from admin panel
    hidden: false,

    // Don't send Better Auth verification email on signup
    // (use if you're using Payload's verify option instead)
    blockFirstBetterAuthVerificationEmail: false,

    // Customize the collection config
    collectionOverrides: ({ collection }) => ({
      ...collection,
      fields: [
        ...collection.fields,
        {
          name: 'bio',
          type: 'textarea'
        }
      ]
    })
  }
})
```

### Roles

The `roles` array defines available user roles. These become options in the role select field:

```ts
users: {
  roles: ['user', 'editor', 'moderator', 'admin'],
  adminRoles: ['moderator', 'admin'], // These have admin panel access
  defaultRole: 'user',
  defaultAdminRole: 'admin'
}
```

### Allowed Fields

Control which fields users can edit on their own profile:

```ts
users: {
  allowedFields: ['name', 'image', 'bio']
}
```

Password is always allowed. Admin users can edit all fields.

## Accounts Collection Options

```ts
betterAuthPlugin({
  accounts: {
    slug: 'accounts',
    hidden: false,
    collectionOverrides: ({ collection }) => collection
  }
})
```

## Sessions Collection Options

```ts
betterAuthPlugin({
  sessions: {
    slug: 'sessions',
    hidden: false,
    collectionOverrides: ({ collection }) => collection
  }
})
```

## Verifications Collection Options

```ts
betterAuthPlugin({
  verifications: {
    slug: 'verifications',
    hidden: true, // Usually hidden
    collectionOverrides: ({ collection }) => collection
  }
})
```

## Admin Invitations Options

Configure admin user invitation system:

```ts
betterAuthPlugin({
  adminInvitations: {
    slug: 'admin-invitations',
    hidden: false,

    // Custom invite URL generator
    generateInviteUrl: ({ payload, token }) => {
      return `${process.env.NEXT_PUBLIC_SERVER_URL}/admin/accept-invite?token=${token}`
    },

    // Send invitation email
    sendInviteEmail: async ({ payload, email, url }) => {
      await payload.sendEmail({
        to: email,
        subject: 'You\'ve been invited',
        html: `<a href="${url}">Accept Invitation</a>`
      })
      return { success: true }
    }
  }
})
```

## Plugin Collection Overrides

Customize collections created by Better Auth plugins:

```ts
betterAuthPlugin({
  pluginCollectionOverrides: {
    organization: ({ collection }) => ({
      ...collection,
      admin: {
        ...collection.admin,
        description: 'Company accounts'
      }
    }),
    member: ({ collection }) => ({
      ...collection,
      fields: [
        ...collection.fields,
        { name: 'department', type: 'text' }
      ]
    })
  }
})
```

Available keys depend on which Better Auth plugins you've enabled:
- `organization` - Organization collection
- `member` - Organization member collection
- `invitation` - Organization invitation collection
- `team` - Team collection (if teams enabled)
- `passkey` - Passkey collection
- `apiKey` - API key collection

## Admin Panel Options

Configure the admin login experience when `disableDefaultPayloadAuth` is true:

```ts
betterAuthPlugin({
  disableDefaultPayloadAuth: true,
  admin: {
    // Show these login methods on the admin login page
    loginMethods: ['email', 'google', 'github', 'passkey']
  }
})
```

Available login methods:
- `email` - Email and password
- `google`, `github`, `discord`, etc. - Social providers (must be configured)
- `passkey` - Passkey authentication (requires passkey plugin)
- `magic-link` - Magic link authentication (requires magic link plugin)

## Full Example

```ts
import { buildConfig } from 'payload'
import { betterAuthPlugin } from 'payload-auth/better-auth'
import { organization, twoFactor, passkey, admin } from 'better-auth/plugins'

export default buildConfig({
  // ... other config
  plugins: [
    betterAuthPlugin({
      disableDefaultPayloadAuth: true,
      collectionAdminGroup: 'Authentication',

      betterAuthOptions: {
        appName: 'My Application',
        baseURL: process.env.NEXT_PUBLIC_SERVER_URL,

        emailAndPassword: {
          enabled: true,
          requireEmailVerification: true,
          async sendResetPassword({ user, url }) {
            // Send email
          }
        },

        emailVerification: {
          sendOnSignUp: true,
          async sendVerificationEmail({ user, url }) {
            // Send email
          }
        },

        socialProviders: {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!
          }
        },

        session: {
          cookieCache: { enabled: true, maxAge: 300 }
        },

        plugins: [
          organization({ teams: { enabled: true } }),
          twoFactor({ issuer: 'My App' }),
          passkey({
            rpID: 'localhost',
            rpName: 'My App',
            origin: process.env.NEXT_PUBLIC_SERVER_URL
          }),
          admin()
        ]
      },

      users: {
        roles: ['user', 'editor', 'admin'],
        adminRoles: ['admin'],
        allowedFields: ['name', 'image']
      },

      admin: {
        loginMethods: ['email', 'google', 'passkey']
      },

      adminInvitations: {
        sendInviteEmail: async ({ email, url }) => {
          // Send invitation
          return { success: true }
        }
      }
    })
  ]
})
```
