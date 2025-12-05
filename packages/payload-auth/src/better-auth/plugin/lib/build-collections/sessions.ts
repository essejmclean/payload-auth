/**
 * @module lib/build-collections/sessions
 *
 * Builds the Payload collection for Better Auth sessions.
 *
 * Sessions track active user authentication states. Each session contains:
 * - A unique token for authentication
 * - User reference (who owns the session)
 * - Expiration time
 * - Device info (IP address, user agent)
 * - Optional organization/team context (if organization plugin enabled)
 * - Optional impersonation info (if admin plugin enabled)
 */
import { baModelKey, baseSlugs } from '../../constants'
import { getAdminAccess } from '../../helpers/get-admin-access'
import { getCollectionFields } from './utils/transform-schema-fields-to-payload'
import { getDefaultCollectionSlug } from '../../helpers/get-collection-slug'
import { assertAllSchemaFields } from './utils/collection-schema'
import { getSchemaCollectionSlug } from './utils/collection-schema'

import type { CollectionConfig } from 'payload'
import type { Session } from '@/better-auth/generated-types'
import type { BuildCollectionProps, FieldOverrides, FieldRule } from '@/better-auth/plugin/types'

/**
 * Builds the sessions collection for Better Auth.
 *
 * This collection stores active user sessions. Sessions are created when users
 * log in and are used to authenticate subsequent requests via session tokens.
 *
 * **Default slug:** `'sessions'`
 *
 * **Access control:** Admin-only by default (users can't view/modify sessions directly)
 *
 * **Key fields:**
 * - `token` - Unique session identifier for authentication
 * - `user` - Relationship to the user who owns the session
 * - `expiresAt` - When the session will expire
 * - `ipAddress` - Client IP address when session was created
 * - `userAgent` - Browser/client information
 * - `impersonatedBy` - (admin plugin) Admin who is impersonating
 * - `activeOrganization` - (organization plugin) Currently selected organization
 * - `activeTeam` - (organization plugin) Currently selected team
 *
 * @param props - Build collection properties
 * @param props.incomingCollections - Existing collections from Payload config
 * @param props.pluginOptions - Better Auth plugin configuration
 * @param props.resolvedSchemas - Better Auth schemas with field mappings
 * @returns Payload collection configuration for sessions
 *
 * @example Customizing via plugin options
 * ```ts
 * betterAuthPlugin({
 *   sessions: {
 *     slug: 'auth-sessions', // Custom slug
 *     hidden: true, // Hide from admin panel
 *     collectionOverrides: ({ collection }) => ({
 *       ...collection,
 *       admin: { ...collection.admin, description: 'Custom description' }
 *     })
 *   }
 * })
 * ```
 */
export function buildSessionsCollection({ incomingCollections, pluginOptions, resolvedSchemas }: BuildCollectionProps): CollectionConfig {
  const sessionSlug = getSchemaCollectionSlug(resolvedSchemas, baModelKey.session)
  const sessionSchema = resolvedSchemas[baModelKey.session]

  const existingSessionCollection = incomingCollections.find((collection) => collection.slug === sessionSlug) as
    | CollectionConfig
    | undefined

  const fieldOverrides: FieldOverrides<keyof Session> = {
    userId: () => ({
      index: true,
      saveToJWT: true,
      admin: { readOnly: true, description: 'The user that the session belongs to' },
      relationTo: getDefaultCollectionSlug({ modelKey: baModelKey.user, pluginOptions })
    }),
    token: () => ({
      index: true,
      saveToJWT: true,
      admin: { readOnly: true, description: 'The unique session token' }
    }),
    expiresAt: () => ({
      saveToJWT: true,
      admin: { readOnly: true, description: 'The date and time when the session will expire' }
    }),
    ipAddress: () => ({
      saveToJWT: true,
      admin: { readOnly: true, description: 'The IP address of the device' }
    }),
    userAgent: () => ({
      saveToJWT: true,
      admin: { readOnly: true, description: 'The user agent information of the device' }
    }),
    impersonatedBy: () => ({
      type: 'relationship',
      relationTo: pluginOptions.users?.slug ?? baseSlugs.users,
      required: false,
      saveToJWT: true,
      admin: {
        readOnly: true,
        description: 'The admin who is impersonating this session'
      }
    }),
    activeOrganizationId: () => ({
      name: 'activeOrganization',
      type: 'relationship',
      saveToJWT: true,
      relationTo: getDefaultCollectionSlug({ modelKey: baModelKey.organization, pluginOptions }),
      admin: {
        readOnly: true,
        description: 'The currently active organization for the session'
      }
    }),
    activeTeamId: () => ({
      name: 'activeTeam',
      type: 'relationship',
      saveToJWT: true,
      relationTo: getDefaultCollectionSlug({ modelKey: baModelKey.team, pluginOptions }),
      admin: {
        readOnly: true,
        description: 'The currently active team for the session'
      }
    })
  }

  const sessionFieldRules: FieldRule[] = [
    {
      condition: (field) => field.fieldName === 'updatedAt' || field.fieldName === 'createdAt',
      transform: (field) => ({
        ...field,
        saveToJWT: false,
        admin: {
          disableBulkEdit: true,
          hidden: true
        },
        index: true,
        label: ({ t }: any) => t('general:updatedAt')
      })
    }
  ]

  const collectionFields = getCollectionFields({
    schema: sessionSchema,
    fieldRules: sessionFieldRules,
    additionalProperties: fieldOverrides
  })

  let sessionCollection: CollectionConfig = {
    ...existingSessionCollection,
    slug: sessionSlug,
    admin: {
      hidden: pluginOptions.sessions?.hidden,
      description: 'Sessions are active sessions for users. They are used to authenticate users with a session token',
      group: pluginOptions?.collectionAdminGroup ?? 'Auth',
      ...existingSessionCollection?.admin
    },
    access: {
      ...getAdminAccess(pluginOptions),
      ...(existingSessionCollection?.access ?? {})
    },
    custom: {
      ...(existingSessionCollection?.custom ?? {}),
      betterAuthModelKey: baModelKey.session
    },
    fields: [...(existingSessionCollection?.fields ?? []), ...(collectionFields ?? [])]
  }

  if (typeof pluginOptions.sessions?.collectionOverrides === 'function') {
    sessionCollection = pluginOptions.sessions.collectionOverrides({
      collection: sessionCollection
    })
  }

  assertAllSchemaFields(sessionCollection, sessionSchema)

  return sessionCollection
}
