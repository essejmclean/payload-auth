/**
 * @module better-auth/plugin
 *
 * Payload CMS plugin for Better Auth integration.
 *
 * This module provides:
 * - {@link betterAuthPlugin} - Main Payload plugin function
 * - {@link withPayloadAuth} - Helper for creating client-side auth instances
 * - Type exports for hooks, endpoints, and configuration
 *
 * @example Basic usage in payload.config.ts
 * ```ts
 * import { betterAuthPlugin } from 'payload-auth/better-auth/plugin'
 *
 * export default buildConfig({
 *   plugins: [
 *     betterAuthPlugin({
 *       betterAuthOptions: {
 *         emailAndPassword: { enabled: true }
 *       }
 *     })
 *   ]
 * })
 * ```
 */
import type { BetterAuthOptions } from 'better-auth/types'
import { getPayload, SanitizedConfig, type Config } from 'payload'
import { payloadAdapter } from 'payload-auth/better-auth/adapter'
import { getDefaultBetterAuthSchema } from './helpers/get-better-auth-schema'
import { syncResolvedSchemaWithCollectionMap } from './helpers/sync-resolved-schema-with-collection-map'
import { applyDisabledDefaultAuthConfig } from './lib/apply-disabled-default-auth-config'
import { buildCollections } from './lib/build-collections/index'
import { initBetterAuth } from './lib/init-better-auth'
import { sanitizeBetterAuthOptions } from './lib/sanitize-better-auth-options/index'
import { setLoginMethods } from './lib/set-login-methods'
import type { BetterAuthPluginOptions } from './types'
import { set } from './utils/set'

export * from './helpers/index'
export { getPayloadAuth } from './lib/get-payload-auth'
export { sanitizeBetterAuthOptions } from './lib/sanitize-better-auth-options/index'
export * from './types'

/**
 * Internal function that builds all Better Auth data structures from plugin options.
 *
 * This function orchestrates the schema and collection building process:
 * 1. Sets up login methods configuration
 * 2. Generates default Better Auth schemas from `getAuthTables()`
 * 3. Builds Payload collections from the schemas
 * 4. Syncs resolved schemas with the collection map (handles field name mappings)
 * 5. Rebuilds collections with resolved schemas for proper cross-references
 * 6. Sanitizes Better Auth options with final configuration
 *
 * @internal
 * @param params - Build parameters
 * @param params.payloadConfig - The Payload configuration
 * @param params.pluginOptions - Plugin options from the user
 * @returns Object containing plugin options, collection map, schemas, and sanitized BA options
 */
function buildBetterAuthData({ payloadConfig, pluginOptions }: { payloadConfig: SanitizedConfig; pluginOptions: BetterAuthPluginOptions }) {
  pluginOptions = setLoginMethods({ pluginOptions })

  const defaultBetterAuthSchemas = getDefaultBetterAuthSchema(pluginOptions)

  let collectionMap = buildCollections({
    resolvedSchemas: defaultBetterAuthSchemas,
    incomingCollections: payloadConfig.collections ?? [],
    pluginOptions
  })

  const resolvedBetterAuthSchemas = syncResolvedSchemaWithCollectionMap(defaultBetterAuthSchemas, collectionMap)

  // We need to build the collections a second time with the resolved schemas
  // due to hooks, endpoints, useAsTitle, etc should rely on resolvedBetterAuthSchemas to get slugs
  // if they are referencing to other collections then it self.
  collectionMap = buildCollections({
    resolvedSchemas: resolvedBetterAuthSchemas,
    incomingCollections: payloadConfig.collections ?? [],
    pluginOptions
  })

  const sanitizedBetterAuthOptions = sanitizeBetterAuthOptions({
    config: payloadConfig,
    pluginOptions,
    resolvedSchemas: resolvedBetterAuthSchemas
  })

  pluginOptions.betterAuthOptions = sanitizedBetterAuthOptions

  return {
    pluginOptions,
    collectionMap,
    resolvedBetterAuthSchemas,
    sanitizedBetterAuthOptions
  }
}

/**
 * Creates a Payload CMS plugin that integrates Better Auth.
 *
 * This is the main entry point for adding Better Auth to your Payload application.
 * The plugin handles:
 *
 * - **Collection Generation**: Automatically creates Payload collections for auth tables
 *   (users, sessions, accounts, verifications, and any plugin-specific tables)
 * - **Schema Synchronization**: Maps Better Auth field names to Payload field names
 * - **Admin Integration**: Optionally replaces Payload's default auth with Better Auth
 * - **Runtime Initialization**: Attaches `payload.betterAuth` on server startup
 *
 * @param pluginOptions - Configuration options for the plugin
 * @returns A Payload config modifier function
 *
 * @example Basic email/password auth
 * ```ts
 * // payload.config.ts
 * import { buildConfig } from 'payload'
 * import { betterAuthPlugin } from 'payload-auth/better-auth/plugin'
 *
 * export default buildConfig({
 *   plugins: [
 *     betterAuthPlugin({
 *       betterAuthOptions: {
 *         emailAndPassword: { enabled: true }
 *       }
 *     })
 *   ]
 * })
 * ```
 *
 * @example With social providers and organizations
 * ```ts
 * import { organization } from 'better-auth/plugins'
 *
 * betterAuthPlugin({
 *   disableDefaultPayloadAuth: true, // Use BA for admin auth
 *   betterAuthOptions: {
 *     emailAndPassword: { enabled: true },
 *     socialProviders: {
 *       google: {
 *         clientId: process.env.GOOGLE_CLIENT_ID!,
 *         clientSecret: process.env.GOOGLE_CLIENT_SECRET!
 *       }
 *     },
 *     plugins: [organization()]
 *   },
 *   users: {
 *     roles: ['user', 'admin'],
 *     adminRoles: ['admin']
 *   }
 * })
 * ```
 *
 * @example Accessing Better Auth at runtime
 * ```ts
 * // In a server action or API route
 * const payload = await getPayload({ config })
 * const session = await payload.betterAuth.api.getSession({
 *   headers: req.headers
 * })
 * ```
 *
 * @see {@link BetterAuthPluginOptions} for all configuration options
 * @see {@link BetterAuthReturn} for the runtime API
 */
export function betterAuthPlugin(pluginOptions: BetterAuthPluginOptions) {
  return (config: Config): Config => {
    if (pluginOptions.disabled) {
      return config
    }

    config.custom = {
      ...config.custom,
      hasBetterAuthPlugin: true
    }

    const { collectionMap, resolvedBetterAuthSchemas, sanitizedBetterAuthOptions } = buildBetterAuthData({
      payloadConfig: config as SanitizedConfig,
      pluginOptions
    })

    set(config, 'custom.betterAuth.config', sanitizedBetterAuthOptions)

    // ---------------------- Finalize config -----------------
    if (pluginOptions.disableDefaultPayloadAuth) {
      applyDisabledDefaultAuthConfig({
        config,
        pluginOptions,
        collectionMap,
        resolvedBetterAuthSchemas
      })
    }

    config.collections = config.collections ?? []
    config.collections = Object.values(collectionMap)

    const incomingOnInit = config.onInit

    config.onInit = async (payload) => {
      try {
        // Execute any existing onInit functions first
        if (incomingOnInit) {
          await incomingOnInit(payload)
        }

        // Initialize and set the betterAuth instance
        const auth = initBetterAuth<typeof pluginOptions>({
          payload,
          idType: payload.db.defaultIDType,
          options: {
            ...sanitizedBetterAuthOptions,
            enableDebugLogs: pluginOptions.debug?.enableDebugLogs ?? false,
            plugins: [...(sanitizedBetterAuthOptions.plugins ?? [])]
          }
        })

        // Type-safe extension of payload with betterAuth
        Object.defineProperty(payload, 'betterAuth', {
          value: auth,
          writable: false,
          configurable: false
        })
      } catch (error) {
        console.error('Failed to initialize BetterAuth:', error)
        throw error
      }
    }
    return config
  }
}

/**
 * Creates Better Auth options with the Payload adapter pre-configured.
 *
 * This helper is used when you need to create a Better Auth client instance
 * outside of the main Payload context (e.g., for the `@better-auth/client` package
 * in client components or for creating an auth client in a separate module).
 *
 * The function:
 * 1. Extracts the sanitized Better Auth config from Payload's custom config
 * 2. Attaches the Payload adapter with proper database settings
 * 3. Returns options ready to pass to `betterAuth()` or `createAuthClient()`
 *
 * **Note:** This requires the `betterAuthPlugin` to be configured in your Payload config,
 * as it reads configuration stored in `payloadConfig.custom.betterAuth.config`.
 *
 * @param params - Parameters object
 * @param params.payloadConfig - The sanitized Payload configuration
 * @returns Better Auth options with the Payload database adapter configured
 * @throws {Error} If betterAuthPlugin was not configured in the Payload config
 *
 * @example Creating an auth client for use in API routes
 * ```ts
 * // lib/auth-client.ts
 * import { betterAuth } from 'better-auth'
 * import { withPayloadAuth } from 'payload-auth/better-auth/plugin'
 * import payloadConfig from '@payload-config'
 *
 * export const auth = betterAuth(withPayloadAuth({ payloadConfig }))
 * ```
 *
 * @example Using with @better-auth/react client
 * ```ts
 * // lib/auth.ts
 * import { createAuthClient } from '@better-auth/react'
 *
 * export const authClient = createAuthClient({
 *   baseURL: process.env.NEXT_PUBLIC_SERVER_URL
 * })
 * ```
 *
 * @see {@link betterAuthPlugin} for the main plugin setup
 */
export function withPayloadAuth({ payloadConfig }: { payloadConfig: SanitizedConfig }): BetterAuthOptions {
  const betterAuthConfig = payloadConfig.custom.betterAuth.config as BetterAuthOptions

  if (!betterAuthConfig) {
    throw new Error('BetterAuth config not found. Not set payloadConfig.custom.betterAuth.config')
  }

  const optionsWithAdapter: BetterAuthOptions = {
    ...betterAuthConfig,
    database: payloadAdapter({
      payloadClient: async () => await getPayload({ config: payloadConfig }),
      adapterConfig: {
        enableDebugLogs: false,
        idType: payloadConfig.db.defaultIDType
      }
    })
  }

  return optionsWithAdapter
}
