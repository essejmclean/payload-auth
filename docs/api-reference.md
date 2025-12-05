# API Reference

This reference documents all exported functions, types, and utilities from the payload-auth package.

## Main Exports

### betterAuthPlugin

Main Payload plugin function for Better Auth integration.

```ts
import { betterAuthPlugin } from 'payload-auth/better-auth'

function betterAuthPlugin(options: BetterAuthPluginOptions): (config: Config) => Config
```

**Parameters:**
- `options` - Plugin configuration (see [Configuration](./configuration.md))

**Returns:**
- A Payload config modifier function

**Example:**
```ts
export default buildConfig({
  plugins: [
    betterAuthPlugin({
      betterAuthOptions: {
        emailAndPassword: { enabled: true }
      }
    })
  ]
})
```

### withPayloadAuth

Creates Better Auth options with the Payload adapter pre-configured.

```ts
import { withPayloadAuth } from 'payload-auth/better-auth'

function withPayloadAuth(params: {
  payloadConfig: SanitizedConfig
}): BetterAuthOptions
```

**Parameters:**
- `payloadConfig` - The sanitized Payload configuration

**Returns:**
- Better Auth options with database adapter configured

**Example:**
```ts
import { betterAuth } from 'better-auth'
import { withPayloadAuth } from 'payload-auth/better-auth'
import payloadConfig from '@payload-config'

export const auth = betterAuth(withPayloadAuth({ payloadConfig }))
```

### getPayloadAuth

Gets the Better Auth instance from a Payload config.

```ts
import { getPayloadAuth } from 'payload-auth/better-auth'

async function getPayloadAuth(
  config: Config | SanitizedConfig
): Promise<{
  betterAuth: BetterAuthReturn
  findByID: (args: { collection: string; id: string }) => Promise<any>
}>
```

**Parameters:**
- `config` - Payload config object

**Returns:**
- Object with `betterAuth` instance and helper methods

**Example:**
```ts
const payloadAuth = await getPayloadAuth(payload.config)
const session = await payloadAuth.betterAuth.api.getSession({ headers })
```

## Type Exports

### BetterAuthPluginOptions

Main configuration interface for the plugin.

```ts
interface BetterAuthPluginOptions {
  disabled?: boolean
  disableDefaultPayloadAuth?: boolean
  hidePluginCollections?: boolean
  collectionAdminGroup?: string
  requireAdminInviteForSignUp?: boolean
  debug?: {
    enableDebugLogs?: boolean
    logTables?: boolean
  }
  betterAuthOptions?: BetterAuthOptions
  users?: UsersCollectionOptions
  accounts?: CollectionOptions
  sessions?: CollectionOptions
  verifications?: CollectionOptions
  adminInvitations?: AdminInvitationsOptions
  admin?: {
    loginMethods?: LoginMethod[]
  }
  pluginCollectionOverrides?: PluginCollectionOverrides
}
```

### BetterAuthOptions

Better Auth configuration options (subset managed by the plugin).

```ts
interface BetterAuthOptions extends Omit<
  BetterAuthOptionsType,
  'database' | 'user' | 'account' | 'verification' | 'session' | 'advanced'
> {
  user?: Omit<BetterAuthOptionsType['user'], 'modelName' | 'fields'>
  account?: Omit<BetterAuthOptionsType['account'], 'modelName' | 'fields'>
  session?: Omit<BetterAuthOptionsType['session'], 'modelName' | 'fields'>
  verification?: Omit<BetterAuthOptionsType['verification'], 'modelName' | 'fields'>
  advanced?: Omit<BetterAuthOptionsType['advanced'], 'generateId'>
}
```

### BetterAuthReturn

Type of the Better Auth instance attached to Payload.

```ts
type BetterAuthReturn<O extends BetterAuthPluginOptions> = {
  handler: (request: Request) => Promise<Response>
  api: InferAPI<...>
  options: BetterAuthOptions
  $ERROR_CODES: ErrorCodes
  $context: Promise<AuthContext>
  $Infer: {
    Session: {
      session: SessionData
      user: UserData
    }
  }
}
```

**Usage:**
```ts
const payload = await getPayload({ config })

// payload.betterAuth is typed as BetterAuthReturn
const session = await payload.betterAuth.api.getSession({ headers })
```

### PayloadRequestWithBetterAuth

Extended PayloadRequest type with typed Better Auth access.

```ts
interface PayloadRequestWithBetterAuth<O extends BetterAuthPluginOptions>
  extends PayloadRequest {
  payload: BasePayload & {
    betterAuth: BetterAuthReturn<O>
  }
}
```

**Usage in hooks:**
```ts
const myHook: CollectionBeforeChangeHook = async ({ req }) => {
  // Cast to typed request
  const typedReq = req as PayloadRequestWithBetterAuth<typeof pluginOptions>
  const session = await typedReq.payload.betterAuth.api.getSession({
    headers: req.headers
  })
}
```

### CollectionHookWithBetterAuth

Utility type for typed collection hooks.

```ts
type CollectionHookWithBetterAuth<
  O extends BetterAuthPluginOptions,
  T extends (args: any) => any
> = /* ... */
```

**Usage:**
```ts
const beforeChange: CollectionHookWithBetterAuth<
  typeof pluginOptions,
  CollectionBeforeChangeHook
> = async ({ req, data }) => {
  // req.payload.betterAuth is fully typed
  return data
}
```

### EndpointWithBetterAuth

Utility type for typed custom endpoints.

```ts
type EndpointWithBetterAuth<O extends BetterAuthPluginOptions> = Omit<Endpoint, 'handler'> & {
  handler: (req: PayloadRequestWithBetterAuth<O>) => Promise<Response> | Response
}
```

**Usage:**
```ts
const myEndpoint: EndpointWithBetterAuth<typeof pluginOptions> = {
  path: '/custom',
  method: 'get',
  handler: async (req) => {
    const session = await req.payload.betterAuth.api.getSession({
      headers: req.headers
    })
    return Response.json({ user: session?.user })
  }
}
```

### LoginMethod

Available admin login methods.

```ts
type LoginMethod =
  | 'email'
  | 'google'
  | 'github'
  | 'discord'
  | 'twitter'
  | 'apple'
  | 'microsoft'
  | 'passkey'
  | 'magic-link'
```

### SocialProvider

Available social authentication providers.

```ts
type SocialProvider =
  | 'google'
  | 'github'
  | 'discord'
  | 'twitter'
  | 'apple'
  | 'microsoft'
  | 'facebook'
  | 'linkedin'
  | 'spotify'
  | 'twitch'
  // ... and more
```

## Helper Functions

### checkPluginExists

Check if a Better Auth plugin is enabled.

```ts
import { checkPluginExists } from 'payload-auth/better-auth'

function checkPluginExists(
  options: BetterAuthOptions,
  pluginId: string
): boolean
```

**Example:**
```ts
if (checkPluginExists(options, 'organization')) {
  // Organization plugin is enabled
}
```

### getDefaultCollectionSlug

Get the Payload collection slug for a Better Auth model.

```ts
import { getDefaultCollectionSlug } from 'payload-auth/better-auth'

function getDefaultCollectionSlug(params: {
  modelKey: string
  pluginOptions: BetterAuthPluginOptions
}): string
```

**Example:**
```ts
const userSlug = getDefaultCollectionSlug({
  modelKey: 'user',
  pluginOptions
}) // 'users' or custom slug
```

### getAllRoleOptions

Get all role options for select fields.

```ts
import { getAllRoleOptions } from 'payload-auth/better-auth'

function getAllRoleOptions(
  pluginOptions: BetterAuthPluginOptions
): Array<{ label: string; value: string }>
```

**Example:**
```ts
const roles = getAllRoleOptions(pluginOptions)
// [{ label: 'User', value: 'user' }, { label: 'Admin', value: 'admin' }]
```

### getAdminAccess

Get admin-only access control config.

```ts
import { getAdminAccess } from 'payload-auth/better-auth'

function getAdminAccess(
  pluginOptions: BetterAuthPluginOptions
): CollectionConfig['access']
```

## Adapter Exports

### payloadAdapter

Create a Better Auth database adapter using Payload.

```ts
import { payloadAdapter } from 'payload-auth/better-auth/adapter'

function payloadAdapter(options: {
  payloadClient: () => Promise<Payload>
  adapterConfig?: {
    enableDebugLogs?: boolean
    idType?: 'number' | 'uuid' | 'text'
  }
}): BetterAuthAdapter
```

**Example:**
```ts
import { betterAuth } from 'better-auth'
import { payloadAdapter } from 'payload-auth/better-auth/adapter'
import { getPayload } from 'payload'
import config from '@payload-config'

const auth = betterAuth({
  database: payloadAdapter({
    payloadClient: () => getPayload({ config }),
    adapterConfig: {
      idType: 'uuid'
    }
  })
})
```

## Constants

### Model Keys

```ts
const baModelKey = {
  user: 'user',
  session: 'session',
  account: 'account',
  verification: 'verification',
  organization: 'organization',
  member: 'member',
  invitation: 'invitation',
  team: 'team',
  passkey: 'passkey',
  apiKey: 'apiKey',
  // ... more
}
```

### Default Slugs

```ts
const baseSlugs = {
  users: 'users',
  sessions: 'sessions',
  accounts: 'accounts',
  verifications: 'verifications',
  adminInvitations: 'admin-invitations',
  organizations: 'organizations',
  members: 'members',
  invitations: 'invitations',
  teams: 'teams',
  passkeys: 'passkeys',
  apiKeys: 'api-keys'
}
```

### Supported Plugin IDs

```ts
const supportedBAPluginIds = {
  organization: 'organization',
  twoFactor: 'two-factor',
  passkey: 'passkey',
  admin: 'admin',
  username: 'username',
  magicLink: 'magic-link',
  emailOTP: 'email-otp',
  phoneNumber: 'phone-number',
  anonymous: 'anonymous',
  apiKey: 'api-key',
  multiSession: 'multi-session',
  openAPI: 'open-api'
}
```

## Runtime API

Once initialized, Better Auth is available on the Payload instance:

### payload.betterAuth.handler

Handle Better Auth API requests.

```ts
// app/api/auth/[...all]/route.ts
const handler = async (request: Request) => {
  const payload = await getPayload({ config })
  return payload.betterAuth.handler(request)
}

export { handler as GET, handler as POST }
```

### payload.betterAuth.api

Server-side API methods.

```ts
// Get session
const session = await payload.betterAuth.api.getSession({
  headers: request.headers
})

// Sign out
await payload.betterAuth.api.signOut({
  headers: request.headers
})
```

### payload.betterAuth.$Infer

Type inference helpers.

```ts
// Get session type
type Session = typeof payload.betterAuth.$Infer.Session

// Use in components
function Profile({ session }: { session: Session }) {
  return <div>{session.user.name}</div>
}
```

### payload.betterAuth.$ERROR_CODES

Available error codes.

```ts
const { $ERROR_CODES } = payload.betterAuth

// Check for specific errors
if (error.code === $ERROR_CODES.INVALID_EMAIL_OR_PASSWORD) {
  // Handle invalid credentials
}
```

## Error Codes

Common error codes returned by Better Auth:

```ts
const ERROR_CODES = {
  // Authentication
  INVALID_EMAIL_OR_PASSWORD: 'INVALID_EMAIL_OR_PASSWORD',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_BANNED: 'USER_BANNED',

  // Two-factor
  TWO_FACTOR_REQUIRED: 'TWO_FACTOR_REQUIRED',
  INVALID_TWO_FACTOR_CODE: 'INVALID_TWO_FACTOR_CODE',

  // Sessions
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_SESSION: 'INVALID_SESSION',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Validation
  INVALID_EMAIL: 'INVALID_EMAIL',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',

  // Organization
  ORGANIZATION_NOT_FOUND: 'ORGANIZATION_NOT_FOUND',
  MEMBER_NOT_FOUND: 'MEMBER_NOT_FOUND',
  INVITATION_EXPIRED: 'INVITATION_EXPIRED'
}
```
