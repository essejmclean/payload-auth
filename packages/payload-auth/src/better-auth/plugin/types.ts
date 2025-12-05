/**
 * @module plugin/types
 *
 * Type definitions for the Better Auth Payload plugin.
 *
 * This module exports:
 * - {@link BetterAuthPluginOptions} - Main plugin configuration interface
 * - {@link BetterAuthReturn} - Type returned by `payload.betterAuth`
 * - {@link PayloadRequestWithBetterAuth} - Extended PayloadRequest with Better Auth
 * - Various utility types for hooks, endpoints, and schema building
 *
 * @example Basic plugin configuration
 * ```ts
 * import { betterAuthPlugin, BetterAuthPluginOptions } from 'payload-auth/better-auth/plugin'
 *
 * const options: BetterAuthPluginOptions = {
 *   betterAuthOptions: {
 *     emailAndPassword: { enabled: true },
 *     plugins: [organization()]
 *   },
 *   users: {
 *     roles: ['user', 'admin'],
 *     adminRoles: ['admin']
 *   }
 * }
 * ```
 */
import type { AuthContext } from 'better-auth'
import type { DBFieldAttribute } from 'better-auth/db'
import type {
  BetterAuthOptions as BetterAuthOptionsType,
  BetterAuthPlugin as BetterAuthPluginType,
  InferAPI,
  InferPluginTypes
} from 'better-auth/types'
import type { BasePayload, CollectionConfig, Config, Endpoint, Field, Payload, PayloadRequest } from 'payload'
import { ModelKey } from '../generated-types'
import { adminRoutes, baPluginSlugs, loginMethods, socialProviders } from './constants'
import type { InferSession, InferUser } from 'better-auth/types'
import { BASE_ERROR_CODES } from '@better-auth/core/error'
import { router } from 'better-auth/api'
import { defaults } from './constants'

/**
 * BetterAuth options with the following caveats:
 * - The `database` option is removed as it is configured internally
 * - The `user` `modelName` and `fields` is removed as it is configured internally
 * - The `account` `modelName` and `fields` is removed as it is configured internally
 * - The `session` `modelName` and `fields` is removed as it is configured internally
 * - The `verification` `modelName` and `fields` is removed as it is configured internally
 *
 * @see https://www.better-auth.com/docs/reference/options
 */
export interface BetterAuthOptions
  extends Omit<BetterAuthOptionsType, 'database' | 'user' | 'account' | 'verification' | 'session' | 'advanced'> {
  user?: Omit<NonNullable<BetterAuthOptionsType['user']>, 'modelName' | 'fields'> | undefined
  account?: Omit<NonNullable<BetterAuthOptionsType['account']>, 'modelName' | 'fields'> | undefined
  session?: Omit<NonNullable<BetterAuthOptionsType['session']>, 'modelName' | 'fields'> | undefined
  verification?: Omit<NonNullable<BetterAuthOptionsType['verification']>, 'modelName' | 'fields'> | undefined
  advanced?: Omit<NonNullable<BetterAuthOptionsType['advanced']>, 'generateId'> | undefined
}

export interface SanitizedBetterAuthOptions extends Omit<BetterAuthOptionsType, 'database'> {}

export type SocialProvider = (typeof socialProviders)[number]

export type LoginMethod = (typeof loginMethods)[number]

/**
 * Override configuration for plugin-managed collections.
 *
 * Keys correspond to Better Auth plugin collection slugs (e.g., 'organization', 'member', 'team').
 * Each override receives the built collection config and can modify it.
 */
type PluginCollectionOverrides = {
  [K in keyof typeof baPluginSlugs]?: (options: { collection: CollectionConfig }) => CollectionConfig
}

/**
 * Configuration options for the Better Auth Payload plugin.
 *
 * This interface defines all available options for integrating Better Auth with Payload CMS.
 * The plugin handles:
 * - Automatic collection generation for auth tables (users, sessions, accounts, etc.)
 * - Field mapping between Better Auth schemas and Payload fields
 * - Optional replacement of Payload's default admin authentication
 * - Role-based access control for auth collections
 *
 * @example Minimal configuration
 * ```ts
 * betterAuthPlugin({
 *   betterAuthOptions: {
 *     emailAndPassword: { enabled: true }
 *   }
 * })
 * ```
 *
 * @example Full configuration with organizations and custom roles
 * ```ts
 * betterAuthPlugin({
 *   disableDefaultPayloadAuth: true,
 *   hidePluginCollections: true,
 *   collectionAdminGroup: 'Authentication',
 *   betterAuthOptions: {
 *     emailAndPassword: { enabled: true },
 *     socialProviders: {
 *       google: {
 *         clientId: process.env.GOOGLE_CLIENT_ID!,
 *         clientSecret: process.env.GOOGLE_CLIENT_SECRET!
 *       }
 *     },
 *     plugins: [
 *       organization(),
 *       twoFactor()
 *     ]
 *   },
 *   users: {
 *     slug: 'users',
 *     roles: ['user', 'editor', 'admin'],
 *     adminRoles: ['admin'],
 *     defaultRole: 'user',
 *     allowedFields: ['name', 'image']
 *   },
 *   admin: {
 *     loginMethods: ['google', 'email']
 *   }
 * })
 * ```
 */
export interface BetterAuthPluginOptions {
  /**
   * Disable the plugin entirely.
   *
   * When true, the plugin will not modify the Payload config.
   * Useful for conditionally disabling auth in certain environments.
   *
   * @default false
   */
  disabled?: boolean
  /**
   * Disable the default payload auth
   *
   * This will ensure that better-auth handles both admin and frontend auth
   *
   * Admin will make use of custom admin routes for auth and give you more control
   *
   * Note: This will override the option passed in the users collection config
   *
   * Read about this more in the docs
   * @see https://www.payloadauth.com/docs/better-auth#disable-default-payload-auth
   *
   * @default false
   */
  disableDefaultPayloadAuth?: boolean
  /**
   * Custom admin components when disableDefaultPayloadAuth is true
   *
   * These components will be used to render the login, create first admin, and other auth-related views
   */
  admin?: {
    /**
     * Override which social buttons are shown in the Payload Login / Sign Up view.
     *
     * Provide an array of LoginMethod keys.
     */
    loginMethods?: LoginMethod[]
  }
  /**
   * Debug options
   */
  debug?: {
    /**
     * Enable debug logs
     * @default false
     */
    enableDebugLogs?: boolean
    /**
     * Log the tables that are needed for better-auth on init
     * @default false
     */
    logTables?: boolean
  }
  /**
   * Hide the better-authplugin collections from the payload admin UI
   * @default false
   */
  hidePluginCollections?: boolean
  /**
   * Defines the admin group for collections.
   * @default "Auth"
   */
  collectionAdminGroup?: string
  /**
   * Require a valid admin invitation for any *public* sign‑up.
   *
   * – Applies to both email/password and social‑provider flows.
   * – Existing users can still sign in; admins can still create users via
   *   the Payload UI or server‑side calls.
   * – Ignores provider‑level `disableImplicitSignUp` and `disableSignUp`:
   *   with a valid invite the sign‑up proceeds, without one it's blocked.
   * – Also sets `disableImplicitSignUp` for all providers, requiring `requestSignUp` to be true for all `authClient.signIn.social` calls when creating a new account with a provider.
   *
   * Enable when you want OAuth for internal/admin use only and no public
   * registrations at all.
   *
   * @default false
   */
  requireAdminInviteForSignUp?: boolean
  /**
   * BetterAuth options with the following caveats:
   * - The `database` option is removed as it is configured internally
   * - The `user` `modelName` and `fields` is removed as it is configured internally
   * - The `account` `modelName` and `fields` is removed as it is configured internally
   * - The `session` `modelName` and `fields` is removed as it is configured internally
   * - The `verification` `modelName` and `fields` is removed as it is configured internally
   *
   * @see https://www.better-auth.com/docs/reference/options
   */
  betterAuthOptions?: BetterAuthOptions
  /**
   * Override plugin configurations
   *
   * Note: TypeScript cannot enforce that only enabled plugins are configured
   * at compile time, but this will be validated at runtime.
   */
  pluginCollectionOverrides?: PluginCollectionOverrides
  /**
   * Configure the Users collections:
   */
  users?: {
    /**
     * Will set the `modelName` for the `user` table in better-auth
     *
     * and the `slug` for the `users` collection in payload
     *
     * @default 'users'
     */
    slug?: string | undefined
    /**
     * The default role for users
     *
     * This will be used as the default role for the role field in the users collection
     *
     * If you define this you must also have this role in the roles array
     *
     * This will also be used as the defaultRole option in the better-auth admin plugin if present
     * @see https://www.better-auth.com/docs/plugins/admin#default-role
     * @default "user"
     */
    defaultRole?: string
    /**
     * The default role for admins
     *
     * This will be used as the default role for when admins sign up in the create first admin view or when inviting new admins
     *
     *
     * @default "admin"
     */
    defaultAdminRole?: string
    /**
     * All roles for the users collection
     *
     * These will be used to define all the options in the user collection role field
     *
     * Will be merged with the adminRoles array, no need to worry about redefining in adminRoles or duplicates
     *
     * This should match the roles in the better-auth admin plugin if you are using it
     * @see https://www.better-auth.com/docs/plugins/admin#access-control
     *
     * @default ["user"]
     */
    roles?: string[]
    /**
     * Define admin roles for the users collection
     *
     * These roles will be given admin access to all auth collections created by this plugin
     *
     * Note: Will be merged with the roles array, no need to worry about redefining in roles or duplicates
     *
     * Will be also used as the adminRoles option in the better-auth admin plugin if present
     *
     * @see https://www.better-auth.com/docs/plugins/admin#admin-roles
     *
     * @default ["admin"]
     */
    adminRoles?: string[]
    /**
     * Hide the `users` collection from the payload admin UI
     *
     * This will be overwritten if you change the value in the collection overrides option
     */
    hidden?: boolean | undefined
    /**
     * Define which fields users can update themselves
     *
     * Password field is automatically included and doesn't need to be specified here
     *
     * @example ['name', 'dateOfBirth', 'phoneNumber']
     * @default ['name']
     */
    allowedFields?: string[] | undefined
    /**
     * Function to override the collection configuration
     *
     * This allows modifying the collection config after it has been built
     * Example use cases include adding saveToJwt to specific fields or
     * modifying field descriptions
     *
     * @param options Object containing the collection config and potentially additional parameters
     * @returns Modified collection config
     */
    collectionOverrides?: (options: { collection: CollectionConfig }) => CollectionConfig
    /**
     * This will block the first on sign up verification email from better-auth.
     * If you are using Payload's userCollection.verify option, you will want to set this to true.
     * Function that will be blocked: options.emailVerificationsendVerificationEmail
     * @default false
     */
    blockFirstBetterAuthVerificationEmail?: boolean
  }
  /**
   * Configure the Accounts collections:
   */
  accounts?: {
    /**
     * Will set the `modelName` for the `account` table in better-auth
     *
     * and the `slug` for the `accounts` collection in payload
     *
     * @default 'accounts'
     */
    slug?: string | undefined
    /**
     * Hide the `accounts` collection from the payload admin UI
     */
    hidden?: boolean | undefined
    /**
     * Function to override the collection configuration
     *
     * This allows modifying the collection config after it has been built
     *
     * @param options Object containing the collection config and potentially additional parameters
     * @returns Modified collection config
     */
    collectionOverrides?: (options: { collection: CollectionConfig }) => CollectionConfig
  }
  /**
   * Configure the Sessions collections:
   */
  sessions?: {
    /**
     * Will set the `modelName` for the `session` table in better-auth
     *
     * and the `slug` for the `sessions` collection in payload
     *
     * @default 'sessions'
     */
    slug?: string | undefined
    /**
     * Hide the `sessions` collection from the payload admin UI
     */
    hidden?: boolean | undefined
    /**
     * Function to override the collection configuration
     *
     * This allows modifying the collection config after it has been built
     *
     * @param options Object containing the collection config and potentially additional parameters
     * @returns Modified collection config
     */
    collectionOverrides?: (options: { collection: CollectionConfig }) => CollectionConfig
  }
  /**
   * Configure the Verifications collections:
   */
  verifications?: {
    /**
     * Will set the `modelName` for the `verification` table in better-auth
     *
     * and the `slug` for the `verifications` collection in payload
     *
     * @default 'verifications'
     */
    slug?: string | undefined
    /**
     * Hide the `verifications` collection from the payload admin UI
     */
    hidden?: boolean | undefined
    /**
     * Function to override the collection configuration
     *
     * This allows modifying the collection config after it has been built
     *
     * @param options Object containing the collection config and potentially additional parameters
     * @returns Modified collection config
     */
    collectionOverrides?: (options: { collection: CollectionConfig }) => CollectionConfig
  }
  /**
   * Configure the Admin Invitations collections:
   */
  adminInvitations?: {
    /**
     * Will set the `slug` for the `admin-invitations` collection in payload
     *
     * @default 'admin-invitations'
     */
    slug?: string | undefined
    /**
     * Hide the `admin-invitations` collection from the payload admin UI
     */
    hidden?: boolean | undefined
    /**
     * This will be used to generate the admin invite url
     *
     * @param options Object containing payload and the token
     * @returns The admin invite url
     */
    generateInviteUrl?: GenerateAdminInviteUrlFn
    /**
     * This will be used to send the admin invite email
     *
     * @param options Object containing payload, email and the url
     * @returns The admin invite url
     */
    sendInviteEmail?: SendAdminInviteEmailFn
    /**
     * Function to override the collection configuration
     *
     * This allows modifying the collection config after it has been built
     *
     * @param options Object containing the collection config and potentially additional parameters
     * @returns Modified collection config
     */
    collectionOverrides?: (options: { collection: CollectionConfig }) => CollectionConfig
  }
}

export type SendAdminInviteEmailFn = (options: {
  payload: Payload
  email: string
  url: string
}) => Promise<{ success: true; message?: string } | { success: false; message: string }>

export type GenerateAdminInviteUrlFn = (options: { payload: Payload; token: string }) => string

export type ConfigAdminCustom = {
  betterAuth: {
    adminRoutes: {
      [key in keyof typeof adminRoutes]: string
    }
  }
}

/**
 * Plugin function signature with attached options.
 *
 * The plugin function modifies the Payload config and attaches its options
 * for later access.
 */
export interface BetterAuthPlugin {
  (config: Config): Config
  pluginOptions: BetterAuthPluginOptions
}

/**
 * Extended PayloadRequest with typed Better Auth instance.
 *
 * Use this type in your collection hooks, endpoints, or middleware when you need
 * access to the Better Auth client with full type inference from your plugin options.
 *
 * @template O - Your BetterAuthPluginOptions type for proper inference
 *
 * @example Using in a collection hook
 * ```ts
 * const myHook: CollectionHookWithBetterAuth<typeof pluginOptions, CollectionBeforeChangeHook> = async ({ req }) => {
 *   const session = await req.payload.betterAuth.api.getSession({
 *     headers: req.headers
 *   })
 *   // session is fully typed based on your plugins
 * }
 * ```
 *
 * @example Using in a custom endpoint
 * ```ts
 * const endpoint: EndpointWithBetterAuth<typeof pluginOptions> = {
 *   path: '/custom',
 *   method: 'get',
 *   handler: async (req) => {
 *     const { user } = await req.payload.betterAuth.api.getSession({
 *       headers: req.headers
 *     })
 *     return Response.json({ user })
 *   }
 * }
 * ```
 */
export interface PayloadRequestWithBetterAuth<O extends BetterAuthPluginOptions> extends PayloadRequest {
  payload: BasePayload & {
    betterAuth: BetterAuthReturn<O>
  }
}

/**
 * Utility type for collection hooks that need typed Better Auth access.
 *
 * Transforms a standard Payload hook type to use {@link PayloadRequestWithBetterAuth}.
 *
 * @template O - Your BetterAuthPluginOptions type
 * @template T - The Payload hook type (e.g., CollectionBeforeChangeHook)
 *
 * @example
 * ```ts
 * const beforeChange: CollectionHookWithBetterAuth<typeof myOptions, CollectionBeforeChangeHook> = async ({
 *   req,
 *   data
 * }) => {
 *   // req.payload.betterAuth is fully typed
 *   return data
 * }
 * ```
 */
export type CollectionHookWithBetterAuth<O extends BetterAuthPluginOptions, T extends (args: any) => any> = T extends (
  args: infer A
) => infer R
  ? (args: Omit<A, 'req'> & { req: PayloadRequestWithBetterAuth<O> }) => R
  : never

/**
 * Utility type for custom endpoints that need typed Better Auth access.
 *
 * Extends Payload's Endpoint type with a typed request handler.
 *
 * @template O - Your BetterAuthPluginOptions type
 */
export type EndpointWithBetterAuth<O extends BetterAuthPluginOptions> = Omit<Endpoint, 'handler'> & {
  handler: (req: PayloadRequestWithBetterAuth<O>) => Promise<Response> | Response
}

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never
type PrettifyDeep<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? T[K] : T[K] extends object ? T[K] extends Array<any> ? T[K] : T[K] extends Date ? T[K] : PrettifyDeep<T[K]> : T[K];
} & {};
type InferPluginErrorCodes<O extends BetterAuthOptions> =
  O['plugins'] extends Array<infer P>
    ? UnionToIntersection<
        P extends BetterAuthPluginType ? (P['$ERROR_CODES'] extends Record<string, any> ? P['$ERROR_CODES'] : never) : never
      > extends infer R
      ? [R] extends [never]
        ? {}
        : R
      : {}
    : {}

export type RoleArray<O extends readonly string[] = readonly [typeof defaults.userRole]> = O[number][] | null
type OverrideRole<T, O extends readonly string[]> = T extends object ? Omit<T, 'role'> & { role: RoleArray<O> } : T
type ExtractBA<O extends BetterAuthPluginOptions> = NonNullable<O['betterAuthOptions']>
type ExtractRoles<O> = O extends { users?: { roles?: infer R } }
  ? R extends readonly string[]
    ? R
    : readonly []
  : readonly [typeof defaults.userRole]
type BaseErrorCodes = typeof BASE_ERROR_CODES

/**
 * The Better Auth instance returned by `payload.betterAuth`.
 *
 * This type provides full type inference based on your plugin configuration,
 * including session/user types from enabled plugins (like organization, admin, etc.).
 *
 * @template O - Your BetterAuthPluginOptions type
 *
 * @property handler - Request handler for Better Auth API routes
 * @property api - Typed API methods for auth operations (signIn, signUp, getSession, etc.)
 * @property options - The resolved Better Auth options
 * @property $ERROR_CODES - Error codes from Better Auth and enabled plugins
 * @property $context - Promise resolving to the auth context
 * @property $Infer - Type inference helpers for Session and User types
 *
 * @example Accessing in a server action
 * ```ts
 * import { getPayload } from 'payload'
 * import config from '@payload-config'
 *
 * export async function getCurrentUser() {
 *   const payload = await getPayload({ config })
 *   const session = await payload.betterAuth.api.getSession({
 *     headers: headers()
 *   })
 *   return session?.user
 * }
 * ```
 *
 * @example Using $Infer for type-safe user/session
 * ```ts
 * type Session = typeof payload.betterAuth.$Infer.Session
 * type User = Session['user']
 * // User type includes fields from all enabled plugins
 * ```
 */
export type BetterAuthReturn<O extends BetterAuthPluginOptions = BetterAuthPluginOptions> = {
  /** Request handler for `/api/auth/*` routes */
  handler: (request: Request) => Promise<Response>
  /** Typed API methods for auth operations */
  api: InferAPI<ReturnType<typeof router<ExtractBA<O>>>>['endpoints']
  /** The resolved Better Auth options */
  options: ExtractBA<O>
  /** Error codes from Better Auth core and enabled plugins */
  $ERROR_CODES: InferPluginErrorCodes<ExtractBA<O>> & BaseErrorCodes
  /** Auth context promise */
  $context: Promise<AuthContext>
  /** Type inference helpers - use `$Infer.Session` to get the full session type */
  $Infer: InferPluginTypes<ExtractBA<O>> extends {
    Session: any
  }
    ? InferPluginTypes<ExtractBA<O>>
    : {
        Session: {
          session: PrettifyDeep<InferSession<ExtractBA<O>>>
          user: OverrideRole<PrettifyDeep<InferUser<ExtractBA<O>>>, ExtractRoles<O>>
        }
      } & InferPluginTypes<ExtractBA<O>>
}

export type BetterAuthFunctionOptions<O extends BetterAuthPluginOptions> = Omit<ExtractBA<O>, 'database' | 'plugins'> & {
  enableDebugLogs?: boolean
  plugins: ExtractBA<O>['plugins']
}

export interface BuiltBetterAuthSchema {
  modelName: string
  fields: Record<string, DBFieldAttribute>
  order: number
}

export type BetterAuthSchemas = Record<ModelKey, BuiltBetterAuthSchema>

export interface BuildCollectionProps {
  resolvedSchemas: BetterAuthSchemas
  pluginOptions: BetterAuthPluginOptions
  incomingCollections: CollectionConfig[]
}

export type FieldOverrides<K extends string = string> = {
  [Key in K]?: (field: DBFieldAttribute) => Partial<Field>
} & {
  [key: string]: (field: DBFieldAttribute) => Partial<Field>
}

export type FieldWithIds = { name?: string; custom?: { betterAuthFieldKey?: string } }

export type FieldRule = {
  condition?: (field: DBFieldAttribute) => boolean
  transform: (field: DBFieldAttribute) => Record<string, unknown>
}
