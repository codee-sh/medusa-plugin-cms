import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { formatEntityName } from "../../../lib/model/format-entity-name"
import { getRegistry } from "../../../lib/registry/get-registry"

export type ListCmsReferencesInput = {
  /** The slug of the collection the document belongs to. */
  collection: string
  /** The document's id. */
  id: string
}

/** A live row pointing at a document: its collection, the relationship field, and its own id. */
export type CmsReference = {
  collection: string
  field: string
  id: string
}

/**
 * Reads the live rows pointing at a document: for every relationship field of any collection whose
 * `relationTo` is the document's collection, the rows whose key holds its id, one `query.graph` per
 * field, which leaves soft-deleted rows out. A document pointing at itself is left out of its own
 * references. Without a field pointing at the collection, nothing is read.
 */
export const listCmsReferencesStep = createStep(
  "list-cms-references",
  async (input: ListCmsReferencesInput, { container }) => {
    const registry = getRegistry(container)
    const sources = Object.values(registry.collections).flatMap((collection) =>
      collection.fields
        .filter(
          ({ kind, relationTo }) =>
            kind === "relationship" && relationTo === input.collection
        )
        .map((field) => ({ collection, field: field.name }))
    )
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const references = await Promise.all(
      sources.map(async ({ collection, field }) => {
        const { data } = await query.graph({
          entity: formatEntityName(collection.key),
          fields: ["id"],
          filters: { [field]: input.id },
        })

        return (data as { id: string }[])
          .filter(
            ({ id }) => collection.slug !== input.collection || id !== input.id
          )
          .map(({ id }) => ({ collection: collection.slug, field, id }))
      })
    )

    return new StepResponse<CmsReference[]>(references.flat())
  }
)
