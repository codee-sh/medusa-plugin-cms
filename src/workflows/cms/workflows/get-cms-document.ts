import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { getCmsDocumentStep } from "../steps/get-cms-document"
import { getCmsCollectionStep } from "../steps/get-cms-collection"
import { listCmsVersionsStep } from "../steps/list-cms-versions"
import { listCmsDocumentMediaStep } from "../steps/list-cms-document-media"
import {
  buildAdminDocumentRead,
  listAdminReadDocuments,
  completeAdminDocumentRead,
} from "../utils/build-admin-document"

export type GetCmsDocumentWorkflowInput = {
  /** The collection's slug. */
  collection: string
  /** The document's id. */
  id: string
}

/**
 * Reads one document of a collection for the Admin: its row, and its latest version apart. A collection
 * without drafts has no version to show: versions left from before drafts were turned off are not read
 * into the answer.
 *
 * Step order:
 *   1. getCmsCollectionStep - reads whether the collection has drafts
 *   2. getCmsDocumentStep - reads the live document, or throws `NOT_FOUND`
 *   3. listCmsVersionsStep - reads its latest version with the snapshot, if it has one
 *   4. listCmsDocumentMediaStep - reads the media records the row and the snapshot name, which the read
 *      holds in place of their values
 *
 * The workflow only reads, so it has nothing to compensate.
 */
export const getCmsDocumentWorkflow = createWorkflow(
  "get-cms-document",
  (input: GetCmsDocumentWorkflowInput) => {
    const options = getCmsCollectionStep({ collection: input.collection })
    const document = getCmsDocumentStep(input)
    const latest = listCmsVersionsStep({
      collection: input.collection,
      document_id: input.id,
      latest: true,
      with_snapshot: true,
    })
    const read = transform(
      { options, document, latest },
      ({ options, document, latest }) =>
        buildAdminDocumentRead(
          document,
          options.drafts ? latest.versions[0] : null
        )
    )

    const readMedia = listCmsDocumentMediaStep({
      collection: input.collection,
      documents: transform({ read }, ({ read }) =>
        listAdminReadDocuments(read)
      ),
    }).config({ name: "retrieve-cms-read-media" })
    const answer = transform({ read, readMedia }, ({ read, readMedia }) =>
      completeAdminDocumentRead(read, readMedia)
    )

    return new WorkflowResponse(answer)
  }
)
