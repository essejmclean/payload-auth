/**
 * @module helpers/get-admin-access
 *
 * Creates Payload access control configuration for admin-only collections.
 */
import type { BetterAuthPluginOptions } from '@/better-auth/plugin/types'
import { isAdminWithRoles } from '../lib/build-collections/utils/payload-access'

/**
 * Creates a Payload access control object that restricts all CRUD operations to admin users.
 *
 * This helper generates access control functions for collections that should only be
 * accessible to users with admin roles. It uses the `adminRoles` configuration from
 * plugin options, defaulting to `['admin']` if not specified.
 *
 * @param pluginOptions - The Better Auth plugin configuration
 * @returns An access control object with `create`, `read`, `update`, and `delete` functions
 *
 * @example Using in a collection config
 * ```ts
 * import { getAdminAccess } from 'payload-auth/better-auth/plugin/helpers'
 *
 * const sessionsCollection: CollectionConfig = {
 *   slug: 'sessions',
 *   access: getAdminAccess(pluginOptions),
 *   fields: [...]
 * }
 * ```
 *
 * @example With custom admin roles
 * ```ts
 * // In betterAuthPlugin config
 * betterAuthPlugin({
 *   users: {
 *     adminRoles: ['admin', 'super-admin', 'moderator']
 *   }
 * })
 *
 * // getAdminAccess will use ['admin', 'super-admin', 'moderator'] for access checks
 * ```
 *
 * @see {@link isAdminWithRoles} for the underlying access check implementation
 */
export function getAdminAccess(pluginOptions: BetterAuthPluginOptions) {
  const adminRoles = pluginOptions.users?.adminRoles ?? ['admin']
  return {
    create: isAdminWithRoles({
      adminRoles
    }),
    read: isAdminWithRoles({
      adminRoles
    }),
    update: isAdminWithRoles({
      adminRoles
    }),
    delete: isAdminWithRoles({
      adminRoles
    })
  }
}
