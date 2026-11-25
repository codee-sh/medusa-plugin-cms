import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { validateCmsDraftsStep } from "../steps/validate-cms-drafts"
import { getCmsDocumentStep } from "../steps/get-cms-document"
import { getCmsVersionStep } from "../steps/get-cms-version"

export type GetCmsDocumentVersionInput = {
  /** The collection's slug. */
  collection: string
  /** The document's id. */
  id: string
  /** The version's id. */
  version_id: string
}

/**
 * Reads one version of a document with its snapshot, for the Admin to show it.
 *
 * Step order:
 *   1. validateCmsDraftsStep - refuses a collection without drafts, which has no versions
 *   2. getCmsDocumentStep - reads the document's own row, or throws `NOT_FOUND`
 *   3. getCmsVersionStep - reads the version, or throws `NOT_FOUND`
 *
 * The workflow only reads, so it has nothing to compensate.
 */
export const getCmsDocumentVersionWorkflow = createWorkflow(
  "get-cms-document-version",
  (input: GetCmsDocumentVersionInput) => {
    validateCmsDraftsStep({ collection: input.collection })

    getCmsDocumentStep({
      collection: input.collection,
      id: input.id,
      with_areas: false,
    })

    const version = getCmsVersionStep({
      collection: input.collection,
      document_id: input.id,
      id: input.version_id,
    })

    return new WorkflowResponse(version)
  }
)
