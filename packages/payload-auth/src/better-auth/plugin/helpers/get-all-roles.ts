/**
 * @module helpers/get-all-roles
 *
 * Generates select field options from configured user roles.
 */
import type { BetterAuthPluginOptions } from '@/better-auth/plugin/types'

/**
 * Combines admin roles and user roles into a deduplicated array of select options.
 *
 * This helper is used to generate options for the `role` select field on user collections.
 * It merges `adminRoles` and `roles` from plugin options, removes duplicates, and formats
 * each role as a label/value pair suitable for Payload select fields.
 *
 * Role labels are formatted by:
 * 1. Splitting on hyphens, underscores, or spaces
 * 2. Capitalizing the first letter of each word
 * 3. Joining with spaces
 *
 * @param pluginOptions - The Better Auth plugin configuration
 * @returns Array of `{ label: string, value: string }` objects for use in select fields
 *
 * @example Default behavior
 * ```ts
 * // With default options (adminRoles: ['admin'], roles: ['user'])
 * getAllRoleOptions(pluginOptions)
 * // Returns: [
 * //   { label: 'Admin', value: 'admin' },
 * //   { label: 'User', value: 'user' }
 * // ]
 * ```
 *
 * @example With custom roles
 * ```ts
 * // Plugin options:
 * // { users: { adminRoles: ['admin', 'super-admin'], roles: ['user', 'premium-user'] } }
 *
 * getAllRoleOptions(pluginOptions)
 * // Returns: [
 * //   { label: 'Admin', value: 'admin' },
 * //   { label: 'Super Admin', value: 'super-admin' },
 * //   { label: 'User', value: 'user' },
 * //   { label: 'Premium User', value: 'premium-user' }
 * // ]
 * ```
 *
 * @example Label formatting examples
 * ```ts
 * // 'content_manager' → 'Content Manager'
 * // 'super-admin' → 'Super Admin'
 * // 'vip user' → 'Vip User'
 * ```
 */
export function getAllRoleOptions(pluginOptions: BetterAuthPluginOptions) {
  const adminRoles = pluginOptions.users?.adminRoles ?? ['admin']
  const roles = pluginOptions.users?.roles ?? ['user']
  const allRoleOptions = [...new Set([...adminRoles, ...roles])].map((role) => ({
    label: role
      .split(/[-_\s]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
    value: role
  }))
  return allRoleOptions
}
