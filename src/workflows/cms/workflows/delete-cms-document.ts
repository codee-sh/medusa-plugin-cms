import { emitEventStep } from "@medusajs/medusa/core-flows"
import {
  createHook,
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { DocumentEvents } from "../../../lib/document-events"
import { clearCmsCacheStep } from "../steps/clear-cms-cache"
import { deleteCmsDocumentContentStep } from "../steps/delete-cms-document-content"
import { deleteCmsVersionsStep } from "../steps/delete-cms-versions"
import { getCmsDocumentStep } from "../steps/get-cms-document"
import { listCmsVersionsStep } from "../steps/list-cms-versions"
import { prepareCmsDeleteStep } from "../steps/prepare-cms-delete"
import { validateCmsSingletonStep } from "../steps/validate-cms-singleton"

export type DeleteCmsDocumentInput = {
  /** The collection's slug. */
  collection: string
  /** The document's id. */
  id: string
}

/**
 * Deletes a document of a collection, published or not, and returns its id.
 *
 * Step order:
 *   1. getCmsDocumentStep - reads the live document with its areas, or throws `NOT_FOUND`
 *   2. validateCmsSingletonStep - refuses the delete in a singleton
 *   3. prepareCmsDeleteStep - decides the soft delete of its row
 *   4. the `validate` hook - a host's handler, given the input, the collection and the stored document,
 *      refuses the delete by throwing; a no-op without one
 *   5. deleteCmsDocumentContentStep - soft-deletes it, its areas and blocks with it
 *   6. clearCmsCacheStep - clears the cached store reads the write changes, the collection's lists among them
 *   7. listCmsVersionsStep - reads its versions
 *   8. deleteCmsVersionsStep - soft-deletes them
 *   9. emitEventStep - `cms.document.deleted` with the collection and the id
 *
 * deleteCmsDocumentContentStep restores the document during compensation, keeping deleted what was not
 * live before, and deleteCmsVersionsStep its versions.
 */
export const deleteCmsDocumentWorkflow = createWorkflow(
  "delete-cms-document",
  (input: DeleteCmsDocumentInput) => {
    const stored = getCmsDocumentStep(input)

    validateCmsSingletonStep({
      collection: input.collection,
      operation: "delete",
    })

    const write = prepareCmsDeleteStep({ collection: input.collection, stored })

    const validate = createHook("validate", {
      input,
      collection: input.collection,
      document: stored,
    })

    deleteCmsDocumentContentStep({
      collection: input.collection,
      delete: write.delete,
      stored,
    })
    clearCmsCacheStep({ collection: input.collection, write })

    const versions = listCmsVersionsStep({
      collection: input.collection,
      document_id: input.id,
    })

    deleteCmsVersionsStep({
      ids: transform({ versions }, ({ versions }) =>
        versions.versions.map(({ id }) => id)
      ),
    })
    emitEventStep({
      eventName: DocumentEvents.DOCUMENT_DELETED,
      data: { collection: input.collection, id: input.id },
    })

    return new WorkflowResponse(input.id, { hooks: [validate] })
  }
)
