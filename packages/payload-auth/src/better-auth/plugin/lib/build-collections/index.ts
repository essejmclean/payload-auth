/**
 * @module lib/build-collections
 *
 * Payload collection builders for Better Auth integration.
 *
 * This module orchestrates the generation of all Payload collections required
 * by Better Auth and its plugins. Each model in the Better Auth schema gets
 * a corresponding Payload collection with properly configured fields, access
 * control, hooks, and admin UI.
 *
 * ## Architecture
 *
 * The collection building process:
 * 1. Receives resolved Better Auth schemas (from `getAuthTables()`)
 * 2. For each schema model, calls the appropriate collection builder
 * 3. Each builder transforms BA fields to Payload fields with proper types
 * 4. Applies access control, hooks, endpoints, and admin UI configuration
 * 5. Merges with any existing collection config (for customization)
 * 6. Returns a map of slug → CollectionConfig
 *
 * ## Collection Builders
 *
 * - **Core collections**: users, accounts, sessions, verifications
 * - **Organization plugin**: organizations, members, invitations, teams, teamMembers
 * - **Auth plugins**: passkeys, twoFactors, apiKeys, jwks
 * - **OAuth plugins**: oauthApplications, oauthAccessTokens, oauthConsents
 * - **Enterprise**: ssoProviders, subscriptions
 */
import type { ModelKey } from '@/better-auth/generated-types'
import type { CollectionConfig } from 'payload'
import { baModelKey, baseSlugs } from '../../constants'
import type { BetterAuthPluginOptions, BuildCollectionProps, BetterAuthSchemas } from '../../types'
import { buildAccountsCollection } from './accounts/index'
import { buildAdminInvitationsCollection } from './admin-invitations'
import { buildApiKeysCollection } from './api-keys'
import { buildInvitationsCollection } from './invitations'
import { buildJwksCollection } from './jwks'
import { buildMembersCollection } from './members'
import { buildOauthAccessTokensCollection } from './oauth-access-tokens'
import { buildOauthApplicationsCollection } from './oauth-applications'
import { buildOauthConsentsCollection } from './oauth-consents'
import { buildOrganizationsCollection } from './organizations'
import { buildPasskeysCollection } from './passkeys'
import { buildSessionsCollection } from './sessions'
import { buildSsoProvidersCollection } from './sso-providers'
import { buildSubscriptionsCollection } from './subscriptions'
import { buildTeamsCollection } from './teams'
import { buildTwoFactorsCollection } from './two-factors'
import { buildUsersCollection } from './users/index'
import { getSchemaCollectionSlug } from './utils/collection-schema'
import { buildVerificationsCollection } from './verifications'
import { buildTeamMembersCollection } from './team-members'
import { buildDeviceCodeCollection } from './device-code'

/**
 * Builds all required Payload collections from Better Auth schemas.
 *
 * This is the main orchestration function that creates the complete set of
 * Payload collections needed for Better Auth. It:
 *
 * 1. Iterates through all resolved Better Auth schemas
 * 2. Calls the appropriate builder function for each model
 * 3. Handles the special `adminInvitations` collection (not in BA schema)
 * 4. Preserves any existing collections that don't conflict with BA collections
 *
 * @param params - Build parameters
 * @param params.incomingCollections - Existing Payload collections from the config
 * @param params.pluginOptions - Better Auth plugin configuration
 * @param params.resolvedSchemas - Better Auth schemas from `getAuthTables()`
 * @returns A map of collection slugs to their configurations
 *
 * @example
 * ```ts
 * const collectionMap = buildCollections({
 *   incomingCollections: config.collections ?? [],
 *   pluginOptions,
 *   resolvedSchemas
 * })
 *
 * // collectionMap = {
 * //   'users': CollectionConfig,
 * //   'sessions': CollectionConfig,
 * //   'accounts': CollectionConfig,
 * //   ...
 * // }
 * ```
 *
 * @see {@link BuildCollectionProps} for the props passed to each builder
 */
export function buildCollections({
  incomingCollections,
  pluginOptions,
  resolvedSchemas
}: {
  incomingCollections: CollectionConfig[]
  pluginOptions: BetterAuthPluginOptions
  resolvedSchemas: BetterAuthSchemas
}): Record<string, CollectionConfig> {
  const collectionBuilders: Record<ModelKey, (props: BuildCollectionProps) => CollectionConfig> = {
    [baModelKey.user]: (props: BuildCollectionProps) => buildUsersCollection(props),
    [baModelKey.account]: (props: BuildCollectionProps) => buildAccountsCollection(props),
    [baModelKey.session]: (props: BuildCollectionProps) => buildSessionsCollection(props),
    [baModelKey.verification]: (props: BuildCollectionProps) => buildVerificationsCollection(props),
    [baModelKey.organization]: (props: BuildCollectionProps) => buildOrganizationsCollection(props),
    [baModelKey.member]: (props: BuildCollectionProps) => buildMembersCollection(props),
    [baModelKey.invitation]: (props: BuildCollectionProps) => buildInvitationsCollection(props),
    [baModelKey.team]: (props: BuildCollectionProps) => buildTeamsCollection(props),
    [baModelKey.teamMember]: (props: BuildCollectionProps) => buildTeamMembersCollection(props),
    [baModelKey.jwks]: (props: BuildCollectionProps) => buildJwksCollection(props),
    [baModelKey.apikey]: (props: BuildCollectionProps) => buildApiKeysCollection(props),
    [baModelKey.twoFactor]: (props: BuildCollectionProps) => buildTwoFactorsCollection(props),
    [baModelKey.oauthAccessToken]: (props: BuildCollectionProps) => buildOauthAccessTokensCollection(props),
    [baModelKey.oauthApplication]: (props: BuildCollectionProps) => buildOauthApplicationsCollection(props),
    [baModelKey.oauthConsent]: (props: BuildCollectionProps) => buildOauthConsentsCollection(props),
    [baModelKey.passkey]: (props: BuildCollectionProps) => buildPasskeysCollection(props),
    [baModelKey.ssoProvider]: (props: BuildCollectionProps) => buildSsoProvidersCollection(props),
    [baModelKey.subscription]: (props: BuildCollectionProps) => buildSubscriptionsCollection(props),
    [baModelKey.deviceCode]: (props: BuildCollectionProps) => buildDeviceCodeCollection(props)
  }

  const collectionMap: Record<string, CollectionConfig> = {}
  for (const modelKey of Object.keys(resolvedSchemas) as ModelKey[]) {
    const collectionSlug = getSchemaCollectionSlug(resolvedSchemas, modelKey)
    const builder = collectionBuilders[modelKey]
    if (!builder) continue
    collectionMap[collectionSlug] = builder({
      incomingCollections,
      pluginOptions,
      resolvedSchemas
    })
  }

  // Add adminInvitations collection as it's not in the collectionSchemaMap
  const adminInvitationsSlug = pluginOptions.adminInvitations?.slug ?? baseSlugs.adminInvitations
  collectionMap[adminInvitationsSlug] = buildAdminInvitationsCollection({
    incomingCollections,
    pluginOptions
  })

  // Then add incoming collections that don't conflict with required ones
  incomingCollections.forEach((c) => {
    if (!collectionMap[c.slug]) {
      collectionMap[c.slug] = c
    }
  })

  return collectionMap
}
