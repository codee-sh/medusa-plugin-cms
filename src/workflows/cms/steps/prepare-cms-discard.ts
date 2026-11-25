import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { CmsDocument } from "./list-cms-documents"
import type { CmsVersionRecord } from "./list-cms-versions"

export type PrepareCmsDiscardInput = {
  /** The document as stored. */
  stored: CmsDocument
  /** Its latest version, if it has one. */
  latest?: CmsVersionRecord
  /** Its newest published version, if it has one. */
  published?: CmsVersionRecord
}

/**
 * Picks the version a discard returns a document to: its newest published version, which matches the
 * row the store serves. The discarded drafts stay in the history.
 *
 * @throws `NOT_ALLOWED` for a document with no draft waiting over its published content, and for one
 * published before versions, which has no published version to return to.
 */
export const prepareCmsDiscardStep = createStep(
  "prepare-cms-discard",
  async (input: PrepareCmsDiscardInput) => {
    if (
      input.stored.status !== "published" ||
      input.latest?.status !== "draft"
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Document "${input.stored.id}" has no unpublished changes to discard`
      )
    }

    if (!input.published) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Document "${input.stored.id}" has no published version to return to`
      )
    }

    return new StepResponse<CmsVersionRecord>(input.published)
  }
)
