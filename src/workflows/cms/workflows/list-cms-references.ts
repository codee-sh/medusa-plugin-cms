import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { getCmsDocumentStep } from "../steps/get-cms-document"
import {
  type ListCmsReferencesInput,
  listCmsReferencesStep,
} from "../steps/list-cms-references"

/**
 * Lists the live rows pointing at a live document, so the Admin can show where it is used and a host's
 * hook can refuse to unpublish or delete it.
 *
 * Step order:
 *   1. getCmsDocumentStep - reads the document's own row, or throws `NOT_FOUND`
 *   2. listCmsReferencesStep - reads the rows whose relationship fields hold its id
 *
 * The workflow only reads, so it has nothing to compensate.
 */
export const listCmsReferencesWorkflow = createWorkflow(
  "list-cms-references",
  (input: ListCmsReferencesInput) => {
    getCmsDocumentStep({
      collection: input.collection,
      id: input.id,
      with_areas: false,
    })

    const references = listCmsReferencesStep(input)

    return new WorkflowResponse(references)
  }
)
