import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { CMS_MODULE } from "../../../modules/cms"
import type CmsModuleService from "../../../modules/cms/service"

export type DeleteCmsVersionsInput = {
  /** The ids of the versions to delete. */
  ids: string[]
}

/**
 * Soft-deletes versions: those over a document's limit, or all of a deleted document's. A deleted
 * version keeps its number, so no later version takes it.
 *
 * The compensation restores the same ids; versions have no cascades, so nothing else comes back.
 */
export const deleteCmsVersionsStep = createStep(
  "delete-cms-versions",
  async (input: DeleteCmsVersionsInput, { container }) => {
    if (!input.ids.length) {
      return new StepResponse<void, string[]>(undefined, [])
    }

    await container
      .resolve<CmsModuleService>(CMS_MODULE)
      .softDeleteCmsVersions(input.ids)

    return new StepResponse<void, string[]>(undefined, input.ids)
  },
  async (ids: string[] | undefined, { container }) => {
    if (!ids?.length) {
      return
    }

    await container
      .resolve<CmsModuleService>(CMS_MODULE)
      .restoreCmsVersions(ids)
  }
)
