import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { CMS_MODULE } from "../../../modules/cms"
import type CmsModuleService from "../../../modules/cms/service"
import type { CmsVersionRecord } from "./list-cms-versions"

export type GetCmsVersionInput = {
  /** The collection's slug. */
  collection: string
  document_id: string
  /** The version's id. */
  id: string
}

/**
 * Reads one live version of a document, with its snapshot.
 *
 * @throws `NOT_FOUND` for a version that is unknown, deleted, or of another document.
 */
export const getCmsVersionStep = createStep(
  "get-cms-version",
  async (input: GetCmsVersionInput, { container }) => {
    const [version] = await container
      .resolve<CmsModuleService>(CMS_MODULE)
      .listCmsVersions(
        {
          id: input.id,
          collection: input.collection,
          document_id: input.document_id,
        },
        { take: 1 }
      )

    if (!version) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Version "${input.id}" was not found for document "${input.document_id}"`
      )
    }

    return new StepResponse<CmsVersionRecord>(version as CmsVersionRecord)
  }
)
