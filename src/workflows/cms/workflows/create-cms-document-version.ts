import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import type { CmsVersionChangeType } from "../../../modules/cms/models"
import { createCmsVersionStep } from "../steps/create-cms-version"
import { deleteCmsVersionsStep } from "../steps/delete-cms-versions"
import { listCmsVersionsStep } from "../steps/list-cms-versions"
import { prepareCmsOldVersionsStep } from "../steps/prepare-cms-old-versions"
import { prepareCmsVersionSnapshotStep } from "../steps/prepare-cms-version-snapshot"

export type CreateCmsDocumentVersionInput = {
  /** The collection's slug. */
  collection: string
  document_id: string
  /** The document the version records, whole: its row, or a body over what was stored. */
  document: Record<string, unknown>
  /** What it is compared with for its changed fields: the latest snapshot, or the stored row. */
  previous: Record<string, unknown> | null
  status: "draft" | "published"
  change_type: CmsVersionChangeType
  /** The admin user who made the change. */
  actor_id: string
  /** With a restore, the number of the version brought back. */
  restored_from?: number | null
}

/**
 * Records a version of a document as its latest, then keeps the document within its version limit, and
 * returns the version with its snapshot. Other workflows run it as a step after their own writes.
 *
 * Step order:
 *   1. prepareCmsVersionSnapshotStep - the snapshot of the document and the fields it changed
 *   2. createCmsVersionStep - records it as the latest version
 *   3. listCmsVersionsStep - reads all of the document's versions
 *   4. prepareCmsOldVersionsStep - picks those over the limit
 *   5. deleteCmsVersionsStep - deletes them; a failure is logged and the version stands
 *
 * createCmsVersionStep removes the version and gives `latest` back during compensation, and
 * deleteCmsVersionsStep restores what it deleted.
 */
export const createCmsDocumentVersionWorkflow = createWorkflow(
  "create-cms-document-version",
  (input: CreateCmsDocumentVersionInput) => {
    const prepared = prepareCmsVersionSnapshotStep({
      collection: input.collection,
      document: input.document,
      previous: input.previous,
    })
    const version = createCmsVersionStep(
      transform({ input, prepared }, ({ input, prepared }) => ({
        collection: input.collection,
        document_id: input.document_id,
        snapshot: prepared.snapshot,
        status: input.status,
        changed_fields: prepared.changed_fields,
        change_type: input.change_type,
        restored_from: input.restored_from ?? null,
        created_by: input.actor_id,
      }))
    )
    const all = listCmsVersionsStep({
      collection: input.collection,
      document_id: input.document_id,
    })
    const old = prepareCmsOldVersionsStep({ versions: all.versions })

    deleteCmsVersionsStep({ ids: old }).config({
      name: "delete-cms-old-versions",
      continueOnPermanentFailure: true,
    })

    return new WorkflowResponse(version)
  }
)
