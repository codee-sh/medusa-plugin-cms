import type { z as zod } from "@medusajs/framework/zod"
import type { RegistryArea } from "../area/types"
import type { ClientBlock } from "../block/types"
import type { ClientCollection } from "../collection/types"
import { isOptionsHookSource } from "../field/is-options-hook-source"
import { SLUG_FORMAT } from "../../shared/slug/normalize-slug"
import { buildTextSchema } from "../../shared/sanitize/build-text-schema"
import { DEFAULT_LINK_POLICY } from "../../shared/sanitize/link-policy"
import { validateUrl } from "../../shared/sanitize/validate-url"
import { isRichTextDocument } from "../../shared/rich-text/is-rich-text-document"
import { isRichTextEmpty } from "../../shared/rich-text/is-rich-text-empty"
import { validateRichText } from "../../shared/rich-text/validate-rich-text"
import { DEFAULT_RICH_TEXT_FEATURES } from "../../shared/rich-text/features/default-rich-text-features"
import type { AnyField, FieldSchemas, ModelSchemas } from "../field/types"
import type { DocumentSchemaOptions } from "./types"

type Zod = typeof zod

type ObjectSchema = zod.ZodObject<zod.ZodRawShape>

/**
 * What a block type's schema reads: the Admin's projection and the registry both hold it, whichever form
 * its texts take, as the schema reads none.
 */
type SchemaBlock = Pick<ClientBlock<unknown>, "slug" | "fields" | "areas">

/**
 * What the document schema reads: its fields and, when given, its areas with the block types they
 * reach, and how deep they may nest - 1, the document's own areas only, when left out.
 */
type SchemaCollection = Pick<ClientCollection<unknown>, "fields"> & {
  areas?: RegistryArea<unknown>[]
  blocks?: SchemaBlock[]
  maxDepth?: number
}

/** How the fields of a document or a block are checked. */
type FieldRules = {
  mode: DocumentSchemaOptions["mode"]
  beforeFill: boolean
  partial: boolean
  /** The model's schemas, on the server; left out in the Admin, where a field's word decides. */
  schemas?: ModelSchemas
}

/** What building the schemas of areas needs, the same at every level. */
type AreaContext = {
  z: Zod
  /** The block types the areas may hold. */
  blocks: SchemaBlock[]
  /** How the blocks' fields are checked, without their own schemas. */
  rules: FieldRules
  /** Per block type, its schemas; left out in the Admin. */
  blockSchemas: Record<string, ModelSchemas> | undefined
  /** The deepest level an area may sit at: a document's own areas are level 1. */
  maxDepth: number
  /** Each block type's schema per level, so a type listed by several areas is built once. */
  built: Map<string, ObjectSchema>
}

/** The message of an empty value a field needs, unless its schema gives its own. */
const REQUIRED_MESSAGE = "Required"

/**
 * Builds the schema of a field holding several values: a list of its items, no longer than its `max`.
 *
 * @param z - The Zod instance of the caller.
 * @param item - The schema of one value.
 * @param max - The most values, or `undefined` for no limit.
 * @param tooMany - The message of a list longer than `max`.
 * @returns The list's schema.
 */
const buildListSchema = (
  z: Zod,
  item: zod.ZodType,
  max: number | undefined,
  tooMany: string
): zod.ZodType => {
  const list = z.array(item)

  // A refinement, not `.max()`: Zod 4 runs `.max()` on a text too, so a text would also be "too big".
  return max === undefined
    ? list
    : list.refine((values) => values.length <= max, { message: tooMany })
}

/**
 * Builds the schema of one option of a select or a combobox: one of the values its config lists, or
 * any text from a hook, whose options are fetched in the browser and never reach the server.
 *
 * @param z - The Zod instance of the caller.
 * @param field - The select or combobox.
 * @returns The option's schema.
 */
const buildOptionSchema = (z: Zod, field: AnyField): zod.ZodType =>
  isOptionsHookSource(field.options)
    ? buildTextSchema(z, { multiline: false })
    : z.enum(
        (field.options ?? []).map(({ value }) => value) as [string, ...string[]]
      )

/**
 * Builds the schema of a field's value, before it is made optional.
 *
 * @param z - The Zod instance of the caller.
 * @param field - The field.
 * @returns The value's schema.
 */
const buildValueSchema = (z: Zod, field: AnyField): zod.ZodType => {
  switch (field.kind) {
    case "text":
      return buildTextSchema(z, { multiline: field.input === "textarea" })
    case "slug":
      return z
        .string()
        .regex(SLUG_FORMAT, "Use lowercase letters, digits and hyphens")
    case "number":
      return z.number()
    case "boolean":
      return z.boolean()
    case "date":
      return z.union([z.date(), z.iso.datetime({ offset: true })])
    case "select":
      return buildOptionSchema(z, field)
    case "combobox":
      return field.multiple
        ? buildListSchema(
            z,
            buildOptionSchema(z, field),
            field.max,
            `Choose at most ${field.max} options`
          )
        : buildOptionSchema(z, field)
    case "text_list":
      return z.array(buildTextSchema(z, { multiline: false }))
    case "media":
      return field.multiple
        ? buildListSchema(
            z,
            buildTextSchema(z, { multiline: false }),
            field.max,
            `Keep at most ${field.max} files`
          )
        : buildTextSchema(z, { multiline: false })
    case "url":
      return buildTextSchema(z, { multiline: false }).superRefine(
        (url, context) => {
          const result = validateUrl(
            url,
            field.linkPolicy ?? DEFAULT_LINK_POLICY
          )

          if (result !== true) {
            context.addIssue({ code: "custom", message: result })
          }
        }
      )
    case "relationship":
      // The Admin sends an emptied field as `null`; an empty id would reach the foreign key.
      return buildTextSchema(z, { multiline: false }).refine(
        (id) => id !== "",
        { message: "Send null for no document, not an empty id" }
      )
    case "richtext":
      return z.unknown().superRefine((document, context) => {
        const [error] = validateRichText(document, {
          features: field.features ?? DEFAULT_RICH_TEXT_FEATURES,
        })

        if (error) {
          context.addIssue({ code: "custom", message: error.message })
        }
      })
  }
}

/**
 * Tells whether a value counts as filled in for a required field.
 *
 * @param field - The field.
 * @param value - The submitted value.
 * @returns Whether it is neither missing, null, an empty text, an empty list nor, for a `richtext`
 * field, a document without text.
 */
const isFilled = (field: AnyField, value: unknown): boolean =>
  value !== undefined &&
  value !== null &&
  value !== "" &&
  !(Array.isArray(value) && value.length === 0) &&
  !(
    field.kind === "richtext" &&
    isRichTextDocument(value) &&
    isRichTextEmpty(value)
  )

/**
 * Builds the shape of an object's fields, each optional and nullable.
 *
 * @param z - The Zod instance of the caller.
 * @param fields - The editable fields.
 * @returns The shape, by field name.
 */
const buildFieldShape = (z: Zod, fields: AnyField[]): zod.ZodRawShape =>
  Object.fromEntries(
    fields.map((field) => [
      field.name,
      buildValueSchema(z, field).nullable().optional(),
    ])
  )

/**
 * Finds the first message of the schemas a value fails, in their order.
 *
 * @param schemas - The schemas to run, a missing one skipped.
 * @param value - The value they get.
 * @param params - The parse's own params, such as its message for an issue without one.
 * @returns The message, or `undefined` when the value passes them all.
 */
const findSchemaMessage = (
  schemas: (zod.ZodType | undefined)[],
  value: unknown,
  params?: zod.core.ParseContext<zod.core.$ZodIssue>
): string | undefined => {
  for (const schema of schemas) {
    const result = schema?.safeParse(value, params)

    if (result && !result.success) {
      return result.error.issues[0]?.message
    }
  }

  return undefined
}

/**
 * Lists the schemas a mode checks: the one of every save, and at a publish the one of a publish after
 * it.
 *
 * @param mode - How the document is checked.
 * @param schemas - The save and publish schemas of a field or of a model.
 * @returns The schemas, in the order they run, each `undefined` when the config gives none.
 */
const listModeSchemas = (
  mode: FieldRules["mode"],
  schemas: FieldSchemas | undefined
): FieldSchemas["save"][] =>
  mode === "publish" ? [schemas?.save, schemas?.publish] : [schemas?.save]

/**
 * Brings a submitted value to the form a schema gets: a date as its ISO text, anything else as it is.
 *
 * @param value - The value.
 * @returns The value a schema gets.
 */
const normalizeRuleValue = (value: unknown): unknown =>
  value instanceof Date ? value.toISOString() : value

/**
 * Tells whether a refinement runs: next to the field errors, and not when the value is no object at
 * all.
 *
 * @param payload - The parse's payload.
 * @returns Whether the value is an object.
 */
const isObjectPayload = (payload: { value: unknown }): boolean =>
  typeof payload.value === "object" && payload.value !== null

/**
 * Finds what a field's value breaks beyond its type, the one check of a field the shape cannot make. An
 * empty value - missing, `null`, `""` or `[]` - reaches the field's schemas as `null`, with `Required`
 * as the message of an issue the schema gives none; without schemas, as in the Admin, the field's word
 * decides, `publish` at a publish only. A slug the server fills from its source is not required before
 * it is filled. A filled value of the field's type reaches its schemas with their own messages, a date
 * as its ISO text; a value of another type is left to the shape's error. A publish runs the schema of a
 * publish after the one of every save.
 *
 * @param z - The Zod instance of the caller.
 * @param field - The field.
 * @param value - Its submitted value.
 * @param rules - How the fields are checked.
 * @returns The message, or `undefined` when the value fits.
 */
const findFieldMessage = (
  z: Zod,
  field: AnyField,
  value: unknown,
  { mode, beforeFill, schemas }: FieldRules
): string | undefined => {
  const checked = listModeSchemas(mode, schemas?.fields[field.name])

  if (!isFilled(field, value)) {
    if (beforeFill && field.from) {
      return undefined
    }

    if (!schemas) {
      const required =
        field.required === "always" ||
        (mode === "publish" && field.required === "publish")

      return required ? REQUIRED_MESSAGE : undefined
    }

    return findSchemaMessage(checked, null, { error: () => REQUIRED_MESSAGE })
  }

  if (!buildValueSchema(z, field).safeParse(value).success) {
    return undefined
  }

  return findSchemaMessage(checked, normalizeRuleValue(value))
}

/**
 * Adds to an object's schema the check of each field that a type cannot say, as `findFieldMessage`
 * makes it, so a missing value is reported next to the type errors of the other fields. A field a
 * partial body leaves out is not checked.
 *
 * @param z - The Zod instance of the caller.
 * @param schema - The object's schema, its fields' shape included.
 * @param fields - The editable fields.
 * @param rules - How the fields are checked.
 * @returns The schema with the checks.
 */
const addFieldRules = (
  z: Zod,
  schema: ObjectSchema,
  fields: AnyField[],
  rules: FieldRules
): ObjectSchema => {
  return fields.reduce(
    (current, field) =>
      current.refine(
        (document: Record<string, unknown>) =>
          (rules.partial && !(field.name in document)) ||
          findFieldMessage(z, field, document[field.name], rules) === undefined,
        {
          path: [field.name],
          error: (issue) =>
            findFieldMessage(
              z,
              field,
              (issue.input as Record<string, unknown>)[field.name],
              rules
            ),
          when: isObjectPayload,
        }
      ),
    schema
  )
}

/**
 * Builds the values a model's rule gets: every field of the model by name, an empty value as `null` and
 * a date as its ISO text, as a field's schema gets them.
 *
 * @param fields - The model's fields.
 * @param values - The model's submitted values.
 * @returns The values, by field name.
 */
const buildRuleValues = (
  fields: AnyField[],
  values: Record<string, unknown>
): Record<string, unknown> =>
  Object.fromEntries(
    fields.map((field) => {
      const { name } = field
      const value = values[name]

      if (!isFilled(field, value)) {
        return [name, null]
      }

      return [name, normalizeRuleValue(value)]
    })
  )

/**
 * Adds to an object's schema its model's own rules over its fields together: the one of every save,
 * then, at a publish and only when the first passes, the one of a publish. A rule runs once no issue
 * sits at one of the model's fields, so a field is reported once, and beside the issues of anything
 * else, a block's included. An issue whose path starts with a field lands at that field; any other at
 * the object. The rules need the values once the server filled them, so a `beforeFill` check leaves them
 * to the server's later check, and a `partial` one the document's rules, a block being checked whole.
 *
 * @param schema - The object's schema, its field rules included.
 * @param fields - The model's fields.
 * @param rules - How the fields are checked, with the model's schemas on the server.
 * @returns The schema with the rules, or as it was without any.
 */
const addModelRules = (
  schema: ObjectSchema,
  fields: AnyField[],
  { mode, beforeFill, partial, schemas }: FieldRules
): ObjectSchema => {
  const checked = listModeSchemas(mode, schemas?.model)
  const modelRules = checked.filter((rule) => rule !== undefined)
  /**
   * Tells whether an issue's first path key names one of the fields, so the issue goes to that field.
   *
   * @param key - The key.
   * @returns Whether it is a field's name.
   */
  const isField = (key: PropertyKey | undefined) =>
    fields.some(({ name }) => name === key)

  if (!modelRules.length || beforeFill || partial) {
    return schema
  }

  return schema.superRefine(
    (values: Record<string, unknown>, context) => {
      const ruleValues = buildRuleValues(fields, values)

      for (const rule of modelRules) {
        const result = rule.safeParse(ruleValues)

        if (!result.success) {
          for (const issue of result.error.issues) {
            context.addIssue({
              code: "custom",
              path: isField(issue.path[0]) ? [issue.path[0]] : [],
              message: issue.message,
            })
          }

          return
        }
      }
    },
    {
      when: (payload) =>
        isObjectPayload(payload) &&
        !payload.issues.some((issue) => isField(issue.path?.[0])),
    }
  )
}

/**
 * Builds the schema of a block of a type its area allows: its fields, its areas, an optional `id`,
 * and its type. Each area is optional, as a body that leaves one out keeps it as stored, and is
 * checked as an area is, a level deeper.
 *
 * @param context - What every level shares.
 * @param block - The block type.
 * @param level - The level of the area holding the block.
 * @returns The block's schema.
 */
const buildBlockSchema = (
  context: AreaContext,
  block: SchemaBlock,
  level: number
): ObjectSchema => {
  const key = `${block.slug}:${level}`
  const known = context.built.get(key)

  if (known) {
    return known
  }

  const { z, rules, blockSchemas } = context
  const { fields } = block
  const blockRules = {
    ...rules,
    partial: false,
    schemas:
      blockSchemas && (blockSchemas[block.slug] ?? { fields: {}, model: {} }),
  }
  const schema = addModelRules(
    addFieldRules(
      z,
      z.strictObject({
        id: z.string().optional(),
        block_type: z.literal(block.slug),
        ...buildFieldShape(z, fields),
        ...Object.fromEntries(
          block.areas.map((area) => [
            area.name,
            buildAreaSchema(context, area, level + 1).optional(),
          ])
        ),
      }),
      fields,
      blockRules
    ),
    fields,
    blockRules
  )

  context.built.set(key, schema)

  return schema
}

/**
 * Builds the schema of an area: a list of blocks, each checked by the schema of its
 * `block_type`. A type the area does not allow may only be sent as `{ id, block_type }`, which keeps a
 * stored block in its place; whether that id is stored in the area is the server's check. An area past
 * `maxDepth` takes no blocks. `publish` adds the area's `minRows` and `maxRows`.
 *
 * @param context - What every level shares.
 * @param area - The area.
 * @param level - Its level: a document's own areas are level 1.
 * @returns The area's schema.
 */
const buildAreaSchema = (
  context: AreaContext,
  area: RegistryArea<unknown>,
  level: number
): zod.ZodType => {
  const { z, blocks, rules, maxDepth } = context

  if (level > maxDepth) {
    return z.array(z.unknown()).max(0, "Blocks cannot be nested this deep")
  }

  const schemas = new Map(
    blocks
      .filter(({ slug }) => area.blocks.includes(slug))
      .map((block) => [block.slug, buildBlockSchema(context, block, level)])
  )
  const keptBlock = z.strictObject({ id: z.string(), block_type: z.string() })
  const item = z
    .looseObject({ block_type: z.string() })
    .superRefine((block, refinement) => {
      const result = (schemas.get(block.block_type) ?? keptBlock).safeParse(
        block
      )

      for (const issue of result.error?.issues ?? []) {
        refinement.addIssue({ ...issue })
      }
    })

  if (rules.mode !== "publish") {
    return z.array(item)
  }

  /**
   * Names blocks in the number a message counts.
   *
   * @param count - How many blocks.
   * @returns `block` or `blocks`.
   */
  const formatBlockWord = (count: number) => (count === 1 ? "block" : "blocks")
  const min = area.minRows
  const max = area.maxRows
  const withMin = min
    ? z.array(item).min(min, `Add at least ${min} ${formatBlockWord(min)}`)
    : z.array(item)

  return max
    ? withMin.max(max, `Keep at most ${max} ${formatBlockWord(max)}`)
    : withMin
}

/**
 * Builds the validation schema of a document: its own columns and, when the collection is given with
 * them, its areas.
 *
 * Unknown keys, a column the config lists as no field included, are refused. Every field's type is
 * optional and nullable, and what its value breaks beyond its type is checked apart, so a missing value
 * is reported next to the type errors of the other fields: the server runs the fields' schemas, an empty
 * value as `null` with `Required` unless a schema says otherwise, and the Admin, which has none, a
 * field's word. An area key absent from the body is not checked; a block is checked whole,
 * its areas at any depth down to `maxDepth` included, `partial` reaching only the document's own
 * keys.
 *
 * @param z - The Zod instance of the caller: the backend's or the Admin's.
 * @param collection - The fields, the areas with the block types they reach, and `maxDepth`, that the
 * schema reads.
 * @param options - How the document is checked, as `DocumentSchemaOptions` describes.
 * @returns The schema.
 */
export const buildDocumentSchema = (
  z: Zod,
  collection: SchemaCollection,
  {
    mode,
    beforeFill = false,
    partial = false,
    schemas,
    blockSchemas,
  }: DocumentSchemaOptions
): zod.ZodType => {
  const { fields } = collection
  const rules = { mode, beforeFill, partial, schemas }
  const context: AreaContext = {
    z,
    blocks: collection.blocks ?? [],
    rules: { mode, beforeFill, partial },
    blockSchemas,
    maxDepth: collection.maxDepth ?? 1,
    built: new Map(),
  }
  const areas = Object.fromEntries(
    (collection.areas ?? []).map((area) => [
      area.name,
      buildAreaSchema(context, area, 1).optional(),
    ])
  )

  return addModelRules(
    addFieldRules(
      z,
      z.strictObject({ ...buildFieldShape(z, fields), ...areas }),
      fields,
      rules
    ),
    fields,
    rules
  )
}
