import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { ClientMediaProvider } from "../../../lib/media/types"
import { getMediaProvider } from "../../../lib/registry/get-media-provider"
import { getRegistry } from "../../../lib/registry/get-registry"

/**
 * Reads what the Admin's picker needs of the media provider, from the provider itself: whether it can
 * be searched, and the largest upload. Answers `null` for a config without a provider.
 */
export const getCmsMediaProviderStep = createStep(
  "get-cms-media-provider",
  async (_input: void, { container }) => {
    if (!getRegistry(container).media) {
      return new StepResponse<ClientMediaProvider>(null)
    }

    const provider = getMediaProvider(container)

    return new StepResponse<ClientMediaProvider>({
      searchable: typeof provider.list === "function",
      maxFileSize: provider.maxFileSize,
    })
  }
)
