/**
 * @module lib/build-collections/utils/collection-schema
 *
 * Utilities for working with Better Auth schemas and Payload collections.
 *
 * These functions help bridge the gap between Better Auth's schema representation
 * and Payload's collection configurations, providing field name resolution and
 * validation utilities.
 */
import type { ModelKey, BetterAuthFullSchema } from '@/better-auth/generated-types'
import type { BuiltBetterAuthSchema, BetterAuthSchemas } from '@/better-auth/types'
import { type CollectionConfig, flattenAllFields } from 'payload'

/**
 * Gets the Payload collection slug for a Better Auth model from resolved schemas.
 *
 * The resolved schemas contain the final `modelName` (collection slug) after
 * applying any custom slug overrides from plugin options.
 *
 * @param resolvedSchemas - The resolved Better Auth schemas
 * @param model - The Better Auth model key (e.g., `'user'`, `'session'`)
 * @returns The Payload collection slug
 *
 * @example
 * ```ts
 * const userSlug = getSchemaCollectionSlug(resolvedSchemas, 'user')
 * // 'users' (or custom slug if configured)
 * ```
 */
export function getSchemaCollectionSlug(resolvedSchemas: BetterAuthSchemas, model: ModelKey): string {
  return resolvedSchemas?.[model]?.modelName ?? model
}

/**
 * Gets the Payload field name for a Better Auth field from resolved schemas.
 *
 * Better Auth uses internal field keys (like `userId`) that may be mapped to
 * different Payload field names (like `user` for relationships). This function
 * returns the final field name to use in Payload.
 *
 * @param resolvedSchemas - The resolved Better Auth schemas
 * @param model - The Better Auth model key
 * @param fieldKey - The Better Auth field key (e.g., `'userId'`, `'email'`)
 * @returns The Payload field name
 *
 * @example
 * ```ts
 * // BA field 'userId' might map to Payload field 'user'
 * const fieldName = getSchemaFieldName(resolvedSchemas, 'session', 'userId')
 * // 'user'
 * ```
 */
export function getSchemaFieldName<M extends ModelKey>(
  resolvedSchemas: BetterAuthSchemas,
  model: M,
  fieldKey: Extract<keyof BetterAuthFullSchema[M], string>
): string {
  return resolvedSchemas?.[model]?.fields?.[fieldKey]?.fieldName ?? fieldKey
}

/**
 * Asserts that all field keys that exist in the schema exist in the collection
 *
 * It checks based on the custom.betterAuthFieldKey property.
 *
 * @param collection - The collection object
 * @param schema - The schema object containing field definitions
 * @throws {Error} If any required field is missing from the schema
 */

export function assertAllSchemaFields(collection: CollectionConfig, schema: BuiltBetterAuthSchema): void {
  const schemaFieldKeys = Object.keys(schema.fields)
  const collectionConfigBetterAuthKeys = new Set(
    flattenAllFields(collection)
      .map((field) => field.custom?.betterAuthFieldKey)
      .filter((key): key is string => typeof key === 'string')
  )

  const missingFields = schemaFieldKeys.filter((key) => !collectionConfigBetterAuthKeys.has(key))
  if (missingFields.length === 0) return

  throw new Error(`Missing required custom.betterAuthFieldKeys in collection "${collection.slug}": ${missingFields.join(', ')}`)
}
