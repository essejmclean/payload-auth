/**
 * @module lib/build-collections/utils/payload-access
 *
 * Payload CMS access control utilities for role-based authentication.
 *
 * These functions create access control handlers that integrate with Better Auth's
 * role system, enabling admin-only, user-specific, and field-level access restrictions.
 */
import type { Access, FieldAccess } from 'payload'
import type { PayloadRequest } from 'payload'

/**
 * Configuration for admin role-based access control.
 */
export type AdminRolesConfig = {
  /** Array of role strings that have admin privileges. Defaults to `['admin']` */
  adminRoles?: string[]
}

/**
 * Configuration for access control that allows admins OR the current user.
 */
export type AdminOrCurrentUserConfig = AdminRolesConfig & {
  /** The field name used to identify the user. Defaults to `'id'` */
  idField?: string
}

/**
 * Configuration for update access that allows admins OR users updating their own allowed fields.
 */
export type AdminOrCurrentUserUpdateConfig = AdminOrCurrentUserConfig & {
  /** Fields that regular users are allowed to update on their own record */
  allowedFields?: string[]
  /** The slug of the users collection (used for password verification) */
  userSlug: string
}

/**
 * Creates a field-level access control function that only allows admin users.
 *
 * @param config - Configuration specifying which roles are considered admin
 * @returns A Payload FieldAccess function that returns `true` for admins, `false` otherwise
 *
 * @example
 * ```ts
 * const adminOnlyField: Field = {
 *   name: 'internalNotes',
 *   type: 'text',
 *   access: {
 *     read: isAdminWithRoles({ adminRoles: ['admin', 'super-admin'] }),
 *     update: isAdminWithRoles({ adminRoles: ['admin'] })
 *   }
 * }
 * ```
 */
export const isAdminWithRoles =
  (config: AdminRolesConfig = {}): FieldAccess =>
  ({ req }) => {
    const { adminRoles = ['admin'] } = config
    if (!req?.user || !req.user.role || !hasAdminRoles(adminRoles)({ req })) return false
    return true
  }

/**
 * Creates a collection-level access control function that allows admins OR the current user.
 *
 * For admins, returns `true` (full access). For non-admin users, returns a Payload `where`
 * query that restricts access to only their own document(s).
 *
 * @param config - Configuration for admin roles and the ID field to match against
 * @returns A Payload Access function
 *
 * @example
 * ```ts
 * const usersCollection: CollectionConfig = {
 *   slug: 'users',
 *   access: {
 *     read: isAdminOrCurrentUserWithRoles({ adminRoles: ['admin'] }),
 *     update: isAdminOrCurrentUserWithRoles({ adminRoles: ['admin'] })
 *   }
 * }
 * ```
 */
export const isAdminOrCurrentUserWithRoles =
  (config: AdminOrCurrentUserConfig = {}): Access =>
  ({ req }) => {
    const { adminRoles = ['admin'], idField = 'id' } = config
    if (isAdminWithRoles({ adminRoles })({ req })) return true
    if (!req?.user) return false
    return {
      [idField]: {
        equals: req?.user?.id
      }
    }
  }

/**
 * Creates a function that checks if the current user has any of the specified admin roles.
 *
 * Handles roles stored as:
 * - A single string (`'admin'`)
 * - A comma-separated string (`'admin,moderator'`)
 * - An array of strings (`['admin', 'moderator']`)
 *
 * @param adminRoles - Array of role strings considered admin
 * @returns A function that takes `{ req: PayloadRequest }` and returns `true` if user has admin role
 *
 * @example
 * ```ts
 * const checkAdmin = hasAdminRoles(['admin', 'super-admin'])
 * if (checkAdmin({ req })) {
 *   // User is an admin
 * }
 * ```
 */
export const hasAdminRoles = (adminRoles: string[]) => {
  return ({ req }: { req: PayloadRequest }): boolean => {
    let userRoles: string[] = []
    if (Array.isArray(req.user?.role)) {
      userRoles = req.user.role
    } else if (typeof req.user?.role === 'string') {
      if (req.user.role.includes(',')) {
        userRoles = req.user.role
          .split(',')
          .map((r: string) => r.trim())
          .filter(Boolean)
      } else if (req.user.role) {
        userRoles = [req.user.role]
      }
    }
    if (!userRoles) return false
    return userRoles.some((role) => adminRoles.includes(role))
  }
}

/**
 * Creates an access control function for updates that allows admins full access,
 * but restricts regular users to updating only specific fields on their own document.
 *
 * This is particularly useful for user profile updates where users should be able
 * to change some fields (like name, avatar) but not others (like role, permissions).
 *
 * **Password change handling:**
 * If `password` is in the update data, the user must also provide `currentPassword`.
 * The function will verify the current password before allowing the update.
 *
 * @param config - Configuration including allowed fields, user collection slug, and admin roles
 * @returns A Payload Access function
 *
 * @example
 * ```ts
 * const usersCollection: CollectionConfig = {
 *   slug: 'users',
 *   access: {
 *     update: isAdminOrCurrentUserUpdateWithAllowedFields({
 *       adminRoles: ['admin'],
 *       userSlug: 'users',
 *       allowedFields: ['name', 'image', 'email']
 *     })
 *   }
 * }
 * ```
 */
export const isAdminOrCurrentUserUpdateWithAllowedFields = (config: AdminOrCurrentUserUpdateConfig): Access => {
  return async ({ req, id, data }) => {
    const { adminRoles = ['admin'], allowedFields = [], userSlug, idField = 'id' } = config
    const user = req.user

    if (isAdminWithRoles({ adminRoles })({ req })) return true

    if (!user) return false

    if (user[idField] === id && data) {
      const dataKeys = Object.keys(data)

      const hasCurrentPassword = dataKeys.includes('currentPassword')
      const hasPassword = dataKeys.includes('password')

      if (hasPassword || hasCurrentPassword) {
        if (!(hasCurrentPassword && hasPassword)) return false
        try {
          if (!user.email) return false

          const result = await req.payload.login({
            collection: userSlug,
            data: {
              email: user.email,
              password: data.currentPassword
            }
          })

          if (!result) return false

          allowedFields.push('password', 'currentPassword')
        } catch (error) {
          return false
        }
      }

      const hasDisallowedField = dataKeys.some((key) => !allowedFields.includes(key))

      return !hasDisallowedField
    }

    return false
  }
}
