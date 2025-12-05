/**
 * @module lib/build-collections/utils/transform-schema-fields-to-payload
 *
 * Transforms Better Auth schema fields into Payload CMS field configurations.
 *
 * This module is the core of the schema-to-collection translation. It takes
 * Better Auth's database field attributes and produces properly typed Payload
 * field configurations with appropriate admin UI, validation, and relationships.
 */
import type { BuiltBetterAuthSchema, FieldRule } from '@/better-auth/plugin/types'
import type { DBFieldAttribute } from 'better-auth/db'
import type { Field, RelationshipField } from 'payload'
import { getAdditionalFieldProperties } from './model-field-transformations'

/**
 * Generates Payload field configurations from a Better Auth schema.
 *
 * This function iterates through all fields in a BA schema and transforms each
 * one into a Payload-compatible field configuration. It supports:
 *
 * - Type conversion (BA types → Payload field types)
 * - Relationship field detection and configuration
 * - Custom field rules for conditional transformations
 * - Additional property overrides per field
 *
 * @param params - Transform parameters
 * @param params.schema - The Better Auth schema containing field definitions
 * @param params.fieldRules - Optional rules for conditional field transformations
 * @param params.additionalProperties - Optional overrides for specific fields by key
 * @returns Array of Payload field configurations, or null if schema has no fields
 *
 * @example
 * ```ts
 * const fields = getCollectionFields({
 *   schema: userSchema,
 *   fieldRules: [
 *     {
 *       condition: (f) => f.fieldName === 'createdAt',
 *       transform: () => ({ admin: { hidden: true } })
 *     }
 *   ],
 *   additionalProperties: {
 *     email: () => ({ index: true })
 *   }
 * })
 * ```
 */
export function getCollectionFields({
  schema,
  fieldRules = [],
  additionalProperties = {}
}: {
  schema: BuiltBetterAuthSchema
  fieldRules?: FieldRule[]
  additionalProperties?: Record<string, (field: DBFieldAttribute) => Partial<Field>>
}): Field[] | null {
  const payloadFields = Object.entries(schema.fields).map(([fieldKey, field]) => {
    return convertSchemaFieldToPayload({ field, fieldKey, fieldRules, additionalProperties })
  })

  return payloadFields
}

/**
 * Converts a single Better Auth field attribute to a Payload field configuration.
 *
 * This function handles the core type mapping and applies any field-specific
 * overrides or transformations. Each converted field includes a `custom.betterAuthFieldKey`
 * property to maintain the mapping back to the original BA field.
 *
 * @param params - Conversion parameters
 * @param params.field - The Better Auth field attribute
 * @param params.fieldKey - The BA field key (e.g., `'email'`, `'userId'`)
 * @param params.fieldRules - Optional rules for conditional transformations
 * @param params.additionalProperties - Optional property overrides
 * @returns A Payload field configuration
 *
 * @example
 * ```ts
 * const payloadField = convertSchemaFieldToPayload({
 *   field: { type: 'string', required: true, fieldName: 'email' },
 *   fieldKey: 'email'
 * })
 * // { name: 'email', type: 'text', required: true, custom: { betterAuthFieldKey: 'email' } }
 * ```
 */
export function convertSchemaFieldToPayload({
  field,
  fieldKey,
  fieldRules = [],
  additionalProperties = {}
}: {
  field: DBFieldAttribute
  fieldKey: string
  fieldRules?: FieldRule[]
  additionalProperties?: Record<string, (field: DBFieldAttribute) => Partial<Field>>
}): Field {
  const { type, hasMany } = getPayloadFieldProperties({ field })
  const additionalFieldProperties = getAdditionalFieldProperties({
    field,
    fieldKey,
    fieldRules,
    additionalProperties,
  })
  const baseField = {
    name: field.fieldName ?? fieldKey,
    type,
    ...(hasMany && { hasMany }),
    ...(field.required && { required: true }),
    ...(field.unique && { unique: true }),
    ...additionalFieldProperties,
    custom: {
      betterAuthFieldKey: fieldKey
    }
  } as Field

  if (field.references) {
    return {
      ...baseField,
      ...('relationTo' in additionalFieldProperties
        ? { relationTo: additionalFieldProperties.relationTo }
        : { relationTo: field.references.model })
    } as RelationshipField
  }

  return baseField
}

/**
 * Determines the Payload field type and options from a Better Auth field.
 *
 * Maps Better Auth's type system to Payload's field types:
 * - `string` → `text`
 * - `number` → `number`
 * - `boolean` → `checkbox`
 * - `date` → `date`
 * - `string[]` → `text` with `hasMany: true`
 * - `number[]` → `number` with `hasMany: true`
 * - Fields with `references` → `relationship`
 *
 * @param params - Parameters object
 * @param params.field - The Better Auth field attribute
 * @returns Object with `type` and optionally `hasMany`
 *
 * @example
 * ```ts
 * getPayloadFieldProperties({ field: { type: 'string' } })
 * // { type: 'text' }
 *
 * getPayloadFieldProperties({ field: { type: 'string[]' } })
 * // { type: 'text', hasMany: true }
 *
 * getPayloadFieldProperties({ field: { type: 'string', references: { model: 'user' } } })
 * // { type: 'relationship' }
 * ```
 */
export function getPayloadFieldProperties({ field }: { field: DBFieldAttribute }): {
  type: Field['type']
  hasMany?: boolean
} {
  const type = field.type

  if ('references' in field) {
    return { type: 'relationship' }
  }

  if (type === 'number[]') {
    return { type: 'number', hasMany: true }
  }

  if (type === 'string[]') {
    return { type: 'text', hasMany: true }
  }

  switch (type) {
    case 'boolean':
      return { type: 'checkbox' }
    case 'date':
      return { type: 'date' }
    case 'string':
      return { type: 'text' }
    case 'number':
      return { type: 'number' }
    default:
      return { type: 'text' }
  }
}
