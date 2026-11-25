import { z } from "@medusajs/framework/zod"
import { buildDocumentSchema } from "./build-document-schema"
import { buildDocumentErrors } from "./build-document-errors"
import type { RegistryCollection } from "../collection/types"
import type { Registry } from "../registry/types"
import type { DocumentSchemaOptions, DocumentError } from "./types"

/**
 * Finds what a document's values break in its collection's schema, `shape` unless `publish` is asked
 * for, its areas with the registry's blocks and the schemas of fields and blocks included.
 *
 * Kept apart from the schema builder, which the Admin imports, because this file loads the backend's
 * Zod, and the registry's schemas exist on the server only.
 *
 * @param registry - The resolved registry, whose blocks the areas allow.
 * @param collection - The collection the document belongs to; its fields' schemas are applied.
 * @param document - The submitted values, with the areas the body holds.
 * @param options - `mode`, `beforeFill` and `partial`, as `DocumentSchemaOptions` describes; `mode`
 * is `shape` when left out.
 * @returns One error per problem, empty when the values fit.
 */
export const findDocumentErrors = (
  registry: Registry,
  collection: RegistryCollection,
  document: unknown,
  {
    mode = "shape",
    ...options
  }: Partial<Omit<DocumentSchemaOptions, "schemas" | "blockSchemas">> = {}
): DocumentError[] => {
  const blocks = Object.values(registry.blocks)
  const result = buildDocumentSchema(
    z,
    {
      fields: collection.fields,
      areas: collection.areas,
      blocks,
      maxDepth: registry.maxDepth,
    },
    {
      ...options,
      mode,
      schemas: collection.schemas,
      blockSchemas: Object.fromEntries(
        blocks.map(({ slug, schemas }) => [slug, schemas])
      ),
    }
  ).safeParse(document)

  return result.success ? [] : buildDocumentErrors(result.error.issues)
}
