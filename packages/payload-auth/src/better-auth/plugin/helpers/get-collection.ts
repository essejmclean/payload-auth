/**
 * @module helpers/get-collection
 *
 * Utilities for looking up Payload collections by Better Auth model keys and field mappings.
 *
 * These helpers bridge the gap between Better Auth's internal model/field keys and
 * Payload's collection configurations, enabling field name resolution across the two systems.
 */
import type { BetterAuthFullSchema, ModelKey } from '@/better-auth/generated-types'
import { flattenAllFields, type Collection, type CollectionConfig } from 'payload'

/**
 * Finds a Payload collection configuration by its Better Auth model key.
 *
 * This function searches through the collections map to find a collection that either:
 * 1. Has a `custom.betterAuthModelKey` property matching the given model key, or
 * 2. Has a `slug` matching the model key (fallback)
 *
 * This is useful when you have a Better Auth model key (like `'user'` or `'session'`)
 * and need to get the corresponding Payload collection configuration.
 *
 * @param collections - A record of Payload collections, typically from `payload.collections`
 * @param modelKey - The Better Auth model key to search for (e.g., `'user'`, `'session'`, `'organization'`)
 * @returns The matching Payload collection configuration
 * @throws {Error} If no collection with the given model key is found
 *
 * @example Basic usage
 * ```ts
 * const userCollection = getCollectionByModelKey(payload.collections, 'user')
 * console.log(userCollection.slug) // 'users'
 * ```
 *
 * @example In a hook or endpoint
 * ```ts
 * const sessionCollection = getCollectionByModelKey(payload.collections, 'session')
 * const sessions = await payload.find({
 *   collection: sessionCollection.slug,
 *   where: { userId: { equals: user.id } }
 * })
 * ```
 */
export function getCollectionByModelKey(collections: Record<string, Collection>, modelKey: ModelKey | string): CollectionConfig {
  const collection = Object.values(collections).find((c) => {
    return c.config?.custom?.betterAuthModelKey === modelKey || c.config?.slug === modelKey
  })

  if (!collection) {
    throw new Error(`Collection with key ${modelKey} not found`)
  }

  return collection.config
}

/**
 * Retrieves the field name from a collection based on the field key
 *
 * This function searches through the fields of a collection to find a field
 * that has a matching custom property betterAuthFieldKey.
 *
 * @param collection - The collection configuration to search through
 * @param model - The model key of the collection (This is really just for type hinting)
 * @param fieldKey - The key of the field to search for
 * @returns The name of the field if found, otherwise the field key itself
 */
export function getCollectionFieldNameByFieldKey<M extends ModelKey>(
  collection: CollectionConfig,
  model: M,
  fieldKey: Extract<keyof BetterAuthFullSchema[M], string>
): string {
  const fields = flattenAllFields({ fields: collection.fields })
  return fields.find((f) => f.custom?.betterAuthFieldKey === fieldKey)?.name ?? fieldKey
}

export function getCollectionFieldNameByFieldKeyUntyped(collection: CollectionConfig, fieldKey: string): string {
  const fields = flattenAllFields({ fields: collection.fields })
  return fields.find((f) => f.custom?.betterAuthFieldKey === fieldKey || f.name === fieldKey)?.name ?? fieldKey
}

/**
 * Retrieves the field key from a collection based on the collection field name
 *
 * This function searches through the fields of a collection to find a field
 * that has a matching name.
 *
 * @param collection - The collection configuration to search through
 * @param fieldName - The name of the field to search for
 * @returns The key of the field if found, otherwise the field name itself
 */
export function getFieldKeyByCollectionFieldName(collection: CollectionConfig, fieldName: string): string {
  const fields = flattenAllFields({ fields: collection.fields })
  return fields.find((f) => f.name === fieldName)?.custom?.betterAuthFieldKey ?? fieldName
}
