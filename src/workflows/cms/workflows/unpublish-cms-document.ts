import { emitEventStep } from "@medusajs/medusa/core-flows"
import {
  createHook,
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { DocumentEvents } from "../../../lib/document-events"
import { validateCmsDraftsStep } from "../steps/validate-cms-drafts"
import { clearCmsCacheStep } from "../steps/clear-cms-cache"
import { getCmsDocumentStep } from "../steps/get-cms-document"
import { listCmsVersionsStep } from "../steps/list-cms-versions"
import { prepareCmsUnpublishStep } from "../steps/prepare-cms-unpublish"
import { updateCmsDocumentContentStep } from "../steps/update-cms-document-content"
import { listCmsDocumentMediaStep } from "../steps/list-cms-document-media"
import {
  buildAdminDocumentRead,
  listAdminReadDocuments,
  completeAdminDocumentRead,
} from "../utils/build-admin-document"
import { createCmsDocumentVersionWorkflow } from "./create-cms-document-version"

export type UnpublishCmsDocumentInput = {
  /** The collection's slug. */
  collection: string
  /** The document's id. */
  id: string
  /** The admin user who unpublishes it. */
  actor_id: string
}

/**
 * Turns a published document back into a draft, records that in its history, and returns the document
 * and the new version.
 *
 * The new version takes the latest version's content, so a draft waiting to be published stays what
 * the Admin edits; a document without versions takes the document as read after the write.
 *
 * Step order:
 *   1. validateCmsDraftsStep - refuses a collection without drafts, which has no versions
 *   2. getCmsDocumentStep - reads the stored row without its areas, or throws `NOT_FOUND`
 *   3. listCmsVersionsStep - reads the latest version with its snapshot
 *   4. prepareCmsUnpublishStep - decides the update of its status, `published_at` cleared
 *   5. the `validate` hook - a host's handler, given the input, the collection and the stored row
 *      without its areas, refuses the unpublish by throwing; a no-op without one
 *   6. updateCmsDocumentContentStep - writes it
 *   7. clearCmsCacheStep - clears the cached store reads the write changes, the collection's lists among them
 *   8. getCmsDocumentStep - reads the document back with its areas
 *   9. createCmsDocumentVersionWorkflow - records a draft version, an `unpublish`
 *   10. emitEventStep - `cms.document.updated` with the collection, the id, `unpublish` and `draft`
 *   11. listCmsDocumentMediaStep - reads the media records of the answer, held in place of their values
 *
 * updateCmsDocumentContentStep writes the stored status back during compensation, and the version
 * workflow removes its version.
 */
export const unpublishCmsDocumentWorkflow = createWorkflow(
  "unpublish-cms-document",
  (input: UnpublishCmsDocumentInput) => {
    validateCmsDraftsStep({ collection: input.collection })

    const stored = getCmsDocumentStep({
      collection: input.collection,
      id: input.id,
      with_areas: false,
    })
    const latestList = listCmsVersionsStep({
      collection: input.collection,
      document_id: input.id,
      latest: true,
      with_snapshot: true,
    })
    const latest = transform(
      { latestList },
      ({ latestList }) => latestList.versions[0]
    )
    const write = prepareCmsUnpublishStep({
      collection: input.collection,
      stored,
    })

    const validate = createHook("validate", {
      input,
      collection: input.collection,
      document: stored,
    })

    updateCmsDocumentContentStep({
      collection: input.collection,
      update: write.update,
      stored,
    })
    clearCmsCacheStep({ collection: input.collection, write })

    const row = getCmsDocumentStep({
      collection: input.collection,
      id: input.id,
    }).config({ name: "get-cms-unpublished-document" })
    const version = createCmsDocumentVersionWorkflow.runAsStep({
      input: transform({ input, row, latest }, ({ input, row, latest }) => ({
        collection: input.collection,
        document_id: input.id,
        document: latest?.snapshot ?? row,
        previous: latest?.snapshot ?? row,
        status: "draft" as const,
        change_type: "unpublish" as const,
        actor_id: input.actor_id,
      })),
    })

    emitEventStep({
      eventName: DocumentEvents.DOCUMENT_UPDATED,
      data: {
        collection: input.collection,
        id: input.id,
        action: "unpublish",
        status: "draft",
      },
    })

    const read = transform({ row, version }, ({ row, version }) =>
      buildAdminDocumentRead(row, version)
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

    return new WorkflowResponse(answer, { hooks: [validate] })
  }
)
