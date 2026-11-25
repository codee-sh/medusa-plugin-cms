import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { splitDocumentAreas } from "../../../lib/document/split-document-areas"
import type { SubmittedBlock } from "../../../lib/document/types"
import { getCollection } from "../../../lib/registry/get-collection"
import { findFreeValue } from "../utils/find-free-value"
import type { CmsTakenValues } from "./list-cms-taken-values"

export type PrepareCmsDocumentInputInput = {
  /** The collection's slug. */
  collection: string
  /** The admin user who writes the document. */
  actor_id: string
  /** The submitted values. */
  document: Record<string, unknown>
  taken: CmsTakenValues
  /** The document as stored, when an existing one is edited. */
  stored?: Record<string, unknown>
}

/** A document ready for validation: the editor's values and areas, and the authorship the plugin stamps. */
export type PreparedCmsDocument = {
  values: Record<string, unknown>
  /** Each area the body holds, under its name; an area left out is kept as stored. */
  areas: Record<string, SubmittedBlock[]>
  /** Set for a new document only; an edit keeps the stored author. */
  created_by?: string
  updated_by: string
}

/**
 * Readies a document's values for validation and writing, for a new document or an edit.
 *
 * Each empty slug field is filled from its source column through the field's `serverTransform`, with the first
 * of `<slug>`, `<slug>-2`, `<slug>-3` that `taken` does not hold; it stays empty when the source gives
 * no slug. The validation after this step checks a built slug against the slug format too. A submitted
 * slug is kept as it is. On an edit, only a slug the body sends empty is filled, from the body's source
 * or else the stored one; a slug the body leaves out stays as stored.
 *
 * Authorship comes from the actor and is kept apart from the values, which hold only what the editor may
 * write: a new document gets `created_by` and `updated_by`, an edit `updated_by` alone. The areas the
 * body holds are kept apart too, as they are written to their own rows.
 */
export const prepareCmsDocumentInputStep = createStep(
  "prepare-cms-document-input",
  async (input: PrepareCmsDocumentInputInput, { container }) => {
    const { collection } = getCollection(container, input.collection)
    const { values, areas } = splitDocumentAreas(collection, input.document)

    for (const field of collection.fields) {
      const current = values[field.name]

      if (field.kind !== "slug" || (typeof current === "string" && current)) {
        continue
      }

      if (input.stored && !(field.name in values)) {
        continue
      }

      const from = field.from ?? ""
      const source = from in values ? values[from] : input.stored?.[from]
      const base =
        typeof source === "string"
          ? collection.slugTransforms[field.name](source)
          : ""

      if (!base) {
        continue
      }

      values[field.name] = findFreeValue(base, input.taken[field.name] ?? [])
    }

    if (input.stored) {
      return new StepResponse<PreparedCmsDocument>({
        values,
        areas,
        updated_by: input.actor_id,
      })
    }

    return new StepResponse<PreparedCmsDocument>({
      values,
      areas,
      created_by: input.actor_id,
      updated_by: input.actor_id,
    })
  }
)
