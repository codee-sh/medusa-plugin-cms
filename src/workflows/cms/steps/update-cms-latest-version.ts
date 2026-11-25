import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { CMS_MODULE } from "../../../modules/cms"
import type CmsModuleService from "../../../modules/cms/service"

export type UpdateCmsLatestVersionInput = {
  /** The collection's slug. */
  collection: string
  document_id: string
  /** The version to make latest. */
  version_id: string
}

/** What the compensation moves back: the version made latest, and the one that was. */
type MovedLatest = { from: string | null; to: string }

/**
 * Makes another version of a document its latest, as a discard does.
 *
 * It reads the version that is latest now, for the compensation, then takes the flag from it before it
 * gives the flag to the new one: two calls, as the unique index allows one latest version at a time and
 * one call's updates come in no set order. Moving the flag to the version that has it changes nothing.
 * The compensation moves it back the same way.
 */
export const updateCmsLatestVersionStep = createStep(
  "update-cms-latest-version",
  async (input: UpdateCmsLatestVersionInput, { container }) => {
    const service = container.resolve<CmsModuleService>(CMS_MODULE)
    const [current] = await service.listCmsVersions(
      {
        collection: input.collection,
        document_id: input.document_id,
        latest: true,
      },
      { select: ["id"], take: 1 }
    )

    if (current?.id === input.version_id) {
      return new StepResponse<void, MovedLatest | null>(undefined, null)
    }

    if (current) {
      await service.updateCmsVersions({ id: current.id, latest: false })
    }

    await service.updateCmsVersions({ id: input.version_id, latest: true })

    return new StepResponse<void, MovedLatest | null>(undefined, {
      from: current?.id ?? null,
      to: input.version_id,
    })
  },
  async (moved: MovedLatest | null | undefined, { container }) => {
    if (!moved) {
      return
    }

    const service = container.resolve<CmsModuleService>(CMS_MODULE)

    await service.updateCmsVersions({ id: moved.to, latest: false })

    if (moved.from) {
      await service.updateCmsVersions({ id: moved.from, latest: true })
    }
  }
)
