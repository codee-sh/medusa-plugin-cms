import { emitEventStep } from "@medusajs/medusa/core-flows"
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  DocumentEvents,
  type DocumentUpdatedEventData,
} from "../../../lib/document-events"
import { validateCmsDraftsStep } from "../steps/validate-cms-drafts"
import { getCmsDocumentStep } from "../steps/get-cms-document"
import { listCmsVersionsStep } from "../steps/list-cms-versions"
import { prepareCmsDiscardStep } from "../steps/prepare-cms-discard"
import { updateCmsLatestVersionStep } from "../steps/update-cms-latest-version"
import { validateCmsBaseVersionStep } from "../steps/validate-cms-base-version"
import { listCmsDocumentMediaStep } from "../steps/list-cms-document-media"
import {
  buildAdminDocumentRead,
  listAdminReadDocuments,
  completeAdminDocumentRead,
} from "../utils/build-admin-document"

export type DiscardCmsDocumentDraftInput = {
  /** The collection's slug. */
  collection: string
  /** The document's id. */
  id: string
  /** The number of the version the editor's form showed. */
  base_version?: number | null
}

/**
 * Returns a published document with unpublished changes to its published content, and returns its row
 * and the version it now edits.
 *
 * Nothing is deleted: `latest` moves back to the newest published version, the drafts stay in the
 * history, and the next save is numbered after them. The row is untouched, as it already holds the
 * published content.
 *
 * Step order:
 *   1. validateCmsDraftsStep - refuses a collection without drafts, which has no versions
 *   2. getCmsDocumentStep - reads the stored row, or throws `NOT_FOUND`
 *   3. listCmsVersionsStep - reads the latest version
 *   4. validateCmsBaseVersionStep - refuses a discard from a version that is no longer the latest
 *   5. listCmsVersionsStep - reads the newest published version
 *   6. prepareCmsDiscardStep - picks it, or refuses a document with nothing to discard
 *   7. updateCmsLatestVersionStep - makes it the latest
 *   8. emitEventStep - `cms.document.updated` with the collection, the id, `discard` and the row's status
 *   9. listCmsDocumentMediaStep - reads the media records of the answer, held in place of their values
 *
 * updateCmsLatestVersionStep moves `latest` back during compensation.
 */
export const discardCmsDocumentDraftWorkflow = createWorkflow(
  "discard-cms-document-draft",
  (input: DiscardCmsDocumentDraftInput) => {
    validateCmsDraftsStep({ collection: input.collection })

    const stored = getCmsDocumentStep({
      collection: input.collection,
      id: input.id,
    })
    const latestList = listCmsVersionsStep({
      collection: input.collection,
      document_id: input.id,
      latest: true,
    })
    const latest = transform(
      { latestList },
      ({ latestList }) => latestList.versions[0]
    )

    validateCmsBaseVersionStep({ latest, base_version: input.base_version })

    const publishedList = listCmsVersionsStep({
      collection: input.collection,
      document_id: input.id,
      status: "published",
      limit: 1,
      with_snapshot: true,
    }).config({ name: "list-cms-published-versions" })
    const target = prepareCmsDiscardStep({
      stored,
      latest,
      published: transform(
        { publishedList },
        ({ publishedList }) => publishedList.versions[0]
      ),
    })

    updateCmsLatestVersionStep({
      collection: input.collection,
      document_id: input.id,
      version_id: target.id,
    })

    emitEventStep({
      eventName: DocumentEvents.DOCUMENT_UPDATED,
      data: transform(
        { input, stored },
        ({ input, stored }): DocumentUpdatedEventData => ({
          collection: input.collection,
          id: input.id,
          action: "discard",
          status: stored.status,
        })
      ),
    })

    const read = transform({ stored, target }, ({ stored, target }) =>
      buildAdminDocumentRead(stored, { ...target, latest: true })
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
