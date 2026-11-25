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
import { createCmsDocumentContentStep } from "../steps/create-cms-document-content"
import { deleteCmsDocumentContentStep } from "../steps/delete-cms-document-content"
import { getCmsDocumentStep } from "../steps/get-cms-document"
import { listCmsTakenValuesStep } from "../steps/list-cms-taken-values"
import { listCmsVersionsStep } from "../steps/list-cms-versions"
import { prepareCmsPublishStep } from "../steps/prepare-cms-publish"
import { updateCmsDocumentContentStep } from "../steps/update-cms-document-content"
import { validateCmsBaseVersionStep } from "../steps/validate-cms-base-version"
import { validateCmsDocumentStep } from "../steps/validate-cms-document"
import { listCmsDocumentMediaStep } from "../steps/list-cms-document-media"
import { listCmsRelatedDocumentsStep } from "../steps/list-cms-related-documents"
import {
  buildAdminDocumentRead,
  listAdminReadDocuments,
  completeAdminDocumentRead,
} from "../utils/build-admin-document"
import { createCmsDocumentVersionWorkflow } from "./create-cms-document-version"

export type PublishCmsDocumentInput = {
  /** The collection's slug. */
  collection: string
  /** The document's id. */
  id: string
  /** The admin user who publishes it. */
  actor_id: string
  /** The number of the version the editor's form showed; `null` for a document without versions. */
  base_version?: number | null
}

/**
 * Publishes a document's latest version, and returns the document and the published version.
 *
 * The latest version's content goes to the rows the store serves, checked as a publish: the fields a
 * publish needs, its areas, and the unique values against the other live documents. A block the draft
 * added is created, and one it removed is deleted. A document without versions publishes its row.
 *
 * Step order:
 *   1. validateCmsDraftsStep - refuses a collection without drafts, which has no versions
 *   2. getCmsDocumentStep - reads the stored row, or throws `NOT_FOUND`
 *   3. listCmsVersionsStep - reads the latest version with its snapshot
 *   4. validateCmsBaseVersionStep - refuses a publish from a version that is no longer the latest
 *   5. listCmsTakenValuesStep - reads the unique values other live documents hold
 *   6. listCmsRelatedDocumentsStep - reads the live documents the latest content's relationships name
 *   7. validateCmsDocumentStep - checks the latest content, its areas included, with the `publish` schema,
 *      and refuses a relationship naming no live document
 *   8. prepareCmsPublishStep - decides the write of the rows, or refuses a document with nothing new
 *   9. the `validate` hook - a host's handler, given the input, the collection and the stored row,
 *      refuses the publish by throwing; a no-op without one
 *   10. createCmsDocumentContentStep - creates the area rows and blocks the draft added
 *   11. updateCmsDocumentContentStep - updates the row and the kept blocks
 *   12. deleteCmsDocumentContentStep - deletes the blocks the draft removed
 *   13. clearCmsCacheStep - clears the cached store reads the write changes, the collection's lists among them
 *   14. getCmsDocumentStep - reads the published document back
 *   15. createCmsDocumentVersionWorkflow - records it as a published version, a `publish`
 *   16. emitEventStep - `cms.document.updated` with the collection, the id, `publish` and `published`
 *   17. listCmsDocumentMediaStep - reads the media records of the answer, held in place of their values
 *
 * The version is built from the rows as read, so a block added in a draft carries the id the write gave
 * it. On a failure, the write steps undo their calls and the version workflow removes its version.
 */
export const publishCmsDocumentWorkflow = createWorkflow(
  "publish-cms-document",
  (input: PublishCmsDocumentInput) => {
    validateCmsDraftsStep({ collection: input.collection })

    const stored = getCmsDocumentStep({
      collection: input.collection,
      id: input.id,
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

    validateCmsBaseVersionStep({ latest, base_version: input.base_version })

    const content = transform(
      { latest },
      ({ latest }) => latest?.snapshot ?? {}
    )
    const current = transform({ stored, content }, ({ stored, content }) => ({
      ...stored,
      ...content,
    }))
    const taken = listCmsTakenValuesStep({
      collection: input.collection,
      document: current,
      id: input.id,
    })

    const related = listCmsRelatedDocumentsStep({
      collection: input.collection,
      document: content,
    })

    validateCmsDocumentStep({
      collection: input.collection,
      document: content,
      taken,
      stored,
      mode: "publish",
      related,
    })

    const write = prepareCmsPublishStep({
      collection: input.collection,
      stored,
      latest,
    })

    const validate = createHook("validate", {
      input,
      collection: input.collection,
      document: stored,
    })

    createCmsDocumentContentStep({
      collection: input.collection,
      create: write.create,
    })
    updateCmsDocumentContentStep({
      collection: input.collection,
      update: write.update,
      stored,
    })
    deleteCmsDocumentContentStep({
      collection: input.collection,
      delete: write.delete,
      stored,
    })
    clearCmsCacheStep({ collection: input.collection, write })

    const published = getCmsDocumentStep({
      collection: input.collection,
      id: input.id,
    }).config({ name: "get-cms-published-document" })
    const version = createCmsDocumentVersionWorkflow.runAsStep({
      input: transform(
        { input, published, latest, stored },
        ({ input, published, latest, stored }) => ({
          collection: input.collection,
          document_id: input.id,
          document: published,
          previous: latest?.snapshot ?? stored,
          status: "published" as const,
          change_type: "publish" as const,
          actor_id: input.actor_id,
        })
      ),
    })

    emitEventStep({
      eventName: DocumentEvents.DOCUMENT_UPDATED,
      data: {
        collection: input.collection,
        id: input.id,
        action: "publish",
        status: "published",
      },
    })

    const read = transform({ published, version }, ({ published, version }) =>
      buildAdminDocumentRead(published, version)
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
