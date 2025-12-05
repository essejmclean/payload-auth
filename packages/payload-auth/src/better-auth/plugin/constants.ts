/**
 * @module plugin/constants
 *
 * Constants and mappings used throughout the Better Auth plugin.
 *
 * This module defines:
 * - Supported social providers and login methods
 * - Better Auth plugin IDs and their string identifiers
 * - Collection slug mappings (model key → Payload slug)
 * - Field key mappings (BA field names → Payload field names)
 * - Admin route and endpoint paths
 * - Default role values
 */

/**
 * Supported OAuth/social authentication providers.
 *
 * These correspond to Better Auth's built-in social provider plugins.
 */
export const socialProviders = [
  'apple',
  'discord',
  'facebook',
  'github',
  'google',
  'linkedin',
  'microsoft',
  'spotify',
  'tiktok',
  'twitter',
  'twitch',
  'zoom',
  'gitlab',
  'roblox',
  'vk',
  'kick',
  'reddit'
] as const

/**
 * All supported login/authentication methods.
 *
 * Includes both credential-based methods (email/password, magic link, etc.)
 * and social provider authentication.
 */
export const loginMethods = [
  'emailPassword',
  'magicLink',
  'emailOTP',
  'phonePassword',
  'phoneOTP',
  'phoneMagicLink',
  'passkey',
  ...socialProviders
] as const

/**
 * Mapping of camelCase plugin names to Better Auth's kebab-case plugin IDs.
 *
 * Better Auth uses kebab-case IDs internally for plugins. This mapping allows
 * the plugin to check for enabled plugins by their canonical IDs.
 *
 * @example Checking if a plugin is enabled
 * ```ts
 * const pluginIds = betterAuthOptions.plugins?.map(p => p.id) ?? []
 * const hasOrganization = pluginIds.includes(supportedBAPluginIds.organization)
 * ```
 */
export const supportedBAPluginIds = {
  oneTimeToken: 'one-time-token',
  oAuthProxy: 'oauth-proxy',
  haveIBeenPwned: 'haveIBeenPwned',
  captcha: 'captcha',
  bearer: 'bearer',
  genericOAuth: 'generic-oauth',
  customSession: 'custom-session',
  harmonyEmail: 'harmony-email',
  harmonyPhoneNumber: 'harmony-phone-number',
  twoFactor: 'two-factor',
  username: 'username',
  anonymous: 'anonymous',
  phoneNumber: 'phone-number',
  magicLink: 'magic-link',
  emailOtp: 'email-otp',
  passkey: 'passkey',
  oneTap: 'one-tap',
  admin: 'admin',
  apiKey: 'api-key',
  mcp: 'mcp',
  organization: 'organization',
  multiSession: 'multi-session',
  openApi: 'open-api',
  jwt: 'jwt',
  nextCookies: 'next-cookies',
  sso: 'sso',
  oidc: 'oidc',
  expo: 'expo',
  polar: 'polar',
  stripe: 'stripe',
  autumn: 'autumn',
  dodopayments: 'dodopayments',
  dubAnalytics: 'dub-analytics',
  deviceAuthorization: 'device-authorization',
  lastLoginMethod: 'last-login-method'
} as const

/**
 * Default collection slugs for core Better Auth models.
 *
 * These are the default Payload collection slugs used if no custom slug
 * is specified in the plugin options.
 */
export const baseSlugs = {
  users: 'users',
  sessions: 'sessions',
  accounts: 'accounts',
  verifications: 'verifications',
  adminInvitations: 'admin-invitations'
} as const

/**
 * Default collection slugs for Better Auth plugin-specific models.
 *
 * These collections are created when specific Better Auth plugins are enabled
 * (e.g., organization plugin creates organizations, members, invitations, teams).
 */
export const baPluginSlugs = {
  subscriptions: 'subscriptions',
  apiKeys: 'apiKeys',
  jwks: 'jwks',
  twoFactors: 'twoFactors',
  passkeys: 'passkeys',
  oauthApplications: 'oauthApplications',
  oauthAccessTokens: 'oauthAccessTokens',
  oauthConsents: 'oauthConsents',
  ssoProviders: 'ssoProviders',
  organizations: 'organizations',
  invitations: 'invitations',
  members: 'members',
  teams: 'teams',
  teamMembers: 'teamMembers'
} as const

/**
 * Better Auth internal model keys.
 *
 * These are the string identifiers that Better Auth uses internally to
 * reference its database models/tables.
 */
export const baModelKey = {
  user: 'user',
  session: 'session',
  account: 'account',
  verification: 'verification',
  twoFactor: 'twoFactor',
  passkey: 'passkey',
  oauthApplication: 'oauthApplication',
  oauthAccessToken: 'oauthAccessToken',
  oauthConsent: 'oauthConsent',
  ssoProvider: 'ssoProvider',
  organization: 'organization',
  invitation: 'invitation',
  member: 'member',
  team: 'team',
  teamMember: 'teamMember',
  subscription: 'subscription',
  apikey: 'apikey',
  jwks: 'jwks',
  deviceCode: 'deviceCode'
} as const

/**
 * Mapping of Better Auth field keys to Payload field names for relationship fields.
 *
 * Better Auth uses keys like `userId` that reference foreign keys, but Payload's
 * relationship fields use more readable names like `user`. This mapping defines
 * how BA field keys should be renamed when creating Payload fields.
 *
 * @example
 * ```ts
 * // Better Auth: { userId: '123' }
 * // Payload field: { user: '123' } (relationship field named 'user')
 * ```
 */
export const baModelFieldKeysToFieldNames = {
  user: {
    role: 'role'
  },
  account: {
    userId: 'user'
  },
  session: {
    userId: 'user',
  },
  member: {
    organizationId: 'organization',
    userId: 'user',
    teamId: 'team'
  },
  invitation: {
    organizationId: 'organization',
    inviterId: 'inviter',
    teamId: 'team'
  },
  team: {
    organizationId: 'organization'
  },
  apikey: {
    userId: 'user'
  },
  twoFactor: {
    userId: 'user'
  },
  passkey: {
    userId: 'user'
  },
  ssoProvider: {
    userId: 'user'
  },
  oauthApplication: {
    userId: 'user'
  },
  oauthAccessToken: {
    userId: 'user',
    clientId: 'client'
  },
  oauthConsent: {
    userId: 'user',
    clientId: 'client'
  }
} as const

/**
 * Better Auth field keys organized by model.
 *
 * This provides a type-safe way to reference BA field keys when building
 * queries or mapping fields. Useful for the adapter when translating between
 * BA's field names and Payload's field names.
 */
export const baModelFieldKeys = {
  teamMember: {
    teamId: 'teamId',
    userId: 'userId'
  },
  account: {
    userId: 'userId'
  },
  session: {
    userId: 'userId',
    activeOrganizationId: 'activeOrganizationId',
    impersonatedBy: 'impersonatedBy',
    activeTeamId: 'activeTeamId'
  },
  member: {
    organizationId: 'organizationId',
    userId: 'userId',
    teamId: 'teamId'
  },
  invitation: {
    organizationId: 'organizationId',
    inviterId: 'inviterId',
    teamId: 'teamId'
  },
  team: {
    organizationId: 'organizationId'
  },
  apikey: {
    userId: 'userId'
  },
  twoFactor: {
    userId: 'userId'
  },
  passkey: {
    userId: 'userId'
  },
  ssoProvider: {
    userId: 'userId'
  },
  oauthApplication: {
    userId: 'userId'
  },
  oauthAccessToken: {
    userId: 'userId',
    clientId: 'clientId'
  },
  oauthConsent: {
    userId: 'userId',
    clientId: 'clientId'
  }
} as const

/**
 * Complete mapping from Better Auth model keys to Payload collection slugs.
 *
 * This is the canonical mapping used by `getDefaultCollectionSlug()` to resolve
 * the Payload collection slug for any given BA model key.
 *
 * @see {@link getDefaultCollectionSlug} for the resolution function
 */
export const baModelKeyToSlug = {
  user: baseSlugs.users,
  session: baseSlugs.sessions,
  account: baseSlugs.accounts,
  verification: baseSlugs.verifications,
  twoFactor: baPluginSlugs.twoFactors,
  passkey: baPluginSlugs.passkeys,
  oauthApplication: baPluginSlugs.oauthApplications,
  oauthAccessToken: baPluginSlugs.oauthAccessTokens,
  oauthConsent: baPluginSlugs.oauthConsents,
  ssoProvider: baPluginSlugs.ssoProviders,
  organization: baPluginSlugs.organizations,
  invitation: baPluginSlugs.invitations,
  member: baPluginSlugs.members,
  team: baPluginSlugs.teams,
  teamMember: baPluginSlugs.teamMembers,
  subscription: baPluginSlugs.subscriptions,
  apikey: baPluginSlugs.apiKeys,
  jwks: baPluginSlugs.jwks
} as const

/**
 * Admin panel route paths for Better Auth pages.
 *
 * When `disableDefaultPayloadAuth` is enabled, these routes are used for
 * the custom login, password reset, and other auth flows in the Payload admin panel.
 */
export const adminRoutes = {
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  adminSignup: '/signup',
  adminLogin: '/login',
  loginRedirect: '/login-redirect',
  twoFactorVerify: '/two-factor-verify'
} as const

/**
 * Custom API endpoint paths added to the users collection.
 *
 * These endpoints provide additional functionality for admin auth operations
 * like setting admin roles, refreshing tokens, and sending invitations.
 */
export const adminEndpoints = {
  setAdminRole: '/set-admin-role',
  refreshToken: '/refresh-token',
  sendInvite: '/send-invite',
  generateInviteUrl: '/generate-invite-url',
  signup: '/signup'
} as const

/**
 * Default role values used when no custom roles are specified.
 */
export const defaults = {
  adminRole: 'admin',
  userRole: 'user'
} as const
