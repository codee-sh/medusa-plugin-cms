import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { CMS_MODULE } from "../../../modules/cms"
import type { CmsVersionChangeType } from "../../../modules/cms/models"
import type CmsModuleService from "../../../modules/cms/service"

/** A version as the workflows read it; `snapshot` only when asked for. */
export type CmsVersionRecord = {
  id: string
  collection: string
  document_id: string
  version: number
  status: "draft" | "published"
  change_type: CmsVersionChangeType
  restored_from: number | null
  latest: boolean
  changed_fields: string[]
  created_by: string | null
  created_at: string | Date
  snapshot?: Record<string, unknown>
}

export type ListCmsVersionsInput = {
  /** The collection's slug. */
  collection: string
  /** One document, or several, as a page of documents is. */
  document_id: string | string[]
  /** Only the latest version, or only the others. */
  latest?: boolean
  /** Only the drafts, or only the published versions. */
  status?: "draft" | "published"
  /** Read the snapshots too; left out, a list stays light. */
  with_snapshot?: boolean
  /** A page of versions; every version when left out. */
  limit?: number
  offset?: number
}

export type ListCmsVersionsOutput = {
  versions: CmsVersionRecord[]
  count: number
}

/** The columns a version is read with, its snapshot apart. */
const VERSION_COLUMNS = [
  "id",
  "collection",
  "document_id",
  "version",
  "status",
  "change_type",
  "restored_from",
  "latest",
  "changed_fields",
  "created_by",
  "created_at",
]

/**
 * Lists the live versions of a document, or of several, newest first, with the total count.
 *
 * Snapshots are read only when asked for, as a history page needs none. With `latest: true` it answers
 * the version the Admin edits, or none for a document saved before versions.
 */
export const listCmsVersionsStep = createStep(
  "list-cms-versions",
  async (input: ListCmsVersionsInput, { container }) => {
    const [versions, count] = await container
      .resolve<CmsModuleService>(CMS_MODULE)
      .listAndCountCmsVersions(
        {
          collection: input.collection,
          document_id: input.document_id,
          ...(input.latest === undefined ? {} : { latest: input.latest }),
          ...(input.status ? { status: input.status } : {}),
        },
        {
          select: input.with_snapshot
            ? [...VERSION_COLUMNS, "snapshot"]
            : VERSION_COLUMNS,
          order: { version: "DESC" },
          ...(input.limit === undefined
            ? {}
            : { take: input.limit, skip: input.offset ?? 0 }),
        }
      )

    return new StepResponse<ListCmsVersionsOutput>({
      versions: versions as CmsVersionRecord[],
      count,
    })
  }
)
