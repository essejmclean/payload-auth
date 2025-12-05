import type { AdapterInstance } from 'better-auth'
import type { BasePayload } from 'payload'

/**
 * Configuration parameters for the Payload CMS database adapter.
 *
 * @example
 * ```ts
 * import { payloadAdapter } from 'payload-auth/better-auth/adapter'
 *
 * const adapter = payloadAdapter({
 *   payloadClient: payload,
 *   adapterConfig: {
 *     idType: 'number',
 *     enableDebugLogs: true
 *   }
 * })
 * ```
 */
export type PayloadAdapterParams = {
  /**
   * The Payload CMS client instance.
   *
   * Can be provided as:
   * - A direct `BasePayload` instance
   * - A `Promise<BasePayload>` that resolves to the client
   * - A factory function `() => Promise<BasePayload>` for lazy initialization
   *
   * @example Direct instance
   * ```ts
   * payloadClient: payload
   * ```
   *
   * @example Factory function (recommended for Next.js)
   * ```ts
   * payloadClient: () => getPayload({ config })
   * ```
   */
  payloadClient: BasePayload | Promise<BasePayload> | (() => Promise<BasePayload>)

  /**
   * Adapter configuration options.
   */
  adapterConfig: {
    /**
     * Enable debug logging for all database operations.
     *
     * When enabled, logs detailed information about:
     * - Collection slug resolution
     * - Field name transformations
     * - Query conversions
     * - Operation timing
     *
     * @default false
     */
    enableDebugLogs?: boolean

    /**
     * The ID type used by your Payload database.
     *
     * - `'number'` - For PostgreSQL with auto-incrementing integer IDs (default Payload setup)
     * - `'text'` - For databases using string/UUID IDs
     *
     * This must match your Payload database configuration. The adapter uses this
     * to correctly convert IDs between Better Auth (always strings) and Payload.
     *
     * @example PostgreSQL with default Payload config
     * ```ts
     * idType: 'number'
     * ```
     */
    idType: 'number' | 'text'
  }
}

/**
 * Function signature for creating a Payload database adapter for Better Auth.
 *
 * Returns a Better Auth `AdapterInstance` that translates all authentication
 * database operations to Payload CMS collection operations.
 *
 * @see {@link PayloadAdapterParams} for configuration options
 */
export type PayloadAdapter = (options: PayloadAdapterParams) => AdapterInstance
