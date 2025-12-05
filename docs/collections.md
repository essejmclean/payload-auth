# Collections

The payload-auth plugin automatically creates and manages Payload collections for Better Auth's data models. This guide explains each collection and how to customize them.

## How Collections are Built

When the plugin initializes:

1. **Schema Generation** - Better Auth generates schemas for all auth tables based on enabled plugins
2. **Field Transformation** - Schemas are converted to Payload field configurations
3. **Collection Building** - Full Payload collections are created with access control, hooks, and admin config
4. **Synchronization** - Field names are mapped between Better Auth and Payload conventions

## Core Collections

These collections are always created:

### Users

Stores user accounts with authentication data.

**Default slug:** `users`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `email` | text | User's email address (unique) |
| `emailVerified` | boolean | Whether email is verified |
| `name` | text | Display name |
| `image` | text | Profile image URL |
| `role` | select (multi) | User roles |
| `createdAt` | date | Account creation time |
| `updatedAt` | date | Last update time |

With plugins, additional fields may be added (e.g., `twoFactorEnabled`, `username`, `banned`).

**Access Control:**
- `admin` - Users with admin roles
- `read` - Admins read all, users read own
- `create` - Admin only
- `update` - Admins update all, users update allowed fields on own
- `delete` - Admins delete all, users delete own

**Custom Endpoints:**
- `POST /refresh-token` - Refresh session token
- `POST /set-admin-role` - Set user role (admin only)
- `POST /generate-invite-url` - Generate admin invitation
- `POST /send-invite` - Send invitation email

### Sessions

Tracks active authentication sessions.

**Default slug:** `sessions`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `token` | text | Unique session token |
| `userId` | relationship | Reference to user |
| `expiresAt` | date | Session expiration |
| `ipAddress` | text | Client IP address |
| `userAgent` | text | Browser/client info |

With plugins:
- `impersonatedBy` - Admin who is impersonating (admin plugin)
- `activeOrganization` - Current organization (organization plugin)
- `activeTeam` - Current team (organization plugin)

**Access Control:** Admin only

### Accounts

Stores authentication provider connections.

**Default slug:** `accounts`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `userId` | relationship | Reference to user |
| `accountId` | text | Provider's account ID |
| `providerId` | text | Provider name (e.g., `credential`, `google`) |
| `accessToken` | text | OAuth access token |
| `refreshToken` | text | OAuth refresh token |
| `password` | text | Hashed password (credential provider) |
| `accessTokenExpiresAt` | date | Token expiration |

A user can have multiple accounts (e.g., one for email/password, one for Google).

**Access Control:**
- `create`, `update`, `delete` - Admin only
- `read` - Admins read all, users read own accounts

### Verifications

Stores verification tokens for email verification, password reset, etc.

**Default slug:** `verifications`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `identifier` | text | What's being verified (email) |
| `value` | text | Token value |
| `expiresAt` | date | Token expiration |

**Access Control:** Admin only

Usually hidden from admin panel as it's managed automatically.

## Plugin Collections

These collections are created when specific Better Auth plugins are enabled:

### Organizations

Created by the `organization()` plugin.

**Default slug:** `organizations`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `name` | text | Organization name |
| `slug` | text | URL-safe identifier |
| `logo` | text | Logo URL |
| `metadata` | json | Custom metadata |
| `createdAt` | date | Creation time |

**Access Control:**
- Admin or organization owner/admin

### Members

Created by the `organization()` plugin.

**Default slug:** `members`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `userId` | relationship | Reference to user |
| `organizationId` | relationship | Reference to organization |
| `role` | text | Role within organization |
| `createdAt` | date | When user joined |

### Invitations

Created by the `organization()` plugin.

**Default slug:** `invitations`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `email` | text | Invitee's email |
| `organizationId` | relationship | Target organization |
| `role` | text | Role to assign |
| `status` | text | pending, accepted, rejected |
| `expiresAt` | date | Invitation expiration |
| `inviterId` | relationship | Who sent the invite |

### Teams

Created by `organization({ teams: { enabled: true } })`.

**Default slug:** `teams`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `name` | text | Team name |
| `organizationId` | relationship | Parent organization |
| `createdAt` | date | Creation time |

### Passkeys

Created by the `passkey()` plugin.

**Default slug:** `passkeys`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `name` | text | Passkey name (e.g., "MacBook Pro") |
| `userId` | relationship | Owner |
| `publicKey` | text | WebAuthn public key |
| `credentialID` | text | Credential identifier |
| `counter` | number | Authentication counter |
| `deviceType` | text | Device type |
| `createdAt` | date | Registration time |

### API Keys

Created by the `apiKey()` plugin.

**Default slug:** `api-keys`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `name` | text | Key name/description |
| `userId` | relationship | Owner |
| `key` | text | The API key (shown once) |
| `expiresAt` | date | Optional expiration |
| `lastUsed` | date | Last usage time |

### Admin Invitations

Always created for the admin invitation system.

**Default slug:** `admin-invitations`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `email` | text | Invitee's email |
| `token` | text | Invitation token |
| `role` | text | Role to assign |
| `expiresAt` | date | Invitation expiration |
| `usedAt` | date | When accepted |

## Customizing Collections

### Using collectionOverrides

Each collection type has a `collectionOverrides` option:

```ts
betterAuthPlugin({
  users: {
    collectionOverrides: ({ collection }) => ({
      ...collection,
      // Add custom fields
      fields: [
        ...collection.fields,
        {
          name: 'bio',
          type: 'textarea',
          admin: {
            description: 'User biography'
          }
        },
        {
          name: 'website',
          type: 'text'
        }
      ],
      // Customize admin
      admin: {
        ...collection.admin,
        defaultColumns: ['email', 'name', 'role', 'createdAt']
      }
    })
  },

  sessions: {
    collectionOverrides: ({ collection }) => ({
      ...collection,
      admin: {
        ...collection.admin,
        hidden: true // Hide from admin panel
      }
    })
  }
})
```

### Using pluginCollectionOverrides

For collections created by Better Auth plugins:

```ts
betterAuthPlugin({
  pluginCollectionOverrides: {
    organization: ({ collection }) => ({
      ...collection,
      fields: [
        ...collection.fields,
        {
          name: 'industry',
          type: 'select',
          options: ['tech', 'finance', 'healthcare', 'other']
        }
      ]
    }),

    member: ({ collection }) => ({
      ...collection,
      fields: [
        ...collection.fields,
        {
          name: 'title',
          type: 'text',
          admin: { description: 'Job title' }
        }
      ]
    })
  }
})
```

### Adding Fields via Better Auth additionalFields

Better Auth plugins support `additionalFields` in their schema configuration. These fields are automatically transformed into Payload fields:

```ts
import { organization } from 'better-auth/plugins'

betterAuthPlugin({
  betterAuthOptions: {
    plugins: [
      organization({
        schema: {
          organization: {
            additionalFields: {
              industry: {
                type: 'string',
                required: false,
                input: true // Allow in create/update
              },
              maxSeats: {
                type: 'number',
                required: false,
                input: true
              },
              website: {
                type: 'string',
                required: false,
                input: true
              }
            }
          }
        }
      })
    ]
  }
})
```

After adding fields, run a migration:

```bash
pnpm payload migrate:create
pnpm payload migrate
```

## Changing Collection Slugs

You can customize slugs for any collection:

```ts
betterAuthPlugin({
  users: {
    slug: 'members'        // Instead of 'users'
  },
  accounts: {
    slug: 'auth-accounts'  // Instead of 'accounts'
  },
  sessions: {
    slug: 'auth-sessions'  // Instead of 'sessions'
  },
  verifications: {
    slug: 'auth-tokens'    // Instead of 'verifications'
  },
  adminInvitations: {
    slug: 'invites'        // Instead of 'admin-invitations'
  }
})
```

## Access Control

### Default Access Patterns

The plugin uses these access patterns:

**Admin-only collections** (sessions, verifications):
```ts
{
  create: isAdminWithRoles({ adminRoles }),
  read: isAdminWithRoles({ adminRoles }),
  update: isAdminWithRoles({ adminRoles }),
  delete: isAdminWithRoles({ adminRoles })
}
```

**User-accessible collections** (users, accounts):
```ts
{
  create: isAdminWithRoles({ adminRoles }),
  read: isAdminOrCurrentUserWithRoles({ adminRoles, idField: 'userId' }),
  update: isAdminOrCurrentUserUpdateWithAllowedFields({ adminRoles, allowedFields }),
  delete: isAdminOrCurrentUserWithRoles({ adminRoles, idField: 'id' })
}
```

### Customizing Access

Override access in collection overrides:

```ts
betterAuthPlugin({
  users: {
    collectionOverrides: ({ collection }) => ({
      ...collection,
      access: {
        ...collection.access,
        // Allow public read of basic info
        read: ({ req }) => {
          if (!req.user) {
            return {
              // Only allow reading these fields for public
              email: { equals: undefined } // This effectively limits results
            }
          }
          // Admins and authenticated users get full access
          return true
        }
      }
    })
  }
})
```

## Hooks

### Built-in Hooks

The plugin adds these hooks automatically:

**Users Collection:**
- `beforeChange` - Syncs email verification status
- `afterChange` - Syncs password changes to accounts
- `beforeLogin` - Validates login (when Payload auth enabled)
- `afterLogin` - Creates Better Auth session
- `afterLogout` - Invalidates Better Auth session
- `beforeDelete` - Cleans up related data

**Accounts Collection:**
- `afterChange` - Syncs password changes to user (when Payload auth enabled)

### Adding Custom Hooks

```ts
betterAuthPlugin({
  users: {
    collectionOverrides: ({ collection }) => ({
      ...collection,
      hooks: {
        ...collection.hooks,
        beforeChange: [
          ...(collection.hooks?.beforeChange ?? []),
          async ({ data, req, operation }) => {
            if (operation === 'create') {
              // Custom logic on user creation
              console.log('New user:', data.email)
            }
            return data
          }
        ],
        afterChange: [
          ...(collection.hooks?.afterChange ?? []),
          async ({ doc, operation }) => {
            if (operation === 'create') {
              // Send welcome email, etc.
            }
          }
        ]
      }
    })
  }
})
```

## Field Mappings

Better Auth field names are mapped to Payload conventions:

| Better Auth | Payload |
|-------------|---------|
| `userId` | `userId` (relationship field) |
| `expiresAt` | `expiresAt` (date field) |
| `createdAt` | `createdAt` (date field) |
| `updatedAt` | `updatedAt` (date field) |

The plugin handles snake_case to camelCase conversion and proper field type transformations.

## Database Migrations

When you add fields or change schemas:

1. **Create migration:**
   ```bash
   pnpm payload migrate:create
   ```

2. **Review the generated migration** in your migrations folder

3. **Run migration:**
   ```bash
   pnpm payload migrate
   ```

For new Better Auth plugin fields (like `additionalFields`), the migration will include `ALTER TABLE` statements to add the new columns.
