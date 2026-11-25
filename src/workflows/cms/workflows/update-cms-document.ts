import { emitEventStep } from "@medusajs/medusa/core-flows"
import {
  createHook,
  createWorkflow,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  DocumentEvents,
  type DocumentUpdatedEventData,
} from "../../../lib/document-events"
import { clearCmsCacheStep } from "../steps/clear-cms-cache"
import { createCmsDocumentContentStep } from "../steps/create-cms-document-content"
import { deleteCmsDocumentContentStep } from "../steps/delete-cms-document-content"
import { getCmsCollectionStep } from "../steps/get-cms-collection"
import { getCmsDocumentStep } from "../steps/get-cms-document"
import { listCmsTakenValuesStep } from "../steps/list-cms-taken-values"
import { listCmsVersionsStep } from "../steps/list-cms-versions"
import { prepareCmsDocumentInputStep } from "../steps/prepare-cms-document-input"
import { prepareCmsWriteStep } from "../steps/prepare-cms-write"
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

export type UpdateCmsDocumentInput = {
  /** The collection's slug. */
  collection: string
  /** The document's id. */
  id: string
  /** The admin user who edits the document. */
  actor_id: string
  /** The columns to change, as the editor sent them; a column left out stays as it was. */
  document: Record<string, unknown>
  /** The number of the version the editor's form showed; `null` for a document without versions. */
  base_version?: number | null
  /** What the version records: a `save` by default, or a `restore` of an older version. */
  change_type?: "save" | "restore"
  /** With a restore, the number of the version brought back. */
  restored_from?: number | null
}

/**
 * Saves the changes to a document's own columns and areas, records them as its latest version, and
 * returns the document and that version.
 *
 * A draft's rows are its working copy, so a save writes them, the areas the body holds included, and
 * records the version. A published document's row is what the store serves, so a save leaves it
 * untouched and records a draft version only, checked for its shape; the fields a publish needs and the
 * unique values are checked when it is published. In a collection without drafts a save writes the rows
 * of any document, checked as a publish and live at once, records no version and reads none: versions
 * left from before drafts were turned off stay stored and unread.
 *
 * Step order:
 *   1. getCmsCollectionStep - reads whether the collection has drafts
 *   2. getCmsDocumentStep - reads the stored row, or throws `NOT_FOUND`
 *   3. listCmsVersionsStep - reads the latest version with its snapshot, used with drafts only
 *   4. validateCmsBaseVersionStep - refuses a save from a version that is no longer the latest
 *   5. the `validate` hook - a host's handler, given the input, the collection and the stored row,
 *      refuses the save by throwing; a no-op without one. It runs before the branches, so the body it
 *      sees is not checked yet: a hook appears once in a workflow, and after the branches the rows are
 *      written
 *   6. when("save-cms-draft"), a draft, or any document without drafts: listCmsTakenValuesStep -> prepareCmsDocumentInputStep ->
 *      listCmsDocumentMediaStep -> listCmsRelatedDocumentsStep -> validateCmsDocumentStep -> prepareCmsWriteStep -> createCmsDocumentContentStep ->
 *      updateCmsDocumentContentStep -> deleteCmsDocumentContentStep -> clearCmsCacheStep, which clears the
 *      cached store reads the write changes -> getCmsDocumentStep, which reads the document back with
 *      its blocks' ids
 *   7. when("save-cms-published-draft"), a published document with drafts: prepareCmsDocumentInputStep ->
 *      listCmsDocumentMediaStep -> listCmsRelatedDocumentsStep -> validateCmsDocumentStep in `shape` mode, over the latest version, its areas included; the areas
 *      go to the draft version only, and the block rows wait for the publish
 *   8. when("record-cms-saved-version"), with drafts: createCmsDocumentVersionWorkflow - records the
 *      document as it is now, a `save`, or a `restore` when the restore workflow runs this one
 *   9. emitEventStep - `cms.document.updated` with the collection, the id, the action - `save`, or
 *      `restore` from the restore workflow; `publish` without drafts, as the save is live - and the
 *      row's status
 *   10. listCmsDocumentMediaStep - reads the media records of the answer, held in place of their values
 *
 * During compensation createCmsDocumentContentStep deletes what it created, updateCmsDocumentContentStep
 * writes the stored values back, deleteCmsDocumentContentStep restores what it deleted, and the version
 * workflow removes its version.
 */
export const updateCmsDocumentWorkflow = createWorkflow(
  "update-cms-document",
  (input: UpdateCmsDocumentInput) => {
    const options = getCmsCollectionStep({ collection: input.collection })
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
      { latestList, options },
      ({ latestList, options }) =>
        options.drafts ? latestList.versions[0] : undefined
    )

    validateCmsBaseVersionStep({ latest, base_version: input.base_version })

    const validate = createHook("validate", {
      input,
      collection: input.collection,
      document: stored,
    })

    const savedRow = when(
      "save-cms-draft",
      { stored, options },
      ({ stored, options }) => !options.drafts || stored.status !== "published"
    ).then(() => {
      // A slug sent empty is built from the source the document will have, sent or stored.
      const current = transform({ input, stored }, ({ input, stored }) => ({
        ...stored,
        ...input.document,
      }))
      const taken = listCmsTakenValuesStep({
        collection: input.collection,
        document: current,
        id: input.id,
      })
      const prepared = prepareCmsDocumentInputStep({
        collection: input.collection,
        actor_id: input.actor_id,
        document: input.document,
        taken,
        stored,
      })

      const media = listCmsDocumentMediaStep({
        collection: input.collection,
        documents: transform({ prepared }, ({ prepared }) => [
          { ...prepared.values, ...prepared.areas },
        ]),
      }).config({ name: "retrieve-cms-saved-media" })
      const related = listCmsRelatedDocumentsStep({
        collection: input.collection,
        document: prepared.values,
      }).config({ name: "list-cms-saved-related-documents" })

      validateCmsDocumentStep({
        collection: input.collection,
        document: prepared.values,
        areas: prepared.areas,
        taken,
        stored,
        media,
        related,
      })

      const write = prepareCmsWriteStep({
        collection: input.collection,
        document: prepared,
        stored,
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

      return getCmsDocumentStep({
        collection: input.collection,
        id: input.id,
      }).config({ name: "get-cms-saved-document" })
    })

    const savedDraft = when(
      "save-cms-published-draft",
      { stored, options },
      ({ stored, options }) => options.drafts && stored.status === "published"
    ).then(() => {
      // The draft builds on the latest version, which may hold changes the row does not show yet.
      const base = transform({ stored, latest }, ({ stored, latest }) => ({
        ...stored,
        ...(latest?.snapshot ?? {}),
      }))
      const prepared = prepareCmsDocumentInputStep({
        collection: input.collection,
        actor_id: input.actor_id,
        document: input.document,
        taken: {},
        stored: base,
      }).config({ name: "prepare-cms-draft-input" })

      const media = listCmsDocumentMediaStep({
        collection: input.collection,
        documents: transform({ prepared }, ({ prepared }) => [
          { ...prepared.values, ...prepared.areas },
        ]),
      }).config({ name: "retrieve-cms-draft-media" })
      const related = listCmsRelatedDocumentsStep({
        collection: input.collection,
        document: prepared.values,
      }).config({ name: "list-cms-draft-related-documents" })

      validateCmsDocumentStep({
        collection: input.collection,
        document: prepared.values,
        areas: prepared.areas,
        taken: {},
        stored: base,
        mode: "shape",
        media,
        related,
      }).config({ name: "validate-cms-draft" })

      return transform({ base, prepared }, ({ base, prepared }) => ({
        ...base,
        ...prepared.values,
        ...prepared.areas,
      }))
    })

    const version = when(
      "record-cms-saved-version",
      { options },
      ({ options }) => options.drafts
    ).then(() =>
      createCmsDocumentVersionWorkflow.runAsStep({
        input: transform(
          { input, stored, latest, savedRow, savedDraft },
          ({ input, stored, latest, savedRow, savedDraft }) => ({
            collection: input.collection,
            document_id: input.id,
            document: (savedRow ?? savedDraft) as Record<string, unknown>,
            previous: latest?.snapshot ?? stored,
            status: "draft" as const,
            change_type: input.change_type ?? "save",
            restored_from: input.restored_from ?? null,
            actor_id: input.actor_id,
          })
        ),
      })
    )

    emitEventStep({
      eventName: DocumentEvents.DOCUMENT_UPDATED,
      data: transform(
        { input, options, stored, savedRow },
        ({ input, options, stored, savedRow }): DocumentUpdatedEventData => ({
          collection: input.collection,
          id: input.id,
          action: options.drafts ? (input.change_type ?? "save") : "publish",
          status: (savedRow ?? stored).status,
        })
      ),
    })

    const read = transform(
      { stored, savedRow, version },
      ({ stored, savedRow, version }) =>
        buildAdminDocumentRead(savedRow ?? stored, version)
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
