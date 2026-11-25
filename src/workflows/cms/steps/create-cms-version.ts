import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { CMS_MODULE } from "../../../modules/cms"
import type CmsModuleService from "../../../modules/cms/service"
import type { CreateCmsVersionInput } from "../../../modules/cms/service"
import type { CmsVersionRecord } from "./list-cms-versions"

/** What the compensation undoes: the version created, and the one that was latest before it. */
type CreatedVersion = { id: string; previous_latest_id: string | null }

/**
 * Records a new version of a document as its latest, numbered after its highest one, through the `cms`
 * service's `createCmsVersion`, and returns it.
 *
 * Before writing it reads the version that is latest now, so the compensation can give the flag back:
 * it deletes the new version, then makes the previous one latest again, in that order, as the unique
 * index allows one latest version at a time.
 */
export const createCmsVersionStep = createStep(
  "create-cms-version",
  async (input: CreateCmsVersionInput, { container }) => {
    const service = container.resolve<CmsModuleService>(CMS_MODULE)
    const [previous] = await service.listCmsVersions(
      {
        collection: input.collection,
        document_id: input.document_id,
        latest: true,
      },
      { select: ["id"], take: 1 }
    )
    const version = await service.createCmsVersion(input)

    return new StepResponse<CmsVersionRecord, CreatedVersion>(
      version as CmsVersionRecord,
      { id: version.id, previous_latest_id: previous?.id ?? null }
    )
  },
  async (created: CreatedVersion | undefined, { container }) => {
    if (!created) {
      return
    }

    const service = container.resolve<CmsModuleService>(CMS_MODULE)

    await service.deleteCmsVersions([created.id])

    if (created.previous_latest_id) {
      await service.updateCmsVersions({
        id: created.previous_latest_id,
        latest: true,
      })
    }
  }
)
