import { pluralize } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { getCollection } from "../../../lib/registry/get-collection"

export type ListCmsTakenValuesInput = {
  /** The collection's slug. */
  collection: string
  /** The submitted values. */
  document: Record<string, unknown>
  /** The document being edited, whose own values are not taken. */
  id?: string
}

/** Per unique column, the values live documents already hold among those the document may take. */
export type CmsTakenValues = Record<string, string[]>

type List = (
  filters: Record<string, unknown>,
  config: { select: string[] }
) => Promise<Record<string, unknown>[]>

/**
 * Reads which values of the collection's unique columns are taken by live documents.
 *
 * A column with a submitted value is looked up by that value, an empty slug column by the slug its
 * field's `serverTransform` builds from the source; either with any `-<n>` suffix as well, so a free value can
 * be picked or suggested. Soft-deleted documents are left out by the generated list method, so their
 * values are free, and so is the edited document's when `id` names it. Without anything to look up,
 * nothing is read.
 */
export const listCmsTakenValuesStep = createStep(
  "list-cms-taken-values",
  async (input: ListCmsTakenValuesInput, { container }) => {
    const { module, collection } = getCollection(container, input.collection)
    const conditions: Record<string, unknown>[] = []

    for (const column of collection.unique) {
      const value = input.document[column]
      const source =
        input.document[
          collection.fields.find(({ name }) => name === column)?.from ?? ""
        ]
      // Only a slug column has a transform to build a value from its source.
      const base =
        typeof value === "string" && value
          ? value
          : column in collection.slugTransforms && typeof source === "string"
            ? collection.slugTransforms[column](source)
            : ""

      if (base) {
        conditions.push(
          { [column]: base },
          { [column]: { $like: `${base}-%` } }
        )
      }
    }

    if (!conditions.length) {
      return new StepResponse<CmsTakenValues>({})
    }

    const rows = await container
      .resolve<Record<string, List>>(module)
      [`list${pluralize(collection.key)}`](
        input.id
          ? { $or: conditions, id: { $ne: input.id } }
          : { $or: conditions },
        { select: collection.unique }
      )

    return new StepResponse<CmsTakenValues>(
      Object.fromEntries(
        collection.unique.map((column) => [
          column,
          rows
            .map((row) => row[column])
            .filter((value): value is string => typeof value === "string"),
        ])
      )
    )
  }
)
