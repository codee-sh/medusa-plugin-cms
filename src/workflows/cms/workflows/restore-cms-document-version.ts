import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { validateCmsDraftsStep } from "../steps/validate-cms-drafts"
import { getCmsVersionStep } from "../steps/get-cms-version"
import { prepareCmsVersionSnapshotStep } from "../steps/prepare-cms-version-snapshot"
import { updateCmsDocumentWorkflow } from "./update-cms-document"

export type RestoreCmsDocumentVersionInput = {
  /** The collection's slug. */
  collection: string
  /** The document's id. */
  id: string
  /** The version to bring back. */
  version_id: string
  /** The admin user who restores it. */
  actor_id: string
  /** The number of the version the editor's form showed. */
  base_version?: number | null
}

/**
 * Brings an older version of a document back as its latest, and returns its row and the new version.
 *
 * The old snapshot goes through the current config first, so a column no longer configured is left out
 * and logged; then it is saved as any save is: a draft's row is written, a published document gets a
 * draft version and keeps serving its row until it is published. Nothing is overwritten: the restore is
 * a new version, recorded as a `restore` with the number it came from.
 *
 * Step order:
 *   1. validateCmsDraftsStep - refuses a collection without drafts, which has no versions
 *   2. getCmsVersionStep - reads the version to restore, or throws `NOT_FOUND`
 *   3. prepareCmsVersionSnapshotStep - filters its snapshot through the current config
 *   4. updateCmsDocumentWorkflow - saves it, checking `base_version`, as a `restore`; its `validate`
 *      hook runs with `change_type: "restore"`, and its `cms.document.updated` carries the action
 *      `restore`
 *
 * The save workflow undoes its own writes during compensation.
 */
export const restoreCmsDocumentVersionWorkflow = createWorkflow(
  "restore-cms-document-version",
  (input: RestoreCmsDocumentVersionInput) => {
    validateCmsDraftsStep({ collection: input.collection })

    const version = getCmsVersionStep({
      collection: input.collection,
      document_id: input.id,
      id: input.version_id,
    })
    const restored = prepareCmsVersionSnapshotStep({
      collection: input.collection,
      document: transform({ version }, ({ version }) => version.snapshot ?? {}),
      restored: true,
    })
    const read = updateCmsDocumentWorkflow.runAsStep({
      input: transform(
        { input, version, restored },
        ({ input, version, restored }) => ({
          collection: input.collection,
          id: input.id,
          actor_id: input.actor_id,
          document: restored.snapshot,
          base_version: input.base_version,
          change_type: "restore" as const,
          restored_from: version.version,
        })
      ),
    })

    return new WorkflowResponse(read)
  }
)
