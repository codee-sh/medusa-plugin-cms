import { z } from "zod"
import type { ClientCollection } from "../../../lib/collection/types"
import { buildDocumentSchema } from "../../../lib/document/build-document-schema"
import { buildFieldDefaults } from "../common/utils/build-field-defaults"
import type { DocumentFormValues } from "../common/types"
import type { Field } from "../../../lib/field/types"
import { collectLayoutNames } from "../../components/manager-form-fields/layout/utils/collect-layout-names"
import { pruneLayoutToShown } from "../../components/manager-form-fields/layout/utils/prune-layout-to-shown"

/**
 * Picks the fields the create form shows: the editable ones required always or at publish, and the other
 * fields of each component node that edits one of them, as the layout pruned to the required fields keeps
 * such a node whole.
 *
 * @param collection - The collection the document belongs to.
 * @returns The fields, in the model's order.
 */
export const getCreateFields = (collection: ClientCollection): Field[] => {
  const isRequired = (name: string) =>
    collection.fields.some((field) => field.name === name && field.required)
  const laidOut = new Set(
    collection.admin.sections.flatMap((section) =>
      collectLayoutNames(pruneLayoutToShown(section.fields, isRequired))
    )
  )

  return collection.fields.filter(
    (field) => field.required || laidOut.has(field.name)
  )
}

/**
 * Gives each field the empty value its input starts from.
 *
 * @param fields - The form's fields.
 * @returns The form's default values.
 */
export const buildCreateDefaults = (fields: Field[]): DocumentFormValues => ({
  document: buildFieldDefaults(fields),
})

/**
 * Drops the values an input holds when left empty, so they are not sent.
 *
 * @param document - The form's values.
 * @returns The values without empty texts and empty dates.
 */
const dropEmptyValues = (document: unknown): unknown =>
  Object.fromEntries(
    Object.entries(document as Record<string, unknown>).filter(
      ([, value]) => value !== "" && value !== null && value !== undefined
    )
  )

/**
 * Builds the form's schema from the collection's `shape` schema, the one the server checks.
 *
 * @param collection - The collection the document belongs to.
 * @returns The schema.
 */
export const buildCreateSchema = (collection: ClientCollection) =>
  // The document schema is built from the config at runtime, so its type is only the form's values.
  z.object({
    document: z.preprocess(
      dropEmptyValues,
      buildDocumentSchema(z, collection, { mode: "shape" })
    ),
  }) as unknown as z.ZodType<DocumentFormValues, DocumentFormValues>
