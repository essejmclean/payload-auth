/**
 * @module lib/build-collections/users/better-auth-strategy
 *
 * Payload authentication strategy that delegates to Better Auth.
 *
 * This strategy allows Payload to authenticate requests using Better Auth sessions.
 * It's automatically added to the users collection when the plugin is enabled.
 */
import type { AuthStrategy } from 'payload'
import { getPayloadAuth } from '@/better-auth/plugin/lib/get-payload-auth'
import { baseSlugs } from '@/better-auth/plugin/constants'

/**
 * Creates a Payload authentication strategy that uses Better Auth sessions.
 *
 * This strategy is the bridge between Payload's authentication system and Better Auth.
 * When a request comes in, this strategy:
 *
 * 1. Calls Better Auth's `getSession()` API to validate the session token
 * 2. If valid, fetches the full user document from Payload
 * 3. Returns the user to Payload's auth system
 *
 * The strategy is added to the users collection's `auth.strategies` array,
 * allowing Payload to recognize and authenticate Better Auth sessions.
 *
 * @param userSlug - The slug of the users collection. Defaults to `'users'`
 * @returns A Payload AuthStrategy object
 *
 * @example How it's used internally
 * ```ts
 * // In the users collection builder:
 * const usersCollection: CollectionConfig = {
 *   slug: 'users',
 *   auth: {
 *     strategies: [betterAuthStrategy('users')]
 *   }
 * }
 * ```
 *
 * @example Authentication flow
 * ```
 * Request with session cookie
 *        ↓
 * Payload calls strategy.authenticate()
 *        ↓
 * Strategy calls betterAuth.api.getSession()
 *        ↓
 * If valid session → fetch user from Payload
 *        ↓
 * Return user with _strategy: 'better-auth'
 * ```
 *
 * @see {@link getPayloadAuth} for accessing the Better Auth instance
 */
export function betterAuthStrategy(userSlug?: string): AuthStrategy {
  return {
    name: 'better-auth',
    authenticate: async ({ payload, headers }) => {
      try {
        const payloadAuth = await getPayloadAuth(payload.config)

        const res = await payloadAuth.betterAuth.api.getSession({
          headers
        })
        
        if (!res) {
          return { user: null }
        }
        const userId = res.session.userId ?? res.user.id
        if (!userId) {
          return { user: null }
        }
        const user = await payloadAuth.findByID({
          collection: userSlug ?? baseSlugs.users,
          id: userId
        })
        if (!user) {
          return { user: null }
        }
        return {
          user: {
            ...user,
            collection: userSlug ?? baseSlugs.users,
            _strategy: 'better-auth'
          }
        }
      } catch (error) {
        return { user: null }
      }
    }
  }
}
