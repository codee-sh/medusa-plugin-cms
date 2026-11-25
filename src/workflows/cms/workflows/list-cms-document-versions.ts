import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { validateCmsDraftsStep } from "../steps/validate-cms-drafts"
import { getCmsDocumentStep } from "../steps/get-cms-document"
import { listCmsVersionsStep } from "../steps/list-cms-versions"

export type ListCmsDocumentVersionsInput = {
  /** The collection's slug. */
  collection: string
  /** The document's id. */
  id: string
  limit: number
  offset: number
}

/**
 * Lists one page of a document's history, newest first, without the snapshots.
 *
 * Step order:
 *   1. validateCmsDraftsStep - refuses a collection without drafts, which has no versions
 *   2. getCmsDocumentStep - reads the document's own row, or throws `NOT_FOUND`
 *   3. listCmsVersionsStep - reads the page of its versions, with the total count
 *
 * The workflow only reads, so it has nothing to compensate.
 */
export const listCmsDocumentVersionsWorkflow = createWorkflow(
  "list-cms-document-versions",
  (input: ListCmsDocumentVersionsInput) => {
    validateCmsDraftsStep({ collection: input.collection })

    getCmsDocumentStep({
      collection: input.collection,
      id: input.id,
      with_areas: false,
    })

    const page = listCmsVersionsStep({
      collection: input.collection,
      document_id: input.id,
      limit: input.limit,
      offset: input.offset,
    })

    return new WorkflowResponse(page)
  }
)
