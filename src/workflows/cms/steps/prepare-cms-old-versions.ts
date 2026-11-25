import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { CMS_MODULE } from "../../../modules/cms"
import type CmsModuleService from "../../../modules/cms/service"
import type { CmsVersionRecord } from "./list-cms-versions"

export type PrepareCmsOldVersionsInput = {
  /** A document's live versions, newest first. */
  versions: CmsVersionRecord[]
}

/** How many versions a document keeps when the config sets no limit. */
const DEFAULT_MAX_PER_DOCUMENT = 50

/**
 * Picks the versions over the config's `versions.maxPerDocument`, 50 by default: the oldest beyond the
 * limit, never the latest nor the newest published one, which the Admin edits and the history restores.
 *
 * Returns the ids to delete; none while the document is within the limit.
 */
export const prepareCmsOldVersionsStep = createStep(
  "prepare-cms-old-versions",
  async (input: PrepareCmsOldVersionsInput, { container }) => {
    const max =
      container.resolve<CmsModuleService>(CMS_MODULE).getConfig()?.versions
        ?.maxPerDocument ?? DEFAULT_MAX_PER_DOCUMENT
    const latestPublished = input.versions.find(
      ({ status }) => status === "published"
    )

    return new StepResponse<string[]>(
      input.versions
        .slice(max)
        .filter(
          (version) => !version.latest && version.id !== latestPublished?.id
        )
        .map(({ id }) => id)
    )
  }
)
