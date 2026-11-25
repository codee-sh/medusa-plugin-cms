import { emitEventStep } from "@medusajs/medusa/core-flows"
import {
  createHook,
  createWorkflow,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  type DocumentCreatedEventData,
  DocumentEvents,
} from "../../../lib/document-events"
import { clearCmsCacheStep } from "../steps/clear-cms-cache"
import { createCmsDocumentContentStep } from "../steps/create-cms-document-content"
import { getCmsCollectionStep } from "../steps/get-cms-collection"
import { getCmsDocumentStep } from "../steps/get-cms-document"
import { listCmsDocumentsStep } from "../steps/list-cms-documents"
import { listCmsTakenValuesStep } from "../steps/list-cms-taken-values"
import { prepareCmsDocumentInputStep } from "../steps/prepare-cms-document-input"
import { prepareCmsWriteStep } from "../steps/prepare-cms-write"
import { listCmsDocumentMediaStep } from "../steps/list-cms-document-media"
import { listCmsRelatedDocumentsStep } from "../steps/list-cms-related-documents"
import { validateCmsDocumentStep } from "../steps/validate-cms-document"
import { validateCmsSingletonStep } from "../steps/validate-cms-singleton"
import {
  buildAdminDocumentRead,
  listAdminReadDocuments,
  completeAdminDocumentRead,
} from "../utils/build-admin-document"
import { createCmsDocumentVersionWorkflow } from "./create-cms-document-version"

export type CreateCmsDocumentInput = {
  /** The collection's slug. */
  collection: string
  /** The admin user who creates the document. */
  actor_id: string
  /** The document's columns, as the editor sent them. */
  document: Record<string, unknown>
}

/**
 * Creates a document of a collection from its own columns and its areas, records it as its first version,
 * and returns the document as read back, with its blocks' ids, and the version. The document is a draft;
 * in a collection without drafts it is published at once, checked as a publish, and has no version.
 *
 * Step order:
 *   1. getCmsCollectionStep - reads whether the collection has drafts
 *   2. listCmsDocumentsStep - reads one live document from the database, which a singleton may hold
 *      only one of; a list collection's too, as the workflow cannot read the registry to skip it
 *   3. validateCmsSingletonStep - refuses a create in a singleton that holds its document
 *   4. listCmsTakenValuesStep - reads the unique values live documents already hold
 *   5. prepareCmsDocumentInputStep - fills empty slugs with a free value, stamps the authorship
 *   6. listCmsDocumentMediaStep - reads the media records the submitted values name
 *   7. listCmsRelatedDocumentsStep - reads the live documents the submitted relationships name
 *   8. validateCmsDocumentStep - checks the shape, the areas included, refuses a taken unique value, a
 *      media value without a record and a relationship naming no live document; as a publish without
 *      drafts
 *   9. prepareCmsWriteStep - generates the ids and decides the create calls, `published` without drafts
 *   10. the `validate` hook - a host's handler, given the input, the collection and `document: null`,
 *       refuses the create by throwing; a no-op without one
 *   11. createCmsDocumentContentStep - writes the document, its area rows and its blocks
 *   12. clearCmsCacheStep - clears the cached store reads the write changes, the collection's lists among them
 *   13. getCmsDocumentStep - reads the document back with its areas
 *   14. when("record-cms-first-version"), with drafts: createCmsDocumentVersionWorkflow - records
 *       version 1, a `save`
 *   15. emitEventStep - `cms.document.created` with the collection, the id and the status
 *   16. listCmsDocumentMediaStep - reads the media records of the answer, held in place of their values
 *
 * A new document has nothing to update or delete, so the update and delete steps of a save do not run.
 * createCmsDocumentContentStep deletes the rows it created during compensation, and the version
 * workflow removes its version.
 */
export const createCmsDocumentWorkflow = createWorkflow(
  "create-cms-document",
  (input: CreateCmsDocumentInput) => {
    const options = getCmsCollectionStep({ collection: input.collection })
    const existing = listCmsDocumentsStep({
      collection: input.collection,
      limit: 1,
      offset: 0,
    })

    validateCmsSingletonStep({
      collection: input.collection,
      operation: "create",
      count: existing.count,
    })

    const taken = listCmsTakenValuesStep({
      collection: input.collection,
      document: input.document,
    })
    const prepared = prepareCmsDocumentInputStep({
      collection: input.collection,
      actor_id: input.actor_id,
      document: input.document,
      taken,
    })

    const media = listCmsDocumentMediaStep({
      collection: input.collection,
      documents: transform({ prepared }, ({ prepared }) => [
        { ...prepared.values, ...prepared.areas },
      ]),
    })

    const related = listCmsRelatedDocumentsStep({
      collection: input.collection,
      document: prepared.values,
    })

    validateCmsDocumentStep({
      collection: input.collection,
      document: prepared.values,
      areas: prepared.areas,
      taken,
      media,
      related,
    })

    const write = prepareCmsWriteStep({
      collection: input.collection,
      document: prepared,
    })

    const validate = createHook("validate", {
      input,
      collection: input.collection,
      document: null,
    })

    createCmsDocumentContentStep({
      collection: input.collection,
      create: write.create,
    })
    clearCmsCacheStep({ collection: input.collection, write })

    const document = getCmsDocumentStep({
      collection: input.collection,
      id: transform(
        { write },
        ({ write }) => write.create[0].rows[0].id as string
      ),
    }).config({ name: "get-cms-created-document" })
    const version = when(
      "record-cms-first-version",
      { options },
      ({ options }) => options.drafts
    ).then(() =>
      createCmsDocumentVersionWorkflow.runAsStep({
        input: transform({ input, document }, ({ input, document }) => ({
          collection: input.collection,
          document_id: document.id,
          document,
          previous: null,
          status: "draft" as const,
          change_type: "save" as const,
          actor_id: input.actor_id,
        })),
      })
    )

    emitEventStep({
      eventName: DocumentEvents.DOCUMENT_CREATED,
      data: transform(
        { input, document },
        ({ input, document }): DocumentCreatedEventData => ({
          collection: input.collection,
          id: document.id,
          status: document.status,
        })
      ),
    })

    const read = transform({ document, version }, ({ document, version }) =>
      buildAdminDocumentRead(document, version)
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
