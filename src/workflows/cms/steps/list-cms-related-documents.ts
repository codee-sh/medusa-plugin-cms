import { pluralize } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { getCollection } from "../../../lib/registry/get-collection"

export type ListCmsRelatedDocumentsInput = {
  /** The collection's slug. */
  collection: string
  /** The values to check, a body's or a version's. */
  document: Record<string, unknown>
}

/** Per relationship field holding an id, the live documents of its target among the ids it holds. */
export type CmsRelatedDocuments = Record<string, string[]>

type List = (
  filters: Record<string, unknown>,
  config: { select: string[] }
) => Promise<{ id: string }[]>

/**
 * Reads which ids the document's relationship fields hold are live documents of their targets: one
 * read per target collection, through its generated list method, which leaves soft-deleted documents
 * out, a draft kept. A field left out or empty is not read, and without one nothing is.
 */
export const listCmsRelatedDocumentsStep = createStep(
  "list-cms-related-documents",
  async (input: ListCmsRelatedDocumentsInput, { container }) => {
    const { module, collection } = getCollection(container, input.collection)
    const held = collection.fields.flatMap((field) => {
      const id = input.document[field.name]

      return field.kind === "relationship" && typeof id === "string" && id
        ? [{ field: field.name, target: field.relationTo!, id }]
        : []
    })
    const targets = [...new Set(held.map(({ target }) => target))]
    const service = container.resolve<Record<string, List>>(module)
    const live = await Promise.all(
      targets.map(async (target) => {
        const { collection: targetCollection } = getCollection(
          container,
          target
        )
        const ids = held
          .filter((relation) => relation.target === target)
          .map(({ id }) => id)
        const rows = await service[`list${pluralize(targetCollection.key)}`](
          { id: ids },
          { select: ["id"] }
        )

        return { target, ids: rows.map(({ id }) => id) }
      })
    )

    return new StepResponse<CmsRelatedDocuments>(
      Object.fromEntries(
        held.map(({ field, target, id }) => [
          field,
          live
            .find((read) => read.target === target)!
            .ids.filter((liveId) => liveId === id),
        ])
      )
    )
  }
)
