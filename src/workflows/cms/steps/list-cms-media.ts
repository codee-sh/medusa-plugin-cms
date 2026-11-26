import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type {
  CmsMediaList,
  CmsMediaListQuery,
} from "../../../lib/media-provider/types"
import { getMediaProvider } from "../../../lib/registry/get-media-provider"
import { getRegistry } from "../../../lib/registry/get-registry"

/**
 * Searches the media provider's records.
 *
 * @throws `NOT_ALLOWED` when the provider has no `list`, or the config names no provider.
 */
export const listCmsMediaStep = createStep(
  "list-cms-media",
  async (input: CmsMediaListQuery, { container }) => {
    const provider = getMediaProvider(container)

    if (!provider.list) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `The media provider "${getRegistry(container).media!.identifier}" does not support search`
      )
    }

    return new StepResponse<CmsMediaList>(await provider.list(input))
  }
)
