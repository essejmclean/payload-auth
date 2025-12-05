/**
 * @module helpers/get-collection-slug
 *
 * Maps Better Auth model keys to Payload collection slugs.
 */
import type { BetterAuthPluginOptions } from '../types'
import { baseSlugs, baModelKeyToSlug } from '../constants'

/**
 * Resolves the Payload collection slug for a given Better Auth model key.
 *
 * Better Auth uses internal model keys (like `'user'`, `'session'`, `'account'`) that need
 * to be mapped to Payload collection slugs. This function handles that mapping, respecting
 * any custom slugs configured in plugin options.
 *
 * **Resolution order:**
 * 1. For core models (`user`, `account`, `session`, `verification`, `adminInvitation`):
 *    Uses the custom slug from plugin options if specified, otherwise uses the default
 * 2. For plugin-specific models: Uses the mapping from `baModelKeyToSlug` constants
 * 3. Fallback: Returns the model key itself as the slug
 *
 * @param params - Parameters object
 * @param params.pluginOptions - The Better Auth plugin configuration
 * @param params.modelKey - The Better Auth internal model key (e.g., `'user'`, `'session'`)
 * @returns The Payload collection slug string
 *
 * @example Default slugs
 * ```ts
 * getDefaultCollectionSlug({ pluginOptions, modelKey: 'user' })      // 'users'
 * getDefaultCollectionSlug({ pluginOptions, modelKey: 'session' })   // 'sessions'
 * getDefaultCollectionSlug({ pluginOptions, modelKey: 'account' })   // 'accounts'
 * ```
 *
 * @example Custom slug from plugin options
 * ```ts
 * // With pluginOptions: { users: { slug: 'members' } }
 * getDefaultCollectionSlug({ pluginOptions, modelKey: 'user' })  // 'members'
 * ```
 *
 * @example Plugin-specific models
 * ```ts
 * getDefaultCollectionSlug({ pluginOptions, modelKey: 'organization' }) // 'organizations'
 * getDefaultCollectionSlug({ pluginOptions, modelKey: 'twoFactor' })    // 'twoFactors'
 * getDefaultCollectionSlug({ pluginOptions, modelKey: 'passkey' })      // 'passkeys'
 * ```
 *
 * @see {@link baseSlugs} for default core collection slugs
 * @see {@link baModelKeyToSlug} for the complete model key to slug mapping
 */
export function getDefaultCollectionSlug({
  pluginOptions,
  modelKey
}: {
  pluginOptions: BetterAuthPluginOptions
  modelKey: string
}): string {
  const baseSlug = baModelKeyToSlug[modelKey as keyof typeof baModelKeyToSlug] ?? modelKey

  switch (modelKey) {
    case 'user':
      return pluginOptions.users?.slug ?? baseSlugs.users
    case 'account':
      return pluginOptions.accounts?.slug ?? baseSlugs.accounts
    case 'session':
      return pluginOptions.sessions?.slug ?? baseSlugs.sessions
    case 'verification':
      return pluginOptions.verifications?.slug ?? baseSlugs.verifications
    case 'adminInvitation':
      return pluginOptions.adminInvitations?.slug ?? baseSlugs.adminInvitations
    default:
      return baseSlug
  }
}
